# Memory Sync — 2025-09-17

- Render deploy fixed by syncing `package-lock.json` with `package.json` (sqlite3 → sql.js).
- Added `server/utils/grammarSpanGenerator.js`; routes now include `choices` in `grammar_span` payloads.
- Removed unicode fallback for choices to prevent parse errors.
- Recommended Vercel settings reiterated: Root=`client`, Build=`npm run build`, Output=`build`; `REACT_APP_API_URL` → Render `/api`.

Next
- Switch Render to Starter + Disk; set `DB_FILE=/var/data/loe.db` for persistence.
- Redeploy client on Vercel with latest commit and env.
