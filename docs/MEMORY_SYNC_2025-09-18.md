# Memory Sync — 2025-09-18

- Verified `http://localhost:3000` returns 200 once `npm run dev:all` runs from Windows PowerShell.
- Logged why WSL currently fails (no Node/nodemon) and captured the workaround in README/TODO.
- Cleared the lingering Node PID on port 5000 to stop the `EADDRINUSE` crash loop.
- Created fresh ADR/session/TODO updates so the troubleshooting steps stay discoverable.

Next
- Install Node 20 inside WSL (via nvm or NodeSource) and repeat the dev start.
- Automate port 3000/5000 checks before booting the stack.
- Return to PDF parser Phase 2 after the environment guardrails land.
