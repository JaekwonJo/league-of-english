# PROJECT_STATE.md

## What we're building
- League of English CSAT suite delivering exam-quality problem sets through an API-driven pipeline for every problem type (summary, grammar, vocabulary, blank, theme, etc.).
- Persistent problem library that stores vetted AI-generated items, tracks which students have seen each question, and rotates unseen problems automatically.
- Teacher/student portals built on trustworthy content plus reporting tools so moderators can retire low-quality items quickly.

## Stack & Commands
- Node.js 20 Express backend with React 19 (CRA) frontend; lucide-react powers shared iconography/components.
- SQL.js still persists documents and generated problems today; PostgreSQL migration remains queued once caching + rotation metadata are finalised.
- Preferred dev command: `npm run dev:all` (API 5000 + client 3000). `npm run dev`/`npm run client` remain for single-target work.
- Refresh manuals via `node scripts/update-problem-manuals.js` so prompt builders keep the latest Wolgo guidance while we expand API prompts to new types.

## Decisions (key)
- Retire deterministic/rule-based fallbacks: if the API pipeline cannot return a validated item, we queue regeneration rather than ship lower-quality templates.
- Every generated problem is stored in the problem library with source metadata, validation status, and exposure tracking before it reaches students.
- Study sessions draw from cached, unseen problems first; only when a student exhausts the cache do we invoke the API again for that type.
- Reporting flow lets students flag problematic items; moderators can deactivate them so the cache and rotation immediately exclude the issue.
- API base URL continues to come from `client/.env` (`REACT_APP_API_URL`); auth tokens stay in `localStorage` until refresh tokens are introduced.

## Current Stage
- Hardening the API-only grammar and summary generators while preparing the cache and exposure tracker rollout.

## Next 3 (priority)
1) Hook aiProblemService.saveProblems and fetchCached into /generate/csat-set so unseen items rotate before new API calls.
2) Replace the static fallback question banks for vocabulary, theme, and title with API retries plus clear user messaging.
3) Add regression tests covering summary option normalization and source-label sanitizing on both server and client.

## Known issues
- ESLint config is still missing (npm run lint fails), so we rely on CRA build warnings.
- Static fallback problem banks still ship when OpenAI errors, conflicting with the API-only mandate until we wire robust retries.
- Per-student exposure tracking is not wired yet, so duplicates can resurface until the cache layer ships.

## Resolved (Today)
- Trimmed duplicate 출처 prefixes on API responses and study cards so Wolgo titles display correctly.
- Strengthened the summary option normalizer so circled choices keep their leading letters and en dashes (fixes djust, xtending).
- Raised the summary prompt difficulty to advanced and seeded variant tags for richer distractors.
- Repaired the grammar study component after the JSX parse error by rebuilding the source label renderer.

## Resolved (2025-09-26)
- Added `server/utils/summaryTemplate.js` and rewrote `aiProblemService` to build/validate CSAT-style summary problems (A/B blanks, circled options, source labels).
- Integrated the Wolgo grammar template via `server/utils/eobeopTemplate.js`, removed basic/advanced fallbacks, and returned API-only grammar batches with circled options and underlined passages.
- Rebuilt `/generate/csat-set` route to enforce 5-question steps (max 20), dispatch batched generators, and normalize responses for the React study screen.
- Updated the study client (`useStudySession`, `StudyConfig`, `ProblemDisplay`, `GrammarProblemDisplay`) to request 5-at-once, render list mode cleanly, and support the new summary/grammar data shape.



