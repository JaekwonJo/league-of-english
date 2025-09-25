# PROJECT_STATE.md

## What we're building
- League of English CSAT suite: React study client + Express API delivering manual-aligned problem sets for students and teachers.
- Multi-problem CSAT generators that obey 5-question batch rules, preserve circled-digit options, and surface passage/source metadata for each item.
- Prompt/validator pairs derived from the Wolgo manuals so AI outputs (grammar, summary, etc.) mirror official exam wording and layout.

## Stack & Commands
- Node.js 20 Express backend with React 19 (CRA) frontend; lucide-react powers icons/components.
- SQL.js persists documents/problems today; PostgreSQL migration remains queued after the CSAT templates are finalized.
- Preferred dev command: `npm run dev:all` (API 5000 + client 3000). `npm run dev`/`npm run client` stay available for single-target work.
- Refresh manuals via `node scripts/update-problem-manuals.js` so prompt builders keep the latest PDF guidance.

## Decisions (key)
- Each problem type keeps a dedicated template doc under `docs/problem-templates/` and must pass a validator before being returned by the API.
- Summary/grammar problems expose the English passage, circled-digit choices (U+2460~U+2464), and `sourceLabel` metadata exactly as manuals dictate.
- Server enforces 5-question increments (max 20) at the API layer and the study UI mirrors those steps so users scroll through batches instead of single items.
- Prompt builders render deterministic sections (passage -> stem -> choices -> answer/explanation placeholders) to avoid ad-hoc string patching in the UI.
- API base URL continues to come from `client/.env` (`REACT_APP_API_URL`); auth tokens stay in `localStorage` until refresh tokens are introduced.

## Current Stage
- Hardening the refactored summary and grammar batch flow while planning cache/fallback support and automated tests before expanding to other problem types.

## Next 3 (priority)
1) Add caching/fallback coverage for summary and grammar so batches survive transient OpenAI failures without dropping the entire study session.
2) Stand up automated fixtures/tests for the new templates and validators to catch regressions before deploy.
3) Migrate the remaining CSAT generators (blank, vocabulary, title, theme) onto manual-driven prompts with circled digits and source labels so every type shares the same response shape.

## Known issues
- ESLint config is missing (`npm run lint` fails), so static analysis is limited to CRA's build step.
- Irrelevant/implicit generators still use generic sentence heuristics instead of Wolgo-aligned templates.
- No integration tests yet for `generate/csat-set`; only manual runs cover the multi-type batching logic.

## Resolved (2025-09-26)
- Added `server/utils/summaryTemplate.js` and rewrote `aiProblemService` to build/validate CSAT-style summary problems (A/B blanks, circled options, source labels).
- Integrated the Wolgo grammar template via `server/utils/eobeopTemplate.js`, removed basic/advanced fallbacks, and returned API-only grammar batches with circled options and underlined passages.
- Rebuilt `/generate/csat-set` route to enforce 5-question steps (max 20), dispatch batched generators, and normalize responses for the React study screen.
- Updated the study client (`useStudySession`, `StudyConfig`, `ProblemDisplay`, `GrammarProblemDisplay`) to request 5-at-once, render list mode cleanly, and support the new summary/grammar data shape.
