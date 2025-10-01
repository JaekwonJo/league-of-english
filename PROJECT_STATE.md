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
- Membership tiers: 무료 회원은 생성 즉시 주어지는 미저장(캐시 X) 문제와 느린 응답 속도로 체험하고, 유료(프리미엄 9,900원/프로 19,900원)는 검증된 문제 캐시와 빠른 배포, 프로는 추가 분석 리포트까지 받습니다.

## Current Stage
- Blank 파이프라인이 원문 길이와 문장 수를 검증해 기존의 짧은 캐시 문제를 모두 걸러내고, 새 항목에는 원문 길이/문장 메타를 저장합니다.
- `problem_exposures`가 정답/오답을 추적하며 틀린 문제는 쿨다운 후 확률적으로 재출제되고, 맞힌 문제는 자동 제외돼요.
- 홈·프로필·학습 설정 화면에 “복습 대기열” 카드가 추가되어 최근 오답과 바로가기 버튼을 한눈에 볼 수 있습니다.
- 관리자 페이지에 문제 라이브러리 뷰가 생겨 저장된 문제를 유형별로 훑어보고, 원하는 조합만 PDF로 내보낼 수 있어요.
- 라이트/다크 테마 토글이 모든 주요 화면(랭킹·통계·관리자 포함)에 적용되고, `tierConfig`·`appConfig` 같은 JSON 색상도 CSS 변수로 치환됐습니다.
- 함축 추론 생성기가 `<u>` 태그를 빼먹은 응답도 `targetSpan`을 활용해 자동 보정하고, 실패 사유를 프롬프트에 즉시 전달해 재시도 품질을 높였습니다.
- 어법과 어휘 문제는 각각 전용 메뉴얼·프롬프트로 생성되고, 학습/홈 화면에서도 `어법`, `어휘` 타입이 분리되어 선택·통계가 가능한 상태입니다.
- `server/tmp/implicit-retries.log`에 함축 추론 재시도 로그가 JSONL로 누적돼 실패한 variantTag와 사유를 바로 추적할 수 있어요.
- `analysisService`가 지문 분석본을 DB(`passage_analyses`)에 저장하고, 분석 페이지는 해당 데이터를 불러오는 API 골격을 갖췄습니다.

## Next 3 (priority)
1. **분석 데이터 UI 연결 완성.** `analysisService`가 저장한 요약·핵심 포인트·질문 데이터를 Analysis 페이지 카드/차트에 실데이터로 표시해 “분석 자료” 요구를 충족시킵니다.
2. **어휘 학습 루틴 고도화.** 현재 플래시카드/퀵 세트만 있는 Vocabulary 흐름을 단어장 저장·반복·스피드모드로 확장해 “단어 학습” 목표를 달성합니다.
3. **베타 배포 파이프라인 준비.** Render/Vercel 기준 `.env` 예시, 빌드/시드 스크립트, 데이터 백업 절차를 문서화해 1주 내 베타 배포를 실행 가능하게 만듭니다.

## Known issues
- Analysis 페이지가 아직 더미 카드/그래프를 쓰고 있어 DB에 저장된 분석본이 직접 표시되지 않습니다.
- Vocabulary 학습이 플래시카드 수준에 머물러 오답 저장·반복 루프·발음 음원 같은 학습 기능이 비어 있습니다.
- 함축 추론 생성이 `targetSpan` 없이 오면 여전히 실패하며, 괄호 강조 등 두 번째 방어 장치가 없습니다.
- ProblemLibrary에서 유형 토글 시 이전 집계 값이 잠깐 보이는 플리커가 남아 있어 UX가 어색합니다.
- 재출제 확률이 하드코딩이라 학생 데이터에 맞춘 동적 조정이나 관리자 설정 화면이 없습니다.

## Resolved (2025-10-01 - implicit log + vocab/grammar split hardening)
- `server/services/aiProblemService.js`가 외부 어법/어휘 메뉴얼 경로를 우선 읽어 정확한 템플릿을 적용합니다.
- `tierConfig.json`·`appConfig.json` 색상을 CSS 변수로 통일해 라이트/다크 테마에서 대비가 유지됩니다.
- 함축 추론 생성 로그가 `server/tmp/implicit-retries.log`에 JSONL로 남아 재시도 사유를 추적할 수 있습니다.
- PROJECT_STATE.md·BUILDLOG.md·README.md를 최신 목표/이슈/요약으로 동기화했습니다.

## Resolved (2025-10-06 - blank passage truncation guard)
- `_normalizeBlankPayload`가 원문 전체 단락 길이와 문장 수를 저장·검증해 잘린 지문이 캐시에 남지 않도록 차단했습니다.
- `_acceptCachedProblem`이 축약본/의도치 않은 단문을 자동 폐기하고, 필요 시 즉시 재생성 루프에 넣어 빈칸 품질을 유지합니다.
- 문제 저장 시 원문 길이 메타를 기록해 관리자 라이브러리에서도 축약 여부를 한눈에 확인할 수 있게 했습니다.

## Resolved (2025-10-01 - grammar/vocabulary split + implicit retry log)
- Grammar/Vocabulary 프롬프트와 메뉴얼을 분리해 `/mnt/c/...` 외부 최신본을 그대로 읽고, 학습 UI도 `어법`·`어휘` 선택을 독립시켰습니다.
- `generateImplicit`가 `targetSpan`으로 `<u>` 구간을 자동 복원하고, 실패 사유/variantTag를 JSONL(`server/tmp/implicit-retries.log`)로 남깁니다.
- 테마 컨텍스트와 CSS 변수 팔레트를 재정비해 `tierConfig`·`appConfig` 등 JSON 색상이 라이트/다크에서 동일하게 보입니다.
- 복습/홈 카드가 어법·어휘 통계를 따로 보여줘 추적이 쉬워졌습니다.

## Resolved (2025-10-07 - implicit underline guard + full theme tokens)
- 함축 추론 생성기에 `targetSpan` 기반 보정과 실패 사유 피드백을 추가해 `<u>` 누락으로 세트 생성이 막히던 문제를 해결했습니다.
- StudyResult/Ranking/Analysis/관리자 UI 등 전 화면을 CSS 변수 팔레트로 리팩터링해 라이트·다크 테마가 일관되게 적용됩니다.
- `problemTypes.json`/`analysis.config.json`/UI 설정을 CSS 변수로 치환해 문서 기반 색상 정의도 토글에 맞춰 변하도록 정리했습니다.

## Resolved (2025-10-05 - review queue & problem library)
- 홈/프로필/StudyPage 설정 화면에 복습 대기열 카드와 자동 시작 플로우를 붙여 틀린 문제를 바로 다시 풀 수 있게 했습니다.
- `/problems/review-queue`와 `/problems/review-session` API가 학생별 오답을 가져와 재출제 결과를 `startManualSession`으로 넘겨주고, 리뷰 세션이 끝나면 미리보기 숫자가 갱신돼요.
- 관리용 ProblemLibrary 컴포넌트가 저장된 문제를 문서·유형별로 훑어보고, 최대 100문제까지 PDF로 묶어 내려받을 수 있도록 했습니다.

## Resolved (2025-10-04 - blank 해설/재출제/PDF)
- `_normalizeBlankPayload`가 한글 해설 3문장·전 오답 사유를 강제하고, 프롬프트도 distractor 설명을 명시하게 보강했습니다.
- `problem_exposures`에 정답/오답 카운트와 `last_result`를 추가해서 맞은 문제는 제외, 틀린 문제는 쿨다운 후 확률적으로 재출제되도록 업데이트했습니다.
- `/problems/export/pdf` 엔드포인트와 React 모달을 추가해 관리자 계정이 최대 100문제를 한글 폰트 포함 PDF로 내려받을 수 있습니다.

## Resolved (2025-10-03 - study scoring & analytics)
- `studyService`를 추가해 `POST /problems/submit`, `GET /problems/stats`가 학습 결과를 저장·집계하고, 점수/티어/랭크가 즉시 갱신되도록 만들었어요.
- 학생이 푼 문제는 `study_records`에 누적되고, per-type 정답률·주간 학습 수치가 같은 API로 노출돼요.
- React `StudyResult`/`Home` 화면을 새 통계에 맞춰 업데이트해서 획득 LP, 누적 LP, 유형별 성과를 바로 복습할 수 있어요.

## Resolved (2025-10-02 - irrelevant sentence deterministic manual)
- Replaced the ad-hoc 무관 문장 가이드(`problem manual/irrelevant_problem_manual.md`) with the deterministic Irrelevant Master spec (`docs/problem-templates/irrelevant-master.md`, `irrelevant_problem_manual.md`) so 흐름상 무관한 문장도 같은 규격으로 재현돼요.
- Added `generateIrrelevant` to the AI generator + CSAT 세트/스마트 출제 루프에 연결하고, `problem-templates.json` 프롬프트까지 맞춰 OpenAI로 문제를 뽑아 저장·노출 차단까지 한 번에 돌아가요.
- Exposed metadata(`irrelevantType`, `defectAxis`)와 `출처│` 규칙을 적용해 QA/로깅과 문서 흐름이 다른 유형과 동일하게 맞춰졌어요.

## Resolved (2025-10-02 - implicit inference deterministic manual)
- Shipped the K-CSAT Implicit Master spec (`docs/problem-templates/implicit-master.md`, `implicit_problem_manual.md`, `problem manual/implicit_meaning_manual.md`) so 함축적 의미 추론도 다른 유형처럼 결정형으로 재현돼요.
- Added `generateImplicit` to the AI problem service + routes so `implicit` 타입이 OpenAI로 생성/저장되고, CSAT 세트·스마트 출제에서도 바로 고를 수 있어요.
- Updated `problem-templates.json` 프롬프트와 expose/캐시 로직까지 묶어 `출처│`·결함 태그·노출 차단 규칙을 그대로 따르게 했어요.

## Resolved (2025-10-01 - docs nickname cleanup)
- Replaced the personal nickname with `LoE관리자` across status docs to keep published materials professional and avoid leaking DC forum handles.
- Updated README and CLAUDE overview so future contributors see the new naming instantly.
- Confirmed no other files reference the deprecated nickname by searching the repository.

## Resolved (2025-10-01 - grammar underline auto-heal)
- Patched `formatGrammarProblem` to rebuild missing `<u>...</u>` spans from the provided options (대소문자/문장부호 차이 허용), 추가 실패 진단을 붙이고 Node 테스트로 검증해 4-underlines payload에서도 더 이상 500이 나지 않게 했습니다.
- Verified the fix locally with `npm test` and `npm run lint` (both green on Windows/WSL).

## Resolved (2025-09-30 - grammar manual v7.1 + tooling sync)
- Upgraded `grammar_problem_manual.md` (root + problem manual) to Master v7.1, documenting the Style Contract/Variation Engine 분리와 어법·어휘 통합 패턴 가이드.
- Confirmed `npm test` (Node test runner) and `npm run lint` succeed on Windows/WSL after the earlier script + ESLint config fixes.
- Captured follow-up priorities (loading UI QA, manual propagation, client lint/tests) so the team knows where to focus next.

## Resolved (2025-10-02 - deterministic title manual)
- Added the K-CSAT Title Master deterministic manual (`docs/problem-templates/title-master.md`, `title_problem_manual.md`, `problem manual/title_problem_manual.md`) covering Style Contract, variation engine, 오답 유형, 루브릭.
- Updated the OpenAI title generator prompt/validation so it consumes the manual snippet, enforces 5 options(6~12 words), Korean question text, and Korean rationale.

## Resolved (2025-10-02 - summary AB deterministic manual)
- Replaced the summary(빈칸 A/B) manuals (`docs/problem-templates/summary-two-blank.md`, `summary_problem_manual.md`, `problem manual/summary_problem_manual.md`) with the deterministic Style Contract/Variation guide.
- Hardened `summaryTemplate`/`generateSummary` prompts and validation: new 한국어 지시문, 18~35 word single-sentence requirement, ①~⑤ en-dash pairs, Korean rationale, `출처│` 라벨.

## Resolved (2025-10-02 - cloze blank deterministic manual)
- Added the blank/cloze Style Contract manual (`docs/problem-templates/blank-master.md`, `blank_problem_manual.md`, `problem manual/blank_problem_manual.md`) covering four pattern families and distractor defects.
- Updated `generateBlank` prompt/validation to rely on the manual, enforce 5 options with circled digits, question whitelist, Korean explanation, placeholder detection, and `출처│` 라벨.

## Resolved (2025-10-02 - topic deterministic manual)
- Added the K-CSAT Topic Master manual (`docs/problem-templates/topic-master.md`, `theme_problem_manual.md`, `problem manual/theme_problem_manual.md`) so 주제 문제가 논지+범위 기준으로 재현 가능.
- Hardened `generateTheme` prompt/validation: 5 options(6~14 단어), 한국어 해설, `출처│` 라벨, 오답 결함 메타태그.

## Resolved (2025-09-30 - doc sync + CLI verification)
- Re-read PROJECT_STATE.md, README.md, and BUILDLOG.md, then re-ran `npm test` and `npm run lint` to capture the current failure messages so the status docs stay actionable while the fixes are pending.
- Recorded the exact Windows glob error and ESLint config gap inside the status docs to guide whoever tackles the automation backlog next.

## Resolved (2025-09-30)
- Re-synced PROJECT_STATE.md, README.md, and BUILDLOG.md to spotlight the queue-ready backend, refreshed Top 3 priorities, and the temporary `node --test` workaround.
- Re-ran `node --test server/tests/aiProblemService.test.js` to confirm circled-digit formatting and exposure tracking stay green while the npm script fix is pending.
- Adopted the Claude×ChatGPT 통합 빈칸 메뉴얼 (`problem manual/빈칸_메뉴얼_GPTxClaude.md`) across the backend: rebuilt the blank prompt, validator, and cache filter so every CSAT blank problem returns JSON with family/strategy tags, 3~18 word English options, spelled-out numerals, and a single `____` placeholder.

## Resolved (2025-09-28)
- Added `problem_exposures` table + `markExposures` so cached questions only appear once per student.
- Reworked `/generate/csat-set` to fetch unseen cached items first, then persist fresh OpenAI batches, and queue OpenAI calls with retry/backoff.
- Updated the Wolgo grammar template/normaliser to keep circled digits + source labels intact and introduced node-test coverage for summary/grammar/exposure flows.

## Resolved (2025-09-26)
- Added `server/utils/summaryTemplate.js` and rewrote `aiProblemService` to build/validate CSAT-style summary problems (A/B blanks, circled options, source labels).
- Integrated the Wolgo grammar template via `server/utils/eobeopTemplate.js`, removed basic/advanced fallbacks, and returned API-only grammar batches with circled options and underlined passages.
- Rebuilt `/generate/csat-set` route to enforce 5-question steps (max 20), dispatch batched generators, and normalize responses for the React study screen.
- Updated the study client (`useStudySession`, `StudyConfig`, `ProblemDisplay`, `GrammarProblemDisplay`) to request 5-at-once, render list mode cleanly, and support the new summary/grammar data shape.
