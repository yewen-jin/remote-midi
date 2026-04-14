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
