# PROJECT_STATE.md

## What we're building
- League of English React SPA (problem authoring, solving, analysis, teacher/admin tools)

## Stack & Commands
- Node 20 / Express / React 19 / CRA / lucide-react
- Scripts: dev / client / build / lint
- Run: `npm run dev:all` from the repository root (preferred) or start `npm run dev` + `npm run client` separately.

## Decisions (key)
- API base URL comes from `client/.env` `REACT_APP_API_URL` (defaults to `http://localhost:5000/api`).
- Auth API: `/api/auth/login`, `/api/auth/register` store tokens and profile info in `localStorage`.
- Grammar generators now ship single-answer (`grammar`) and multi-answer (`grammar_multi`) items with cached `<u>...</u>` spans so the study app can underline targets reliably.
- Problem manuals stay in sync via `node scripts/update-problem-manuals.js`; AI prompts always reference the latest guidance PDFs.
- Sentence-insertion generator outputs full passages with circled markers (①~⑤) and balanced choice windows (2025-09-22).

## Current Stage
- Core pipelines (PDF → manuals → API) are aligned; we just wired grammar basic/advanced items into caching and the study UI. Next focus: broaden the other AI question types and connect scoring/analytics.

## Next 3 (priority)
1) (P1) QA grammar-basic/advanced flows end-to-end (API cache → study UI multi-select) and capture regression scenarios for automated tests.
2) (P1) Port the remaining AI question types (blank/vocab/summary/title/theme) onto the same cached-problem contract so the study loop is consistent.
3) (P1) Draft the scoring & ranking schema/API so attempt storage, tier updates, and leaderboard math can move forward.

## Roadmap (high level)
1. Automate problem generation from PDFs/manuals with deterministic QA steps.
2. Build complete study loop: author → practise → scoring → review/analysis.
3. Persist attempts and analytics (Supabase/PostgreSQL + API contracts).
4. Stand up tier/ranking service, UX, and notification hooks.
5. Layer in AI explainers/analysis tooling for teachers and students.
6. Production ops: Render (backend) + Vercel (frontend) + Supabase (DB) CI/CD, monitoring, incident playbooks.

## Known issues
- ESLint config is still missing; `npm run lint` fails. Need a shared config (or update scripts) before enforcing linting in CI.
- Manual QA for insertion problems is still pending (screenshots + acceptance); same needs to happen for the new grammar multi-select flow.
- Automated regression coverage for generators remains thin; failures depend on console smoke tests.
- Scoring persistence & ranking APIs are blocked until the contract in "Next 3" is drafted.

## Resolved (recent)
- 2025-09-22: Refactored `InsertionProblemGenerator2` so passages remain intact and markers render as circled numerals with balanced windows.
- Introduced `scripts/update-problem-manuals.js` so manuals stay in lockstep with the source PDFs.
- Synced README/BUILDLOG/PROJECT_STATE to document the refresh workflow for future contributors.
- 2025-09-23: Implemented grammar-basic/multi API caching, added `/generate/grammar`, and upgraded the study UI with multi-answer support and answer normalization.
- Earlier fixes (PowerShell dev loop + grammar-span UI alignment) remain stable after today’s changes.
