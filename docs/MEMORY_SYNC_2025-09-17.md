# Memory Sync ??2025-09-17

- Render deploy fixed by syncing `package-lock.json` with `package.json` (sqlite3 �� sql.js).
- Added `server/utils/grammarSpanGenerator.js`; routes now include `choices` in `grammar_span` payloads.
- Removed unicode fallback for choices to prevent parse errors.
- Added `auth_logs` table + logging service so register/login events persist with metadata (IP, UA, role).
- Rebuilt `newPdfParser` with marker-first segmentation; passages map to markers sequentially and merge short lines.
- Deployment defaults now assume Render Starter plan (`render.yaml` uses `/var/data/loe.db`) and docs were refreshed.
- Normalizer now preserves order/insertion fields; StudyPage uses apiService.post so CSAT set returns arrange/insert problems again.
- Vercel production build uses Render API (`REACT_APP_API_URL`), deployment verified.

Next
- Smoke-test production order/insertion flow with 새 계정.
- Wire auth log analytics dashboard or daily summary query.
