# ADR Addendum — 2025-09-18

39) Local Dev Execution Path
- Problem: `npm run dev:all` fails under WSL because Node and nodemon are missing from the Linux toolchain.
- Decision: Keep running the combined dev command from Windows PowerShell until Node LTS is installed in WSL, and document the limitation.
- Impact: Guarantees React (3000) and Express (5000) boot so the login page loads again.

40) Port 5000 Contention Guard
- Problem: Express crashed with `EADDRINUSE` when a lingering Windows Node process already bound port 5000.
- Decision: Document a quick check (`netstat -ano | findstr 5000` / `Stop-Process`) and plan an automated port guard in TODO.
- Impact: Prevents repeat crashes during restarts and keeps `/api` reachable.

41) Doc-First Stabilization
- Problem: Missing runbook meant the same environment question kept coming up.
- Decision: Update README, TODO, session log, and memory sync together whenever environment work happens.
- Impact: Everyone can follow the same instructions without re-debugging.
