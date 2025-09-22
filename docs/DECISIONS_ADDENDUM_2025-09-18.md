# ADR Addendum 2025-09-18

39) Local Dev Execution Path
- Problem: The alternative Linux toolchain was missing Node and nodemon, so the combined dev command failed.
- Decision: Standardize on the Windows PowerShell `npm run dev:all` workflow and remove the unused Linux instructions from the docs.
- Impact: Guarantees React (3000) and Express (5000) boot so the login page loads again without environment drift.

40) Port 5000 Contention Guard
- Problem: Express crashed with `EADDRINUSE` when a lingering Windows Node process already bound port 5000.
- Decision: Document a quick check (`netstat -ano | findstr 5000` / `Stop-Process`) and plan an automated port guard in TODO.
- Impact: Prevents repeat crashes during restarts and keeps `/api` reachable.

41) Doc-First Stabilization
- Problem: Missing runbook meant the same environment question kept coming up.
- Decision: Update README, TODO, session log, and memory sync together whenever environment work happens.
- Impact: Everyone can follow the same instructions without re-debugging.
