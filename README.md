# MIDI Relay

A real-time WebSocket relay server that forwards MIDI bytes between a sender and one or more receivers over the internet.

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
- Per-IP and per-connection rate limiting

## Quick Start

### Requirements

- Node.js 20 LTS or later
- NixOS environment: `nix develop`

### Development

```bash
nix develop                # Enter NixOS development environment
npm install                # Install dependencies
npm test                   # Run tests (52 passing)
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

| Variable                 | Default     | Description                            |
| ------------------------ | ----------- | -------------------------------------- |
| `PORT`                   | `3500`      | Server listen port                     |
| `HOST`                   | `127.0.0.1` | Bind address (use 0.0.0.0 in Docker)   |
| `WS_PATH`                | `/midi`     | WebSocket endpoint path                |
| `PING_INTERVAL_MS`       | `15000`     | WebSocket ping interval (ms)           |
| `PING_TIMEOUT_MS`        | `30000`     | Connection dead timeout (ms)           |
| `MAX_ROOMS`              | `50`        | Maximum concurrent rooms               |
| `MAX_CLIENTS_PER_ROOM`   | `20`        | Maximum clients per room               |
| `MAX_CONNECTIONS_PER_IP` | `10`        | Max concurrent connections per IP      |
| `CONNECT_RATE_LIMIT`     | `20`        | Max new connections per IP per window  |
| `CONNECT_RATE_WINDOW_MS` | `60000`     | Connection rate window (ms)            |
| `MESSAGE_RATE_LIMIT`     | `500`       | Max messages per second per connection |

## Testing

```bash
npm test
```

Uses Node's built-in test runner. All 68 tests passing:

- Protocol parsing: 17 tests
- Room management: 7 tests
- Relay logic: 17 tests
- Health endpoint: 3 tests
- Rate limiting: 13 tests
- Integration (end-to-end): 11 tests

## Deployment

### Production setup (Docker)

The relay runs as a Docker container alongside `nginxproxy/nginx-proxy` for automatic TLS and routing.

```bash
# Clone
git clone <your-repo-url> ~/remote-midi

# Add midi-relay service to your docker-compose.yml
# (see deploy/docker-compose.service.yml for the service block)

# Build and start
cd /srv/reverse-proxy
docker compose up -d --build midi-relay

# Verify
curl https://your-domain.com/health
```

To update after pulling changes: `docker compose up -d --build midi-relay`

For detailed instructions, see [`deploy/deploy-guide.md`](deploy/deploy-guide.md).

## Documentation

- [Client Connection Guide](docs/client-guide.md) — browser and Node.js client usage
- [Wire Protocol](docs/protocol.md) — control messages, MIDI frames, connection flow
- [Troubleshooting](docs/troubleshooting.md) — common issues and diagnostic steps
- [Deployment Guide](deploy/deploy-guide.md) — full VPS deployment walkthrough
- [Technical Instructions](CLAUDE.md) — architecture, design decisions, code standards

## How It Works

1. Clients open a WebSocket connection to the relay server (e.g. `wss://midi.datadadaist.space/midi`)
2. Each client sends a JSON `join` message specifying a room name and role (sender or receiver)
3. Senders transmit raw MIDI bytes as binary WebSocket frames
4. The relay forwards binary frames to all receivers in the same room
5. The relay never inspects or modifies MIDI data — it is a transparent byte pipe

## Using with a DAW (Ableton, Logic, etc.)

To route MIDI from the relay into a DAW, you need a virtual MIDI port — a software loopback that connects the browser client's output to the DAW's input.

### 1. Create a virtual MIDI port

| OS      | Tool                  | Setup                                                                                                                   |
| ------- | --------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| macOS   | IAC Driver (built-in) | Open **Audio MIDI Setup** → **Window** → **Show MIDI Studio** → double-click **IAC Driver** → tick **Device is online** |
| Windows | loopMIDI              | Install [loopMIDI](https://www.tobias-erichsen.de/software/loopmidi.html) → click **+** to create a port                |
| Linux   | ALSA virmidi          | `sudo modprobe snd-virmidi` — creates virtual MIDI ports                                                                |

### 2. Connect the browser client

1. Open `https://midi.datadadaist.space` in Chrome
2. Set role to **Receiver**, enter the room name, connect
3. In the **MIDI Output** dropdown, select your virtual MIDI port (e.g. "IAC Driver Bus 1" or "loopMIDI Port")

### 3. Configure the DAW

- **Ableton Live:** Preferences → Link/Tempo/MIDI → under MIDI Ports, enable **Track** and **Remote** for the virtual port's input
- **Logic Pro:** the IAC Driver appears automatically as a MIDI input
- **Other DAWs:** look for the virtual port in MIDI input/device settings

MIDI data now flows: **relay → browser → virtual port → DAW**

### 4. Sending from a DAW

To send MIDI from a DAW to the relay:

1. Set the DAW's MIDI output to the virtual port
2. Open the browser client as **Sender**
3. Select the virtual port as the **MIDI Input**

MIDI data flows: **DAW → virtual port → browser → relay → receivers**

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
- [x] Docker deployment + Nginx proxy
- [x] Complete documentation
- [x] Stress testing (0 drops at 48 msg/s × 5 senders)
- [x] Arduino serial bridge
- [ ] Browser UI polish
- [ ] MIDI library integration for Node clients

All tests passing. Deployed at `midi.datadadaist.space`.

## Licence

MIT
