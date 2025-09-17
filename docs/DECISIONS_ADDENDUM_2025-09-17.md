# ADR Addendum — 2025-09-17

31) Render Build Determinism (lock sync)
- Problem: `npm ci` failed on Render because `package.json` and `package-lock.json` diverged (sqlite3 vs sql.js).
- Decision: Always sync lock before deploy; committed updated lock after moving to `sql.js`.
- Impact: `npm ci --omit=dev` works reliably on Render.

32) Grammar Span Generator (server util)
- Added `server/utils/grammarSpanGenerator.js` to generate 5-choice span-based grammar items from a passage.
- Routes now include `choices` (underlined snippet strings) in `grammar_span` payloads.
- Removed fragile unicode fallback in routes (circled digits) to avoid parse errors on some environments.

33) Vercel Settings (client)
- Recommended: Root Directory=`client`, Build=`npm run build`, Output=`build`.
- Env: `REACT_APP_API_URL` points to Render server `/api`.

Rationale
- Prevent recurring deploy failures due to lock drift or unicode token issues.
- Ensure grammar items render consistently in UI.

Impact
- Server deploy succeeds on Render Free/Starter.
- Client consumes `choices` safely; no reliance on unicode glyphs.
