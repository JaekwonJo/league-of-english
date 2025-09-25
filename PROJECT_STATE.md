# PROJECT_STATE.md

## What we're building
- League of English CSAT suite: React study client + Express API that deliver manual-aligned problem sets for students and teachers.
- Multi-problem CSAT generators that obey 5-question batch rules, preserve circled-digit options, and surface passage/source metadata for each item.
- Prompt/validator pairs derived from the Wolgo manuals so that AI outputs (grammar, summary, etc.) mirror official exam wording and layout.

## Stack & Commands
- Node.js 20 Express backend with React 19 (CRA) frontend; lucide-react powers icons/components.
- SQL.js persists documents/problems today; PostgreSQL migration remains queued after all CSAT templates are locked down.
- Preferred dev command: `npm run dev:all` (API 5000 + client 3000). `npm run dev`/`npm run client` stay available for single-target work.
- Refresh manuals via `node scripts/update-problem-manuals.js` so prompt builders keep the latest PDF guidance.

## Decisions (key)
- Each problem type keeps a dedicated template doc under `docs/problem-templates/` and must pass a validator before being returned by the API.
- Summary/grammar/etc. problems expose the English passage, Korean stem, circled-digit choices (U+2460~U+2464), and `sourceLabel` metadata exactly as manuals dictate.
- Server enforces 5-question increments (max 20) and shares the sanitized counts with the UI so the study screen always shows scrollable batches.
- Prompt builders render deterministic sections (passage → stem → choices → answer/explanation placeholders) to avoid ad-hoc string patching in the UI.
- API base URL continues to come from `client/.env` (`REACT_APP_API_URL`), auth tokens stay in `localStorage` until refresh tokens are added.

## Current Stage
- Wiring the summary (A/B) template end-to-end: enforce 5-question generation in `generate/csat-set`, push the new prompt/validator through `aiProblemService`, and render the blanks/options correctly in the study UI.

## Next 3 (priority)
1) Add caching/fallback coverage for summary outputs so `generateSummary` can survive OpenAI slowdowns without breaking problem batches.
2) Extend the 5-step count sanitizer to teacher/class flows (e.g., saved configs, analytics requests) and document the API contract for clients.
3) Backfill automated validation fixtures for summary + grammar templates so regressions surface before deploy.

## Known issues
- Summary validator currently relies on runtime checks only; no unit tests/assertions guard new edge cases.
- Grammar multi-answer explanations still lean on AI phrasing—needs manual pattern cataloguing for consistency.
- Other CSAT types (vocabulary/title/theme) still use legacy prompts without manual-derived wording.

## Resolved (2025-09-25)
- `POST /generate/csat-set` now snaps counts to 5-question steps (max 20) and accepts the new `counts` payload used by the React study config.
- Added OpenAI-backed summary prompt/validator (`buildSummaryPrompt`, `formatSummaryFromModel`) so generated items carry (A)/(B) blanks, circled-digit options, and source labels.
- `csatProblemNormalizer` preserves summary-specific fields (`summarySentence`, `sourceLabel`, metadata) so the client can render them without loss.
- Study UI renders summary questions with highlighted (A)/(B) blanks, exports circled options, and reuses the 5-question batch styling.
- `problemRegistry` treats summary as a standard MCQ (string answer), removing the legacy `{A,B}` placeholder logic.
