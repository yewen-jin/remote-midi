#!/usr/bin/env node

/**
 * Node.js MIDI Receiver Client
 *
 * Connects to the MIDI relay server and forwards received MIDI bytes
 * to a local MIDI output device. Reconnects automatically with
 * exponential backoff.
 *
 * Usage:
 *   node receiver.js --url wss://relay.example.com/midi --room my-room [--name robot-arm-1] [--device "Device Name"] [--list]
 *
 * Note: Requires a MIDI library (e.g. easymidi or @julusian/midi) for
 * local MIDI device access.
 */

import { WebSocket } from 'ws';
import { parseArgs } from 'node:util';

// ── CLI argument parsing ─────────────────────────────────────────

const { values: args } = parseArgs({
  options: {
    url: { type: 'string', default: 'ws://127.0.0.1:3500/midi' },
    room: { type: 'string', default: 'speakers-corner-2026' },
    name: { type: 'string', default: '' },
    device: { type: 'string', default: '' },
    list: { type: 'boolean', default: false },
    help: { type: 'boolean', short: 'h', default: false },
  },
  strict: true,
});

if (args.help) {
  console.log(`MIDI Relay Receiver

Usage: node receiver.js [options]

Options:
  --url <url>       Relay WebSocket URL (default: ws://127.0.0.1:3500/midi)
  --room <name>     Room to join (default: speakers-corner-2026)
  --name <name>     Display name for this receiver
  --device <name>   MIDI output device name (requires MIDI library)
  --list            List available MIDI output devices and exit
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
  console.log('Available MIDI output devices:');
  const outputs = midi.getOutputs();
  if (outputs.length === 0) {
    console.log('  (none found)');
  } else {
    outputs.forEach((name, i) => console.log(`  ${i}: ${name}`));
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

  let output = null;

  ws.on('open', () => {
    reconnectDelay = 1000;
    console.log(
      `[${timestamp()}] Connected. Joining room "${args.room}" as receiver…`,
    );

    const joinMsg = { type: 'join', room: args.room, role: 'receiver' };
    if (args.name) joinMsg.name = args.name;
    ws.send(JSON.stringify(joinMsg));

    // Open MIDI output device if available
    if (midi && args.device) {
      try {
        output = new midi.Output(args.device);
        console.log(`[${timestamp()}] Bound to MIDI output: ${args.device}`);
      } catch (err) {
        console.error(
          `[${timestamp()}] Failed to open MIDI device "${args.device}": ${err.message}`,
        );
      }
    }
  });

  ws.on('message', (data, isBinary) => {
    if (isBinary) {
      const bytes = Buffer.from(data);
      const hex = [...bytes]
        .slice(0, 6)
        .map((b) => b.toString(16).padStart(2, '0').toUpperCase())
        .join(' ');
      const suffix = bytes.length > 6 ? ` … (${bytes.length} bytes)` : '';
      console.log(`[${timestamp()}] MIDI ← ${hex}${suffix}`);

      // Forward to local MIDI output
      if (output) {
        // easymidi's Output doesn't have a raw send, so we use
        // the underlying node-midi output if available
        if (output._output?.sendMessage) {
          output._output.sendMessage([...bytes]);
        }
      }
      return;
    }

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
    if (output) {
      output.close();
      output = null;
    }

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
