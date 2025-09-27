# PROJECT_STATE.md

## What we're building
- API-only CSAT English generator that derives every problem type (summary, grammar, vocabulary, blank, theme, etc.) directly from user-uploaded passages.
- Persistent problem library that stores validated OpenAI outputs with source metadata, exposure tracking, and smart rotation so each student sees unseen items first.
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
- Auditing each generator to guarantee API-only output, confirming database persistence, and wiring cache/exposure rotation for study sessions.

## Next 3 (priority)
1) Connect `aiProblemService.saveProblems` and cached fetch helpers inside `/generate/csat-set` so grammar/summary pull unseen stored items before new API calls.
2) Replace the remaining static fallback banks (vocabulary, theme, title, blank) with OpenAI prompts plus retry/queuing so every type is API-driven.
3) Add regression coverage for `normalizeAll` + `saveProblems` to guard source-label cleanup, option prefixes, and database persistence.

## Known issues
- ESLint config is still missing (`npm run lint` fails), so we rely on CRA build warnings.
- Vocabulary, title, theme, and blank generators still fall back to static templates when the API errors; removal is in progress.
- Per-student exposure tracking is not wired yet, so duplicates can resurface until the cache layer ships.

## Resolved (Today)
- Synced status docs with the API-only roadmap so the team stops expecting rule-based fallbacks.
- Recorded that grammar and summary batches now save through `saveProblems` for automatic library persistence.
- Clarified upcoming cache/exposure work and flagged remaining fallback types to keep QA focused on the correct gap.

## Resolved (2025-09-26)
- Added `server/utils/summaryTemplate.js` and rewrote `aiProblemService` to build/validate CSAT-style summary problems (A/B blanks, circled options, source labels).
- Integrated the Wolgo grammar template via `server/utils/eobeopTemplate.js`, removed basic/advanced fallbacks, and returned API-only grammar batches with circled options and underlined passages.
- Rebuilt `/generate/csat-set` route to enforce 5-question steps (max 20), dispatch batched generators, and normalize responses for the React study screen.
- Updated the study client (`useStudySession`, `StudyConfig`, `ProblemDisplay`, `GrammarProblemDisplay`) to request 5-at-once, render list mode cleanly, and support the new summary/grammar data shape.




