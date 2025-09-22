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
- Grammar span problems return both `<u>...</u>` markup and `choices/options` arrays.
- PDF → manual refresh is standardised through `node scripts/update-problem-manuals.js` so the AI always reads the latest writer guidance.
- Sentence-insertion generator outputs full passages with circled markers (①~⑤) and balanced choice windows (2025-09-22).

## Current Stage
- Core content pipelines are aligned (manual sync + insertion generator). Focus now is wiring complete study flow: generation → practise → scoring → analytics.

## Next 3 (priority)
1) (P1) End-to-end smoke test of circled-marker insertion problems in teacher preview & study UI, capturing screenshots for sign-off (ensures new format renders correctly).
2) (P1) Draft the scoring + ranking contract (API + DB schema) so student attempts can be persisted and tier logic designed before UI wiring.
3) (P2) Document contributor FAQ covering manual sync, problem generation scripts, and new insertion behaviour to reduce onboarding overhead.

## Roadmap (high level)
1. 문제 저작 자동화: PDF 업로드 → 문제 자동 생성 파이프라인 고도화 및 테스트 자동화.
2. 학습/풀이 경험: 학생 대시보드, 타이머, 즉시 채점, 오답/리뷰 흐름 구축.
3. 점수 저장 및 분석: Supabase/PostgreSQL 기반 점수 저장, API 설계, 개인·학급 통계 페이지 구축.
4. 랭크/티어 시스템: 시즌별 Elo/구간 설계, 프로필/랭킹 페이지(UX, 아이콘, 보상) 구현.
5. 분석본 & 학습 가이드: 문항별 AI 해설/리뷰 제공, 교사용 분석 리포트 자동 생성.
6. 운영 및 배포: Render(backend) + Vercel(frontend) + Supabase(DB) CI/CD 파이프라인 구성, 모니터링/알림 세팅.

## Known issues
- Full end-to-end verification of the new insertion output in the React UI is still pending (needs manual QA and snapshots).
- Scoring persistence & ranking DB schema not implemented yet; API contracts must be defined before wiring Study flow.
- Automated tests around problem generators and manual sync are minimal; regression risk remains high until coverage improves.

## Resolved (recent)
- 2025-09-22: Refactored `InsertionProblemGenerator2` so passages remain intact and markers render as circled numerals with balanced windows.
- Introduced `scripts/update-problem-manuals.js` so manuals stay in lockstep with the source PDFs.
- Synced README/BUILDLOG/PROJECT_STATE to document the refresh workflow for future contributors.
- Earlier fixes (PowerShell dev loop + grammar_span UI alignment) remain stable after today’s changes.
