## 2025-10-02 (implicit inference deterministic launch)
- Issue: 함축적 의미 추론 문제가 옛 모의고사 PDF에만 의존해 자동 생성/QA가 불가능했어요.
- Cause: 매뉴얼이 스캔본 수준에 머물러 있고, API 파이프라인에 `implicit` 유형이 연결되지 않았습니다.
- Fix: K-CSAT Implicit Master 규격을 문서화(`docs/problem-templates/implicit-master.md` 등)하고 OpenAI 생성기(`generateImplicit`)와 CSAT 세트 루프에 통합했습니다.
- Files: docs/problem-templates/implicit-master.md, implicit_problem_manual.md, problem manual/implicit_meaning_manual.md, server/services/aiProblemService.js, server/routes/problem.routes.js, server/services/ultraSimpleProblemService.js, server/config/problem-templates.json.
- Verification: 문서 교차 확인 + 코드 리뷰(추후 `npm test`/`npm run lint`로 재확인 예정).

## 2025-09-30 (doc sync - spinner QA alignment)
- Issue: 각 문서의 Top 3 포인트에 이유가 빠져 있어 오늘 집중할 일을 한눈에 읽기 어려웠습니다.
- Cause: 지난 10월 2일 정리 때 우선순위 문구만 맞추고, 왜 필요한지 설명을 적지 못했습니다.
- Fix: PROJECT_STATE.md/README.md에 우선순위별 이유를 추가하고 Current Stage를 "문서 재검토 완료" 상황으로 맞췄습니다.
- Files: PROJECT_STATE.md, README.md, BUILDLOG.md.
- Verification: 문서 교차 확인(코드 변경 없음).

## 2025-10-02 (status docs sync for spinner focus)
- Issue: Top-priority docs still highlighted 지난 닉네임 정리 작업이라, 스터디 스피너 한글화·어법 QA·클라이언트 자동화가 흐릿하게 보였습니다.
- Cause: 10월 1일 문서 정리 이후 새 과제가 생겼지만 README/PROJECT_STATE/BUILDLOG에 일관되게 반영하지 못했습니다.
- Fix: PROJECT_STATE.md와 README.md를 한글 스피너, 어법 세트 QA, 클라이언트 테스트 도입 중심으로 다시 정렬하고 BUILDLOG에 업데이트를 추가했습니다.
- Files: PROJECT_STATE.md, README.md, BUILDLOG.md.
- Verification: 손으로 문서 교차 확인 (`npm test`, `npm run lint` 현 상태 문서에 명시).

## 2025-10-01 (docs nickname cleanup)
- Issue: Status docs still exposed the DC forum nickname, which risked leaking personal info and confused external collaborators.
- Cause: Earlier documentation syncs copied the handle directly into CLAUDE.md and README.md without a neutral label.
- Fix: Replaced every occurrence with `LoE관리자`, refreshed PROJECT_STATE.md, README.md, and CLAUDE.md, and verified no other files referenced the old nickname.
- Files: PROJECT_STATE.md, README.md, CLAUDE.md.
- Verification: `grep -R "슬랄라"` returns no matches outside ignored folders.

## 2025-10-01 (grammar underline auto-heal)
- Issue: OpenAI sometimes returned grammar passages with only 2-4 `<u>...</u>` spans even though all five options were correct, so `/generate/csat-set` kept 500-ing.
- Cause: `formatGrammarProblem` required exactly five inline underlines and never rebuilt them from the option text, so minor formatting drift (대소문자, 문장부호, 다중 공백)에서 계속 실패.
- Fix: Added an underline-rebuild helper that tolerates case/whitespace/punctuation drift, surfaced richer failure diagnostics, and covered the scenario with Node tests while syncing the status docs.
- Files: server/services/aiProblemService.js, server/tests/aiProblemService.test.js, PROJECT_STATE.md, README.md.
- Verification: `npm test`, `npm run lint`.

## 2025-09-30 (grammar manual v7.1 + study queue UX sync)
- Issue: The grammar manual still referenced the older Master spec and docs kept warning about failing npm scripts even after the fixes landed, so downstream generators risked pulling stale guidance while devs hesitated to trust the tooling.
- Cause: After shipping the countdown UI and updating scripts, we forgot to refresh the manuals/docs together, leaving contributors without a single source of truth.
- Fix: Replaced both `grammar_problem_manual.md` files with Master v7.1 (Style Contract + Variation Engine + 어휘 확장 가이드), revised PROJECT_STATE/README to call out the new priorities, and logged the countdown QA + manual propagation tasks.
- Files: grammar_problem_manual.md, problem manual/grammar_problem_manual.md, PROJECT_STATE.md, README.md, BUILDLOG.md.
- Verification: `npm test`, `npm run lint` on Windows/WSL shell (both pass).

## 2025-10-02 (title manual v1.0 + generator hardening)
- Issue: Title generation은 고정 지침 없이 4지선다 JSON을 반환해, 실행마다 결과가 달라지고 한국어 지시문/어휘 결함 필터가 빠져 있었다.
- Cause: 기존 prompt가 간단한 지시만 주고, Style Contract나 오답 유형 규격을 강제하지 않았다.
- Fix: 도큐먼트(`docs/problem-templates/title-master.md`, `title_problem_manual.md`, `problem manual/title_problem_manual.md`)로 결정적 규격을 정리하고, `generateTitle` 프롬프트/검증 로직을 업데이트해 5지선다·6~12단어·한국어 해설을 강제했다.
- Files: docs/problem-templates/title-master.md, title_problem_manual.md, problem manual/title_problem_manual.md, server/services/aiProblemService.js, server/config/problem-templates.json, PROJECT_STATE.md.
- Verification: `node --test server/tests/aiProblemService.test.js` (regression suite).

## 2025-10-02 (summary AB deterministic overhaul)
- Issue: Summary AB(빈칸) 메뉴얼이 간단한 포맷 정보만 제공해, 요약문 길이/오답 유형/Collocation 등을 일관되게 강제하지 못했다.
- Cause: 기존 템플릿은 기본 구조만 정의하고, Variation Engine·Triviality 필터·어휘 결함 규칙이 누락돼 있었다.
- Fix: 새 통합 매뉴얼로 Style Contract/What-Why-So-what 모델을 정의하고, `summaryTemplate`/`generateSummary` 프롬프트·검증을 18~35단어 한문장, ①~⑤ en-dash 조합, 한국어 해설, `출처│` 라벨 검증까지 강화했다.
- Files: docs/problem-templates/summary-two-blank.md, summary_problem_manual.md, problem manual/summary_problem_manual.md, server/utils/summaryTemplate.js, server/services/aiProblemService.js, PROJECT_STATE.md.
- Verification: `node --test server/tests/aiProblemService.test.js`.

## 2025-10-02 (cloze deterministic overhaul)
- Issue: 일반 빈칸/영영풀이/패러프레이즈/문장삽입 유형이 산발적으로 구현돼, 실행마다 옵션 수·지시문·해설 언어가 불안정했다.
- Cause: 기존 prompt가 4지선다 JSON을 요구하고, Style Contract/오답 결함 규칙을 강제하지 않았다.
- Fix: `docs/problem-templates/blank-master.md`와 배포용 메뉴얼을 작성하고, `generateBlank`가 5지선다, 질문 화이트리스트, placeholder 검사, 한국어 해설, `출처│` 라벨을 강제하도록 프롬프트·검증 로직을 재구성했다.
- Files: docs/problem-templates/blank-master.md, blank_problem_manual.md, problem manual/blank_problem_manual.md, server/services/aiProblemService.js, server/config/problem-templates.json, PROJECT_STATE.md.
- Verification: `node --test server/tests/aiProblemService.test.js`.

## 2025-10-02 (topic deterministic overhaul)
- Issue: 주제(Topic) 문제는 제목과 혼동됨, 4지선다 출력과 느슨한 오답 설계로 실행마다 결과가 달라졌다.
- Cause: 기존 prompt가 기본 구조만 지시하고, 논지·범위·오답 결함 규칙을 강제하지 않았다.
- Fix: `docs/problem-templates/topic-master.md`, `theme_problem_manual.md`, `problem manual/theme_problem_manual.md`를 작성하고, `generateTheme`가 새 규격(5지선다, 6~14 단어, 한국어 해설, `출처│` 라벨, 결함 메타 태그)을 강제하도록 업데이트했다.
- Files: docs/problem-templates/topic-master.md, theme_problem_manual.md, problem manual/theme_problem_manual.md, server/services/aiProblemService.js, server/config/problem-templates.json, PROJECT_STATE.md.
- Verification: `node --test server/tests/aiProblemService.test.js`.

## 2025-09-30 (status docs + CLI verification)
- Issue: Status docs called out the automation backlog but skipped the exact failure messages from `npm test` and `npm run lint`, so Windows users still had to rediscover the errors.
- Cause: After the previous sync we never re-ran the scripts on the current branch, so the documentation referenced fixes without showing their reproduction details.
- Fix: Re-ran both commands, captured the `Could not find '/mnt/c/Users/jaekw/Desktop/league-of-english/server/tests/**/*.test.js'` and "ESLint couldn't find a configuration file" outputs, and updated PROJECT_STATE.md/README.md with those specifics while logging the sync.
- Files: PROJECT_STATE.md, README.md, BUILDLOG.md.
- Verification: `npm test` (expected failure reproduced), `npm run lint` (expected failure reproduced).

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
