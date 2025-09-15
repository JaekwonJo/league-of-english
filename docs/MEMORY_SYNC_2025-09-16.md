# Memory Sync 2025-09-16

- Deploy target: Render (server), Vercel (client)
- DB layer: sql.js (pure JS) instead of sqlite3 native
- Env: DB_FILE=/tmp/loe.db (free), OPENAI_API_KEY, JWT_SECRET, NODE_VERSION=20
- Routes: /api/generate/csat-set, /api/problems/submit, /api/problems/report
- CORS: dynamic via CORS_ORIGIN or * (dev)
- Next steps: Vercel env REACT_APP_API_URL set; optional persistent disk; compact UI
