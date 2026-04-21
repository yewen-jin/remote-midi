#!/usr/bin/env node

/**
 * Node.js MIDI Sender Client
 *
 * Connects to the MIDI relay server and forwards local MIDI input
 * to the relay. Reconnects automatically with exponential backoff.
 *
 * Usage:
 *   node sender.js --url wss://relay.example.com/midi --room my-room [--name piano-1] [--device "Device Name"] [--list]
 *
 * Note: Requires a MIDI library (e.g. easymidi or @julusian/midi) for
 * local MIDI device access. Without one, this client can still be used
 * as a programmatic sender by importing the connect function.
 */

import { WebSocket } from 'ws';
import { parseArgs } from 'node:util';

// ── CLI argument parsing ─────────────────────────────────────────

const { values: args } = parseArgs({
  options: {
    url: { type: 'string', default: 'ws://127.0.0.1:3500/midi' },
    room: { type: 'string', default: 'midi-relay-default' },
    name: { type: 'string', default: '' },
    device: { type: 'string', default: '' },
    list: { type: 'boolean', default: false },
    help: { type: 'boolean', short: 'h', default: false },
  },
  strict: true,
});

if (args.help) {
  console.log(`MIDI Relay Sender

Usage: node sender.js [options]

Options:
  --url <url>       Relay WebSocket URL (default: ws://127.0.0.1:3500/midi)
  --room <name>     Room to join (default: midi-relay-default)
  --name <name>     Display name for this sender
  --device <name>   MIDI input device name (requires MIDI library)
  --list            List available MIDI input devices and exit
  -h, --help        Show this help message`);
  process.exit(0);
}

// ── MIDI library detection ───────────────────────────────────────

let midi = null;

try {
  midi = await import('easymidi');
  midi = midi.default || midi;
} catch {
  // easymidi not available — that's fine
}

if (args.list) {
  if (!midi) {
    console.error(
      'No MIDI library available. Install easymidi to list devices:\n  npm install easymidi',
    );
    process.exit(1);
  }
  console.log('Available MIDI input devices:');
  const inputs = midi.getInputs();
  if (inputs.length === 0) {
    console.log('  (none found)');
  } else {
    inputs.forEach((name, i) => console.log(`  ${i}: ${name}`));
  }
  process.exit(0);
}

// ── Connection logic ─────────────────────────────────────────────

const timestamp = () => new Date().toISOString();
let reconnectDelay = 1000;
const MAX_RECONNECT_DELAY = 30000;
let shouldReconnect = true;

function connect() {
  console.log(`[${timestamp()}] Connecting to ${args.url}…`);

  const ws = new WebSocket(args.url);

  ws.on('open', () => {
    reconnectDelay = 1000;
    console.log(
      `[${timestamp()}] Connected. Joining room "${args.room}" as sender…`,
    );

    const joinMsg = { type: 'join', room: args.room, role: 'sender' };
    if (args.name) joinMsg.name = args.name;
    ws.send(JSON.stringify(joinMsg));

    // Bind MIDI input if available
    if (midi && args.device) {
      try {
        const input = new midi.Input(args.device);
        console.log(`[${timestamp()}] Bound to MIDI input: ${args.device}`);

        input.on('message', (msg) => {
          if (ws.readyState === WebSocket.OPEN) {
            // easymidi gives us an object; convert to raw bytes
            // For raw bytes, use the _bytes property if available
            const bytes = msg._bytes;
            if (bytes) {
              ws.send(Buffer.from(bytes));
            }
          }
        });

        ws.on('close', () => {
          input.close();
        });
      } catch (err) {
        console.error(
          `[${timestamp()}] Failed to open MIDI device "${args.device}": ${err.message}`,
        );
      }
    }
  });

  ws.on('message', (data, isBinary) => {
    if (isBinary) return; // Sender shouldn't receive binary

    try {
      const msg = JSON.parse(data.toString());
      switch (msg.type) {
        case 'joined':
          console.log(
            `[${timestamp()}] Joined room "${msg.room}" (${msg.members} member${msg.members !== 1 ? 's' : ''})`,
          );
          break;
        case 'room-update':
          console.log(
            `[${timestamp()}] Room update: ${msg.senders} sender(s), ${msg.receivers} receiver(s)`,
          );
          break;
        case 'error':
          console.error(`[${timestamp()}] Server error: ${msg.message}`);
          break;
        case 'pong':
          break;
        default:
          break;
      }
    } catch {
      // Ignore malformed messages
    }
  });

  ws.on('close', () => {
    console.log(`[${timestamp()}] Connection closed.`);
    if (shouldReconnect) {
      console.log(
        `[${timestamp()}] Reconnecting in ${(reconnectDelay / 1000).toFixed(1)}s…`,
      );
      setTimeout(connect, reconnectDelay);
      reconnectDelay = Math.min(reconnectDelay * 2, MAX_RECONNECT_DELAY);
    }
  });

  ws.on('error', (err) => {
    console.error(`[${timestamp()}] WebSocket error: ${err.message}`);
  });
}

// ── Start ────────────────────────────────────────────────────────

connect();

// Graceful shutdown
for (const signal of ['SIGTERM', 'SIGINT']) {
  process.on(signal, () => {
    console.log(`\n[${timestamp()}] Received ${signal}, shutting down…`);
    shouldReconnect = false;
    process.exit(0);
  });
}
