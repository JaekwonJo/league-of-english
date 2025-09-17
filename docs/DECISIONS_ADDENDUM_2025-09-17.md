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
34) Auth Event Logging
- Added `auth_logs` table plus `auditLogService` to capture register/login events (user id, IP, UA, metadata).
- Auth routes now call logger after successful register/login so analytics can track usage.

35) PDF Parser Marker Segmentation
- Rebuilt `newPdfParser` to segment passages via `N. pX-no.Y(~Z)` markers with ordered fallback.
- Merges short textbook lines and keeps `Unknown N` placeholders when a passage/source is missing.

36) Render Starter Defaults
- Updated `render.yaml` to plan starter + `/var/data` disk so persistence is default.
- Deployment playbook refreshed to highlight Starter flow first.
37) CSAT Normalizer Coverage
- Problem: order/insertion problems lost their options during normalizeAll so Study API returned 0 items.
- Decision: map multipleChoices, sentences, givenSentence -> options/metadata and add fallback prompts for deterministic question text.
- Impact: order/insertion survive normalization; CSAT set route returns balanced mix again.

38) Study API Client Fix
- Problem: StudyPage called pi.post which is undefined after refactor to export nested api categories.
- Decision: import default piService and call piService.post('/generate/csat-set', ...).
- Impact: front-end can start study sessions without TypeError.
