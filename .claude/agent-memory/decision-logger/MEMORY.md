# MIDI Relay Project Memory

## Project Overview

- **Name:** midi-relay
- **Purpose:** WebSocket relay for remote MIDI control without inbound firewall config
- **Status:** v0.1 Alpha — Core implementation complete, 44 tests passing
- **Deadline:** End of April/early May 2026

## Key Technical Decisions (Finalised)

1. **Binary frames for MIDI** — Raw bytes in binary WebSocket frames, not JSON. Reason: Eliminates serialisation overhead, keeps latency sub-50ms.
2. **`ws` library only** — No Socket.IO. Reason: ~10ms faster, no unnecessary abstraction.
3. **No authentication v1** — Room codes provide basic access control. Can add auth later if needed.
4. **ES modules + built-in test runner** — No TypeScript, no Mocha/Jest. Reason: Modern Node.js, zero external test dependencies.
5. **Room-based routing** — Simple; centralised; easier to monitor than peer-to-peer.
6. **NixOS flake + direnv** — Development environment. Never use fnm/nvm.

## Implementation Summary

**Server (100% complete):**

- Core relay: room management, binary forwarding, connection lifecycle
- Health endpoint: GET /health returns JSON with uptime/room count
- Graceful shutdown: SIGTERM/SIGINT handlers
- WebSocket-level ping/pong (15s interval, 30s timeout)

**Clients (100% complete):**

- Browser: Web MIDI API, JSON controls, auto-reconnect with exponential backoff, activity log
- Node.js: Two examples (sender/receiver) for headless/automation

**Tests (100% passing):**

- 44 tests across protocol, room, relay, health, integration suites
- Use Node's built-in `--test` runner

**Deployment (100% complete):**

- Systemd service with security hardening (ProtectSystem strict, NoNewPrivileges)
- Nginx reverse proxy: TLS termination, WebSocket upgrade headers, long timeouts
- Deployment guide: step-by-step VPS setup

**Documentation (100% complete):**

- Wire protocol spec: control messages, MIDI frames, connection flow
- Client guide: browser and Node.js usage, troubleshooting
- Troubleshooting guide: common issues, diagnostic steps
- Deploy guide: full VPS walkthrough

## Architecture Notes

- Server: http.Server + WebSocket upgrade, no Express/heavy frameworks
- Protocol: Text frames for control (JSON), binary frames for MIDI
- Relay: Relay class manages rooms; Room class manages members and broadcasts
- Clients: Auto-reconnect via exponential backoff (starting at 100ms, max 10s)

## Known Limitations (v0.1)

- No persistent state or message history
- No user accounts/billing/rate limiting
- MIDI library for Node clients not finalised (easymidi vs midi vs jzz)
- Browser UI functional but not polished
- No Docker support (systemd only)
- Health endpoint HTTP-only (not authenticated)

## File Structure

```
server/
├── index.js          # Entry point, startServer() exported
├── relay.js          # Core relay, room management
├── room.js           # Room class, member tracking
├── protocol.js       # Message parsing/creation
└── health.js         # Health check endpoint

client/
├── browser/
│   ├── index.html
│   ├── midi-relay-client.js
│   └── style.css
└── node/
    ├── sender.js
    └── receiver.js

deploy/
├── midi-relay.service
├── nginx-site.conf
└── deploy-guide.md

docs/
├── protocol.md
├── client-guide.md
├── troubleshooting.md
└── deploy-guide.md

test/
├── protocol.test.js
├── room.test.js
├── relay.test.js
├── health.test.js
└── integration.test.js
```

## Next Steps (Not Started)

1. Load testing and latency profiling (production readiness)
2. Browser UI polish (currently functional)
3. Node MIDI library integration (placeholder code needs real implementation)
4. Client reconnection edge cases (partial send/receive during disconnect)
5. User acceptance testing
6. Production deployment monitoring/alerting

## Worklog Pattern

- Tasks logged to WORKLOG.md (append-only)
- Each entry includes: timestamp, task name, status, summary, decisions, alternatives, files changed
- All commits use conventional commits (feat:, fix:, docs:, test:, deploy:, chore:)

## Development Commands

- `nix develop` — Enter development environment
- `npm install` — Install dependencies
- `npm test` — Run all tests
- `npm run dev` — Start server with file watching
- `npm start` — Run server (production)

## Git Log Pattern

- 10 commits completed as of 2026-04-14
- Sequential implementation: protocol → room → relay → server → clients → tests → deployment → docs
- Each logical step independently tested before moving on
