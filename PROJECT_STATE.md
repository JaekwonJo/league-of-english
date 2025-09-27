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
- Defining the API-only generation scope for the remaining problem types while designing the smart cache/rotation layer and the problem report workflow.

## Next 3 (priority)
1) Replace the remaining rule-based generators (vocabulary, blank, theme, title, etc.) with manual-aligned OpenAI prompts that mirror the Wolgo samples.
2) Implement the smart cache/resurfacing service that stores generated items, tracks per-student exposure, and falls back to the API only when no unseen problems remain.
3) Add report/review tooling so flagged questions are quarantined, audited, and removed from both the cache and future study sessions.

## Known issues
- ESLint config is still missing (`npm run lint` fails), so static analysis stays limited to CRA's build step.
- Legacy rule-based generators remain in the codebase until each type migrates to the API prompts.
- Smart cache and per-student exposure ledger are not implemented yet, so duplicate problems can still resurface.

## Resolved (Today)
- Documented the API-only mandate across PROJECT_STATE, BUILDLOG, and README so planning references stay accurate.
- Clarified the smart cache/exposure ledger requirements to prevent duplicate surface of old problems.
- Captured the rapid report triage workflow so moderators can remove low-quality items without reintroducing fallbacks.

## Resolved (2025-09-26)
- Added `server/utils/summaryTemplate.js` and rewrote `aiProblemService` to build/validate CSAT-style summary problems (A/B blanks, circled options, source labels).
- Integrated the Wolgo grammar template via `server/utils/eobeopTemplate.js`, removed basic/advanced fallbacks, and returned API-only grammar batches with circled options and underlined passages.
- Rebuilt `/generate/csat-set` route to enforce 5-question steps (max 20), dispatch batched generators, and normalize responses for the React study screen.
- Updated the study client (`useStudySession`, `StudyConfig`, `ProblemDisplay`, `GrammarProblemDisplay`) to request 5-at-once, render list mode cleanly, and support the new summary/grammar data shape.

