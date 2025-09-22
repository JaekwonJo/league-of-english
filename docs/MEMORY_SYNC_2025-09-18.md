# Memory Sync 2025-09-18

- Verified `http://localhost:3000` returns 200 once `npm run dev:all` runs from Windows PowerShell.
- Removed the unused Linux setup notes and captured the PowerShell-only workflow in README/TODO.
- Cleared the lingering Node PID on port 5000 to stop the `EADDRINUSE` crash loop.
- Created fresh ADR/session/TODO updates so the troubleshooting steps stay discoverable.
- If port 5000 keeps refusing connections, the backend likely is not running or a Windows Node process is still holding the port; inspect and clear it.

Next
- Add an automated port 3000/5000 check before booting the stack.
- Provide a PowerShell helper for the check so the workflow stays one-command.
- Return to PDF parser Phase 2 after the environment guardrails land.
