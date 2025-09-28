# PROJECT_STATE.md

## What we're building
- API-only CSAT English generator that transforms every problem type (summary, grammar, vocabulary, blank, title, theme, inference, etc.) straight from user-uploaded passages; only order and insertion stay scripted until their API prompts finish QA.
- Persistent problem library that stores validated OpenAI outputs with source metadata, exposure tracking plans, smart rotation, and moderator controls so each student sees unseen, high-quality items first.
- Teacher/student portals built on trustworthy content, per-problem reporting, vocabulary drills, ranking, and analytics so moderators can retire low-quality items immediately.

## Stack & Commands
- Node.js 20 Express backend with React 19 (CRA) frontend; lucide-react powers shared icons/components.
- SQL.js currently persists documents and generated problems; PostgreSQL migration remains queued after cache + rotation metadata stabilise.
- Preferred dev command: `npm run dev:all` (API 5000 + client 3000). `npm run dev`/`npm run client` stay available for single-target work.
- Refresh manuals via `node scripts/update-problem-manuals.js` to keep Wolgo-aligned prompts current while expanding API prompts across types.

## Decisions (key)
- Rule-based fallbacks are retired for all types except order/insertion; if the API pipeline cannot return a validated item we queue regeneration instead of shipping templated questions.
- Every generated problem is stored in the problem library with source metadata, validation status, and exposure tracking before it reaches students.
- Study sessions must draw from cached, unseen problems first; once a student exhausts the cache for a type we invoke the API again just for that learner.
- Reporting flow lets students flag problematic items; moderators can deactivate them so the cache and rotation immediately exclude the issue.
- API base URL continues to come from `client/.env` (`REACT_APP_API_URL`); auth tokens stay in `localStorage` until refresh tokens are introduced.

## Current Stage
- Finalising cache-first delivery after the source-label and option-sanitiser fixes, while wiring per-student exposure tracking and hardening OpenAI retry behaviour.

## Next 3 (priority)
1) Implement per-student exposure tracking so cached problems skip anyone who has already answered them and only call the API when the cache is empty for that learner.
2) Add structured retry/backoff + background queueing for OpenAI errors to keep study sessions smooth without reintroducing rule-based fallbacks.
3) Backfill regression tests for `fetchCached`/`saveProblems` and the summary/grammar formatters to catch option/answer/source regressions early.

## Known issues
- ESLint config is still missing (`npm run lint` fails), so we rely on CRA build warnings and manual review.
- Grammar/vocabulary prompt outputs still need sustained QA to guarantee Wolgo-level difficulty; shaky generations must be reported and filtered until prompts stabilise.
- OpenAI error handling still lacks queued retries and clearer UI feedback, risking session drops if the API hiccups or the cache runs dry mid-session.

## Resolved (Today)
- Synced PROJECT_STATE, BUILDLOG, and README so the roadmap now reflects API-only generation and the removal of rule-based fallbacks.
- Documented the source-label cleanup and first-letter option sanitiser fixes that keep study cards aligned with cached copies.
- Reconfirmed cache-first rotation expectations so admins understand the flow before per-student exposure tracking lands.

## Resolved (2025-09-26)
- Added `server/utils/summaryTemplate.js` and rewrote `aiProblemService` to build/validate CSAT-style summary problems (A/B blanks, circled options, source labels).
- Integrated the Wolgo grammar template via `server/utils/eobeopTemplate.js`, removed basic/advanced fallbacks, and returned API-only grammar batches with circled options and underlined passages.
- Rebuilt `/generate/csat-set` route to enforce 5-question steps (max 20), dispatch batched generators, and normalize responses for the React study screen.
- Updated the study client (`useStudySession`, `StudyConfig`, `ProblemDisplay`, `GrammarProblemDisplay`) to request 5-at-once, render list mode cleanly, and support the new summary/grammar data shape.

