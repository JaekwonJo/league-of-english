# PROJECT_STATE.md

## What we're building
- League of English React SPA (problem authoring, solving, analysis, teacher/admin tools)

## Stack & Commands
- Node 20 / Express / React 19 / CRA / lucide-react
- SQL.js (file-backed) presently; PostgreSQL migration planned
- Render (API) + Vercel (Web) deployment targets
- Scripts: dev / client / build / lint / deploy helpers
- Run: 
pm run dev:all from the repository root (preferred) or start 
pm run dev + 
pm run client separately.

## Decisions (key)
- API base URL comes from client/.env REACT_APP_API_URL (defaults to http://localhost:5000/api).
- Auth API: /api/auth/login, /api/auth/register store tokens and profile info in localStorage.
- Grammar generators now ship single-answer (grammar) and multi-answer (grammar_multi) items with cached <u>...</u> spans so the study app can underline targets reliably.
- Problem manuals stay in sync via 
ode scripts/update-problem-manuals.js; AI prompts always reference the latest guidance PDFs.
- Sentence-insertion generator outputs full passages with circled markers (①~⑤) and balanced choice windows (2025-09-22).
- Deployment pairs Render (server) + Vercel (client); environment variables (API URL, OpenAI key, JWT secret) are stored per platform.

## Current Stage
- Feature-complete MVP: authentication, AI 문제 생성, 학습 루프, 랭킹/티어, 관리자 콘솔, 분석/업로드, Render·Vercel 배포까지 연결됨. 남은 일은 고급 통계, 멤버십 업그레이드, 파일 포맷 확장 등 마감 전 polish 영역.

## Next 3 (priority)
1) (P1) 구현되지 않은 멤버십 업그레이드/쿠폰 흐름과 Premium 기능 토글을 완성하고 QA.
2) (P1) 학습 통계 대시보드(유형별 정답률, 주간 그래프, 취약 유형)를 API + UI로 연결.
3) (P2) 문서 업로드 포맷(DOCX/CSV) 확장 및 Smoke 테스트 자동화로 배포 전 안정화.

## Roadmap (high level)
1. Automate problem generation from PDFs/manuals with deterministic QA steps.
2. Build complete study loop: author → practise → scoring → review/analysis.
3. Persist attempts and analytics (Supabase/PostgreSQL + API contracts).
4. Stand up tier/ranking service, UX, and notification hooks.
5. Layer in AI explainers/analysis tooling for teachers and students.
6. Production ops: Render (backend) + Vercel (frontend) + Supabase (DB) CI/CD, monitoring, incident playbooks.

## Known issues
- ESLint config is still missing; 
pm run lint fails. Need a shared config (or update scripts) before enforcing linting in CI.
- Manual QA for insertion problems is still pending (screenshots + acceptance); same needs to happen for the new grammar multi-select flow.
- Automated regression coverage for generators remains thin; failures depend on console smoke tests.
- 멤버십 업그레이드/결제·쿠폰 UI가 미구현 상태이며, 단어 시험/통계 화면은 placeholder.

## Resolved (recent)
- 2025-09-24: README에 전체 로드맵 표 추가, PROJECT_STATE/BUILDLOG를 최신 상태로 동기화하여 진행 상황을 명확히 공유.
- 2025-09-23: Implemented grammar-basic/multi API caching, added /generate/grammar, and upgraded the study UI with multi-answer support and answer normalization.
- 2025-09-22: Refactored InsertionProblemGenerator2 so passages remain intact and markers render as circled numerals with balanced windows.
- Introduced scripts/update-problem-manuals.js so manuals stay in lockstep with the source PDFs.
- Synced README/BUILDLOG/PROJECT_STATE to document the refresh workflow for future contributors.
- Earlier fixes (PowerShell dev loop + grammar-span UI alignment) remain stable after today’s changes.
