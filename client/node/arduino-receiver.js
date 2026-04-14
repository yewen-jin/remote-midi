#!/usr/bin/env node

/**
 * Node.js Arduino MIDI Receiver Client
 *
 * Connects to the MIDI relay server as a receiver and forwards incoming
 * MIDI bytes to an Arduino over a serial port. Reconnects to both the
 * relay and the serial port automatically with exponential backoff.
 *
 * Usage:
 *   node arduino-receiver.js --url wss://relay.example.com/midi --room my-room [--name arduino-1] [--port /dev/ttyUSB0] [--baud 9600] [--list]
 */

import { WebSocket } from 'ws';
import { SerialPort } from 'serialport';
import { parseArgs } from 'node:util';

// -- CLI argument parsing -----------------------------------------------------

const { values: args } = parseArgs({
  options: {
    url: { type: 'string', default: 'ws://127.0.0.1:3500/midi' },
    room: { type: 'string', default: 'speakers-corner-2026' },
    name: { type: 'string', default: 'arduino-1' },
    port: { type: 'string', default: '' },
    baud: { type: 'string', default: '9600' },
    list: { type: 'boolean', default: false },
    help: { type: 'boolean', short: 'h', default: false },
  },
  strict: true,
});

if (args.help) {
  console.log(`MIDI Relay Arduino Receiver

Connects to the MIDI relay as a receiver and forwards incoming MIDI
bytes to an Arduino (or any microcontroller) over a serial port.

Usage: node arduino-receiver.js [options]

Options:
  --url <url>       Relay WebSocket URL (default: ws://127.0.0.1:3500/midi)
  --room <name>     Room to join (default: speakers-corner-2026)
  --name <name>     Display name for this receiver (default: arduino-1)
  --port <path>     Serial port path, e.g. /dev/ttyUSB0 or COM3
                    If omitted, auto-detects the first available port.
  --baud <rate>     Baud rate (default: 9600)
  --list            List available serial ports and exit
  -h, --help        Show this help message`);
  process.exit(0);
}

// -- List serial ports --------------------------------------------------------

if (args.list) {
  try {
    const ports = await SerialPort.list();
    console.log('Available serial ports:');
    if (ports.length === 0) {
      console.log('  (none found)');
    } else {
      for (const p of ports) {
        const desc = [p.manufacturer, p.serialNumber]
          .filter(Boolean)
          .join(', ');
        console.log(`  ${p.path}${desc ? ` (${desc})` : ''}`);
      }
    }
  } catch (err) {
    console.error(`Failed to list serial ports: ${err.message}`);
  }
  process.exit(0);
}

// -- Helpers ------------------------------------------------------------------

const timestamp = () => new Date().toISOString();
const baudRate = parseInt(args.baud, 10);

if (Number.isNaN(baudRate) || baudRate <= 0) {
  console.error(`Invalid baud rate: ${args.baud}`);
  process.exit(1);
}

// -- Serial port management ---------------------------------------------------

let serialPort = null;
let serialReady = false;
let serialReconnectDelay = 1000;
const SERIAL_MAX_RECONNECT_DELAY = 30000;
let shouldRun = true;

/**
 * Auto-detect the first available serial port path.
 * @returns {Promise<string|null>} The port path, or null if none found.
 */
async function autoDetectPort() {
  const ports = await SerialPort.list();
  if (ports.length === 0) return null;
  return ports[0].path;
}

/**
 * Open the serial port, with auto-detection if no --port was given.
 * Retries with exponential backoff on failure.
 */
async function openSerialPort() {
  if (!shouldRun) return;

  let portPath = args.port;

  if (!portPath) {
    console.log(`[${timestamp()}] No --port specified, auto-detecting…`);
    portPath = await autoDetectPort();
    if (!portPath) {
      console.log(
        `[${timestamp()}] No serial ports found. Retrying in ${(serialReconnectDelay / 1000).toFixed(1)}s…`,
      );
      setTimeout(openSerialPort, serialReconnectDelay);
      serialReconnectDelay = Math.min(
        serialReconnectDelay * 2,
        SERIAL_MAX_RECONNECT_DELAY,
      );
      return;
    }
    console.log(`[${timestamp()}] Auto-detected serial port: ${portPath}`);
  }

  try {
    serialPort = new SerialPort({
      path: portPath,
      baudRate,
      autoOpen: false,
    });

    serialPort.on('open', () => {
      serialReady = true;
      serialReconnectDelay = 1000;
      console.log(
        `[${timestamp()}] Serial port opened: ${portPath} @ ${baudRate} baud`,
      );
    });

    serialPort.on('error', (err) => {
      console.error(`[${timestamp()}] Serial port error: ${err.message}`);
    });

    serialPort.on('close', () => {
      serialReady = false;
      serialPort = null;
      console.log(`[${timestamp()}] Serial port closed.`);
      if (shouldRun) {
        console.log(
          `[${timestamp()}] Reopening serial port in ${(serialReconnectDelay / 1000).toFixed(1)}s…`,
        );
        setTimeout(openSerialPort, serialReconnectDelay);
        serialReconnectDelay = Math.min(
          serialReconnectDelay * 2,
          SERIAL_MAX_RECONNECT_DELAY,
        );
      }
    });

    serialPort.open((err) => {
      if (err) {
        console.error(
          `[${timestamp()}] Failed to open serial port "${portPath}": ${err.message}`,
        );
        serialPort = null;
        if (shouldRun) {
          console.log(
            `[${timestamp()}] Retrying serial port in ${(serialReconnectDelay / 1000).toFixed(1)}s…`,
          );
          setTimeout(openSerialPort, serialReconnectDelay);
          serialReconnectDelay = Math.min(
            serialReconnectDelay * 2,
            SERIAL_MAX_RECONNECT_DELAY,
          );
        }
      }
    });
  } catch (err) {
    console.error(
      `[${timestamp()}] Failed to create serial port: ${err.message}`,
    );
    if (shouldRun) {
      setTimeout(openSerialPort, serialReconnectDelay);
      serialReconnectDelay = Math.min(
        serialReconnectDelay * 2,
        SERIAL_MAX_RECONNECT_DELAY,
      );
    }
  }
}

// -- WebSocket relay connection -----------------------------------------------

let wsReconnectDelay = 1000;
const WS_MAX_RECONNECT_DELAY = 30000;

function connect() {
  console.log(`[${timestamp()}] Connecting to ${args.url}…`);

  const ws = new WebSocket(args.url);

  ws.on('open', () => {
    wsReconnectDelay = 1000;
    console.log(
      `[${timestamp()}] Connected. Joining room "${args.room}" as receiver…`,
    );

    const joinMsg = { type: 'join', room: args.room, role: 'receiver' };
    if (args.name) joinMsg.name = args.name;
    ws.send(JSON.stringify(joinMsg));
  });

  ws.on('message', (data, isBinary) => {
    if (isBinary) {
      const bytes = Buffer.from(data);
      const hex = [...bytes]
        .slice(0, 6)
        .map((b) => b.toString(16).padStart(2, '0').toUpperCase())
        .join(' ');
      const suffix = bytes.length > 6 ? ` … (${bytes.length} bytes)` : '';
      console.log(`[${timestamp()}] MIDI <- ${hex}${suffix}`);

      // Forward raw bytes to the serial port
      if (serialReady && serialPort) {
        serialPort.write(bytes, (err) => {
          if (err) {
            console.error(
              `[${timestamp()}] Serial write error: ${err.message}`,
            );
          }
        });
      } else {
        console.warn(
          `[${timestamp()}] Serial port not ready — MIDI data dropped`,
        );
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
    console.log(`[${timestamp()}] Connection closed.`);
    if (shouldRun) {
      console.log(
        `[${timestamp()}] Reconnecting in ${(wsReconnectDelay / 1000).toFixed(1)}s…`,
      );
      setTimeout(connect, wsReconnectDelay);
      wsReconnectDelay = Math.min(wsReconnectDelay * 2, WS_MAX_RECONNECT_DELAY);
    }
  });

  ws.on('error', (err) => {
    console.error(`[${timestamp()}] WebSocket error: ${err.message}`);
  });
}

// -- Start --------------------------------------------------------------------

// Open serial port and WebSocket connection in parallel
openSerialPort();
connect();

// Graceful shutdown
for (const signal of ['SIGTERM', 'SIGINT']) {
  process.on(signal, () => {
    console.log(`\n[${timestamp()}] Received ${signal}, shutting down…`);
    shouldRun = false;

    if (serialPort && serialPort.isOpen) {
      console.log(`[${timestamp()}] Closing serial port…`);
      serialPort.close((err) => {
        if (err) {
          console.error(
            `[${timestamp()}] Error closing serial port: ${err.message}`,
          );
        }
        process.exit(0);
      });
    } else {
      process.exit(0);
    }
  });
}
