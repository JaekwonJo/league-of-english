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
- `aiProblemService`가 메뉴얼 로더·노출 정책·문항 저장소·OpenAI 큐 도우미로 나뉘고, 새 `problemSetService`가 `/generate/csat-set`을 맡아 타입별 진행 로그와 `partial_generation` 정보를 함께 반환합니다.
- 요약 생성기는 실패 로그를 해석해 맞춤 지시문을 붙이고 최대 5회까지 재시도하므로, 길이/단어수 제약에 걸린 경우에도 스스로 교정하도록 진화했습니다.
- 어법 생성기는 실패 로그에서 "밑줄 그대로"나 오류 키워드 누락을 감지하면 추가 지시문을 붙여 잘못된 밑줄을 반드시 수정하도록 6회까지 재시도하고, 실패 사유에 맞춰 밑줄·이유 필드를 자동 보완해요.
- 학습 설정의 랜덤 배치는 선택한 지문 수를 그대로 반영하고, 유형 수 조절이 1문제 단위로 가능해 17문처럼 특이한 숫자도 그대로 유지돼요. 문제 유형을 하나도 고르지 않으면 바로 안내창이 떠서 빈 요청이 서버로 가지 않아요.
- 로딩 화면은 테마 토큰을 사용하는 진행 막대로 시각 피드백을 유지하고, 복습 모드에는 🔝 버튼을 붙여 긴 리스트도 곧바로 맨 위로 돌아갈 수 있어요. 결과 화면 랭킹·격려 문구도 `--text-*` 팔레트를 써서 다크 모드 대비가 살아났습니다.
- 학습 프런트가 `features/study` 아래로 재배치돼 설정(`config`), 풀이(`problem`), 결과(`result`)가 각각 전용 훅·스타일·컴포넌트로 나뉘어 재사용성과 경로 구조가 정리됐어요.
- `StudyConfig`는 API/상태 관리 훅(`useStudyConfig`)과 단계별 뷰(`DocumentStep`·`PassageStep`·`ProblemTypeStep`)로 쪼개져 단계 이동·랜덤 선택·로컬 저장 로직을 한눈에 추적할 수 있습니다.
- `ProblemDisplay`·`StudyResult`가 옵션/정답/티어 UI를 별도 컴포넌트·스타일로 분리해 리뷰/목록 뷰를 공통으로 쓰고, 복습 카드/랭킹 패널도 재사용 가능한 블록이 됐습니다.
- 문제 화면에 👍/🚨 버튼이 추가되어 `problem_feedback` 테이블에 저장되고, 같은 유저의 좋아요는 토글·신고는 사유 갱신으로 처리돼요.
- 신고가 쌓이면 사용자·지문별 rate-limit을 통과한 기록만 `problem_feedback_events`·`admin_notifications`에 저장되고, 관리자 페이지 신고 보드에서 바로 완료/보류 처리를 누르며 상태가 갱신됩니다.
- 저장된 학습 세션을 로컬·서버에 동시에 보관해 다시 접속했을 때 `이어서 풀기` 버튼으로 복구할 수 있고, 제출 시 서버 스냅샷도 정리해 중복 학습을 막아요.
- Blank 파이프라인이 원문 길이와 문장 수를 검증해 기존의 짧은 캐시 문제를 모두 걸러내고, 새 항목에는 원문 길이/문장 메타를 저장합니다.
- `problem_exposures`가 정답/오답을 추적하며 틀린 문제는 쿨다운 후 확률적으로 재출제되고, 맞힌 문제는 자동 제외돼요.
- 홈·프로필·학습 설정 화면에 “복습 대기열” 카드가 추가되어 최근 오답과 바로가기 버튼을 한눈에 볼 수 있습니다.
- 관리자 페이지에 문제 라이브러리 뷰가 생겨 저장된 문제를 유형별로 훑어보고, 원하는 조합만 PDF로 내보낼 수 있어요.
- 문서 카드의 🌐 버튼으로 전체/학교/학년/학생 단위 공개 범위를 지정할 수 있고, 학생 목록은 이 규칙에 맞춰 필터링돼요.
- 라이트/다크 테마 토글이 모든 주요 화면(랭킹·통계·관리자 포함)에 적용되고, `tierConfig`·`appConfig` 같은 JSON 색상도 CSS 변수로 치환됐습니다.
- `adminStyles`, `analysis` 계열 스타일, 학습 헤드업 디스플레이 등에서 텍스트 색상을 전부 `--text-*` 토큰으로 표준화해 다크 테마에서도 가독성이 유지됩니다.
- 함축 추론 생성기가 `<u>` 태그를 빼먹은 응답도 `targetSpan`을 활용해 자동 보정하고, 실패 사유를 프롬프트에 즉시 전달해 재시도 품질을 높였습니다.
- 어법과 어휘 문제는 각각 전용 메뉴얼·프롬프트로 생성되고, 학습/홈 화면에서도 `어법`, `어휘` 타입이 분리되어 선택·통계가 가능한 상태입니다.
- `server/tmp/implicit-retries.log`에 함축 추론 재시도 로그가 JSONL로 누적돼 실패한 variantTag와 사유를 바로 추적할 수 있어요.
- `analysisService`가 지문 분석본을 DB(`passage_analyses`)에 저장하고, 새 `/documents/:id/passages` API로 원문/요약/단어 수를 한 번에 불러옵니다.
- 관리자·학생 분석 화면과 학습 설정이 `PassagePickerGrid`를 공유해 지문 미리보기·최대 3개 선택·전체보기 UX가 일관되게 동작합니다.
- Analysis 화면에서 Variant 1·2 분석본을 탭으로 보여주고, 교사/관리자가 1~3개씩 요청하면 AI가 빈 슬롯(최대 2개)만 채워 캐시에 저장합니다. 무료 회원은 하루 10개까지만 열람하도록 뷰 로그로 제한돼요.
- 새 CSAT 세트 서비스가 타입별 캐시→AI→정규화 과정을 분리하고 남은 문제라도 돌려주지만, `blank`/`vocabulary` 검증기가 빡세서 `partial_generation` 로그가 자주 남습니다.
- `/generate/csat-set`이 `passageNumbers`를 받아 선택한 지문으로만 문제를 만들고, 학습 세션이 불필요한 본문까지 돌지 않도록 백엔드를 보강해 놨어요.
- Variant 분석 화면에는 이미 "도움이 됐어요"/신고 흐름이 붙었지만, 학습 화면은 아직 버튼이 없어 동일한 품질 피드백 흐름을 이어 붙여야 합니다.
- 회원가입은 이메일 인증 코드를 입력해야 완료되고, 60초 쿨다운·10분 만료가 적용돼요. 프리미엄/프로 입금 요청을 보내면 관리자에게 안내 메일이 자동 발송됩니다.
- Vocabulary PDF 파서가 Day 문자열 속 숨은 단어까지 분해해 30문항이 온전하게 저장되고, 퀴즈 생성기는 뜻↔단어 양방향 출제·보기 셔플·정답 검증을 모두 통과한 문제만 저장합니다.
- 어휘 퀴즈 화면에 티어 기반 3분 타이머, 이전/다음 이동, 제출 전 확인, 시간 소요 요약을 붙여 실제 시험처럼 연습할 수 있게 했어요.
- 로그인할 때마다 `auth_logs`와 사용자 프로필(`last_login_at`, `login_count`, `last_login_ip`)을 갱신하고, 문제 풀이가 끝나면 `study_session_logs`에 세션 요약을 남겨 학습 기록·티어·랭크가 확실히 추적돼요.
- StudyPage와 AnalysisPage에 공통 오류 패널(`FriendlyError`)을 붙여서, 요약·세부 로그·재시도 버튼을 한 화면에서 안내합니다.
- 학습 설정에서 ‘랜덤/순서대로 풀기’를 고를 수 있고, 서버도 `orderMode` 값에 맞춰 문제 순서를 섞거나 유지합니다.
- 분석 자료 목록에 단어장도 노출되고 있어요. 어휘 자료는 분석 메뉴에 필요 없으니, 문서 타입을 분리하거나 필터링해야 합니다.

## Today’s Top 3 (2025-10-18)
1. **AI 문제 6종 통합 테스트.** 어법·빈칸을 포함한 생성 파이프라인을 실제 OpenAI 호출과 검증 로직으로 재현하는 통합 테스트/리포트를 추가해 "밑줄 변경"·길이 규칙을 자동으로 확인합니다. (출제 안정성)
2. **신고 보드 필터 & 안내.** 유형/문서/사용자 필터, CSV 내보내기, 429 토스트를 신고 대시보드와 학습 화면에 붙여 품질 triage와 사용자 안내를 빠르게 합니다. (운영 효율)
3. **랭킹/세션 복구 E2E.** 랭킹 패널·LP 반영·세션 이어풀기·다크 테마 대비를 한 번에 검증하는 Playwright 시나리오를 작성해 베타 전 QA를 자동화합니다. (베타 준비)

## Known issues
- 빈칸 검증기가 여전히 정답 보기를 원문과 완벽히 맞추지 못하면 `partial_generation`만 남기고 중단돼요. 재시도 횟수/허용 오차를 낮춰야 합니다.
- 어휘 생성기는 본문에 `(A)` 자리 표시자가 없으면 즉시 실패해 "passage missing slot marker (A)" 로그가 쌓이고, 다른 유형까지 함께 빠집니다.
- 신고 보드는 아직 유형/문서/사용자 필터, 검색, 나가기 전 CSV 다운로드 같은 정리 기능이 없어 처리 속도가 느립니다.
- rate-limit이 발동되면 429를 던지긴 하지만, 학습 화면에서 토스트와 가이드 타이머가 없어 사용자가 왜 막혔는지 이해하기 어렵습니다.
- 클라우드 학습 세션은 시작 시 스냅샷만 저장하고 진행 중 경과/타이머를 동기화하지 않아 장시간 학습 시 정확도가 떨어질 수 있습니다.
- React 테스트 실행 시 `act(...)` 경고가 계속 출력돼 대기열/렌더 타이밍 버그를 찾기 어렵습니다.

## Resolved (2025-10-18 - 어법 재시도 지시문 + 학습 UX 다듬기)
- `aiProblemService._deriveEobeopDirectives`가 "segment unchanged"·"오류 키워드 없음" 실패 로그를 감지해 밑줄 수정·한국어 사유 지시문을 추가하고, 어법 생성이 원문과 똑같은 보기로 멈추지 않도록 6회까지 재시도합니다.
- 학습 설정의 랜덤 배치가 선택한 지문 수를 그대로 반영하고 1문제 단위로 조절되며, 로딩 막대는 `--progress-gradient`로 테마에 맞춰 다시 표시됩니다. 복습 모드에는 🔝 버튼을 붙여 긴 목록도 즉시 맨 위로 이동합니다.
- 결과 화면 랭킹 패널과 격려 문구가 `--text-*` 팔레트를 사용해 다크 모드 대비가 개선됐고, `StudyResult` 메시지는 메인 텍스트 색상을 따라 읽기 쉬워졌습니다.
- Verification: `npm test`, `npm run lint`, `CI=true npm --prefix client test -- --watch=false --runInBand`

## Resolved (2025-10-17 - 요약 재시도 힌트 + 다크모드 대비 개선)
- `summaryTemplate`에 `deriveSummaryDirectives`를 추가하고, `generateSummary`가 실패 메시지를 분석해 맞춤 지시문과 variant 태그를 붙여 최대 5회까지 재시도하도록 손봤어요.
- 새 `server/tests/summaryTemplate.test.js`가 지시문 생성과 프롬프트 주입을 검증해, 길이/단어수 오류가 다시 슬립되는 걸 막아줍니다.
- 클라이언트 전역에서 `var(--color-slate-###)` 텍스트 색상을 `--text-*` 토큰으로 교체해 다크모드에서도 대비가 유지되고, 공유 모달 입력창도 테마 색상을 따르게 정리했습니다.
- 검증: `npm test`, `CI=true npm --prefix client test -- --watch=false --runInBand`, `npm run lint`.

## Resolved (2025-10-16 - 신고 운영판 + 학습 세션 클라우드)
- 관리자 페이지에 `ProblemFeedbackBoard`와 `AdminNotificationsPanel`을 추가해 문항 신고를 상태별로 확인하고, 1클릭으로 완료/보류 처리할 수 있습니다.
- `problemFeedbackService`가 IP/지문 기반 rate-limit과 이벤트 로그를 기록하고, 신고가 접수되면 `admin_notifications` 큐에 적재해 후속 알림과 추적을 돕습니다.
- 새로운 `/api/study/session` 라우트와 `studySessionService`가 학습 스냅샷을 DB에 저장/복구하고 제출 시 정리하도록 만들었어요. 프런트 `useStudySession`은 로그인 시 클라우드 데이터를 불러오고 저장/삭제도 함께 동기화합니다.
- 관리자/알림 훅(`useProblemFeedbackReports`, `useAdminNotifications`)과 대응 테스트를 추가해서 대시보드 데이터가 정상적으로 갱신되는지 검증합니다.
- Verification: `npm test`, `CI=true npm --prefix client test -- --watch=false --runInBand`, `npm run lint`

## Resolved (2025-10-15 - Study 프런트 모듈화 2단계)
- `client/src/features/study/config`에 `useStudyConfig`와 단계별 뷰(`DocumentStep`·`PassageStep`·`ProblemTypeStep`)를 도입해 문서/지문/유형 선택 로직을 깔끔하게 분리했습니다.
- `ProblemDisplay`를 `features/study/problem`으로 이사시키고 리뷰/인터랙션 옵션, 텍스트 포매터, 스타일을 별도 모듈로 나눠 모든 유형이 동일한 레이아웃을 공유합니다.
- `StudyResult`가 카드·랭킹·통계 뷰를 컴포넌트화(`ResultCard`, `RankPanel`, `ResultEffects`)해 티어 UI·문항 요약을 재사용 가능 구조로 재정리했습니다.
- `problem_feedback` 서비스와 라우트를 추가해 학습 화면에서 누른 👍/🚨가 DB에 저장되고, 같은 유저의 좋아요는 토글·신고는 사유 갱신으로 기록돼요.
- 학습 세션을 로컬에 저장해 “이어서 풀기” 버튼으로 복구할 수 있고, StudyConfig/ProblemDisplay/ResultCard에 대한 기본 렌더/인터랙션 테스트를 추가했습니다.
- Verification: `npm test`, `CI=true npm --prefix client test -- --watch=false --runInBand`, `npm run lint`

## Resolved (2025-10-14 - csat 서비스 모듈화 + study 화면 분리)
- `aiProblemService`가 manual 로더, 노출 정책, 문제 저장소, OpenAI 큐 도우미로 나뉘고 새 `problemSetService`가 `/generate/csat-set`을 맡아 타입별 진행 로그와 실패 요약을 돌려줍니다.
- StudyPage를 `LoadingState`·`GenerationSummary`·`ReviewCallout`·`StudyModeView`·`ReviewModeView`로 분리하고 스타일을 `viewStyles`로 묶어 로딩·복습·풀이 UI를 모듈식으로 재사용할 수 있게 했어요.
- Verification: `npm test`

## Resolved (2025-10-10 - study order toggle & friendly error panels)
- StudyPage와 AnalysisPage가 새 `FriendlyError` 패널을 공유해, 오류 요약·세부 로그·재시도 버튼을 한 번에 안내하고 홈으로 돌아올 수 있게 했어요.
- 학습 설정에서 랜덤/순서 모드를 고르면 `/generate/csat-set`이 `orderMode`를 받아 문제 배열을 섞거나 유지하도록 수정했습니다.
- 오류 상세는 접기/펼치기로 숨겨두고, 필요하면 스택과 원문 메시지를 확인할 수 있도록 구성했어요.

## Resolved (2025-10-11 - auth/study logging hardening)
- 회원가입 시 비밀번호 복잡도 검사를 추가하고 기본 회원권을 `free`로 고정해, 중복 가입/약한 비밀번호 문제를 막았어요.
- 로그인 성공 시 `last_login_at`·`last_login_ip`·`login_count`를 업데이트하고 감사 로그에 남겨 사용자 접속 기록이 누락되지 않도록 했습니다.
- 문제 풀이가 끝나면 `study_session_logs`에 총 문항·정답·점수 변화를 저장하고, 통계 화면은 해당 로그를 기반으로 세션 수/최근 7일 기록을 계산해요.

## Resolved (2025-10-04 - vocabulary parser & timed quiz)
- WordMaster 등 PDF에서 붙어 나오던 `12Day` 형태를 전부 분해해, 빠진 단어 없이 Day별 30문항이 그대로 저장·조회되도록 파서를 보강했습니다.
- 어휘 퀴즈 생성기가 뜻↔단어 양방향 문제를 만들고, 보기 셔플·중복 제거·정답 검증까지 통과한 항목만 DB에 저장합니다.
- 학생 화면은 티어별 3분(티어마다 -5초) 타이머, 이전/다음 탐색, 제출 전 확인 팝업을 지원하며, 결과 화면에 모드·정답·소요 시간을 함께 정리합니다.
- 단어장 카드에서 실제 단어 미리보기는 숨기고 Day·단어 수만 노출해, 시험 직전에 정답이 노출되는 문제를 없앴습니다.

## Resolved (2025-10-04 - passage picker & study sync)
- `/documents/:id/passages` API가 전체 원문/요약/단어 수를 반환해 관리자·학생·학습 설정 화면이 같은 본문 데이터를 공유하게 됐어요.
- `PassagePickerGrid`와 `PassagePreviewModal`을 만들어 관리자 분석 모달, 학생 분석 페이지, 학습 설정이 모두 카드 미리보기 + 최대 3개 선택 UX로 통일됐습니다.
- 학습 설정/문제 요청 시 `passageNumbers`를 함께 넘기도록 준비해 두었고, 다음 단계에서 백엔드 필터링만 붙이면 선택 지문과 생성 결과가 일치하게 됩니다.
- README·PROJECT_STATE·BUILDLOG에도 새 흐름과 환경 변수를 반영해 문서와 실제 UI가 어긋나지 않도록 정리했습니다.

## Resolved (2025-10-08 - email verification + membership request + analysis feedback)
- 회원가입에 이메일 인증 코드를 붙이고, 60초 재전송 쿨다운·10분 만료·재사용 차단 로직을 구축했습니다.
- `membership.requests` 라우트와 프로필 UI를 추가해 무통장 입금 요청을 보내면 관리자 이메일로 알림이 오고, 쿠폰/만료 정보가 DB에 저장되도록 했어요.
- 분석 페이지에 Variant 추천/신고 버튼과 신고 사유 모달을 붙이고, 관리자 페이지에서 처리 상태를 업데이트할 수 있게 API를 확장했습니다.
- `docs/deploy-guide.md`, `.env.example`를 갱신해 Render 빌드 명령(`npm install && npm install --prefix client && npm run build`)과 이메일 환경 변수 요구사항을 문서화했어요.
- Render 헬스 체크 경로를 `/api/health`로 맞추고, README/PROJECT_STATE/BUILDLOG를 동기화했습니다.

## Resolved (2025-10-02 - 분석본 Variant + 열람 제한)
- DocumentAnalyzer 프롬프트를 전면 교체해 문장별 해석·배경지식·실전 사례·어법·어휘까지 포함한 Variant 1/2 분석본을 생성합니다.
- `passage_analyses` 테이블에 `variants` JSON을 저장하고, 교사/관리자가 1~3개 생성 요청을 하면 빈 슬롯(최대 2개)만 채우도록 했어요.
- 무료 회원은 하루 10개의 분석본만 열람하도록 `view_logs`를 활용해 제한하고, 프리미엄/프로·교사·관리자는 무제한으로 확인할 수 있습니다.
- 프런트 `AnalysisPage`가 Variant 탭·문장 카드·현대 사례 카드 형태로 분석본을 보여주고, 버튼으로 추가 생성을 트리거합니다.

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
- Added the K-CSAT Topic Master manual (`docs/problem-templates/topic-master.md`, `theme_problem_manual.md`, `problem manual/theme_problem_manual.md`) so 주제 문제가 논지+범위 기준으로 재현 가능.
- Hardened `generateTheme` prompt/validation: 5 options(6~14 단어), 한국어 해설, `출처│` 라벨, 오답 결함 메타태그.

## Resolved (2025-10-04 - document visibility + legacy schema guard)
- Added `document_visibility` table/API and a React 공유 모달(🌐) so 관리자가 전체/학교/학년/학생 단위로 문서를 공개할 수 있고, 학생 목록이 새 규칙을 따릅니다.
- Students now see 관리자 공유 문서를 바로 확인할 수 있으며, 학교/학년 값이 맞지 않으면 노출되지 않습니다.
- 회원가입 시 레거시 `users.password` NOT NULL 제약이 남아 있으면 `password_hash` 값을 그대로 채워 넣어 Render 같은 환경에서도 가입이 중단되지 않습니다.
