## 2025-09-30 (status docs refresh + npm test TODO)
- Issue: Status docs still pointed at prompt QA as the top priority and skipped the failing `npm test` script, so contributors could not rely on the documented workflow.
- Cause: After shipping the queue-backed generation + exposure tracking, we never reprioritised the roadmap to cover the Windows glob failure or the missing ESLint config.
- Fix: Updated PROJECT_STATE.md, README.md, and BUILDLOG.md to call out today's Top 3 (fix `npm test`, ship the Study queue status, restore ESLint) and document the `node --test` workaround.
- Files: PROJECT_STATE.md, README.md, BUILDLOG.md.
- Verification: node --test server/tests/aiProblemService.test.js.

## 2025-09-30 (docs + node test sync)
- Issue: Status docs still referenced the older roadmap language and the failing `npm test` glob, so teammates missed the direct node test command and the newest coverage.
- Cause: After adding `server/tests/aiProblemService.test.js`, we had not refreshed the documentation to describe how to run it nor highlighted the API-only alignment work across files.
- Fix: Updated PROJECT_STATE.md, README.md, and BUILDLOG.md to keep the roadmap consistent, call out the aiProblemService test, and flag the globbing bug in the npm script.
- Files: PROJECT_STATE.md, README.md, BUILDLOG.md.
- Verification: Manual read-through of the synced docs; `node --test server/tests/aiProblemService.test.js`.

## 2025-09-28 (per-student exposure tracking)
- Issue: Students kept seeing repeat API problems whenever the cache refilled mid-session.
- Cause: `/generate/csat-set` only filtered duplicates with the in-memory `usedProblemIds`, so nothing prevented the same question from resurfacing on the next request.
- Fix: Added a `problem_exposures` table + `markExposures`, reworked `fetchCached` to filter by user, and wrapped OpenAI calls in a retry queue that persists every batch into the cache.
- Files: server/models/database.js, server/services/aiProblemService.js, server/routes/problem.routes.js.
- Verification: npm test (node --test server/tests/**/*.test.js).

## 2025-09-28 (documentation sync + API-only policy)
- Issue: Roadmap and README still implied rule-based fallbacks and never mentioned the recent source-label/option sanitizer fixes, so teammates questioned whether grammar/vocab were truly API-only.
- Cause: After landing the sanitiser patches and cache-first rotation, we forgot to refresh the docs to capture the API-only requirement and the new QA focus areas.
- Fix: Updated PROJECT_STATE.md, README.md, and BUILDLOG.md to spell out the API-only mandate, call out the sanitiser work, and highlight remaining exposure-tracking and retry gaps.
- Files: PROJECT_STATE.md, README.md, BUILDLOG.md.
- Verification: Manual read-through of the updated docs; double-checked study cards render a single 출처 label with intact option prefixes in the latest build.

## 2025-09-27 (cache-first API conversions)
- Issue: Blank, vocabulary, title, and theme still fell back to rule-based templates so cached problems never grew and students saw repeats.
- Cause: `/generate/csat-set` only cached grammar/summary outputs and the other generators skipped `saveProblems`, so the DB never stored those items.
- Fix: Routed all types through `fetchCached` -> OpenAI -> `saveProblems`, and normalized persistence so options/answers/source metadata stay intact.
- Files: server/services/aiProblemService.js, server/routes/problem.routes.js.
- Verification: `node -e "require('./server/services/aiProblemService.js')"`, `node -e "require('./server/routes/problem.routes.js')"`, manual study run to confirm API-only cards rotate from DB.

## 2025-09-27 (docs sync + API persistence clarity)
- Issue: Teammates were unsure whether API-generated grammar/summary problems persist in the DB because status docs were stale.
- Cause: After wiring 'saveProblems' inside '/generate/csat-set', we never refreshed the docs to describe the API-only roadmap and remaining fallback gaps.
- Fix: Updated PROJECT_STATE.md, README.md, and BUILDLOG.md so they spell out DB persistence, pending fallback removal, and cache priorities.
- Files: PROJECT_STATE.md, README.md, BUILDLOG.md.
- Verification: Manual read-through and double-checked 'saveProblems' usage in server/routes/problem.routes.js.

## 2025-09-27 (source labels + summary options)
- Error: Study screen repeated 출처 prefixes and summary options lost their first letters (e.g. djust, xtending).
- Cause: API/client sanitizers did not trim existing prefixes and the summary normalizer stripped circled digits without restoring the leading characters.
- Fix: Added shared source-label cleanup, hardened the summary option formatter, and raised the prompt difficulty to advanced-level distractors.
- Files: server/services/aiProblemService.js, server/utils/summaryTemplate.js, client/src/components/study/ProblemDisplay.js, client/src/components/study/GrammarProblemDisplay.js.
- Verification: npm run build; manual study session reload confirmed intact options and single 출처 labels.

## 2025-09-27 (API-only roadmap sync)
- Error: Planning docs still referenced rule-based fallbacks, obscuring the API-only requirement.
- Cause: Requirements shifted yesterday but PROJECT_STATE.md, README.md, and BUILDLOG.md were left unchanged.
- Fix: Rewrote What/Features/Roadmap sections to promise API-only generation, smart caching, and rapid report handling.
- Files: PROJECT_STATE.md, README.md, BUILDLOG.md.
- Verification: Manual read-through against the new checklist to confirm wording alignment.

## 2025-09-26 (Docs + resilience focus)
- Issue: Planning docs still highlighted the initial summary/grammar refactor without the follow-up cache/test/migration priorities, so teammates could miss today's focus.
- Root cause: After landing the batch refactor we had not realigned PROJECT_STATE.md, README.md, and BUILDLOG.md with the resilience work.
- Fix: Updated the status docs to emphasise caching and fallback coverage, automated template tests, and migrating the remaining CSAT generators.
- Files touched: PROJECT_STATE.md, README.md, BUILDLOG.md.
- Verification: Manual read-through of all three docs to confirm the priorities and wording match.

## 2025-09-26 (CSAT batch refactor)
- Issue: Study sessions still returned single grammar/summary items with ad-hoc formatting, so users could not practise CSAT-style batches straight from the uploaded manuals.
- Root cause: `aiProblemService` lacked manual-driven templates/validators and `/generate/csat-set` looped by type without enforcing 5-question batches or circled-digit outputs.
- Fix: Introduced `summaryTemplate`/`eobeopTemplate` utilities, rewrote `aiProblemService` + `/generate/csat-set` to honour 5-step counts and validated outputs, and refreshed the study UI for list-mode rendering.
- Files touched: `server/services/aiProblemService.js`, `server/routes/problem.routes.js`, `server/utils/summaryTemplate.js`, `server/utils/eobeopTemplate.js`, `client/src/components/study/StudyConfig.js`, `client/src/components/study/ProblemDisplay.js`, `client/src/components/study/GrammarProblemDisplay.js`.
- Verification: `npm run build` (success), manual API smoke via React study screen; `npm run lint` still blocked by missing ESLint config (tracked in Known issues).

## 2025-09-25 (Summary batches)
- Issue: The study flow still produced single summary questions with placeholder options, so learners could not practice CSAT-style (A)/(B) blanks in batches.
- Root cause: `/generate/csat-set` ignored the new 5-question counts object and `aiProblemService` kept the generic summary prompt without enforcing circled digits or source labels.
- Fix: Snapped the server counts to 5-step increments (max 20), added `buildSummaryPrompt`/`formatSummaryFromModel` helpers, and updated the normalizer + client renderer to keep `(A)/(B)` sentences, circled options, and Korean metadata.
- Files touched: `server/routes/problem.routes.js`, `server/services/aiProblemService.js`, `server/utils/csatProblemNormalizer.js`, `client/src/components/study/ProblemDisplay.js`, `client/src/services/problemRegistry.js`.
- Verification: Manual Node smoke (`node -e "require('./server/routes/problem.routes.js')"`), inspected generated summary JSON via logger, and loaded the study UI to confirm 5 problems display with highlighted blanks/options.
## 2025-09-25
- Issue: Project status docs still emphasized coupon/analytics work instead of the CSAT manual alignment expected today.
- Root cause: PROJECT_STATE.md hadn''t been resynced after reviewing the Wolgo manuals, so the What/Next sections pointed to older priorities.
- Fix: Rewrote the What/Stack/Decisions/Current/Next blocks to spotlight the grammar-first CSAT template rollout plan, then added dedicated 어법/요약 템플릿 문서와 grammar validator skeleton.
- Files touched: PROJECT_STATE.md, docs/problem-templates/eobeop-grammar.md, docs/problem-templates/summary-two-blank.md, server/utils/eobeopTemplate.js.
- Verification: Manual read-through + Node smoke check for `validateGrammarProblem` to confirm the doc now matches README and today''s planning notes.
## 2025-09-24 (PM3)
- Issue: Teachers could not enrol students, so class-level analytics were impossible.
- Root cause: `teacher_codes` existed but there were no APIs/UI for issuing codes or linking students.
- Fix: Added `/api/teacher/*` endpoints (code issue/deactivate, student list, student join) and wired teacher/student cards on the profile page.
- Files touched: `server/models/database.js`, `server/routes/teacher.routes.js`, `server/server.js`, `server/middleware/auth.js`, `client/src/services/api.service.js`, `client/src/pages/ProfilePage.js`.
- Verification: Reviewed duplicate-code and expiration paths; manual end-to-end test (teacher code -> student join) scheduled next dev session.

## 2025-09-24 (PM2)
- Issue: The membership coupon flow was planned but not implemented, blocking premium upgrades.
- Root cause: `membership_coupons` schema existed but `/membership/*` APIs and profile UI were missing.
- Fix: Added `/api/membership/status` + `/api/membership/redeem`, enforced free-tier daily limits, and hooked the profile membership card to the live API.
- Files touched: `server/models/database.js`, `server/routes/membership.routes.js`, `server/server.js`, `client/src/services/api.service.js`, `client/src/pages/ProfilePage.js`.
- Verification: Code review for duplicate/expired coupon paths; follow-up manual redemption test planned when dev server is running.

## 2025-09-24 (PM)
- Issue: The stats page was still a placeholder, so students could not review their performance.
- Root cause: `study_records` aggregation API was missing and the React StatsPage only showed dummy text.
- Fix: Added `/api/problems/stats` to calculate type accuracy + 7-day trends and rebuilt the page with Recharts visuals.
- Files touched: server/routes/problem.routes.js, client/src/pages/StatsPage.js.
- Verification: Code review covered weekly ordering and response schema; manual verification planned once the dev server is running again.

## 2025-09-24
- Issue: Roadmap/next-step tracking was scattered across multiple docs, making daily status hard to grasp.
- Root cause: README, PROJECT_STATE, and BUILDLOG had diverging narratives after recent feature pushes.
- Fix: Consolidated a single roadmap/status table in README and synchronized PROJECT_STATE.md & BUILDLOG.md with today's priorities.
- Files touched: README.md, PROJECT_STATE.md, BUILDLOG.md.
- Verification: Reviewed README section to ensure table renders correctly, confirmed PROJECT_STATE next-step list shows new priorities, reran smoke review on docs (no build/test needed).
## 2025-09-23
- Issue: Grammar API only produced single-error fallback items and the study UI could not handle multi-answer grammar questions.
- Root cause: `aiProblemService` lacked a dedicated grammar generator/prompt, no caching for grammar types, and the React component assumed single numeric answers.
- Fix: Added OpenAI-backed grammar basic/advanced generator with DB caching, created `/generate/grammar`, and rebuilt the study grammar component to support multi-select + answer normalization.
- Files touched: `server/services/aiProblemService.js`, `server/routes/problem.routes.js`, `server/utils/csatProblemNormalizer.js`, `server/utils/problemValidator.js`, `client/src/components/study/GrammarProblemDisplay.js`, `client/src/pages/StudyPage.js`, `client/src/components/study/ProblemDisplay.js`.
- Verification: Generated sample grammar problems via Node smoke script, manually toggled multi-select answers in the React study flow, noted lint failure due to missing config (documented in Known issues).
# BUILDLOG.md

## 2025-09-20
- Issue: 사람 손으로 수정한 `problem manual/*.md`가 PDF 최신본과 어긋나 AI 출력이 흔들렸어요.
- Root cause: 매뉴얼 갱신 절차가 문서화되지 않아 PDF 변경이 즉시 반영되지 않았습니다.
- Fix: `scripts/update-problem-manuals.js`를 추가해 PDF->매뉴얼 변환을 자동화하고 관련 문서를 동기화했습니다.
- Files touched: `scripts/update-problem-manuals.js`, `PROJECT_STATE.md`, `README.md`.
- Verification: `node scripts/update-problem-manuals.js` 실행 후 출력된 매뉴얼을 샘플 점검하고 다음 AI 호출에 입력했습니다.

## 2025-09-18
- Change summary: consolidated the dev workflow around PowerShell `npm run dev:all`, reinforced grammar_span fallbacks, and refreshed problem API options handling.
- Cause: the discarded Linux automation path lacked nvm initialization, so `node` exited immediately.
- Decision: remove the bash automation, add nvm guardrails directly in docs, and focus on the PowerShell path.
- Impact scope: local dev environment, grammar_span UI, problem API (`problem.routes.js`).
- Verification: `npm run dev:all`, then `curl http://localhost:5000/health`, followed by manual grammar problem checks in the React UI.

## 2025-09-19
- Change summary: ??????된 ??롬??트/규칙 기반??로 모든 MCQ ??형????일??JSON ??키마?? 출력??도??개편??고, ??능????크 ??마 카드 UI??문제 ??이??웃????일??다.
- Cause: 기존 API 출력????형마다 ??락 ??드가 ??르?? UI????배경/???? ??택지 ??으????제 ??험 ??름????랐??
- Decision: 매뉴??`problem manual/*.md`)????롬??트??주입, ??패 ????백 로직??구축??고 `generateGrammarSpanProblem`??규칙 기반??로 ??작??했??
- Impact scope: server/services/aiProblemService.js, server/utils/grammarSpanGenerator.js, client/study 문제 카드 ??반.
- Verification: Node ??위 ??스??로 grammar span 규칙 변??을 ??인??고, 주요 ??형????동 ??행??`source`/`mainText`/`options`가 모두 채워지???? 검증했??

## 2025-09-22
- Error: insertion problems truncated sentences and revealed ASCII markers instead of exam-style numerals.
- Cause: legacy window builder trimmed target sentences and reused them when formatting the gap.
- Fix: refactored `InsertionProblemGenerator2` to render full passages then convert markers and choices to circled numbers (①~⑤).
- Files: `server/utils/insertionProblemGenerator2.js`, regenerated `generated_insertion_problems.json`, docs (`PROJECT_STATE.md`, `README.md`).
- Verification: ran `node generate_insertion_problems.js`, reviewed problems 5·19·21 in study preview for correct layout and numbering.




