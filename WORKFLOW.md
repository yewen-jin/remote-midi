# Claude Code Workflow — MIDI Relay Server

## How to Use This Document

This is your step-by-step execution plan. Work through each phase in order. Each task within a phase is atomic — complete it, test it, commit it, then move on.

### Subagent Pattern

For each task, spawn a subagent with this pattern:

```
Run as a subagent: [task description]. When done, use Haiku to append a log entry
to WORKLOG.md with the timestamp, task name, status, and one-line summary.
Then make an atomic git commit with a conventional commit message.
```

### Haiku Logging Pattern

After each task, append to `WORKLOG.md`:

```markdown
## [ISO timestamp] — [Task Name]

**Status:** completed | blocked | partial
**Summary:** One-line description of what was done
**Commit:** [commit hash or message]
**Notes:** Any gotchas, decisions made, or things to revisit
```

---

## Phase 0: Project Scaffolding

### Task 0.1 — Initialise project

```
Subagent: Initialise the Node.js project.
- Run `git init`
- Create package.json with "type": "module", name "speakers-corner-midi-relay",
  description, and scripts (start, test, dev)
- Create .gitignore (node_modules, logs/, .env, *.log)
- Create .prettierrc (default: single quotes, trailing commas, 2-space)
- Create minimal .eslintrc.json (es2022, node env, import plugin)
- Create the directory structure from CLAUDE.md
- Create WORKLOG.md with a header
- Commit: "chore: initialise project scaffolding"
```

### Task 0.2 — Install dependencies

```
Subagent: Install project dependencies.
- `npm install ws` (only production dependency)
- `npm install --save-dev prettier eslint` (only dev dependencies)
- Verify package-lock.json is generated
- Commit: "chore: install ws and dev dependencies"
```

---

## Phase 1: Core Server

### Task 1.1 — Protocol definition

```
Subagent: Create server/protocol.js
- Define message types as constants (JOIN, JOINED, ERROR, PING, PONG, ROOM_UPDATE)
- Write parseControlMessage(data) — parse JSON text frames, validate shape
- Write createMessage(type, payload) — create JSON control messages
- Export everything with JSDoc comments
- Write test/protocol.test.js using Node's built-in test runner
- Run tests and ensure they pass
- Commit: "feat: define wire protocol and message parsing"
```

### Task 1.2 — Room management

```
Subagent: Create server/room.js
- Room class: constructor(name), addMember(ws, role, name), removeMember(ws),
  broadcastBinary(senderWs, data), broadcastControl(message), getMemberCount(),
  getSenders(), getReceivers(), isEmpty()
- Each member is { ws, role, name, joinedAt }
- broadcastBinary sends to receivers only (not back to sender)
- Write test/room.test.js — test add/remove/broadcast with mock WebSockets
- Commit: "feat: implement room management with broadcast"
```

### Task 1.3 — Relay core

```
Subagent: Create server/relay.js
- Relay class: constructor(options), manages a Map of rooms
- handleConnection(ws, request) — the main connection handler
- handleTextMessage(ws, data) — parse JSON, route to join/ping handlers
- handleBinaryMessage(ws, data) — forward to room receivers
- handleClose(ws) — clean up room membership, destroy empty rooms
- Respect MAX_ROOMS and MAX_CLIENTS_PER_ROOM from env
- Write test/relay.test.js — test room creation, joining, message forwarding
- Commit: "feat: implement core relay logic with room routing"
```

### Task 1.4 — Health check

```
Subagent: Create server/health.js
- Simple HTTP GET /health endpoint returning JSON:
  { "status": "ok", "uptime": N, "rooms": N, "connections": N }
- This runs on the same HTTP server that upgrades to WebSocket
- Write a basic test for it
- Commit: "feat: add health check endpoint"
```

### Task 1.5 — Server entry point

```
Subagent: Create server/index.js
- Read config from environment variables with sensible defaults
- Create HTTP server
- Mount health check on GET /health
- Create WebSocket server on the configured path
- Wire up connection handler to relay
- Set up WebSocket-level ping/pong with configurable interval/timeout
- Graceful shutdown on SIGTERM/SIGINT (close all connections, then exit)
- Log startup info: port, path, ping settings
- Test manually: start server, connect with wscat, verify health endpoint
- Commit: "feat: server entry point with graceful shutdown"
```

### Task 1.6 — Integration test

```
Subagent: Create test/integration.test.js
- Start the relay server programmatically
- Connect two WebSocket clients (sender + receiver)
- Have both join the same room
- Send binary data from sender, verify receiver gets identical bytes
- Test: sender sends 3-byte MIDI message, receiver gets exact bytes
- Test: sender sends longer SysEx message, receiver gets exact bytes
- Test: second sender joins, receiver gets messages from both
- Test: receiver disconnects, sender still works, new receiver can join
- Tear down server after tests
- Commit: "test: integration tests for end-to-end MIDI relay"
```

---

## Phase 2: Client Implementations

### Task 2.1 — Browser client HTML/CSS

```
Subagent: Create client/browser/index.html and client/browser/style.css
- Clean, minimal HTML page with:
  - Connection section: server URL input, room code input, role dropdown
    (sender/receiver), connect/disconnect buttons
  - Status display: connection state, room info, member count
  - MIDI device section: dropdown to select MIDI input (sender) or output (receiver)
  - Activity log: scrolling list of recent events (connected, MIDI sent/received, errors)
  - Latency display: show ping round-trip time
- Style: dark theme, monospace feel, accessible, works on mobile
- No framework — plain HTML, CSS, vanilla JS structure
- Commit: "feat: browser client HTML and CSS scaffold"
```

### Task 2.2 — Browser client JavaScript

```
Subagent: Create client/browser/midi-relay-client.js
- MidiRelayClient class:
  - connect(url, room, role, name) — open WSS, send join, handle responses
  - disconnect() — clean close
  - Automatic reconnection with exponential backoff (1s, 2s, 4s, 8s, max 30s)
  - onMidiMessage(callback) — register handler for incoming MIDI bytes
  - sendMidi(data) — send binary frame
- Web MIDI API integration:
  - requestMidiAccess() — enumerate devices
  - bindInput(inputDevice) — listen for MIDI, send via relay
  - bindOutput(outputDevice) — receive from relay, send to device
- Wire everything to the HTML UI from Task 2.1
- Test manually in browser with a MIDI controller if available
- Commit: "feat: browser client with Web MIDI API and reconnection"
```

### Task 2.3 — Node.js sender client

```
Subagent: Create client/node/sender.js
- Command-line Node.js script
- Usage: node sender.js --url wss://relay.example.com/midi --room myroom --device 0
- Use `ws` library for WebSocket
- Use `easymidi` or `midi` npm package for local MIDI input
  (check which has fewer dependencies — if both are heavy, use `midi`)
- List available MIDI inputs with --list flag
- Reconnection with exponential backoff
- Log all activity to stdout
- Commit: "feat: Node.js MIDI sender client"
```

### Task 2.4 — Node.js receiver client

```
Subagent: Create client/node/receiver.js
- Command-line Node.js script
- Usage: node receiver.js --url wss://relay.example.com/midi --room myroom --device 0
- Receives binary frames from relay, writes to local MIDI output
- List available MIDI outputs with --list flag
- Reconnection with exponential backoff
- Commit: "feat: Node.js MIDI receiver client"
```

---

## Phase 3: Deployment Configuration

> **Actual production setup (Krystal.io VPS):**
> - nginx runs as a **Docker container** (existing, shared with other apps)
> - Node.js apps are managed by **PM2 on the host** (not systemd, not Docker)
> - nginx routes to apps via host IP/port (e.g. `proxy_pass http://127.0.0.1:3500`)
> - TLS is already configured on the nginx container

### Task 3.1 — Systemd service file

```
Created deploy/midi-relay.service (kept for reference / alternative setups).
Not used in production — PM2 handles process management.
Commit: "deploy: systemd service unit file"
```

### Task 3.2 — Nginx config

```
Created deploy/nginx-site.conf (full standalone config, for reference).
Created deploy/nginx-location.conf — the actual file to use:
  add these location blocks to the existing nginx container server{} block.
Commit: "deploy: Nginx reverse proxy config with WSS"
```

### Task 3.3 — Deployment guide

```
Created deploy/deploy-guide.md — updated to reflect PM2 + Docker nginx setup.
Commit: "docs: deployment guide for VPS setup"
```

---

## Phase 4: Documentation

### Task 4.1 — Client connection guide

```
Subagent: Create docs/client-guide.md
- Written for Speakers Corner (non-developer audience)
- How to open the browser client and connect
- How to select MIDI devices
- What the status indicators mean
- What to do if connection drops
- How to use the Node.js clients (for advanced users)
- Include screenshots placeholders or ASCII diagrams
- Commit: "docs: client connection guide for Speakers Corner"
```

### Task 4.2 — Protocol documentation

```
Subagent: Create docs/protocol.md
- Full wire protocol specification
- Message types, formats, examples
- Binary frame handling
- Connection lifecycle
- For developers who might extend the system
- Commit: "docs: wire protocol specification"
```

### Task 4.3 — Troubleshooting guide

```
Subagent: Create docs/troubleshooting.md
- Common issues: can't connect, MIDI not appearing, high latency,
  connection drops, no audio/MIDI output
- Diagnostic steps for each
- How to read the activity log
- How to check server health
- Commit: "docs: troubleshooting guide"
```

### Task 4.4 — README

```
Subagent: Create README.md
- Project overview with architecture diagram (ASCII)
- Quick start: how to run locally for testing
- Deployment summary (link to full guide)
- Client usage summary (link to full guide)
- Environment variables reference
- Contributing notes
- Licence (check with project owner — suggest MIT)
- Commit: "docs: README with architecture overview and quick start"
```

---

## Phase 5: Hardening & Polish

### Task 5.1 — Latency measurement

```
Subagent: Add latency measurement tooling.
- Add application-level ping/pong with timestamps in protocol
- Browser client displays round-trip latency
- Server logs average latency per room if LOG_LEVEL=debug
- Integration test that measures relay-added latency
- Commit: "feat: application-level latency measurement"
```

### Task 5.2 — Connection resilience audit

```
Subagent: Audit and harden reconnection behaviour.
- Verify exponential backoff works correctly in all clients
- Ensure room membership is correctly restored after reconnect
- Test: kill server, restart, verify clients reconnect and resume
- Test: network interruption simulation (close WebSocket uncleanly)
- Fix any issues found
- Commit: "fix: harden reconnection and room rejoin logic"
```

### Task 5.3 — Edge case handling

```
Subagent: Handle edge cases in the relay.
- What happens if a receiver sends binary data? (ignore it, log warning)
- What happens if a client sends text that isn't valid JSON? (send error, don't crash)
- What happens if a room fills up? (reject with error message)
- What happens on rapid connect/disconnect? (no resource leaks)
- Add tests for each case
- Commit: "fix: handle edge cases and prevent resource leaks"
```

### Task 5.4 — Final review and cleanup

```
Subagent: Final pass over all code.
- Run prettier on all files
- Run eslint and fix any issues
- Verify all tests pass
- Check all comments are British English
- Ensure no TODO items remain (or document them in README)
- Verify .gitignore covers everything
- Commit: "chore: final cleanup, formatting, and lint fixes"
```

---

## Execution Checklist

```
[x] Phase 0: Scaffolding
    [x] 0.1 — Initialise project
    [x] 0.2 — Install dependencies

[x] Phase 1: Core Server
    [x] 1.1 — Protocol definition
    [x] 1.2 — Room management
    [x] 1.3 — Relay core
    [x] 1.4 — Health check
    [x] 1.5 — Server entry point
    [x] 1.6 — Integration test

[x] Phase 2: Clients
    [x] 2.1 — Browser client HTML/CSS
    [x] 2.2 — Browser client JavaScript
    [x] 2.3 — Node.js sender
    [x] 2.4 — Node.js receiver

[x] Phase 3: Deployment
    [x] 3.1 — Systemd service (kept for reference; PM2 used in production)
    [x] 3.2 — Nginx config (nginx-location.conf for Docker nginx setup)
    [x] 3.3 — Deployment guide (updated for PM2 + Docker nginx on Krystal.io)

[x] Phase 4: Documentation
    [x] 4.1 — Client guide
    [x] 4.2 — Protocol docs
    [x] 4.3 — Troubleshooting
    [x] 4.4 — README

[x] Phase 5: Hardening
    [x] 5.1 — Latency measurement (avg 0.33ms on localhost)
    [x] 5.2 — Connection resilience
    [x] 5.3 — Edge cases
    [x] 5.4 — Final cleanup

[ ] Phase 6: Production deployment (Krystal.io)
    [ ] 6.1 — Clone repo on VPS, npm install --production
    [ ] 6.2 — Add location blocks to nginx container config, reload nginx
    [ ] 6.3 — pm2 start server/index.js --name midi-relay && pm2 save
    [ ] 6.4 — Verify: curl https://your-domain.com/health
    [ ] 6.5 — End-to-end test with two real machines and MIDI device

[ ] Phase 7: Arduino bridge
    [ ] 7.1 — client/node/arduino-receiver.js
              - Connects to relay as receiver
              - Detects serial port automatically or accepts --port flag
              - Parses MIDI bytes and writes to Arduino over serial (serialport)
              - Reconnection with exponential backoff (same as other clients)
              - --list flag to list available serial ports
              - --baud flag (default 9600)
              - Graceful shutdown closes serial port cleanly
    [ ] 7.2 — Update docs/operations-guide.md with Arduino usage section
    [ ] 7.3 — Update docs/client-guide.md with Arduino section
```
