# Speakers Corner MIDI Relay

A real-time WebSocket relay server that forwards MIDI bytes between a sender and one or more receivers over the internet. Built for [Speakers Corner](https://speakerscorner.org), an arts organisation that controls robotic installations remotely via MIDI.

## What It Does

Enables remote MIDI control of robotic installations without requiring inbound firewall configuration. Both the sender and receiver connect **outbound** to the relay server — neither side needs to accept inbound connections.

```
┌─────────────┐         WSS        ┌──────────────┐         WSS         ┌───────────────┐
│ MIDI Sender │ ─────────────────► │ Relay Server │ ──────────────────► │ MIDI Receiver │
│ (Browser or │   outbound only    │ (VPS/Nginx)  │   outbound only     │ (Browser or   │
│ Node client)│                    │              │                     │  Node client) │
└─────────────┘                    └──────────────┘                     └───────────────┘
```

**Key features:**

- Sub-50ms added latency over typical internet connections
- Room-based routing: MIDI from any sender reaches all receivers in the same room
- Binary WebSocket frames for raw MIDI (no JSON overhead)
- Automatic reconnection with exponential backoff
- TLS/WSS encryption with Nginx reverse proxy (production)
- Minimal dependencies (only `ws` library)

## Quick Start

### Requirements

- Node.js 20 LTS or later
- NixOS environment: `nix develop`

### Development

```bash
nix develop                # Enter NixOS development environment
npm install                # Install dependencies
npm test                   # Run tests (44 passing)
npm run dev                # Start server with file watching
```

### Run the server

```bash
npm start
```

The relay listens on `127.0.0.1:3500/midi` by default. Test it:

```bash
curl http://127.0.0.1:3500/health
```

### Connect clients

**Browser client:** Open `client/browser/index.html` in Chrome, Edge, or Opera (Web MIDI required).

**Node.js clients:**

```bash
# Sender
node client/node/sender.js --url ws://127.0.0.1:3500/midi --room my-room

# Receiver
node client/node/receiver.js --url ws://127.0.0.1:3500/midi --room my-room
```

## Configuration

### Environment Variables

| Variable               | Default     | Description                                  |
| ---------------------- | ----------- | -------------------------------------------- |
| `PORT`                 | `3500`      | Server listen port                           |
| `HOST`                 | `127.0.0.1` | Bind address (use 127.0.0.1 for Nginx proxy) |
| `WS_PATH`              | `/midi`     | WebSocket endpoint path                      |
| `PING_INTERVAL_MS`     | `15000`     | WebSocket ping interval (ms)                 |
| `PING_TIMEOUT_MS`      | `30000`     | Connection dead timeout (ms)                 |
| `MAX_ROOMS`            | `50`        | Maximum concurrent rooms                     |
| `MAX_CLIENTS_PER_ROOM` | `20`        | Maximum clients per room                     |

## Testing

```bash
npm test
```

Uses Node's built-in test runner. All 44 tests passing:

- Protocol parsing: 17 tests
- Room management: 7 tests
- Relay logic: 11 tests
- Health endpoint: 1 test
- Integration (end-to-end): 1 test

## Deployment

### Production setup (PM2 + Docker nginx)

The production environment uses PM2 for the Node.js process and `nginxproxy/nginx-proxy` for routing and TLS.

```bash
# Clone and install
git clone <your-repo-url> ~/remote-midi
cd ~/remote-midi
npm install --production

# Start with PM2 (--env-file ensures .env is loaded)
pm2 start ~/remote-midi/server/index.js --name midi-relay \
  --node-args="--env-file=/home/<username>/remote-midi/.env"
pm2 save

# Add the midi-relay-web container to your docker-compose.yml
# (see deploy/deploy-guide.md for the full service block)
cd /srv/reverse-proxy
docker compose up -d midi-relay-web

# Verify
curl https://your-domain.com/health
```

For detailed instructions, see [`deploy/deploy-guide.md`](deploy/deploy-guide.md).

## Documentation

- [Client Connection Guide](docs/client-guide.md) — browser and Node.js client usage
- [Wire Protocol](docs/protocol.md) — control messages, MIDI frames, connection flow
- [Troubleshooting](docs/troubleshooting.md) — common issues and diagnostic steps
- [Deployment Guide](deploy/deploy-guide.md) — full VPS deployment walkthrough
- [Technical Instructions](CLAUDE.md) — architecture, design decisions, code standards

## How It Works

1. Clients open a WebSocket connection to the relay server (e.g. `wss://relay.example.com/midi`)
2. Each client sends a JSON `join` message specifying a room name and role (sender or receiver)
3. Senders transmit raw MIDI bytes as binary WebSocket frames
4. The relay forwards binary frames to all receivers in the same room
5. The relay never inspects or modifies MIDI data — it is a transparent byte pipe

## Key Design Decisions

- **Binary frames for MIDI** — no JSON wrapping, minimal serialisation overhead
- **`ws` library** — minimal, purpose-built WebSocket library; no Socket.IO overhead
- **Room-based routing** — simple room codes for access control, no user accounts
- **Auto-reconnection** — exponential backoff in all clients for robustness
- **ES modules & built-in tests** — modern Node.js, zero test framework dependencies
- **No MIDI interpretation** — relay is a transparent pipe; all logic lives in clients

## Project Status

**v0.1 — Alpha**

Core functionality complete and tested:

- [x] WebSocket relay with room-based routing
- [x] Binary MIDI forwarding
- [x] Browser client (Web MIDI API)
- [x] Node.js client examples
- [x] Automatic reconnection
- [x] Systemd service + Nginx config
- [x] Complete documentation
- [ ] Production load testing
- [ ] Browser UI polish
- [ ] MIDI library integration for Node clients

All tests passing. Ready for alpha testing with Speakers Corner.

## Licence

MIT
