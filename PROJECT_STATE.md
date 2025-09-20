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

## Current Stage
- PDF manuals are now regenerated automatically; next step is validating AI generation with the refreshed content and surfacing a minimal review UI.

## Next 3 (priority)
1) (P1) Run the manual sync script and confirm AI problem generation consumes the regenerated manuals without schema drift.
2) (P1) Capture sample generation output and wire it into a basic teacher preview / student view flow.
3) (P2) Fold the manual-sync workflow into onboarding docs so teammates follow the same refresh steps.

## Known issues
- Need confirmation that regenerated manuals produce stable AI output (collect sample runs).
- Windows firewall still blocks ports 3000/5000 on first launch unless users pre-authorise.
- Manual port cleanup is required if Node crashes and holds the dev ports.

## Resolved (recent)
- Introduced `scripts/update-problem-manuals.js` so manuals now stay in lockstep with the source PDFs.
- Synced README/BUILDLOG/PROJECT_STATE to document the refresh workflow for future contributors.
- Earlier fixes (PowerShell dev loop + grammar_span UI alignment) remain stable after today’s changes.
