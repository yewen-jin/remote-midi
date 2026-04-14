# Claude Code Launch Prompt

Paste the following into Claude Code to begin. It assumes CLAUDE.md and WORKFLOW.md
are already in the project directory.

---

## Initial Prompt (paste this)

```
I'm building a real-time MIDI relay server for Speakers Corner, an arts organisation
that controls robotic installations remotely. Read CLAUDE.md for full project context
and WORKFLOW.md for the step-by-step execution plan.

Work through the WORKFLOW.md phases in order. For each task:

1. Execute the task as described
2. Run any tests to verify it works
3. Use a subagent (Haiku) to append a log entry to WORKLOG.md with:
   - ISO timestamp
   - Task name and number
   - Status (completed/blocked/partial)
   - One-line summary
   - Commit message
   - Any notes or decisions made
4. Make an atomic git commit with a conventional commit message
5. Move to the next task

Start with Phase 0, Task 0.1. After each task, tell me what you did and
what's next. If anything is unclear or you need a decision, stop and ask.

Do NOT batch multiple tasks into one commit. One task = one commit.
Do NOT skip tests. Every feature gets tested before committing.
Do NOT add dependencies beyond what CLAUDE.md specifies without asking first.

Begin.
```

---

## Resumption Prompts

If you need to resume after a break, use:

```
Read CLAUDE.md, WORKFLOW.md, and WORKLOG.md. The worklog shows what's been completed.
Pick up from the next incomplete task and continue the same pattern:
execute → test → log → commit → next.
```

---

## Subagent Prompt Templates

### For spawning task subagents:

```
Subagent task: [Paste the task block from WORKFLOW.md]

Context: Read CLAUDE.md for project standards. When complete:
1. Run tests if applicable
2. Append a log entry to WORKLOG.md (use Haiku)
3. Stage and commit with the specified commit message
```

### For the Haiku logger:

```
Append the following entry to WORKLOG.md:

## [current ISO timestamp] — Task [N.N]: [Task Name]
**Status:** [completed|blocked|partial]
**Summary:** [One line describing what was done]
**Commit:** `[commit message]`
**Notes:** [Any decisions, gotchas, or things to revisit. "None" if clean.]
```

---

## Mid-Project Check-In Prompts

### Latency sanity check (run after Phase 1):
```
Run the integration tests and measure the time between sending a binary frame
from the mock sender and receiving it at the mock receiver. Report the
relay-added latency in milliseconds. Our target is sub-50ms. If it's higher,
investigate why before moving to Phase 2.
```

### Reconnection stress test (run after Phase 2):
```
Write a quick stress test: connect 5 senders and 5 receivers to the same room.
Have each sender blast MIDI clock messages (0xF8) at 120 BPM rate (24 ppqn =
48 messages/second per sender). Verify all receivers get all messages from all
senders. Then kill one sender's connection and verify it reconnects and resumes.
Report any dropped messages.
```

### Pre-deployment review (run after Phase 4):
```
Do a final review before deployment hardening:
1. Run all tests — report results
2. Check for any TODO comments in the code
3. Verify all environment variables have defaults
4. Confirm the health endpoint works
5. List all npm dependencies and their purposes
6. Flag any concerns about production readiness
```
