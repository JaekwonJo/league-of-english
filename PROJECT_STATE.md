# PROJECT_STATE.md

## What we're building
- API-only CSAT English generator that transforms every problem type (summary, grammar, vocabulary, blank, title, theme, inference, etc.) straight from user-uploaded passages; only order and insertion stay scripted until their API prompts finish QA.
- Persistent problem library that stores validated OpenAI outputs with source metadata, exposure tracking plans, smart rotation, and moderator controls so each student sees unseen, high-quality items first.
- Teacher/student portals built on trustworthy content, per-problem reporting, vocabulary drills, ranking, and analytics so moderators can retire low-quality items immediately.

## Stack & Commands
- Node.js 20 Express backend with React 19 (CRA) frontend; lucide-react powers shared icons/components.
- SQL.js currently persists documents and generated problems; PostgreSQL migration remains queued after cache + rotation metadata stabilise.
- Preferred dev command: `npm run dev:all` (API 5000 + client 3000). `npm run dev`/`npm run client` stay available for single-target work.
- Test with `npm test` (Node test runner over `server/tests`) and lint with `npm run lint` (ESLint via `.eslintrc.cjs`).
- Refresh manuals via `node scripts/update-problem-manuals.js` to keep Wolgo-aligned prompts current while expanding API prompts across types.

## Decisions (key)
- Rule-based fallbacks are retired for all types except order/insertion; if the API pipeline cannot return a validated item we queue regeneration instead of shipping templated questions.
- Every generated problem is stored in the problem library with source metadata, validation status, and exposure tracking before it reaches students.
- Study sessions must draw from cached, unseen problems first; once a student exhausts the cache for a type we invoke the API again just for that learner.
- Reporting flow lets students flag problematic items; moderators can deactivate them so the cache and rotation immediately exclude the issue.
- API base URL continues to come from `client/.env` (`REACT_APP_API_URL`); auth tokens stay in `localStorage` until refresh tokens are introduced.

## Current Stage
- Queue-backed generation and the grammar underline auto-heal are stable, and `npm test`/`npm run lint` continue to pass; the Study spinner still shows English copy, so today's sync spotlights the localisation + QA follow-up while we prep client automation.

## Next 3 (priority)
1. **Localise the Study spinner + vocab warm-up.** Swap the remaining English strings to Korean and fix the mojibake so the countdown screen feels native.
2. **Run end-to-end Study QA for grammar batches.** Launch `npm run dev:all`, request a grammar set, and confirm all five rebuilt underlines render correctly from OpenAI → API → React.
3. **Add client-side tests/linting for spinner + countdown UI.** Extend the test harness to `client/` so localisation and underline rendering stay regression-proof.

## Known issues
- Study loading UI still needs manual QA: validate countdown completion, keyboard focus, and underline rebuild behaviour with live API payloads.
- Loading spinner and vocab warm-up strings remain English with mojibake on some Windows browsers; replace with Korean copy and normalised encoding.
- Client-side linting and automated tests are missing, so React countdown and loading widgets rely on manual checks.
- Order and insertion problem types are still rule-based; Wolgo-aligned OpenAI prompts plus validators are required before we retire the scripted path.

## Resolved (2025-10-01 - docs nickname cleanup)
- Replaced the personal nickname with `LoE관리자` across status docs to keep published materials professional and avoid leaking DC forum handles.
- Updated README and CLAUDE overview so future contributors see the new naming instantly.
- Confirmed no other files reference the deprecated nickname by searching the repository.

## Resolved (2025-10-01 - grammar underline auto-heal)
- Patched `formatGrammarProblem` to rebuild missing `<u>...</u>` spans from the provided options (대소문자/문장부호 차이 허용), 추가 실패 진단을 붙이고 Node 테스트로 검증해 4-underlines payload에서도 더 이상 500이 나지 않게 했습니다.
- Verified the fix locally with `npm test` and `npm run lint` (both green on Windows/WSL).

## Resolved (2025-09-30 - grammar manual v6.0 + tooling sync)
- Upgraded `grammar_problem_manual.md` (root + problem manual) to Master v6.0, documenting the TOEFL/GRE-grade error taxonomy and the updated dangling-participle guidance.
- Confirmed `npm test` (Node test runner) and `npm run lint` succeed on Windows/WSL after the earlier script + ESLint config fixes.
- Captured follow-up priorities (loading UI QA, manual propagation, client lint/tests) so the team knows where to focus next.

## Resolved (2025-09-30 - doc sync + CLI verification)
- Re-read PROJECT_STATE.md, README.md, and BUILDLOG.md, then re-ran `npm test` and `npm run lint` to capture the current failure messages so the status docs stay actionable while the fixes are pending.
- Recorded the exact Windows glob error and ESLint config gap inside the status docs to guide whoever tackles the automation backlog next.

## Resolved (2025-09-30)
- Re-synced PROJECT_STATE.md, README.md, and BUILDLOG.md to spotlight the queue-ready backend, refreshed Top 3 priorities, and the temporary `node --test` workaround.
- Re-ran `node --test server/tests/aiProblemService.test.js` to confirm circled-digit formatting and exposure tracking stay green while the npm script fix is pending.

## Resolved (2025-09-28)
- Added `problem_exposures` table + `markExposures` so cached questions only appear once per student.
- Reworked `/generate/csat-set` to fetch unseen cached items first, then persist fresh OpenAI batches, and queue OpenAI calls with retry/backoff.
- Updated the Wolgo grammar template/normaliser to keep circled digits + source labels intact and introduced node-test coverage for summary/grammar/exposure flows.

## Resolved (2025-09-26)
- Added `server/utils/summaryTemplate.js` and rewrote `aiProblemService` to build/validate CSAT-style summary problems (A/B blanks, circled options, source labels).
- Integrated the Wolgo grammar template via `server/utils/eobeopTemplate.js`, removed basic/advanced fallbacks, and returned API-only grammar batches with circled options and underlined passages.
- Rebuilt `/generate/csat-set` route to enforce 5-question steps (max 20), dispatch batched generators, and normalize responses for the React study screen.
- Updated the study client (`useStudySession`, `StudyConfig`, `ProblemDisplay`, `GrammarProblemDisplay`) to request 5-at-once, render list mode cleanly, and support the new summary/grammar data shape.
