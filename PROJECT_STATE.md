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
- Queue-backed generation, per-student exposure tracking, and the Study queue spinner/vocab countdown are live; today's pass patches the grammar formatter to auto-rebuild missing `<u>...</u>` spans from the options and adds a regression test so Windows/WSL devs still get green `npm test` + `npm run lint` out of the box.

## Next 3 (priority)
1. **Run end-to-end Study QA for grammar generation.** Fire up `npm run dev:all`, request a grammar set, and confirm the rebuilt underlines survive the full OpenAI → API → React flow.
2. **Localise the loading spinner + vocab reveal.** The warm-up still prints English copy and shows mojibake for Korean meanings; swap the strings to Korean and fix the encoding glitch.
3. **Add client-side coverage for the countdown + grammar display.** Extend lint/test harnesses to `client/` so the vocab ticker, Korean copy, and underline renderer stay regression-proof.

## Known issues
- Study loading UI still needs manual QA: ensure the countdown stops exactly at completion, handles failures gracefully, keeps focus visible for keyboard users, and verifies the underline rebuild with real payloads.
- Grammar loading spinner strings remain English and the warm-up vocabulary meanings render as mojibake on some Windows browsers; switch to native Korean copy and normalise encoding.
- Client-side linting/test harness is absent, so React regressions (like the countdown timer) can slip through until manual testing.
- Order/insertion problem types are still rule-based; they need Wolgo-aligned OpenAI prompts plus validators before we can retire the scripted path.

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
