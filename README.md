# Speakers Corner MIDI Relay

A real-time WebSocket relay server that forwards MIDI bytes between a sender and one or more receivers over the internet. Built for [Speakers Corner](https://speakerscorner.org), an arts organisation that controls robotic installations remotely via MIDI.

## Architecture

```
┌─────────────┐         WSS          ┌──────────────┐         WSS          ┌──────────────┐
│ MIDI Sender  │ ──────────────────► │  Relay Server │ ──────────────────► │ MIDI Receiver │
│ (Browser or  │   outbound only     │  (VPS/Nginx)  │   outbound only     │ (Browser or   │
│  Node client)│                     │               │                     │  Node client)  │
└─────────────┘                     └──────────────┘                     └──────────────┘
```

Both clients connect **outbound** to the relay — no firewall or NAT configuration needed on either end.

## Quick Start

### Requirements

- Node.js 20 LTS or later

### Run the server

```bash
npm install
npm start
```

The relay server listens on `127.0.0.1:3500` by default. Test the health endpoint:

```bash
curl http://127.0.0.1:3500/health
```

### Connect with the browser client

Open `client/browser/index.html` in Chrome, Edge, or Opera (Web MIDI required).

### Connect with Node.js clients

```bash
# Sender
node client/node/sender.js --url ws://127.0.0.1:3500/midi --room my-room

# Receiver
node client/node/receiver.js --url ws://127.0.0.1:3500/midi --room my-room
```

## Environment Variables

| Variable               | Default       | Description                          |
|------------------------|---------------|--------------------------------------|
| `PORT`                 | `3500`        | Server listen port                   |
| `HOST`                 | `127.0.0.1`   | Bind address                         |
| `WS_PATH`              | `/midi`       | WebSocket endpoint path              |
| `PING_INTERVAL_MS`     | `15000`       | WebSocket ping interval (ms)         |
| `PING_TIMEOUT_MS`      | `30000`       | Connection dead timeout (ms)         |
| `MAX_ROOMS`            | `50`          | Maximum concurrent rooms             |
| `MAX_CLIENTS_PER_ROOM` | `20`          | Maximum clients per room             |

## Testing

```bash
npm test
```

Uses Node's built-in test runner — no external test framework required.

## Documentation

- [Client Connection Guide](docs/client-guide.md) — how to connect as a sender or receiver
- [Wire Protocol](docs/protocol.md) — full protocol specification
- [Troubleshooting](docs/troubleshooting.md) — common issues and fixes
- [Deployment Guide](deploy/deploy-guide.md) — VPS deployment with systemd and Nginx

## How It Works

1. Clients open a WebSocket connection to the relay server
2. They send a JSON `join` message specifying a room name and role (sender/receiver)
3. Senders transmit raw MIDI bytes as binary WebSocket frames
4. The relay forwards binary frames to all receivers in the same room
5. The relay never inspects or modifies MIDI data — it is a transparent byte pipe

## Key Design Decisions

- **Binary frames for MIDI** — no JSON wrapping, minimal latency
- **`ws` library** — no Socket.IO overhead
- **Room-based routing** — simple room codes, no authentication
- **Auto-reconnection** — exponential backoff in all clients
- **Sub-50ms relay latency** — measured on localhost, network dependent in production

## Licence

MIT
