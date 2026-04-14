# CLAUDE.md — MIDI Relay Server for Speakers Corner

## Project Identity

**Name:** `speakers-corner-midi-relay`
**Purpose:** A real-time WebSocket relay server that forwards MIDI bytes between a sender and one or more receivers over the internet. Built for Speakers Corner, an arts organisation that controls robotic installations remotely via MIDI.
**Deadline:** End of April / early May 2026 (filming and recording session)

## Problem Statement

Speakers Corner previously achieved remote MIDI control in 2020, but increased firewall/NAT restrictions broke their setup. Neither the sender nor receiver can open inbound ports. Both sides must connect _outbound_ to a central relay server, which forwards MIDI bytes in real time.

## Architecture Overview

```
┌─────────────┐         WSS          ┌──────────────┐         WSS          ┌──────────────┐
│ MIDI Sender  │ ──────────────────► │  Relay Server │ ──────────────────► │ MIDI Receiver │
│ (Browser or  │   outbound only     │  (VPS/Nginx)  │   outbound only     │ (Browser or   │
│  Node client)│                     │               │                     │  Node client)  │
└─────────────┘                     └──────────────┘                     └──────────────┘
```

- **Relay server:** Node.js + `ws` library, deployed behind Nginx with TLS termination
- **Clients:** Browser-based (Web MIDI API) or lightweight Node.js scripts
- **Rooms:** Clients join a named room/channel; MIDI bytes from any sender in a room are forwarded to all receivers in that room
- **Transport:** Raw MIDI bytes over WebSocket binary frames — no JSON wrapping for MIDI data

## Non-Negotiable Requirements

1. **Sub-50ms added latency** over a decent connection (relay processing + network, not including local MIDI hardware)
2. **No inbound firewall config** needed on either client end — all connections are outbound WSS
3. **TLS/WSS only** — encrypted transport, SSL terminated at Nginx
4. **Robust reconnection** — clients must auto-reconnect with exponential backoff; installations cannot silently drop
5. **Minimal dependencies** — only what's strictly needed
6. **Room-based routing** — simple room/channel codes, not complex auth

## Code Standards

- **Language:** British English in all comments, logs, documentation, and UI text
- **Style:** Clean, well-commented code; prefer clarity over cleverness
- **Formatting:** Use Prettier defaults (2-space indent, single quotes, trailing commas)
- **Linting:** ESLint with a minimal config
- **Node version:** 20 LTS or later
- **Module system:** ES modules (`"type": "module"` in package.json)
- **Error handling:** Never swallow errors silently; always log with context
- **Logging:** Structured console output with timestamps; no heavy logging frameworks

## Project Structure

```
speakers-corner-midi-relay/
├── CLAUDE.md                    # This file — project instructions for Claude Code
├── README.md                    # User-facing documentation
├── package.json
├── .prettierrc
├── .eslintrc.json
├── .gitignore
├── server/
│   ├── index.js                 # Entry point — starts the WebSocket relay
│   ├── relay.js                 # Core relay logic: rooms, routing, connection mgmt
│   ├── room.js                  # Room class: manages members, handles join/leave
│   ├── protocol.js              # Message protocol definitions and parsing
│   └── health.js                # Health check endpoint for monitoring
├── client/
│   ├── browser/
│   │   ├── index.html           # Browser client — Web MIDI API sender/receiver
│   │   ├── midi-relay-client.js # Browser WebSocket + Web MIDI glue code
│   │   └── style.css            # Minimal styling
│   └── node/
│       ├── sender.js            # Node.js MIDI sender client (using `midi` or `easymidi`)
│       └── receiver.js          # Node.js MIDI receiver client
├── deploy/
│   ├── midi-relay.service       # Systemd unit file
│   ├── nginx-site.conf          # Nginx reverse proxy config (WSS)
│   └── deploy-guide.md          # Step-by-step deployment instructions
├── docs/
│   ├── client-guide.md          # Guide for Speakers Corner to connect
│   ├── protocol.md              # Wire protocol documentation
│   └── troubleshooting.md       # Common issues and fixes
├── test/
│   ├── relay.test.js            # Unit tests for relay logic
│   ├── room.test.js             # Unit tests for room management
│   ├── protocol.test.js         # Unit tests for protocol parsing
│   └── integration.test.js      # End-to-end test: sender → relay → receiver
└── logs/                        # Git-ignored; runtime logs go here
    └── .gitkeep
```

## Wire Protocol

### Control Messages (JSON, text frames)

Clients send JSON for control operations. The server responds with JSON.

```jsonc
// Join a room as sender
{ "type": "join", "room": "speakers-corner-2026", "role": "sender", "name": "optional-display-name" }

// Join a room as receiver
{ "type": "join", "room": "speakers-corner-2026", "role": "receiver", "name": "robot-arm-1" }

// Server acknowledgement
{ "type": "joined", "room": "speakers-corner-2026", "role": "sender", "members": 3 }

// Server error
{ "type": "error", "message": "Room name is required" }

// Heartbeat (ping/pong handled at WebSocket level, but application-level too)
{ "type": "ping" }
{ "type": "pong", "time": 1714000000000 }

// Room info broadcast (when members change)
{ "type": "room-update", "room": "speakers-corner-2026", "senders": 1, "receivers": 2 }
```

### MIDI Data (binary frames)

Raw MIDI bytes are sent as **binary WebSocket frames** with no additional framing or JSON wrapping. This is critical for latency — we do not serialise/deserialise MIDI data.

The relay simply forwards binary frames from senders to all receivers in the same room. The relay does NOT interpret, validate, or modify MIDI bytes.

### Connection Flow

1. Client opens WSS connection to `wss://relay.example.com/midi`
2. Client sends a `join` message (JSON text frame) with room name and role
3. Server responds with `joined` confirmation
4. Sender transmits MIDI bytes as binary frames
5. Server forwards binary frames to all receivers in the room
6. WebSocket-level ping/pong keeps the connection alive (interval: 15s, timeout: 30s)

## Deployment Context

- **VPS:** Linux (likely Debian/Ubuntu), with Docker, Nginx, and Let's Encrypt already configured
- **Nginx:** Reverse proxy with SSL termination; WebSocket upgrade handling required
- **Process manager:** Systemd (preferred) or Docker container
- **Domain:** Will be configured by the developer; docs should use `relay.example.com` as placeholder
- **Port:** Relay listens on localhost:3500 (configurable via env); Nginx proxies WSS → WS

## Environment Variables

```bash
PORT=3500                          # Relay server listen port
HOST=127.0.0.1                     # Bind address (localhost for Nginx proxy)
WS_PATH=/midi                      # WebSocket endpoint path
PING_INTERVAL_MS=15000             # WebSocket ping interval
PING_TIMEOUT_MS=30000              # Connection considered dead after this
LOG_LEVEL=info                     # info | debug | warn | error
MAX_ROOMS=50                       # Maximum concurrent rooms
MAX_CLIENTS_PER_ROOM=20            # Maximum clients per room
```

## Testing Strategy

- **Unit tests:** Pure logic tests for protocol parsing, room management
- **Integration tests:** Spin up relay, connect mock sender + receiver, verify MIDI bytes pass through
- **Latency test:** Measure round-trip time through the relay with timestamps
- **Reconnection test:** Kill connection, verify client reconnects and re-joins room
- **Use Node's built-in test runner** (`node --test`) — no Mocha/Jest dependency

## Key Technical Decisions

1. **Binary frames for MIDI, not JSON** — eliminates serialisation overhead
2. **`ws` library, not Socket.IO** — Socket.IO adds ~15ms overhead and unnecessary abstraction
3. **No authentication (v1)** — room codes provide sufficient access control for this use case; auth can be added later
4. **No MIDI interpretation on server** — the relay is a dumb pipe; all MIDI logic lives in clients
5. **ES modules** — modern Node.js, no CommonJS
6. **Node built-in test runner** — zero test framework dependencies

## What Claude Code Should NOT Do

- Do not add authentication, user accounts, or databases — this is a simple relay
- Do not use Socket.IO, Express, or other heavy frameworks — raw `ws` + `http` only
- Do not interpret or validate MIDI bytes on the server — just forward them
- Do not add a frontend framework (React, Vue, etc.) — the browser client is plain HTML/JS
- Do not use TypeScript unless explicitly asked — plain JavaScript with JSDoc comments
- Do not add Docker configuration unless explicitly asked — systemd is the primary deployment method
- Do not wrap MIDI binary data in JSON — binary frames only

## MIDI-Specific Notes

- MIDI messages are 1–3 bytes, but SysEx messages can be much longer (up to ~64KB)
- Running status (omitting repeated status bytes) is common — the relay must not interfere
- Clock/timing messages (0xF8) are very frequent during sync — these must pass through at full speed
- The relay has no opinion about MIDI content; it is a transparent byte pipe
- If uncertain about MIDI behaviour, say so explicitly — don't guess

## Git Workflow

- **Atomic commits** for each logical step
- **Conventional commits:** `feat:`, `fix:`, `docs:`, `test:`, `chore:`, `deploy:`
- **Branch:** Work on `main` unless otherwise directed
- **Each feature/task should be independently testable before moving on**

## Subagent / Task Logging

When using subagents or breaking work into tasks:

- Use Haiku to maintain a `WORKLOG.md` at the project root
- Each entry should include: timestamp, task name, status (started/completed/blocked), and a one-line summary
- Keep the worklog append-only; never delete entries
- This serves as the project's audit trail
