# PROJECT_STATE.md

## What we're building
- League of English React SPA (problem authoring, solving, analytics, teacher/admin tools)

## Stack & Commands
- Node 20 / Express / React 19 / CRA / lucide-react
- SQL.js (file-backed) today; PostgreSQL migration planned
- Render (API) + Vercel (web) deployment targets
- Scripts: dev / client / build / lint / deploy helpers
- Run: `npm run dev:all` from the repository root (preferred) or `npm run dev` (API) + `npm run client` (web) separately

## Decisions (key)
- API base URL comes from `client/.env` (`REACT_APP_API_URL`, default `http://localhost:5000/api`).
- Auth API (`/api/auth/login`, `/api/auth/register`) stores tokens + profile data in `localStorage`.
- Grammar generators ship both single-answer (`grammar`) and multi-answer (`grammar_multi`) problems with cached `<u>...</u>` spans so the study UI can underline targets.
- Problem manuals stay in sync via `node scripts/update-problem-manuals.js`; AI prompts always reference the latest guidance PDFs.
- Sentence-insertion generator outputs full passages with circled markers (①~⑤) and balanced choice windows (2025-09-22).
- Render (server) + Vercel (client) are paired deployments; secrets (API URL, OpenAI key, JWT secret) live per platform.

## Current Stage
- Feature-complete MVP now ships membership coupon upgrades plus teacher class analytics (filters + CSV export); remaining P1 focus areas are admin coupon tooling and document ingestion hardening.

## Next 3 (priority)
1) (P1) Harden membership operations with an admin coupon issuance/monitoring UI and expiry alerts.
2) (P1) Layer school-level breakdowns and lightweight charts into the teacher analytics dashboard.
3) (P2) Extend admin document uploads to DOCX/CSV and automate smoke checks.

## Roadmap (high level)
1. Automate problem generation from PDFs/manuals with deterministic QA steps.
2. Build complete study loop: author → practise → scoring → review/analysis.
3. Persist attempts and analytics (Supabase/PostgreSQL + API contracts).
4. Stand up tier/ranking service, UX, and notification hooks.
5. Layer in AI explainers/analysis tooling for teachers and students.
6. Production ops: Render (backend) + Vercel (frontend) + Supabase (DB) CI/CD, monitoring, incident playbooks.

## Known issues
- ESLint config is still missing; `npm run lint` fails. Need a shared config (or updated scripts) before enforcing linting in CI.
- Manual QA for insertion problems is still pending (screenshots + acceptance); same required for the new grammar multi-select flow.
- Automated regression coverage for generators remains thin; failures rely on console smoke tests.
- Membership coupons are only redeemable via the profile; no admin issuance/monitoring dashboard exists yet.
- Teacher analytics still needs school-level breakdowns, simple charts, and a QA checklist before production launch.

## Resolved (recent)
- 2025-09-24: Delivered `/api/teacher/analytics/overview`, `students/:id`, and `export` so 교사 계정이 기간/학년/멤버십별 통계를 확인하고 CSV로 내려받을 수 있게 되었어요. React 프로필에 새 반 대시보드를 붙여서 필터·학생별 상세(최근 시도, 유형별 정확도)를 한 화면에서 바로 확인할 수 있습니다.
- 2025-09-24: Added membership coupon upgrade API and connected the profile UI (coupon redemption + status).
- 2025-09-24: Added teacher class-code flow (code issuance, student join, daily limit enforcement for free members).
- 2025-09-24: Added `/api/problems/stats` aggregation and connected the React Stats dashboard (type accuracy + 7-day chart).
- 2025-09-24: README/PROJECT_STATE/BUILDLOG synced with refreshed roadmap and status tracking.
- 2025-09-23: Implemented grammar-basic/multi API caching, added `/generate/grammar`, and upgraded the study UI with multi-answer support and answer normalization.
- 2025-09-22: Refactored `InsertionProblemGenerator2` so passages remain intact and markers render as circled numerals with balanced windows.
- Introduced `scripts/update-problem-manuals.js` so manuals stay in lockstep with the source PDFs.
- Earlier fixes (PowerShell dev loop + grammar-span UI alignment) remain stable after today’s changes.


