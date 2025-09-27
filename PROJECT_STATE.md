# PROJECT_STATE.md

## What we're building
- API-only CSAT English generator that now derives every problem type (summary, grammar, vocabulary, blank, title, theme, etc.) directly from user-uploaded passages.
- Persistent problem library that stores validated OpenAI outputs with source metadata, exposure tracking plans, and smart rotation so each student sees unseen items first.
- Teacher/student portals built on trustworthy content, per-problem reporting, and rich analytics so moderators can retire low-quality items quickly.

## Stack & Commands
- Node.js 20 Express backend with React 19 (CRA) frontend; lucide-react drives shared icons/components.
- SQL.js currently persists documents and generated problems; PostgreSQL migration remains queued until cache + rotation metadata harden.
- Preferred dev command: `npm run dev:all` (API 5000 + client 3000). `npm run dev`/`npm run client` stay available for single-target work.
- Refresh manuals via `node scripts/update-problem-manuals.js` to keep Wolgo-aligned prompts current while expanding API prompts across types.

## Decisions (key)
- Rule-based fallbacks are being retired; if the API pipeline cannot return a validated item we queue regeneration instead of shipping templated questions.
- Every generated problem is stored in the problem library with source metadata, validation status, and exposure tracking before it reaches students.
- Study sessions must draw from cached, unseen problems first; only after the cache empties do we invoke the API again for that type.
- Reporting flow lets students flag problematic items; moderators can deactivate them so the cache and rotation immediately exclude the issue.
- API base URL continues to come from `client/.env` (`REACT_APP_API_URL`); auth tokens stay in `localStorage` until refresh tokens are introduced.

## Current Stage
- Finalising cache-first delivery now that all problem types save to the library, and wiring per-student exposure tracking plus resilience around OpenAI retries.

## Next 3 (priority)
1) Implement per-student exposure tracking so cached problems skip anyone who has already answered them.
2) Add structured retry/backoff + background queueing for OpenAI errors to keep study sessions smooth without rule-based fallbacks.
3) Backfill regression tests for `fetchCached`/`saveProblems` and cache-first routing to catch option/answer/source regressions early.

## Known issues
- ESLint config is still missing (`npm run lint` fails), so we rely on CRA build warnings.
- Per-student exposure tracking is not wired yet, so duplicates can resurface until we record question usage per user.
- OpenAI error handling still lacks queued retries and clearer UI feedback, risking session drops if the API hiccups.

## Resolved (Today)
- Replaced the remaining rule-based fallbacks by routing blank/vocabulary/title/theme through the OpenAI pipeline with consistent metadata.
- Updated `/generate/csat-set` to reuse cached problems across every type before scheduling new generations.
- Hardened `saveProblems`/`fetchCached` so stored items keep options, answers, and `출처` metadata intact for future rotations.

## Resolved (2025-09-26)
- Added `server/utils/summaryTemplate.js` and rewrote `aiProblemService` to build/validate CSAT-style summary problems (A/B blanks, circled options, source labels).
- Integrated the Wolgo grammar template via `server/utils/eobeopTemplate.js`, removed basic/advanced fallbacks, and returned API-only grammar batches with circled options and underlined passages.
- Rebuilt `/generate/csat-set` route to enforce 5-question steps (max 20), dispatch batched generators, and normalize responses for the React study screen.
- Updated the study client (`useStudySession`, `StudyConfig`, `ProblemDisplay`, `GrammarProblemDisplay`) to request 5-at-once, render list mode cleanly, and support the new summary/grammar data shape.




