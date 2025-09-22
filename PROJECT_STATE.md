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
- PDF �� manual refresh is standardised through `node scripts/update-problem-manuals.js` so the AI always reads the latest writer guidance.
- Sentence-insertion generator outputs full passages with circled markers (��~��) and balanced choice windows (2025-09-22).

## Current Stage
- Core content pipelines are aligned (manual sync + insertion generator). Focus now is wiring complete study flow: generation �� practise �� scoring �� analytics.

## Next 3 (priority)
1) (P1) End-to-end smoke test of circled-marker insertion problems in teacher preview & study UI, capturing screenshots for sign-off (ensures new format renders correctly).
2) (P1) Draft the scoring + ranking contract (API + DB schema) so student attempts can be persisted and tier logic designed before UI wiring.
3) (P2) Document contributor FAQ covering manual sync, problem generation scripts, and new insertion behaviour to reduce onboarding overhead.

## Roadmap (high level)
1. ���� ���� �ڵ�ȭ: PDF ���ε� �� ���� �ڵ� ���� ���������� ��ȭ �� �׽�Ʈ �ڵ�ȭ.
2. �н�/Ǯ�� ����: �л� ��ú���, Ÿ�̸�, ��� ä��, ����/���� �帧 ����.
3. ���� ���� �� �м�: Supabase/PostgreSQL ��� ���� ����, API ����, ���Ρ��б� ��� ������ ����.
4. ��ũ/Ƽ�� �ý���: ���� Elo/���� ����, ������/��ŷ ������(UX, ������, ����) ����.
5. �м��� & �н� ���̵�: ���׺� AI �ؼ�/���� ����, ����� �м� ����Ʈ �ڵ� ����.
6. � �� ����: Render(backend) + Vercel(frontend) + Supabase(DB) CI/CD ���������� ����, ����͸�/�˸� ����.

## Known issues
- Full end-to-end verification of the new insertion output in the React UI is still pending (needs manual QA and snapshots).
- Scoring persistence & ranking DB schema not implemented yet; API contracts must be defined before wiring Study flow.
- Automated tests around problem generators and manual sync are minimal; regression risk remains high until coverage improves.

## Resolved (recent)
- 2025-09-22: Refactored `InsertionProblemGenerator2` so passages remain intact and markers render as circled numerals with balanced windows.
- Introduced `scripts/update-problem-manuals.js` so manuals stay in lockstep with the source PDFs.
- Synced README/BUILDLOG/PROJECT_STATE to document the refresh workflow for future contributors.
- Earlier fixes (PowerShell dev loop + grammar_span UI alignment) remain stable after today��s changes.
