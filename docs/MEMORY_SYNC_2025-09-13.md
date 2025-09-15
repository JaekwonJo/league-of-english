# Memory Sync — 2025-09-13

Core Guarantees
- API-only for CSAT MCQ: title/theme(topic)/summary/blank/vocabulary/irrelevant/implicit.
- Client always calls POST /api/generate/csat-set; server returns 503 on AI unavailability/undersupply.
- Grammar uses grammar_span with 5 underlined spans; client renders ①②③④⑤.

Where Things Live
- Prompts: PROBLEM_PROMPTS_*.md (project root) + docs/SPECS/* feed aiProblemService2.
- Result FX: client/src/components/study/StudyResult.js, client/src/index.css.
- Tier HUD: client/src/components/study/ScoreHUD.js (+ index.css classes .tier-*).
- Analysis UI: client/src/pages/AnalysisPage.js, client/src/styles/analysisStyles.js.
- Server routes: server/routes/problem.routes.js (API-only checks, 503 rules).
 - Admin vocab: server/routes/vocab.routes.js (admin-only; requireAdmin).

Operational Tips
- On generation 503: advise retry; no fallback is intentional for quality.
- To tweak type behavior: edit the corresponding PROBLEM_PROMPTS_*.md, then regenerate.
 - If 404 on /generate/csat-set: ensure server restarted; router export must be after route definitions.
 - If ports busy: free 3000/5000 or use client:alt (PORT=3001).

Known Items
- Some legacy Korean strings fixed today; add pre-commit scan to prevent regressions.

KR UI Cleanup (2025-09-13)
- AdminPage header/buttons/categories normalized; default categories: [수능, 내신, 모의고사, 기출문제, 기타].
- UploadModal/CategoryModal/EditModal/DocumentList texts revised.
- StudyPage loading/error/back texts revised; 404/503/401 messages mapped.

KR UI Cleanup (2025-09-13)
- AdminPage header/buttons/categories normalized via i18n
- Upload/Category/Edit/DocumentList texts revised
- StudyPage loading/error/back texts revised; 404/503/401 messages mapped
- Evidence UX: results show evidenceLines + toggle highlight

Operational Tips (updated)
- If 404 on /generate/csat-set: restart server; ensure route export order
- If ports busy: free 3000/5000 or run client:alt (3001)
- On Windows console mojibake: use UTF-8 codepage or set LOE_ASCII_LOG=1
