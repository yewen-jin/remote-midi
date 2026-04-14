# WORKLOG — Speakers Corner MIDI Relay

Append-only log of all tasks completed during development.

---

## 2026-04-14T14:30:00Z — Task 0.1: Initialise project

**Status:** completed
**Summary:** Created package.json (ES modules), .prettierrc, .eslintrc.json, .gitignore, directory structure (server/, client/, deploy/, docs/, test/, logs/), and WORKLOG.md
**Commit:** `cf38e2b` — chore: initialise project scaffolding
**Notes:** logs/ directory is gitignored so no .gitkeep committed for it. CLAUDE.md, WORKFLOW.md, and LAUNCH-PROMPT.md included in commit.

## 2026-04-14T14:35:00Z — Task 0.2: Install dependencies

**Status:** completed
**Summary:** Installed ws (production), prettier and eslint (dev). Added flake.nix and .envrc for NixOS direnv-based Node 20 LTS environment.
**Commit:** `cfc9e5f` — chore: install ws and dev dependencies, add nix flake
**Notes:** Using NixOS with direnv/flake instead of fnm/nvm. All npm commands must run via `nix develop --command bash -c "..."`. Added .direnv/ to .gitignore.

## Phase 1: Core Server

| Timestamp  | Task                           | Status    | Summary                                                                                                                               |
| ---------- | ------------------------------ | --------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-04-14 | Task 1.1 — Protocol definition | completed | Defined MessageType/Role constants, parseControlMessage with validation, createMessage helper. 17 tests passing.                      |
| 2026-04-14 | Task 1.2 — Room management     | completed | Room class with Map-based member tracking, broadcastBinary (senders→receivers only), broadcastControl (all members). 7 tests passing. |
| 2026-04-14 | Task 1.3 — Relay core          | completed | Relay class with room routing, join/ping handlers, binary forwarding, room limits, room switching, close cleanup. 11 tests passing.   |

**Decision note:** Chose to implement Phase 1 tasks sequentially in the main conversation rather than spawning subagents, because each task depends on the previous one (relay imports room imports protocol). Subagents would add overhead without enabling parallelism.

## Phase 2: Server Entry Point & Health Checks

| Timestamp  | Task                             | Status    | Summary                                                                                                                                   |
| ---------- | -------------------------------- | --------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-04-14 | Task 2.1 — Server entry point    | completed | Implemented startServer() with Nix-compatible config, WebSocket-level ping/pong, graceful shutdown handling. Exports for testing and CLI. |
| 2026-04-14 | Task 2.2 — Health check endpoint | completed | GET /health returns JSON with uptime, room count, connection count. 1 test passing.                                                       |

## Phase 3: Browser Client

| Timestamp  | Task                            | Status    | Summary                                                                                                                                                              |
| ---------- | ------------------------------- | --------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-04-14 | Task 3.1 — Browser HTML & CSS   | completed | index.html with form inputs, status panels, activity log. style.css with clean, minimal design. Accessible controls.                                                 |
| 2026-04-14 | Task 3.2 — Web MIDI integration | completed | Browser client with Web MIDI API sender/receiver, exponential backoff reconnection, connection state tracking, activity logging. 0 tests (integration tests verify). |

## Phase 4: Node.js Client Examples

| Timestamp  | Task                       | Status    | Summary                                                                                                                                                     |
| ---------- | -------------------------- | --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-04-14 | Task 4.1 — Node.js clients | completed | sender.js and receiver.js clients for headless/automation use cases. Include reconnection logic, graceful shutdown. Placeholder for midi library selection. |

## Phase 5: Integration Tests

| Timestamp  | Task                         | Status    | Summary                                                                                                    |
| ---------- | ---------------------------- | --------- | ---------------------------------------------------------------------------------------------------------- |
| 2026-04-14 | Task 5.1 — Integration tests | completed | End-to-end test: create relay, start mock sender/receiver, verify MIDI bytes pass through. 1 test passing. |

## Phase 6: Deployment Configuration

| Timestamp  | Task                           | Status    | Summary                                                                                                                                      |
| ---------- | ------------------------------ | --------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-04-14 | Task 6.1 — Systemd service     | completed | midi-relay.service with hardening (NoNewPrivileges, ProtectSystem strict), restart on failure. Configured for /opt/midi-relay.               |
| 2026-04-14 | Task 6.2 — Nginx reverse proxy | completed | nginx-site.conf with TLS termination, WebSocket upgrade headers, long timeouts, health check routing. Domain placeholder: relay.example.com. |
| 2026-04-14 | Task 6.3 — Deployment guide    | completed | Step-by-step VPS setup: create user, clone repo, install deps, configure env, systemd, certbot. Covers prerequisites and all steps.          |

## Phase 7: Documentation

| Timestamp  | Task                             | Status    | Summary                                                                                                                                           |
| ---------- | -------------------------------- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-04-14 | Task 7.1 — Wire protocol doc     | completed | Complete protocol spec: text/binary frames, control messages (join, joined, error, ping, pong, room-update), connection lifecycle, examples.      |
| 2026-04-14 | Task 7.2 — Client guide          | completed | Browser client user guide: requirements, connection steps, device selection, reconnection handling, troubleshooting. Written for Speakers Corner. |
| 2026-04-14 | Task 7.3 — Troubleshooting guide | completed | Common issues: connection refused, MIDI device not found, firewall blocks, reconnection loops, latency measurement. Diagnostic steps.             |

---

## Project Summary — 2026-04-14 17:00 UTC

**Overall Status:** Alpha complete. Core relay, both client types, integration tests, and deployment configuration all implemented and tested.

**What Works:**

- Server: WebSocket relay with room-based routing, binary MIDI forwarding, graceful shutdown
- Browser client: Web MIDI API sender/receiver, auto-reconnect with exponential backoff, real-time activity logging
- Node.js clients: Minimal headless sender/receiver for automation and testing
- Integration tests: Full end-to-end MIDI relay verified
- Deployment: Systemd service + Nginx reverse proxy configured for TLS/WSS, with deployment guide
- Documentation: Complete protocol spec, client guide, and troubleshooting

**Test Results:** All 44 tests passing (protocol, room, relay, health, integration suites)

**Recent Commits:** 10 new commits since initial scaffolding:

- feat: core relay logic (protocol, room, relay classes)
- feat: server entry point + health endpoint
- feat: browser client (HTML, CSS, Web MIDI integration)
- feat: Node.js sender/receiver clients
- test: integration tests
- deploy: systemd service + Nginx config
- docs: protocol, client guide, troubleshooting, deploy guide

**Next Steps (not yet started):**

1. Browser client HTML/CSS polish (currently functional, not production-ready styling)
2. Node MIDI library integration (sender/receiver currently placeholders)
3. Load testing and latency profiling
4. Client reconnection edge cases (partial send/receive during disconnect)
5. Production deployment and monitoring
6. User acceptance testing with Speakers Corner

**Known Limitations (v0.1):**

- No authentication/rate limiting (room codes provide basic access control)
- No persistent state or message history
- MIDI library selection for Node clients not finalised (easymidi vs midi vs jzz)
- Browser client UI not polished
- No Docker support (systemd only)
- Health endpoint is HTTP only (not authenticated)

**Files Changed in Recent Session:**

- WORKLOG.md: appended comprehensive status
- README.md: updated to reflect full project state, added deployment and status sections
- .claude/agent-memory/decision-logger/MEMORY.md: created project memory for future sessions
- test/integration.test.js: added resilience and reconnection edge case tests

---

## 2026-04-14T17:15:00Z — Task 7.4: Additional resilience tests

**Status:** completed

**Summary:** Added two new integration tests covering edge cases: unclean receiver disconnect with reconnection, and sender reconnection after dropping. Both tests verify the relay correctly handles client churn and room rejoin operations.

**Files Changed:** test/integration.test.js

**Decision:** Added these tests to validate client reconnection behaviour under real conditions (socket terminate, not clean close). Tests use existing connectClient/drainTextMessages helpers for consistency.

**Test Results:** 48 tests passing (up from 44)

---

## Phase 1 (continued)

| Timestamp | Task | Status | Summary |
|-----------|------|--------|---------|
| 2026-04-14 | Task 1.4 — Health check | completed | HTTP handler returning JSON status with uptime, rooms, connections. 3 tests. |
| 2026-04-14 | Task 1.5 — Server entry point | completed | startServer() factory with config, WS ping/pong, graceful shutdown. Verified manually. |
| 2026-04-14 | Task 1.6 — Integration tests | completed | 6 end-to-end tests: binary relay, SysEx, multi-sender, reconnect, room isolation, health. |

## Phase 2: Client Implementations

| Timestamp | Task | Status | Summary |
|-----------|------|--------|---------|
| 2026-04-14 | Task 2.1 — Browser HTML/CSS | completed | Dark theme, monospace, accessible UI with connection config, MIDI device select, status, log. |
| 2026-04-14 | Task 2.2 — Browser JavaScript | completed | MidiRelayClient class with Web MIDI API binding, reconnection (exp backoff 1s→30s). |
| 2026-04-14 | Task 2.3+2.4 — Node clients | completed | Sender and receiver CLI scripts with ws, parseArgs, optional easymidi, reconnection. |

## Phase 3: Deployment

| Timestamp | Task | Status | Summary |
|-----------|------|--------|---------|
| 2026-04-14 | Task 3.1 — Systemd service | completed | Unit file with security hardening, env file, auto-restart. |
| 2026-04-14 | Task 3.2 — Nginx config | completed | WSS reverse proxy with upgrade headers, 86400s timeouts. |
| 2026-04-14 | Task 3.3 — Deploy guide | completed | Step-by-step VPS setup: clone, install, systemd, Nginx, certbot. |

## Phase 4: Documentation

| Timestamp | Task | Status | Summary |
|-----------|------|--------|---------|
| 2026-04-14 | Task 4.1 — Client guide | completed | Non-technical walkthrough for browser + Node.js clients. |
| 2026-04-14 | Task 4.2 — Protocol spec | completed | Full wire protocol with all message types, fields, examples. |
| 2026-04-14 | Task 4.3 — Troubleshooting | completed | Common failures and diagnostic steps for connection, MIDI, server. |
| 2026-04-14 | Task 4.4 — README | completed | Architecture diagram, quick start, env vars, links to docs. |

## Phase 5: Hardening & Polish

| Timestamp | Task | Status | Summary |
|-----------|------|--------|---------|
| 2026-04-14 | Task 5.1 — Latency measurement | completed | Integration test: avg 0.33ms, max 0.48ms on localhost. App-level ping/pong verified. |
| 2026-04-14 | Task 5.2 — Resilience audit | completed | Added tests for unclean disconnect, sender rejoin, room recovery. |
| 2026-04-14 | Task 5.3 — Edge cases | completed | Tests for receiver binary (ignored), invalid JSON, rapid connect/disconnect, empty room. |
| 2026-04-14 | Task 5.4 — Final cleanup | completed | Migrated to ESLint flat config, Prettier on all files, 52 tests passing, 0 lint errors. |

## Summary

All 21 tasks across 5 phases completed. 52 tests passing. Zero lint errors. Project ready for alpha testing.

---

## Phase 6: Production Deployment Planning

| Timestamp | Task | Status | Summary |
|-----------|------|--------|---------|
| 2026-04-14 | Deployment environment discovery | completed | Confirmed Krystal.io VPS setup: PM2 manages Node on host, nginx runs as Docker container, routing via host IP/port. |
| 2026-04-14 | Docker support added | completed | Added Dockerfile (node:20-alpine) and docker-compose.service.yml for teams using Docker. Not used in production. |
| 2026-04-14 | nginx-location.conf added | completed | Created deploy/nginx-location.conf — minimal location blocks to drop into existing nginx container config. |
| 2026-04-14 | WORKFLOW.md updated | completed | Marked all phases 0–5 complete, added Phase 6 checklist for actual production deployment steps. |
| 2026-04-14 | deploy-guide.md rewritten | completed | Rewritten for PM2 + Docker nginx setup. Systemd and Docker alternatives kept as reference sections. |

**Decision note:** Skipping Docker for the relay itself — host PM2 is simpler and consistent with the existing app on the VPS. Docker is provided as an optional alternative for other environments.

## Phase 7: Arduino Integration

| Timestamp | Task | Status | Summary |
|-----------|------|--------|---------|
| 2026-04-14 | Task 7.1 — Arduino receiver bridge | completed | arduino-receiver.js with serialport auto-detect, reconnection, --list/--port/--baud flags. |
| 2026-04-14 | Task 7.2 — Operations guide updated | completed | Added Arduino section to operations-guide.md with usage examples and Arduino sketch snippet. |

---

## 2026-04-14T — Update deploy guide for actual nginx-proxy setup

**Status:** completed

**Summary:** Rewrote deploy/deploy-guide.md to document the real Krystal.io setup — nginxproxy/nginx-proxy + acme-companion containers, midi-relay-web nginx container with VIRTUAL_HOST env var, host.docker.internal routing to PM2, exact file paths (/srv/reverse-proxy/, /home/yewen/midi-relay/)

**Commit:** `fd8da4a`

**Notes:** Deployment guide now matches the actual production environment: Docker nginx-proxy handles TLS termination, relay runs via PM2 on the host, routing via host.docker.internal:3500. All file paths, environment variables, and setup steps reflect the live Krystal.io configuration.

---

## 2026-04-14T — Fix PM2 isMain detection

**Status:** completed

**Summary:** PM2 mangles process.argv[1], breaking the isMain entry point check. Replaced fragile path comparison with test-runner detection (auto-start unless NODE_TEST_CONTEXT or --test flag present). Also added PM2_HOME/pm_id env check as fallback.

**Commit:** `0c54302`

**Notes:** The real root cause of "PM2 shows online but empty logs and no port" — startServer() was never called.

---

## 2026-04-14T — Switch to full Docker deployment (Option A)

**Status:** completed

**Summary:** Abandoned PM2 + middleman nginx container approach due to Docker-to-host firewall issues (ufw blocking bridge traffic). Relay now runs as a Docker container on the proxy network with VIRTUAL_HOST/VIRTUAL_PORT. Server serves browser client static files directly. No PM2, no host networking, no firewall changes needed.

**Commit:** `df7de9e`

**Notes:** HOST must be 0.0.0.0 (not 127.0.0.1) since nginx-proxy connects within the Docker network. Added static file serving to health.js. VIRTUAL_PORT: 3500 required since nginx-proxy defaults to port 80.

---

## 2026-04-14T — Rewrite all deployment documentation

**Status:** completed

**Summary:** Rewrote deploy-guide.md, operations-guide.md, and README.md to remove all PM2/host.docker.internal/middleman container references. All docs now describe the Docker-only setup matching the actual production architecture.

**Commit:** `4749f12`

---

## 2026-04-14T20:30:00Z — Update all project docs for Docker deployment and production domain

**Status:** completed

**Summary:** Updated README.md, CLAUDE.md, WORKFLOW.md, default browser client URL, and redeploy script. All references now use midi.datadadaist.space, Docker deployment (not PM2/systemd), and reflect actual project structure. WORKFLOW checklist updated to mark Phases 6 and 7 as complete.

**Commit:** dccc321

**Notes:** Browser client default URL changed from wss://relay.example.com/midi to wss://midi.datadadaist.space/midi. Redeploy script added at deploy/redeploy-midi.sh for quick VPS updates (git pull + docker compose rebuild).
