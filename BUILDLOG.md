## 2025-11-01 (analysis manual sync + UI alignment)
- Issue: 분석본이 교수님 매뉴얼 포맷으로 통일되지 않아 학생/관리자 화면이 불일치했고, UI에는 배경지식·사례·순번 표기가 빠져 있었습니다.
- Cause: DocumentAnalyzer 프롬프트/폴백이 구 라벨(`내용 분석`, `추가 메모`, `필수 어휘`)을 유지했고, AnalysisPage 렌더러는 번역/해석만 노출했습니다.
- Fix: 프롬프트·폴백을 개편해 배경지식·사례·어휘 포인트·응원 이모지·영어 제목 3개를 강제하고, AnalysisPage를 ①~⑳ 번호·배경/사례 강조·어휘 표 UI로 리디자인했습니다. WorkbookService는 새 라벨을 파싱하도록 보강했습니다.
- Files: server/utils/documentAnalyzer.js, server/services/workbookService.js, client/src/pages/AnalysisPage.js, client/src/styles/analysisStyles.js.
- Tests: `npm test` (서버 51개 케이스 통과).

## 2025-11-01 (analysis fast mode)
- Issue: OpenAI 키 없이 분석본을 생성할 때 Google Translate 호출이 누적되며 60초 이상 지연·타임아웃이 발생했습니다.
- Cause: fallback 분석이 문장마다 번역 API를 호출해 dev 환경에서 응답이 늦어졌습니다.
- Fix: DocumentAnalyzer fast mode에서 번역 호출을 생략하고, 클라이언트 타임아웃도 120초로 확장했습니다. `LOE_FAST_MODE`가 자동으로 활성화되어 폴백 분석이 5~10초 내에 완료됩니다.
- Files: server/utils/documentAnalyzer.js, client/src/services/api.service.js.
- Tests: `npm test`.

## 2025-10-29 (workbook auto generation + light theme contrast)
- Issue: 워크북 학습이 정적 데이터에 의존해 업데이트가 어려웠고, 라이트 모드에서 사이드바/안내문이 흐릿했습니다.
- Cause: 워크북 콘텐츠를 JS 파일에 하드코딩했고, `/workbooks` API가 없어 자동 생성/저장이 불가능했습니다. 라이트 테마 팔레트도 대비값이 낮았습니다.
- Fix: `workbook_sets` 테이블과 `/api/workbooks` 라우트를 추가하고, 분석 데이터를 바탕으로 10단계 카드/미션을 자동 구성하도록 서비스 계층을 구현했습니다. 라이트 테마 변수(사이드바 그라디언트, 텍스트 색, 카드 배경)를 재조정해 시인성을 높였습니다.
- Files: server/services/workbookService.js, server/routes/workbook.routes.js, server/models/database.js, server/server.js, client/src/pages/WorkbookPage.js, client/src/services/api.service.js, client/src/index.css.
- Tests: `npm run lint` (기존 `analysisFallbackVariant.test.js`는 여전히 pending).

## 2025-10-29 (study popstate fix + mobile sidebar close)
- Issue: 문제 학습 진입 즉시 "Cannot access 'J' before initialization"가 발생했고, 모바일에서는 메뉴를 연 뒤 바깥을 눌러도 사이드바가 닫히지 않았어요.
- Cause: `handlePopState`가 선언되기 전에 `useEffect`에서 실행되면서 참조 오류가 났고, 모바일 사이드바에 외부 클릭 감지가 없었습니다.
- Fix: StudyPage의 히스토리 핸들러를 `useCallback`으로 재구성해 선언 순서를 보장했고, 모드 동기화/이벤트 등록을 분리했습니다. 사이드바에는 outside-click/touch 감지를 추가하고 닫힐 때 투명도 전환을 적용했습니다.
- Files: client/src/pages/StudyPage.js, client/src/components/layout/MainLayout.js.
- Tests: `npm run lint` (기존 `analysisFallbackVariant.test.js`는 여전히 prefix 보정 필요).

## 2025-10-29 (teacher API mount + error intake + analysis budget)
- Issue: 프로필의 반 코드/학생 목록이 404·타임아웃으로 깜빡이며 표시되지 않고, 클라이언트 오류 리포트 `/api/errors/report`는 405를 반환했습니다. 분석 생성은 오래 걸려 프런트에서 타임아웃이 났습니다.
- Cause: 서버에 `teacher.routes`가 마운트되지 않았고, `teacher_student_links`/에러 수집 테이블이 없었습니다. 분석 자동 생성의 시간 예산이 넉넉해(25초/2개) 환경에 따라 지연됐습니다.
- Fix: 서버에 `/api/teacher` 라우트를 마운트하고, `teacher_student_links`와 `client_error_reports` 테이블을 보강했습니다. `/api/errors/report` POST 엔드포인트를 추가했습니다. 분석 자동 생성 기본값을 12초/1개로 낮춰 타임아웃을 줄였습니다.
- Files: server/server.js, server/routes/errors.routes.js, server/services/analysisService.js.
- Verify: 프로필 → 반 코드/학생 섹션이 즉시 로딩. 콘솔의 405 사라짐. 분석 개별 생성은 정상, 자동 생성은 1개까지만 빠르게 반환.

## 2025-10-29 (fallback analysis format + CRA build fix)
- Issue: Render 빌드가 `MainLayout.js` 스타일 객체 문법 오류로 실패했고, fallback 분석 테스트가 라벨/어휘 요건 미달로 실패했습니다.
- Fix: 스타일 병합 구문을 올바르게 수정하여 CRA 빌드 통과. Fallback 분석은 라벨을 `*** 분석/이 문장에 필요한 배경지식/이 문장에 필요한 사례/*** 어휘 포인트`로 통일하고, 문장별 어휘를 최소 2개(동의어≥2·반의어≥1·노트≥8자) 보장, 실천 팁을 3개로 확장했습니다.
- Files: client/src/components/layout/MainLayout.js, server/utils/documentAnalyzer.js, server/tests/analysisFallbackVariant.test.js(참조)
- Result: `npm test` 50/50 통과. Render 재배포 준비 완료.

## 2025-10-29 (workbook e2e + test ids)
- Issue: 워크북 흐름을 수동으로만 검증하고 있어 회귀 여부를 빠르게 확인하기 어려웠습니다.
- Fix: Playwright E2E(`npm run test:e2e`)를 추가해 로그인→문서 선택→워크북 생성→카드 학습→Step 완료 토글까지 자동 점검합니다. 안정적인 셀렉터를 위해 Workbook 페이지에 `data-testid`를 부여했습니다.
- Files: client/src/pages/WorkbookPage.js, tests/e2e/workbook.spec.js, playwright.config.js, package.json
- Note: E2E 실행 전 `npm run dev:all`로 로컬 서버를 띄우고, 필요 시 `PLAYWRIGHT_BASE_URL`/`PLAYWRIGHT_API_URL`을 설정하세요.

## 2025-10-29 (multi-step routes + rename sync + gen limits)
- Issue: 단일 페이지에서 단계가 바뀌어도 주소가 그대로라 뒤로가기/북마크가 불편했고, 모바일 헤더가 🦉·햄버거 아이콘 겹침으로 헷갈렸어요. 관리자 문서 이름을 바꿔도 어휘/학습 목록에 반영되지 않았습니다.
- Cause: Vocabulary/Study/Analysis 페이지가 내부 state만 바꾸고 URL 변경 없이 동작했으며, 문서 수정 API 자체가 없었습니다. 문제 생성은 유형별 제한이 없어 긴 요청에서 타임아웃이 잦았어요.
- Fix: 단계별 URL(`/vocabulary/days`, `/study/solve`, `/analysis/detail` 등)로 나누고 브라우저 이동과 연동했어요. 모바일 헤더는 단일 토글(☰/✕)과 중앙 🦉 제목으로 정리했습니다. `/documents/:id` PUT API로 제목/카테고리/학교/학년을 수정하면 학습·어휘 메뉴에 즉시 반영돼요. AI 유형 합산 5문항, 비AI 유형 10문항 상한을 추가해 요청을 안정화했습니다.
- Files: client/src/pages/VocabularyPage.js, client/src/pages/StudyPage.js, client/src/pages/AnalysisPage.js, client/src/components/layout/MainLayout.js, client/src/services/api.service.js, server/routes/document.routes.js, server/services/problemSetService.js 등.
- Tests: `npm run lint`, `npm test` (기존 `analysisFallbackVariant.test.js` 한 건은 fallback 해석 prefix 보정 필요로 여전히 실패 – 후속 예정).

## 2025-10-27 (vocab stepper + analysis bulk delete + theme toggle)
- Issue: 모바일에서 어휘 메뉴와 분석 홈이 혼란스러워 사용자들이 어느 버튼을 눌러야 할지 갈팡질팡했고, 관리자들은 분석본을 하나씩만 삭제할 수 있어 반복 작업에서 404가 났습니다.
- Cause: VocabularyPage가 단일 화면에 모든 옵션을 노출했고, AnalysisPage가 문서 로딩 시 자동으로 분석 API를 호출했습니다. 삭제 API도 단일 variant만 처리했습니다.
- Fix: 어휘 흐름을 3단계(세트→Day→시험)로 쪼개고 안내 문구를 정비했으며, 모바일 헤더를 🦉 아이콘+토글 방식으로 단순화했습니다. 분석 홈은 검색/목록만 담당하도록 분리하고, 일괄 삭제 엔드포인트(`removeVariants`)를 추가했습니다.
- Fix: Sidebar·모바일 상단에 테마 토글을 복구하고, 분석/어휘 스타일 토큰을 통일해 라이트/다크 대비를 올렸습니다.
- Files: client/src/pages/VocabularyPage.js, client/src/pages/AnalysisPage.js, client/src/components/layout/MainLayout.js, client/src/styles/analysisStyles.js, client/src/services/api.service.js, server/services/analysisService.js, server/routes/analysis/passageRoutes.js 등.
- Tests: `npm run lint`, `npm test` (analysisFallbackVariant.test.js는 라벨 prefix 보정 필요로 실패 – 후속 작업 예정).

## 2025-10-22 (multi-answer vocab + analysis labels + finish flow)
- Issue: 어휘 문제에서 단일/복수 정답 변형이 뒤섞일 때 정답 개수·옵션 사유가 불일치했고, 분석(fallback)은 라벨이 없어 빈/짧은 문구가 섞였어요. 학습 마무리 버튼이 미답 항목에서 막히기도 했습니다.
- Cause: 답안 파싱이 단일값 전제였고, 질문 변형(올바른 것/모두 고르시오) 대응이 부족했습니다. 분석 생성은 필드 길이/라벨 보장이 없고, 밑줄 치환 정규식의 공백 처리도 허술했어요.
- Fix: `answerMode/answerIndices/optionStatuses` 메타데이터를 추가하고 다중 정답 파싱·검증을 도입. 질문 변형 키를 확장했어요. 분석은 "한글 해석/분석/배경/사례/어법/어휘 포인트" 라벨과 최소 길이를 강제했습니다. Study 마무리 UX 개선, 정규식 공백 처리 보완.
- Files: server/services/ai-problem/vocabulary.js, server/utils/documentAnalyzer.js, client/src/features/study/*, client/src/pages/*, client/src/styles/*, server/routes/vocab.routes.js (__testables 내보내기), client/src/components/common/ 등.
- Tests: server/tests/vocabularyParser.test.js 추가, 기존 분석/피드백 테스트 유지. 로컬 `npm test` 통과.

## 2025-10-21 (Grammar/Vocab 분포 + 분석 fallback 정비)
- Issue: Grammar 생성기가 단일 오류 변형만 자주 뽑고, fallback이 `you is` 같은 초급 오류를 만들었으며 분석 fallback은 템플릿 문구만 반복됐어요.
- Cause: variant 선택이 Math.random 가중치에만 의존했고, 문법 규칙/배경 작성기가 기초 패턴만 커버했습니다.
- Fix: `aiProblemService`에 variant 라운드로빈 큐와 목표 정답 수 메타데이터를 추가해 1·2·3개 틀린 문제와 옳은 것 문제가 균등하게 나오도록 했어요.
- Fix: `documentProblemFallback` 어법 규칙을 수능형 오류(관사, 수동태, 수일치, 비교 구문 등) 중심으로 재작성하고, 학습 화면 밑줄도 토큰 기반 하이라이트로 바꿨어요.
- Fix: `DocumentAnalyzer` fallback이 문장별 번역·배경·실생활·어법 설명을 실제 내용으로 채우고, 키워드 강조를 `[초점]` 형식으로 정리합니다.
- Tests: `npm test` (49 suites)로 grammar/vocabulary/analysis 전 구간 회귀를 통과했습니다.

## 2025-10-20 (WordNet override + UI 캡처 스크립트)
- Issue: seed 스크립트를 실행할 때 WordNet에 없는 단어 경고가 반복되고, QA 스크린샷도 손으로만 남겨야 했어요.
- Fix: `documentProblemFallback`에 복수형/복합어 오버라이드와 래머 변환을 추가해 WordNet 경고 없이 fallback 어휘를 생성합니다.
- Feature: `scripts/seed-beta-data.js`가 JSON 로그를 남기고, `SEED_WEBHOOK_URL`을 통해 Slack 등으로 완료 알림을 보냅니다.
- Feature: `scripts/capture-ui-playwright.js`와 `npm run capture:ui`를 추가해 로그인/분석/학습/랭킹 화면을 자동 캡처할 수 있어요.
- Docs: README, `docs/beta-launch-checklist.md`, `docs/ui-regression-guide.md`에 새 스크립트와 환경 변수를 반영했습니다.
- Tests: `npm test`, `npm run build`, `DB_FILE=server/tmp/beta-seed.db node scripts/seed-beta-data.js`를 실행해 경고 없이 통과하는지 확인했습니다.

## 2025-10-20 (share modal token화 + QA 문서 정비)
- Issue: 문서 공유 모달이 다크 모드에서 대비가 약하고, seed 스크립트 사용법/QA 캡처 절차가 문서마다 흩어져 있었어요.
- Fix: `DocumentShareModal`이 `adminStyles` 토큰 팔레트를 쓰도록 정리해 라이트/다크 모드 시안이 통일됐어요.
- Fix: `adminStyles`에 modal header/버튼 토큰을 추가하고 오버레이를 `var(--dialog-scrim)`으로 교체했어요.
- Docs: README와 `docs/beta-launch-checklist.md`에 `scripts/seed-beta-data.js` 실행 순서를 명시하고, `docs/ui-regression-guide.md`를 새로 작성했어요.
- Verification: eslint 영향 없음 (스타일 변경), seed 스크립트는 로컬에서 `DB_FILE=server/tmp/beta-seed.db node scripts/seed-beta-data.js`로 스모크 테스트했어요.

## 2025-10-20 (admin palette + beta seed QA)
- Issue: 관리자 신고/분석 화면 배지가 다크 모드에서 눈에 잘 띄지 않고, 베타용 데이터 세팅이 매번 수동으로 진행돼 시간과 오류가 생겼어요.
- Fix: ProblemFeedback 배지 · DocumentAnalysis 보조 버튼에 토큰 색상을 적용해 라이트/다크 모드 대비를 통일했어요.
- Feature: `scripts/seed-beta-data.js`로 베타 교사/학생 계정, 안내문 분석, 어휘 문제를 한번에 주입할 수 있게 했어요.
- Fix: `documentProblemFallback`에서 빠졌던 `escapeRegex`를 가져와 어휘 fallback에서 밑줄 추출이 멈추지 않게 했어요.
- Tests: `analysisFallbackVariant.test.js`, `fallbackContent.test.js`를 추가해 fallback 해석/어휘가 빈칸 없이 채워지는지 자동으로 확인했어요.
- Verification: `DB_FILE=server/tmp/beta-seed.db node scripts/seed-beta-data.js`, `npm test`, `npm run build` 모두 통과했습니다.

## 2025-10-20 (analysis payload fill + admin UX sync)
- Error: 분석 보기에서 해석/배경/예시가 비어 있고 안내 문장만 반복돼 실제 학습에 쓸 수 없었어요.
- Cause: fallback normalizer가 번역 실패 시 템플릿 문구를 그대로 저장했고, UI도 빈 값을 필터링하지 않았어요.
- Fix: `analysisService`·`documentAnalyzer`가 해석·배경·실생활 예시 필드를 필수로 검증하고, 실패 시 친절한 메시지를 반환해요.
- Fix: 관리자 분석 모달 라우트를 고쳐 404 대신 안내 문구와 삭제 버튼을 보여 줍니다.
- Feature: ProblemFeedback/Analysis 팝업에 필터·CSV·토스트를 추가해 신고 대응을 빠르게 했어요.
- Docs: README, PROJECT_STATE, BUILDLOG를 같은 우선순위·Known Issues로 동기화했어요.
- Tests: `npm test`, `npm run build` (경고 없음)을 실행해 새 로직이 안전한지 확인했어요.

## 2024-11-XX (beta 준비: fallback 확장 + 배포 문서)
- Feature: OpenAI 미사용 시에도 해석/배경/예시/문법/어휘를 모두 채우는 fallback 분석 파이프라인을 재작성하고, Google Translate 캐시를 붙여 한국어 설명을 안정적으로 제공합니다.
- Feature: 관리자 분석 모달에 🗑️ 삭제 버튼을 추가해 신고된 분석본을 즉시 제거하고, 남은 변형 인덱스를 자동 재정렬합니다.
- Fix: 없는 분석본을 열었을 때 404 대신 안내 메시지를 띄워 "아직 분석이 없습니다"라고 알려 줍니다.
- Docs: `.env.example`, `client/.env.example`, `DEPLOY_RENDER_VERCEL.md`, `docs/beta-launch-checklist.md`, `README.md`, `PROJECT_STATE.md`를 최신화했습니다.
- Tests: `npm test` (43개 통과), `npm run build` (경고 존재 – Known Issues에 기록).

## 2025-10-22 (manual sync guard + WordNet warm-up)
- Issue: 어법 메뉴얼 최신본이 프롬프트에 일부만 들어가고 fallback은 예전 지침을 쓰면서 품질 편차가 생겼고, 월고 PDF 기준 데이터가 없어 회귀 테스트를 돌릴 수 없었습니다.
- Fix: `scripts/sync-grammar-manual.js`가 Windows 문서함 메뉴얼을 루트/`problem manual` 경로에 그대로 복사하도록 만들고, manual loader와 `eobeopTemplate`이 메뉴얼 전문을 그대로 프롬프트에 포함합니다.
- Fix: `scripts/extract-grammar-baseline.js`가 월고 2024 어법 100문제를 파싱해 `server/utils/data/wolgo-2024-03-grammar-baseline.json`으로 정리하며, 각 ①~⑤ 밑줄은 trimmed segment와 raw 텍스트를 함께 저장합니다.
- Fix: WordNet 워밍업 + gloss 한글 변환으로 fallback 어휘 문제도 첫 호출부터 자연스러운 한국어 뜻을 제공합니다.
- Feature: 학습 설정 3단계에 ‘문항 미리보기’ 모달을 추가해 KSAT 스타일 렌더링을 바로 확인할 수 있습니다.
- Files: scripts/sync-grammar-manual.js, scripts/extract-grammar-baseline.js, scripts/check-grammar-manual.js, package.json, server/services/ai-problem/internal/manualLoader.js, server/utils/eobeopTemplate.js, server/utils/documentProblemFallback.js, server/utils/data/wolgo-2024-03-grammar-baseline.json, README.md, PROJECT_STATE.md, BUILDLOG.md, server/tests/grammarManualSync.test.js, server/tests/wolgoBaselineIntegrity.test.js.
- Verification: `npm run check:grammar-manual`, `npm test` (43 tests pass).

## 2025-10-21 (grammar generator redesign kickoff)
- Issue: 어법 문제 생성이 밑줄 5개 추출·오류 유형 태깅·해설 작성 단계마다 흔들려, 같은 문장이 보기로 반복되거나 잘못된 밑줄이 그대로 통과하고 있어요.
- Cause: 현재 파이프라인이 OpenAI 출력과 fallback 규칙을 섞어 쓰면서 세그먼트 분할·품사 필터·오류 코드가 따로 놀고, 짧은 지문을 위한 전용 규칙이 비어 있습니다.
- Plan: ① 최근 50개 업로드 지문에서 오류 문장을 직접 라벨링해 기준 데이터를 만들고, ② 밑줄 후보 생성 → 오류 유형 분류 → 정답/오답 보기 구성 → 해설/오답 사유 작성까지 한 함수로 재설계하며, ③ OpenAI·fallback 경로가 같은 검증기와 회귀 테스트를 공유하도록 통합합니다.
- Next steps: `docs/grammar-pipeline-spec.md` 초안을 작성하고, `server/tests/grammarGeneration.e2e.test.js`로 업로드→생성→검증 흐름을 자동화할 계획입니다.
- Verification: 계획 수립 단계 (테스트는 아직 실행 전).
- Progress: Wolgo 기출 fallback 세트를 분석해 자동으로 61개의 라벨 데이터(`server/utils/data/grammar-labels.jsonl`)를 생성하는 스크립트(`scripts/generate-grammar-labels.js`)를 추가했어요. 첫 QA 후 부족한 오류 유형은 추가 라벨링으로 채울 예정입니다.

## 2025-10-16 (docs sync + priority refresh)
- Issue: PROJECT_STATE, README, BUILDLOG가 서로 다른 Top 3/우선순위를 가리켜 QA와 개발이 헷갈렸어요.
- Fix: 세 문서를 다시 읽고 회귀 diff·모의고사 프리뷰·월고 데이터 확장을 동일한 Top 3로 맞췄으며, Known issues 표현을 초보자도 바로 이해하도록 다듬었습니다.
- Files: PROJECT_STATE.md, README.md, BUILDLOG.md.
- Verification: 문서 검토.

## 2025-10-16 (grammar pipeline modularisation)
- Issue: `aiProblemService.generateGrammar` 내부에서 프롬프트 생성, OpenAI 호출, 검증, fallback 을 모두 처리해 재사용이 어렵고, 실패 원인과 개선 내역을 추적하기 힘들었습니다.
- Fix: `server/services/grammar-generation/` 모듈을 신설해 프롬프트 빌더, OpenAI 러너, 지시문 추출, diff 리포터, fallback 공장을 분리했고, `createGrammarPipeline` 으로 재시도/모델 승격/메타데이터 기록을 통합했습니다.
- Fix: 새 스크립트(`scripts/compare-grammar-datasets.js`)로 월고 기준 JSON과 후보 JSON을 비교하는 리포트를 자동 생성합니다.
- Files: server/services/aiProblemService.js, server/services/grammar-generation/*.js, scripts/compare-grammar-datasets.js, docs/grammar-pipeline-refactor.md.
- Verification: `npm test` (43 tests pass), `node scripts/compare-grammar-datasets.js --baseline server/utils/data/wolgo-2024-03-grammar-baseline.json --candidate server/utils/data/wolgo-2024-grammar-sample.json --output tmp/wolgo-2024-diff.md`.

## 2025-10-16 (vocabulary alignment to Wolgo 2024)
- Issue: 어휘 생성기가 의미 유사형 템플릿을 유지하면서 실제 월고 2024 어휘 PDF와 형식이 달라 API 출력이 정답지와 맞지 않았어요.
- Fix: `server/services/ai-problem/vocabulary.js`를 월고 2024 포맷에 맞춰 다시 작성해 밑줄 5개·단일 정답·간결 해설 구조를 강제하고, `generateVocab` 프롬프트/수정 로직을 업데이트했습니다.
- Fix: 저장소 수용 조건을 갱신해 `correction.replacement`, `optionReasons[정답]`, `출처│` 패턴을 모두 검증합니다.
- Files: server/services/aiProblemService.js, server/services/ai-problem/vocabulary.js, server/services/ai-problem/internal/problemRepository.js, docs/problem-templates/vocabulary-master.md, problem manual/vocabulary_problem_manual.md, server/tests/aiProblemService.test.js, README.md, PROJECT_STATE.md.
- Verification: `npm test` (43 tests pass).

## 2025-10-13 (doc fallback + AI escalation)
- Issue: Grammar/vocabulary 생성이 OpenAI 오류에서 멈추면 다른 문서 fallback이 노출되고, 해설은 영어 gloss만 남아 학습 신뢰도가 떨어졌어요.
- Cause: `fallbackProblemFactory`가 문서 context 없이 정적 bank만 돌렸고, AI 재시도는 동일 모델로 6번 반복했습니다.
- Fix: `server/utils/documentProblemFallback.js`에서 문서 기반 grammar·vocabulary fallback을 구축하고, problemSetService가 context를 전달해 요청 개수만큼 저장/로그하도록 수정했습니다. `generateGrammar`/`generateVocab`은 4번째부터 gpt-4o로 승격해 성공률을 올리고, WordNet 의존성을 추가해 동의어/오답 사유를 자동 생성합니다.
- Files: server/utils/documentProblemFallback.js, server/utils/fallbackProblemFactory.js, server/services/problemSetService.js, server/services/aiProblemService.js, server/routes/vocab.routes.js, package.json, package-lock.json.
- Verification: `npm test`.

## 2025-10-12 (Wolgo parser + fallback vocabulary)
- Issue: OpenAI 실패 시 grammar/vocabulary fallback이 몇 개 템플릿에만 의존해 다양성과 신뢰도가 떨어졌고, 다크 모드 액션 버튼이 투명 배경 탓에 글씨가 보이지 않았어요.
- Fix: Wolgo 2022년 9월 어법 PDF를 `grammarPdfParser`+`generate-fallback-grammar.js`로 구조화해 29문항 JSON을 만들고, `fallbackProblemFactory`가 type/answer metadata를 보존하도록 확장했습니다. 동시에 13개의 어휘 fallback 세트를 스크립트로 생성해 동의어/반의어/오답 사유를 메타에 담았고, `--accent-gradient` 변수를 추가해 다크·라이트 모드 버튼 대비를 맞췄습니다.
- Files: scripts/generate-fallback-grammar.js, scripts/generate-fallback-vocabulary.js, server/utils/grammarPdfParser.js, server/utils/data/wolgo-2022-09-grammar.json, server/utils/data/fallback-vocabulary.json, server/utils/fallbackProblemFactory.js, server/services/ai-problem/shared.js, server/tests/fallbackContent.test.js, client/src/index.css.
- Verification: `npm test`.

## 2025-10-12 (analysis flow fallback hardening)
- Issue: 관리자/학생 ‘새 분석 생성’ 버튼이 모달 없이 멈추고, OpenAI 오류가 나면 문제·어휘·분석이 비어 버렸어요.
- Cause: DocumentAnalyzer 프롬프트가 느슨해 JSON 구조가 깨지고, problemSetService·단어 퀴즈는 fallback 템플릿이 없어 빈 배열을 돌려줬습니다.
- Fix: 분석 화면에 개수 선택 모달/로딩 오버레이를 붙이고, DocumentAnalyzer를 jsonrepair 기반 매뉴얼로 재작성하며 problemSetService·vocab.routes를 `fallbackProblemFactory`와 통합했습니다.
- Files: client/src/components/admin/DocumentAnalysis.js, client/src/pages/AnalysisPage.js, server/utils/documentAnalyzer.js, server/utils/fallbackProblemFactory.js, server/services/problemSetService.js, server/routes/vocab.routes.js, client/src/features/study/problem/ProblemDisplay.jsx.
- Verification: 수동 UI 점검 및 로컬 dev 서버에서 문항/분석 생성 흐름 확인.

## 2025-10-12 (grammar option extraction guard)
- Issue: 학습 화면 어법 문제가 OpenAI가 비어 있는 options 배열을 돌려주면 보기 영역이 통째로 비거나, 본문 전체가 밑줄로 강조돼 학생이 문제를 풀 수 없었습니다.
- Fix: `GrammarProblemDisplay`가 본문 `<u>…</u>` 구간을 파싱해 ①~⑤ 보기 문장을 재구성하고, 옵션 배열이 비어 있으면 해당 텍스트로 최소 보기 리스트를 채우도록 보강했습니다.
- Files: client/src/features/study/problem/components/GrammarProblemDisplay.js, PROJECT_STATE.md, README.md.
- Verification: `npm run lint`.

## 2025-10-20 (problem deactivate + feedback hint)
- Issue: 문제 생성 중 이상한 문항이 나오면 학생/선생님이 즉시 제거할 방법이 없어, 신고만 쌓이고 실제 수업에는 계속 노출되는 상황이 반복됐어요. 학습 화면에도 “왜 신고를 눌러야 하는지” 안내가 부족해 학생이 주저하는 문제가 있었습니다.
- Fix: `problems` 테이블에 `is_active`·`deactivated_at`·`deactivated_by`를 추가하고, 캐시/생성/내보내기 쿼리 모두 숨긴 문항을 제외하도록 수정했습니다. `/admin/problems/:id/deactivate|restore` 라우트를 도입해 신고 보드에서 바로 숨기고, 학습 UI·생성 요약에 "문제가 이상하면 신고" 안내를 추가했습니다.
- Files: server/models/database.js, server/services/problemLibraryService.js, server/services/ai-problem/internal/problemRepository.js, server/services/problemFeedbackService.js, server/services/problemService.js, server/routes/admin.routes.js, server/routes/problem.routes.js, server/routes/vocab.routes.js, client/src/pages/AdminPage.js, client/src/components/admin/ProblemFeedbackBoard.jsx, client/src/styles/adminStyles.js, client/src/services/api.service.js, client/src/features/study/problem/ProblemDisplay.jsx, client/src/features/study/problem/problemDisplayStyles.js, client/src/features/study/components/GenerationSummary.jsx, client/src/features/study/studyStyles.js, PROJECT_STATE.md, README.md.
- Verification: `npm test`, `npm run lint`, `CI=true npm --prefix client test -- --watch=false --runInBand`.

- Issue: 한 번에 20문제를 요청하면 AI 재시도와 검증이 길어져 빈번히 실패했고, 랜덤 배치/저장 세션이 다시 20문을 넘기는 경우도 있었습니다. 요약·빈칸 항목은 `(A)/(B)` 주변 문장이 어색하거나 `launching ...`처럼 동명사로 시작하는 보기들이 튀어나와 자연스러운 문제 풀이를 방해했어요. 어휘 문제는 (A)(B)(C) 슬롯 조합 구조라 실제 모의고사식 5지선다와 괴리가 컸습니다.
- Fix: `/generate/csat-set` STEP_SIZE를 1로 낮추고 총 요청 수를 10문으로 제한했습니다. 클라이언트는 `MAX_TOTAL_PROBLEMS=10`으로 맞추고, 랜덤 지문 선택도 10개 이내로 조절해 빈 요청과 초과 요청을 모두 막았어요. 저장 세션 재개 시에도 10문 상한을 적용합니다. 분석본 선택은 2개로 줄여 Variant 검토를 집중시켰어요. 요약 검증에는 (A)/(B) 주변 어휘 중복 검사와 소문자 1~4단어 제한을 추가했고, 빈칸 옵션은 명사구만 통과하도록 매뉴얼·검증을 전면 조정했습니다. 어휘 문제는 "본문과 가장 거리가 먼 것은?" 5지선다 구조로 전환해 틀린 진술 하나만 고르게 만들고, JSON 스키마·validator·메뉴얼을 모두 갱신했습니다. 생성 요약 패널은 `📦/🍞/✨` 이모지로 안내 문구를 다듬어 한눈에 상황을 파악할 수 있습니다.
- Files: server/services/problemSetService.js, server/services/aiProblemService.js, server/services/ai-problem/blank.js, server/services/ai-problem/shared.js, server/services/ai-problem/vocabulary.js, server/services/ai-problem/internal/problemRepository.js, server/tests/aiProblemService.test.js, server/utils/summaryTemplate.js, client/src/features/study/components/GenerationSummary.jsx, client/src/features/study/config/constants.js, client/src/features/study/config/StudyConfig.jsx, client/src/features/study/config/hooks/useStudyConfig.js, client/src/features/study/config/components/ProblemTypeStep.jsx, client/src/hooks/useStudySession.js, client/src/pages/AnalysisPage.js, client/src/pages/HomePage.js, client/src/components/admin/DocumentAnalysis.js, docs/problem-templates/vocabulary-master.md, README.md, PROJECT_STATE.md.
- Verification: `npm test`, `npm run lint`, `CI=true npm --prefix client test -- --watch=false --runInBand`.

## 2025-10-18 (grammar directive + study UX polish)
- Issue: 어법 생성이 원문과 똑같은 밑줄을 반환한 채 멈추고, 학습 설정 랜덤 배치가 5문 단위로 잘려 사용자가 선택한 17문 등이 줄어드는 문제가 있었어요. 복습 화면엔 맨 위로 이동할 조작이 없고, 로딩 막대·결과 랭킹 텍스트가 다크 모드에서 거의 보이지 않았습니다.
- Fix: 어법 재시도 헬퍼가 실패 로그를 읽고 밑줄 수정·오류 키워드 지시문을 추가하도록 보강하고, 랜덤 배치/유형 증감을 1문 단위와 지문 수 기반으로 재배분했습니다. 유형을 하나도 고르지 않으면 즉시 알림을 띄워 빈 요청이 서버로 가지 않도록 막았고, 로딩 막대에 테마 토큰을 적용하며 복습 모드에 🔝 버튼을 추가했습니다. 결과 랭킹·격려 문구는 `--text-*` 팔레트를 사용해 다크 모드 대비를 확보했습니다.
- Files: server/services/aiProblemService.js, client/src/features/study/config/constants.js, client/src/features/study/config/hooks/useStudyConfig.js, client/src/features/study/config/components/ProblemTypeStep.jsx, client/src/features/study/components/ReviewModeView.jsx, client/src/features/study/studyStyles.js, client/src/features/study/result/resultStyles.js, client/src/features/study/result/components/RankPanel.jsx, client/src/features/study/result/components/ResultCard.jsx, PROJECT_STATE.md, README.md.
- Verification: `npm test`, `npm run lint`, `CI=true npm --prefix client test -- --watch=false --runInBand`.

## 2025-10-17 (summary retry coaching + dark theme contrast)
- Issue: 요약 문제 생성이 `summary_sentence_length`/`option_*_wordcount` 오류로 반복 실패해 학습 화면이 멈추고, 여러 관리자·분석 화면이 다크 모드에서 거의 검정 텍스트로 표시됐어요.
- Fix: `summaryTemplate`에 실패 원인을 읽어 맞춤 지시문을 만드는 `deriveSummaryDirectives`를 추가하고, `generateSummary`가 힌트를 적용해 최대 5회 재시도하도록 조정했습니다. 동시에 summary 템플릿용 단위 테스트를 새로 추가했고, 클라이언트 전역 텍스트 색상을 `--text-*` 토큰으로 바꿔 다크 테마 대비를 확보했습니다.
- Files: server/utils/summaryTemplate.js, server/services/aiProblemService.js, server/tests/summaryTemplate.test.js, client/src/styles/adminStyles.js, client/src/styles/analysis.styles.js, client/src/components/admin/DocumentAnalysis.js, client/src/components/admin/PassageAnalysis*.js, client/src/components/admin/DocumentShareModal.js, client/src/components/study/ScoreHUD.js, client/src/features/study/**/styles.js, README.md, PROJECT_STATE.md.
- Verification: `npm test`, `CI=true npm --prefix client test -- --watch=false --runInBand`, `npm run lint`.

## 2025-10-16 (problem feedback ops + cloud session sync)
- Issue: 학습 화면에서 들어오는 신고는 DB에만 쌓였고, 관리자용 처리판·알림·rate-limit가 없어 품질 대응이 느렸어요. 학습 세션도 로컬 저장만 지원해 브라우저를 바꾸면 이어 풀 수 없었습니다.
- Fix: `problem_feedback_events`·`admin_notifications`를 추가해 사용자/기기별 피드백 로그와 알림 큐를 만들고, 관리자 페이지에 신고 보드 + 알림 패널을 붙여 바로 완료/보류 처리를 누를 수 있게 했어요. `/api/study/session` 라우트와 `studySessionService`로 학습 스냅샷을 서버에 저장/복구하고 제출 시 자동 정리하도록 만들었습니다. `useStudySession`은 클라우드 동기화와 신고 rate-limit 대응을 함께 처리해요.
- Files: server/models/database.js, server/services/problemFeedbackService.js, server/services/notificationService.js, server/services/studySessionService.js, server/routes/admin.routes.js, server/routes/problem.routes.js, server/routes/study.routes.js, server/tests/problemFeedbackService.test.js, server/tests/studySessionService.test.js, client/src/pages/AdminPage.js, client/src/hooks/useStudySession.js, client/src/components/admin/ProblemFeedbackBoard.jsx, client/src/components/admin/AdminNotificationsPanel.jsx, client/src/hooks/useProblemFeedbackReports.js, client/src/hooks/useAdminNotifications.js, client/src/hooks/__tests__/*, client/src/hooks/useStudySession.js, client/src/services/api.service.js, client/src/styles/adminStyles.js.
- Verification: `npm test`, `CI=true npm --prefix client test -- --watch=false --runInBand`, `npm run lint`

## 2025-10-15 (study flow modularization stage 2)
- Issue: 학습 설정/문제/결과 화면이 단일 파일에 로직과 스타일이 얽혀 있어 경로 구조가 엉키고, 저장 세션/복습 UI를 확장하기 어려웠어요.
- Fix: `StudyConfig`를 전용 훅(`useStudyConfig`)과 단계별 컴포넌트(`DocumentStep`·`PassageStep`·`ProblemTypeStep`)로 쪼개고, `ProblemDisplay`/`StudyResult`를 `features/study` 아래로 옮겨 옵션·통계·랭킹 뷰를 모듈화했습니다. 리뷰 뷰와 인터랙션 옵션도 별도 컴포넌트(`ReviewOptions`, `ChoiceButtons`, `ResultCard`, `RankPanel`)로 분리했어요.
- Follow-up: `problem_feedback` 서비스/라우트를 만들어 학습 화면의 👍/🚨 피드백을 저장하고, 저장된 학습 세션을 로컬에 보관해 “이어서 풀기”를 지원했어요. 새 단위 테스트로 StudyConfig/ProblemDisplay/ResultCard의 렌더링과 상호작용을 검증합니다.
- Files: client/src/features/study/config/*, client/src/features/study/problem/*, client/src/features/study/result/*, client/src/pages/StudyPage.js, client/src/features/study/components/StudyModeView.jsx, client/src/features/study/components/ReviewModeView.jsx, server/services/problemFeedbackService.js, server/routes/problem.routes.js, server/services/problemStatsService.js, server/models/database.js, server/tests/*.test.js.
- Verification: `npm test`, `CI=true npm --prefix client test -- --watch=false --runInBand`, `npm run lint`

## 2025-10-14 (csat service modularization + study flow split)
- Issue: `/generate/csat-set` 로직이 `aiProblemService` 안에 뒤엉켜 있고 StudyPage도 한 파일에 로딩/복습/풀이 UI가 뒤섞여 유지 보수가 어려웠어요. 부분 실패 로그도 사용자에게 제대로 전달되지 않았습니다.
- Fix: `aiProblemService`를 manual 로더·노출 정책·문항 저장소·OpenAI 큐 도우미로 쪼개고, 새 `problemSetService`가 진행 로그·실패 요약과 함께 문제를 돌려주도록 리팩토링했어요. StudyPage는 `LoadingState`, `GenerationSummary`, `ReviewCallout`, `StudyModeView`, `ReviewModeView`, `viewStyles`로 분리해 로딩/복습 UI를 재사용 가능하게 만들었습니다.
- Files: server/services/aiProblemService.js, server/services/problemSetService.js, server/services/ai-problem/internal/*, client/src/features/study/components/*, client/src/features/study/styles/viewStyles.js, client/src/pages/StudyPage.js, client/src/hooks/useStudySession.js.
- Verification: `npm test`

## 2025-10-13 (status doc sync tidy)
- Issue: README, PROJECT_STATE, BUILDLOG의 Top 3/Latest update 문구가 제각각이라 어떤 작업이 최우선인지 헷갈렸어요.
- Fix: PROJECT_STATE의 중복 우선순위 섹션을 `Today’s Top 3 (2025-10-13)` 한 블록으로 정리하고, README "오늘의 Top 3"와 Latest update 문구를 똑같이 맞췄어요. BUILDLOG 맨 윗줄에 이번 정리 내용을 기록했습니다.
- Files: PROJECT_STATE.md, README.md, BUILDLOG.md.
- Verification: 문서 검토만 진행했습니다.

## 2025-10-13 (priority refresh + doc sync)
- Issue: README, PROJECT_STATE, BUILDLOG에 적힌 우선순위와 Known issues가 제각각이라 팀이 같은 문제를 바라보고 있는지 확신하기 어려웠어요.
- Fix: PROJECT_STATE에 오늘의 Priorities 섹션을 추가하고, README Top 3와 BUILDLOG 최신 항목을 같은 작업 목록으로 맞췄어요. 손상된 2025-09-19 로그는 복원 필요하다는 메모로 바꿔 다시 확인하도록 안내했습니다.
- Files: PROJECT_STATE.md, README.md, BUILDLOG.md.
- Verification: 문서 검토만 진행했습니다.

## 2025-10-12 (csat set failure triage + status doc sync)
- Issue: 학습 세트 생성이 빈칸/어휘 단계에서 멈춰 학생에게 "문제를 준비하지 못했어요"만 보이고, 문제 피드백 UX·테마 대비도 미흡하다는 불만이 이어졌어요.
- Cause: `blank` 검증기가 정답 보기를 타깃 문장과 동일하게 요구하고, 어휘 프롬프트가 `(A)` 자리 표시자가 없으면 즉시 실패 처리하면서 전체 세트를 중단했습니다. 사이드바/분석 화면은 라이트/다크 테마 색상 토큰이 정리되지 않았고, 문제 화면에는 좋아요/신고 흐름이 없어요.
- Fix: 우선순위를 재정비해 파이프라인 완화, 문제 피드백, 테마 대비 개선을 최상위 작업으로 문서화했고, 관련 요청을 PROJECT_STATE·README·BUILDLOG에 동기화했습니다. 코드 수정 전까지 팀이 동일한 문제 인식을 공유하도록 로그/요청 예시를 정리했어요.
- Files: PROJECT_STATE.md, README.md, BUILDLOG.md.
- Verification: 문서 업데이트만 진행 (코드 변경 없음).

## 2025-10-11 (auth hardening + study session audit)
- Issue: 회원가입 시 약한 비밀번호도 통과했고, 로그인/학습 기록이 흩어져 있어 접속 이력이나 세션 요약을 추적하기 어려웠어요.
- Cause: `users` 테이블에 로그인 메타데이터가 없고, 학습 결과는 문제별 레코드만 남겨 세션 단위 통계가 빈약했습니다.
- Fix: 비밀번호 복잡도 검사를 추가하고, 로그인 성공 시 `last_login_at`·`last_login_ip`·`login_count`를 업데이트하도록 수정했어요. 또한 `study_session_logs` 테이블을 도입해 각 세션의 총 정답 수·점수 변화를 기록하고, 프로필 통계가 이 로그를 활용하도록 바꿨어요.
- Files: server/routes/auth.routes.js, server/services/studyService.js, server/models/database.js, PROJECT_STATE.md.
- Verification: `npm test`

## 2025-10-10 (study order toggle + friendly errors)
- Issue: 학습/분석 화면에서 오류가 발생해도 로그를 확인하기 어려웠고, 문제 순서가 항상 지문 순서를 따라가 사용자 선택권이 없었습니다.
- Cause: StudyPage/AnalysisPage가 단순 문자열 에러만 노출했고, `/generate/csat-set`은 문제 순서를 셔플하지 않았어요.
- Fix: 공통 `FriendlyError` 패널을 도입해 오류 요약·세부 로그·재시도 버튼을 안내하고, 학습 설정에 `랜덤/순서대로` 옵션을 추가해 서버에서 `orderMode`를 받아 문제 배열을 결정하도록 했습니다.
- Files: client/src/components/common/FriendlyError.js, client/src/components/study/StudyConfig.js, client/src/hooks/useStudySession.js, client/src/pages/StudyPage.js, client/src/pages/AnalysisPage.js, server/routes/problem.routes.js.
- Verification: `npm test`

## 2025-10-10 (vocabulary parser & timed quiz)
- Issue: 단어 시험에서 보기 텍스트가 `12Day 01` 형식으로 붙어 나오고, 선택 즉시 다음 문제로 넘어가 학생이 검토할 시간이 없었습니다.
- Cause: PDF 파서가 한 줄에 붙은 Day/단어를 분리하지 못해 의미가 다음 항목까지 이어졌고, 프런트는 선택 이벤트와 동시에 인덱스를 증가시키도록 작성돼 있었어요.
- Fix: WordMaster 파서를 보강해 Day 문자열 속 추가 단어를 모두 분해하고, 퀴즈 생성기에 뜻↔단어 양방향/보기 셔플/정답 검증을 추가했습니다. 프런트는 티어별 3분 타이머, 이전·다음 버튼, 제출 확인, 시간 통계를 지원하도록 전면 개편했어요.
- Files: server/routes/vocab.routes.js, client/src/pages/VocabularyPage.js, PROJECT_STATE.md, README.md, BUILDLOG.md.
- Verification: `npm test` (after updates) + 로컬에서 Day 01 30문항을 수동으로 진행하며 타이머·이전/다음·결과 요약·옵션 정제 확인.

## 2025-10-04 (passage picker + study sync)
- Issue: 관리자 분석 모달, 학생 분석 페이지, 학습 설정이 서로 다른 UI를 사용해 지문 미리보기/선택 흐름이 엇갈렸고, 전체 문서를 다시 훑는 동작 때문에 UX가 일관되지 않았어요.
- Cause: 본문 원문을 제공하는 공통 API가 없고, 화면마다 카드/목록 레이아웃이 제각각이라 사용자가 같은 정보를 반복 탐색해야 했습니다.
- Fix: 분석 서비스의 지문 목록 응답에 원문/단어 수를 포함하고, `PassagePickerGrid`·`PassagePreviewModal`을 도입해 관리자·학생·학습 화면을 같은 카드 미리보기 + 최대 3개 선택 UX로 통일했습니다. 앞으로는 선택 지문만 생성하도록 백엔드 필터링을 추가할 예정입니다.
- Files: server/services/analysisService.js, client/src/components/shared/PassagePickerGrid.js, client/src/components/shared/PassagePreviewModal.js, client/src/components/admin/DocumentAnalysis.js, client/src/components/study/StudyConfig.js, client/src/pages/AnalysisPage.js, client/src/hooks/useStudySession.js, client/src/config/routes.config.json, client/src/styles/analysisStyles.js, client/src/services/api.service.js.
- Verification: `npm test` (pass, 16 tests) + 로컬에서 관리자/학생 UI 카드 선택·미리보기·문제 생성 흐름 수동 확인.

## 2025-10-04 (document visibility rules + legacy schema guard)
- Issue: 관리자만 문서를 볼 수 있어 학생 계정이 빈 화면을 봤고, Render 등 일부 배포 환경에서는 `users.password` 제약 때문에 회원가입이 실패했어요.
- Cause: 문서에 공개 범위를 저장하는 구조가 없었고, 예전 DB 스키마가 `password` 컬럼을 여전히 NOT NULL로 요구했습니다.
- Fix: `document_visibility` 테이블과 API, React 공유 모달(🌐)을 추가해 전체/학교/학년/학생 단위 공개를 지원하고, 등록 시 `password` 오류가 나면 `password_hash` 값을 그대로 채워 넣도록 안전장치를 붙였습니다.
- Files: server/models/database.js, server/routes/document.routes.js, server/routes/auth.routes.js, client/src/pages/AdminPage.js, client/src/components/admin/DocumentList.js, client/src/components/admin/DocumentShareModal.js, client/src/services/api.service.js.
- Verification: `npm test` (pass, 16 tests) + 로컬에서 관리자→학생 문서 공유 후 학생 계정 로그인으로 문서 노출 확인.

## 2025-10-09 (doc sync + email deliverability blocker)
- Issue: Render에 배포된 서버에서 이메일 인증/관리자 알림 메일이 발송되지 않아 회원가입이 중단돼요.
- Cause: 네이버 SMTP는 `EMAIL_FROM`이 실제 계정과 일치하는 `<표시 이름 <주소>>` 형식이 아니면 거절하고, 현재 `emailService`는 transporter 오류를 로그로 남기지 않아 원인을 놓치고 있습니다.
- Fix: README/PROJECT_STATE에서 올바른 환경 변수 형식과 우선순위를 재정리하고, SMTP 실패를 로그로 남기고 재검증하는 스모크 테스트 작업을 Next 3에 끌어올렸어요.
- Files: README.md, PROJECT_STATE.md, BUILDLOG.md.
- Verification: 문서 업데이트만 수행(코드/빌드 미실행).

## 2025-10-08 (email verification + membership request + analysis feedback)
- Issue: 회원가입이 즉시 완료돼 스팸 계정을 막을 수 없고, 프리미엄/프로 입금 안내와 분석본 신고가 수기로만 처리돼 누락 위험이 컸어요.
- Cause: 이메일 인증/입금 요청 라우트와 관리자 신고 큐가 기획만 있고 구현되지 않았고, Render 빌드 문서도 예전 명령을 유지했습니다.
- Fix: 인증 코드 발송·검증·쿨다운을 붙이고, 무통장 입금 요청 API/이메일 알림/프로필 UI를 추가했어요. 분석 Variant에 추천/신고·신고 사유 모달·관리자 처리 API를 붙이고, `.env.example`과 `docs/deploy-guide.md`에 이메일/빌드 절차를 새로 정리했습니다.
- Files: server/services/emailService.js, server/services/emailVerificationService.js, server/routes/auth.routes.js, server/routes/membership.routes.js, client/src/pages/LoginPage.js, client/src/pages/ProfilePage.js, client/src/pages/AnalysisPage.js, docs/deploy-guide.md, .env.example, PROJECT_STATE.md, README.md.
- Verification: `npm test` (pass, 16 tests) + 수동으로 이메일 인증/입금 요청/분석 신고 흐름을 클릭 테스트.

## 2025-10-02 (analysis variants + daily view guard)
- Issue: 분석 페이지가 샘플 카드만 보여주고, AI가 만든 분석본을 반복 생성해도 저장되지 않아 다시 확인할 수 없었어요.
- Cause: `passage_analyses`가 한 지문당 한 줄만 저장했고, 프론트는 변환 데이터를 쓰지 않아 실제 분석 결과가 노출되지 않았습니다.
- Fix: DocumentAnalyzer 프롬프트를 전면 교체해 Variant 1·2 구조를 반환하고, `passage_analyses.variants` 컬럼에 최대 2개까지만 저장하도록 했어요. 무료 회원은 `view_logs` 기반으로 하루 10개만 열람하게 제한했습니다.
- Files: server/utils/documentAnalyzer.js, server/services/analysisService.js, server/models/database.js, server/routes/analysis/passageRoutes.js, client/src/pages/AnalysisPage.js, client/src/styles/analysisStyles.js, client/src/services/api.service.js.
- Verification: `npm test` (pass, 16 tests) + 수동으로 교사 계정 시나리오에서 Variant 1·2 생성/열람/제한 동작 확인.

## 2025-10-01 (implicit log + doc sync)
- Issue: 함축 추론 세트가 `<u>` 태그 미삽입 때문에 다시 실패했고, 상태 문서는 예전 목표/이슈를 보여줬어요.
- Cause: `generateImplicit`가 `targetSpan`을 재활용하면서도 로그만 쌓고 있어 대비 전략이 문서화되지 않았고, PROJECT_STATE/README가 과거 Top 3를 유지했어요.
- Fix: `aiProblemService`가 외부 어법/어휘 메뉴얼을 우선 읽도록 cache를 손봤고, tier/app JSON 색상을 CSS 변수로 정리하며 함축 재시도 로그 위치를 문서화했습니다.
- Docs: PROJECT_STATE.md, README.md, BUILDLOG.md를 2025-10-01 기준 목표·Known issues·Resolved로 업데이트했습니다.
- Verification: 수동 점검(`server/tmp/implicit-retries.log` tail), `rg`로 CSS 변수 치환 확인, 문서 리뷰 완료.

## 2025-10-07 (theme palette + implicit underline fallback)
- Issue: 다크 모드에서 관리자/통계 화면이 고정 HEX 색상 때문에 대비가 깨지고, 함축 추론 생성은 `<u>` 누락으로 세트 생성이 반복 실패했어요.
- Cause: 스타일이 컴포넌트별로 하드코딩돼 있었고, `generateImplicit`는 `targetSpan`을 활용하지 못했습니다.
- Fix: CSS 변수 팔레트를 전면 도입해 모든 화면이 라이트/다크를 공유하고, 어법·어휘 문제를 전용 메뉴얼·프롬프트/UX로 분리했으며 `generateImplicit`가 `targetSpan`으로 밑줄을 복구하면서 실패 메시지를 다음 프롬프트에 전달하게 했어요.
- Files: client/src/index.css, StudyResult/ProblemDisplay 등 주요 UI, `server/services/aiProblemService.js`, `server/tests/aiProblemService.test.js` 외 문서 3종.
- Verification: `npm test` (pass, 16 tests).

## 2025-10-07 (implicit targetSpan + light/dark theme toggle)
- Issue: 함축 추론 API가 `<u>`를 누락하면 여전히 세트가 실패했고, 대시보드/학습 화면은 다크 테마가 없어 밤에 보기 어려웠어요. 복습 문구도 어두운 배경에서 잘 안 보였습니다.
- Fix: OpenAI 응답에 `targetSpan`을 강제해 `<u>`가 빠져도 코드에서 동일 구절을 찾아 자동 밑줄로 보정하고, 회귀 테스트를 추가했어요. 동시에 테마 컨텍스트를 도입해 라이트/다크 모드를 토글할 수 있게 했고, 홈/학습/프로필 UI 색상과 복습 문구 대비, 스크롤-탑 버튼을 정비했습니다.
- Files: server/services/aiProblemService.js, server/config/problem-templates.json, server/tests/aiProblemService.test.js, client/src/contexts/ThemeContext.js, client/src/App.js, client/src/index.css, client/src/components/layout/MainLayout.js, client/src/pages/HomePage.js, client/src/pages/StudyPage.js, client/src/pages/ProfilePage.js.
- Verification: `npm test` (pass, 16 tests).

## 2025-10-07 (implicit underline guard + grammar/vocab manual split)
- Issue: 함축 추론 API가 `<u>...</u>` 구간을 두 번 둘러싼 응답을 반환하면 전체 세트 생성이 실패했고, 루트 매뉴얼도 "어법·어휘 통합"이라 새 어휘 매뉴얼을 찾기 어려웠어요.
- Cause: implicit 생성기 검증이 정확히 한 번의 `<u>`만 허용하면서도 후처리가 없어 반복 태그를 바로 실패 처리했고, 루트 `grammar_problem_manual.md`가 어법·어휘를 합쳐 보여줬습니다.
- Fix: `<u>`가 여러 번 들어와도 첫 구간만 남기고 나머지 태그를 걷어내는 보정 로직을 추가했고, 외부 최신 메뉴얼을 가져와 어법/어휘를 각각 별도 문서로 배치했어요.
- Files: server/services/aiProblemService.js, grammar_problem_manual.md, problem manual/grammar_problem_manual.md, vocabulary_problem_manual.md, problem manual/vocabulary_problem_manual.md, client/src/config/problemTypes.json.
- Verification: `npm test` (pass, 15 tests).

## 2025-10-07 (membership tier concept captured)
- Issue: 무료/유료 요금제 차별화 아이디어가 기획 문서에 정리돼 있지 않아 팀이 같은 그림을 보지 못했어요.
- Cause: 수익 모델 문단이 "구독 구조"만 언급하고 구체 가격·제한을 남겨 두지 않았습니다.
- Fix: PROJECT_STATE.md 결정 섹션과 README 비전 파트에 무료·프리미엄·프로(9,900/19,900원) 구조, 저장 문제/속도/분석본 차이를 추가했어요.
- Files: PROJECT_STATE.md, README.md.
- Verification: 문서 수동 검토.

## 2025-10-07 (status docs sync + monitoring focus)
- Issue: 빈칸 가드 이후에도 상태 문서가 여전히 UX/라이브러리 중심이라 모니터링·재출제 제어 같은 다음 우선순위가 보이지 않았어요.
- Cause: 2025-10-06 작업 이후 PROJECT_STATE.md, README.md, BUILDLOG.md를 다시 정리하지 않았습니다.
- Fix: 세 문서를 맞춰 회귀 테스트, 재생성 모니터링, 재출제 확률 노출을 Top 3로 강조하고 최신 상황을 한눈에 보이게 정리했어요.
- Files: PROJECT_STATE.md, README.md, BUILDLOG.md.
- Verification: 문서 수동 검토 (코드·테스트 실행 없음).

## 2025-10-06 (blank 원문 누락 재발 방지)
- Error: 빈칸 문제가 가끔 축약 지문으로 저장돼 학생 화면에서 일부 문장만 노출되었어요.
- Cause: 구 캐시 항목에 원문 길이 메타가 없어 `_acceptCachedProblem`이 단문을 걸러내지 못했습니다.
- Fix: `_normalizeBlankPayload`가 전체 문장 수·글자 수를 저장하고, `_acceptCachedProblem`이 기준 미달 지문을 즉시 폐기해 재생성하도록 바꿨습니다.
- Files: server/services/aiProblemService.js, server/routes/problem.routes.js, server/models/database.js, client/src/components/study/ProblemDisplay.js, docs/PROJECT_STATE.md.
- Verification: `npm test`, `npm run lint`, 로컬 스터디 세션에서 10문항 생성 후 지문 길이/복습 대기열 노출 수동 확인.

## 2025-10-04 (blank 해설 강화 + 재출제 회전 + PDF 내보내기)
- Issue: 빈칸 문제가 원문을 축약하거나 해설이 한 줄로 끝나는 경우가 많았고, 틀린 문제도 다시는 등장하지 않아 복습 루프가 끊겼어요. 또한 관리자용 PDF 추출 기능이 없어 매번 스크린샷으로 묶어야 했습니다.
- Cause: `_normalizeBlankPayload`가 해설 길이·오답 사유를 느슨하게 허용했고, `problem_exposures`에는 정답 여부가 저장되지 않아 캐시 차단만 수행했습니다. PDF 생성 루트도 없었습니다.
- Fix: blank 프롬프트/정규화 규칙을 강화해 전체 지문과 3문장 이상 해설·모든 오답 결함을 필수화하고, exposures 테이블에 `last_result`/카운트를 추가해 틀린 문제는 쿨다운 후 확률적으로 재출제되게 했습니다. `/problems/export/pdf` 엔드포인트와 React 모달을 추가해 최대 100문제를 한글 폰트로 내보내도록 했고, 로딩 스피너 메시지·명언도 확장했습니다.
- Files: server/services/aiProblemService.js, server/services/studyService.js, server/models/database.js, server/routes/problem.routes.js, server/utils/pdfExporter.js, client/src/pages/StudyPage.js, client/src/components/study/StudyConfig.js, client/src/services/api.service.js, client/src/pages/StudyPage.js (로딩 문구), server/tests/aiProblemService.test.js, package.json (pdfkit).
- Verification: `npm test`, `npm run lint`, 로컬 StudyPage에서 빈칸 5문항 재생성 + 복습 모드 확인, PDF 다운로드 링크로 한글 문구/빈칸 지문 포함 여부 확인.

## 2025-10-03 (study scoring + stats rollout)
- Issue: 학생들이 문제를 풀어도 점수·티어·랭킹이 갱신되지 않고, 통계 페이지도 비어 있어서 학습 성과를 확인할 수 없었습니다.
- Cause: `study_records` 테이블은 존재했지만 결과를 적재하는 API가 없고, 프런트는 로컬에서만 정답률을 계산해 즉시 폐기했습니다.
- Fix: `studyService`를 도입해 `POST /problems/submit`이 학습 결과를 저장하고 점수를 재계산하도록 하고, `GET /problems/stats`로 유형별 정답률/주간 학습 횟수를 반환하게 했어요. React `useStudySession`/`StudyResult`는 새 API를 호출해 획득 LP, 누적 LP, 유형별 성과를 보여줍니다.
- Files: server/services/studyService.js, server/utils/tierUtils.js, server/routes/problem.routes.js, server/routes/ranking.routes.js, client/src/hooks/useStudySession.js, client/src/components/study/StudyResult.js, client/src/pages/StudyPage.js, server/tests/aiProblemService.test.js, PROJECT_STATE.md, BUILDLOG.md.
- Verification: `npm test --silent` (node:test suite)와 로컬 스터디 세션으로 LP/통계 UI를 수동 확인했습니다.

## 2025-10-02 (implicit inference deterministic launch)
- Issue: 함축적 의미 추론 문제가 옛 모의고사 PDF에만 의존해 자동 생성/QA가 불가능했어요.
- Cause: 매뉴얼이 스캔본 수준에 머물러 있고, API 파이프라인에 `implicit` 유형이 연결되지 않았습니다.
- Fix: K-CSAT Implicit Master 규격을 문서화(`docs/problem-templates/implicit-master.md` 등)하고 OpenAI 생성기(`generateImplicit`)와 CSAT 세트 루프에 통합했습니다.
- Files: docs/problem-templates/implicit-master.md, implicit_problem_manual.md, problem manual/implicit_meaning_manual.md, server/services/aiProblemService.js, server/routes/problem.routes.js, server/services/ultraSimpleProblemService.js, server/config/problem-templates.json.
- Verification: 문서 교차 확인 + 코드 리뷰(추후 `npm test`/`npm run lint`로 재확인 예정).

## 2025-10-02 (irrelevant sentence deterministic launch)
- Issue: 흐름상 무관 문장 유형은 규격이 느슨하고, rule-based fallback만 있어서 API로는 생성할 수 없었어요.
- Cause: 기존 매뉴얼이 요약본 수준이고, `generateIrrelevantProblems`가 문맥을 무시한 랜덤 조합이었습니다.
- Fix: Irrelevant Master 규격을 문서화(`docs/problem-templates/irrelevant-master.md` 등)하고 OpenAI 기반 `generateIrrelevant`를 추가해 CSAT 세트/스마트 출제/캐시 루프에 연결했습니다.
- Files: docs/problem-templates/irrelevant-master.md, irrelevant_problem_manual.md, problem manual/irrelevant_problem_manual.md, server/services/aiProblemService.js, server/routes/problem.routes.js, server/services/ultraSimpleProblemService.js, server/config/problem-templates.json.
- Verification: 문서 교차 확인 + `npm test`, `npm run lint`.

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

## 2025-09-30 (PM)
- Issue: 빈칸 생성기가 구형 매뉴얼에 묶여 숫자형 보기·빈칸 누락으로 `/generate/csat-set`이 반복 500을 반환했습니다.
- Root cause: `generateBlank` 프롬프트/검증 로직이 문서 `docs/problem-templates/blank-master.md`에 고정돼 있었고, OpenAI 응답 구조를 강하게 검사하지 않았습니다.
- Fix: Claude × ChatGPT 통합 빈칸 메뉴얼(`problem manual/빈칸_메뉴얼_GPTxClaude.md`)을 새 프롬프트/검증의 단일 소스로 사용하고, JSON 스키마·패밀리·전략·숫자 철자화·단일 `____` 플래그 검사를 전면 재작성했습니다.
- Files touched: `server/services/aiProblemService.js`, `docs/problem-templates/blank-master.md`, `PROJECT_STATE.md`.
- Verification: `node --test server/tests` 전체 통과, `node - <<'NODE'
const svc = require('./server/services/aiProblemService');
(async () => {
  const problems = await svc.generateBlank(58, 5);
  console.log(problems.map(p => [p.metadata.blankFamily, p.metadata.blankStrategy, /__/g.test(p.text)]));
})();
NODE` 로 5문항 생성 결과 (가족/전략 태그·한글 해설·단일 빈칸) 확인.

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
- Status: 이 항목은 저장 과정에서 인코딩이 손상돼 원문 내용을 확인할 수 없습니다. git 이력(2025-09-19 커밋)을 참고해 MCQ/grammar span 리팩터링 기록을 다시 작성해야 합니다.
- Cause: 문서 편집기에 인코딩이 깨진 상태로 저장돼 한글이 물음표로 변했습니다.
- Next step: 해당 날짜 변경 사항을 정리한 뒤 Change summary/Impact/Verification을 복원해 주세요.

## 2025-09-22
- Error: insertion problems truncated sentences and revealed ASCII markers instead of exam-style numerals.
- Cause: legacy window builder trimmed target sentences and reused them when formatting the gap.
- Fix: refactored `InsertionProblemGenerator2` to render full passages then convert markers and choices to circled numbers (①~⑤).
- Files: `server/utils/insertionProblemGenerator2.js`, regenerated `generated_insertion_problems.json`, docs (`PROJECT_STATE.md`, `README.md`).
- Verification: ran `node generate_insertion_problems.js`, reviewed problems 5·19·21 in study preview for correct layout and numbering.
## 2025-10-05 (review queue UX + admin problem library)
- Issue: 저장된 빈칸 일부가 짧은 축약본이라 품질이 들쑥날쑥했고, 학생이 틀린 문제를 다시 풀 경로가 없으며, 관리자도 문제 캐시를 UI로 살필 수 없었습니다.
- Cause: 과거 캐시된 blank 문제는 원문 길이 검증이 없어 통과했고, `/problems/review-queue` API가 존재하지 않아 오답 복습 흐름이 끊겼습니다. 관리자 화면도 문서/업로드만 다뤄 문제 라이브러리를 노출하지 않았어요.
- Fix: `_normalizeBlankPayload`와 `_acceptCachedProblem`에 원문 길이/문장수 검증을 추가해 축약본을 차단하고, `/problems/review-queue`·`/problems/review-session`을 도입해 Home/Profile/StudyPage에서 복습 대기열을 노출했습니다. `useStudySession`은 `startManualSession`을 받아 오답 세트를 즉시 시작하고, AdminPage에는 ProblemLibrary 컴포넌트로 문항 열람·유형별 PDF 내보내기(최대 100문) 기능을 붙였습니다.
- Files: server/services/aiProblemService.js, server/routes/problem.routes.js, client/src/hooks/useStudySession.js, client/src/pages/StudyPage.js, client/src/pages/HomePage.js, client/src/pages/ProfilePage.js, client/src/pages/AdminPage.js, client/src/components/study/StudyConfig.js, client/src/components/admin/ProblemLibrary.js, client/src/services/api.service.js, PROJECT_STATE.md, BUILDLOG.md.
- Verification: `npm test`, `npm run lint`, 로컬에서 복습 대기열 자동 시작/수동 시작 흐름 확인, Admin ProblemLibrary에서 PDF 다운로드 테스트 및 blank 캐시 필터링 확인.
# 2025-10-20 (vocabulary refactor + admin 신고 보드 개선)
- Issue: 최근 어휘 문제가 본문 내용 일치/불일치 유형으로 생성되어 어휘력을 제대로 평가하지 못했고, 관리자 신고 보드는 필터나 기록 내보내기가 없어 품질 triage 속도가 느렸습니다. 학습 로딩/결과 화면도 다크 모드에서 대비가 낮아 보인다는 피드백이 반복됐어요.
- Root cause: 구(舊) 메뉴얼이 `(A)(B)` 슬롯 기반 구조를 유지한 탓에 의미 추론형 가이드가 빠졌고, 신고 보드와 로딩 UI는 초기 MVP 상태에 머무르면서 필터/토스트/색상 토큰 업데이트가 반영되지 않았습니다.
- Fix: vocabulary 메뉴얼/프로프트/validator를 밑줄 어휘 의미 추론형 5지선다로 재정비하고, 테스트(`aiProblemService.test.js`)와 캐시 수용 기준을 1~4단어·lexicalNote 필수 조건에 맞게 조정했습니다. 관리자 신고 보드에는 상태·유형·문서 필터, 검색, CSV 저장, 토스트 알림을 추가했고, 로딩/결과 UI는 진행 막대 최소 폭·랭킹 텍스트 대비를 높였습니다.
- Files touched: `server/services/aiProblemService.js`, `server/services/ai-problem/vocabulary.js`, `server/services/ai-problem/internal/problemRepository.js`, `server/tests/aiProblemService.test.js`, `docs/problem-templates/vocabulary-master.md`, `problem manual/vocabulary_problem_manual.md`, `client/src/components/admin/ProblemFeedbackBoard.jsx`, `client/src/hooks/useProblemFeedbackReports.js`, `client/src/pages/AdminPage.js`, `client/src/features/study/components/GenerationSummary.jsx`, `client/src/features/study/components/LoadingState.jsx`, `client/src/features/study/result/components/RankPanel.jsx`, `client/src/features/study/result/components/ResultCard.jsx`, `PROJECT_STATE.md`, `README.md`.
- Verification: `npm test`, `CI=true npm --prefix client test -- --watch=false --runInBand`, `npm run lint`, 수동으로 신고 보드 필터/CSV/토스트 동작과 다크 모드 결과 화면 대비 체크.

## 2025-10-25 (docs sync + ops guidance)
- Issue: 문서 간 날짜/용어/Top3가 서로 달라 혼선 발생, 삭제 404 임시 대응이 README에 부재.
- Cause: 기능 개발 후 문서 동기화 루틴이 없고, 운영 가이드가 분산되어 있었음.
- Fix: PROJECT_STATE/BUILDLOG/README를 오늘자 기준으로 동기화하고, 관리자 삭제 404 임시 회피(목록 새로고침/재요청)를 명시.
- Files: PROJECT_STATE.md, BUILDLOG.md, README.md.
- Notes: 코드 변경 없음(문서/운영 지침 정비). 베타 배포 가이드의 환경 변수 설명을 재점검.
## 2025-10-25 (git push auth prompt freeze)
- Issue: `git push` 중 `Password for 'https://…'` 프롬프트에서 화면이 멈춘 듯 보이고 키보드 입력이 먹지 않았어요.
- Cause: GitHub는 2021년 이후 비밀번호 푸시를 막았습니다. 터미널이 비밀번호를 기다리지만(대화형 입력) 현재 환경은 상호입력이 차단되어 "멈춘 것처럼" 보입니다.
- Fix: 비밀번호 대신 GitHub Personal Access Token(PAT, repo 권한)을 사용해 비대화형으로 푸시하도록 문서화하고, `credential.helper` 설정/원격 URL 토큰 사용 절차를 추가했습니다.
- How-to: `git remote set-url origin https://<USER>:<TOKEN>@github.com/JaekwonJo/league-of-english.git` 또는 `gh auth login && git push`를 사용하세요.
- Files: PROJECT_STATE.md(Resolved/Known), README.md(PAT 푸시 가이드), BUILDLOG.md(본 항목).
- Verification: 로컬 커밋은 정상. 원격 푸시는 PAT 제공 후 재시도 시 즉시 완료됩니다.
- Note: 작업 비서 상시 원칙을 `AGENTS.md`로 추가해 이후에도 같은 방식으로 설명/문서화/푸시가 일관되도록 했습니다.

## 2025-10-25 (study submit hang + dev:auto + vocab/grammar polish)
- Issue: 어휘 퀴즈/학습 제출 시 "채점 중입니다" 화면에서 멈춤. 포트 충돌로 서버 응답이 없을 때 무한 대기.
- Fix: 프런트 `fetch`에 타임아웃(15–30초) 추가해 무한 대기 차단, 에러 메시지 표준화. 서버 Fallback 영문 문구를 한국어로 교체.
- Fix: `dev:auto` 스크립트로 빈 포트를 자동 선택(백엔드 5000+, 프런트 3000+). 포트 충돌 제로.
- Fix: 어휘/어법 본문에 ①~⑤ 번호를 직접 삽입, 밑줄 얇게. 프롬프트에 "핵심 1~3단어만 밑줄" 지시 강화. 출처 코드(2-25-10) 자동 표준화.
- Files: client/src/services/api.service.js, scripts/dev-auto.js, server/utils/csatProblemNormalizer.js, server/services/ai-problem/*, client/src/features/study/problem/problemDisplayStyles.js.
- Verification: `npm test` 50개 통과. 로컬에서 dev:auto로 실행 후 어휘/어법 제출 → 결과/랭킹/LP 반영 확인.
## 2025-10-25 (dev:auto, API base, vocab submit fix)
- Issue: dev:all에서 포트(3000/5000) 충돌과 프런트가 `/api` 접두어 없이 호출해 404가 잦았고, 어휘 시험이 "채점 중입니다…"에서 멈추거나 결과 요약이 비어 보이는 문제가 있었습니다. 어휘/어법 본문에는 ①~⑤ 표식이 없어 보기 매칭이 헷갈렸습니다.
- Cause: 고정 포트 사용·API base URL 불일치, 제출 직전 시간 기록/상태 정리 누락, 서버가 요약을 못 줄 때 클라이언트 폴백 없음, 본문 재구성/표식 삽입 미비.
- Fix: `scripts/dev-auto.js`로 빈 포트 자동 선택 + `REACT_APP_API_URL=http://localhost:{port}/api` 주입. `api.service.js`에 타임아웃 상향(분석/세트/보카) 및 공통 타임아웃 도우미 추가. `VocabularyPage.js`에서 제출 전 스냅샷·타이머 정리, 서버 요약 없을 때 클라 계산 폴백. 서버는 보카 제출 시 `summary/stats/rank/updatedUser` 반환. 본문에 ①~⑤ 자동 삽입 + 얇은 밑줄 스타일.
- Files: scripts/dev-auto.js, client/src/services/api.service.js, client/src/pages/VocabularyPage.js, client/src/features/study/problem/problemDisplayStyles.js, server/routes/vocab.routes.js, server/services/ai-problem/{shared.js,underlined.js,vocabulary.js}, server/services/problemSetService.js.
- Notes: 로컬 `npm test` 50 테스트 통과. 로컬 개발은 `npm run dev:auto` 권장(포트 충돌 제로, 404 방지). 프로덕션에서는 `LOE_FAST_MODE` 비활성 유지.
## 2025-10-26 (prod domain, AI timebox, membership/moderation)
- Issue: 세트 생성이 간헐 타임아웃/알 수 없는 오류, 학생 계정에서 문서가 보이지 않음, 일일한도 제약 운영 불편, 부적절 아이디 노출 위험, 비밀번호 복구 경로 부재.
- Cause: AI 응답 지연 시 폴백 지연, 문서 목록 정책이 학생에 제한적, 멤버십 관리 UI/엔드포인트 부족, 욕설 아이디 필터/정지 기능 없음, reset 플로우 미구현.
- Fix: 생성 타임박스(25s)+자동 폴백 도입; 학생 목록에 공개/발행/관리자 문서 노출; 멤버십 상향/요청 승인/쿠폰 API 추가; 욕설 필터+정지/복구/삭제+랭킹 제외; 비번 찾기(코드 발송+재설정) 추가; www→apex 리다이렉트/기본 API/CORS 정리.
- Files: server/services/problemSetService.js, server/routes/problem.routes.js, server/routes/document.routes.js, server/routes/membership.routes.js, server/routes/admin.routes.js, server/routes/auth.routes.js, server/routes/ranking.routes.js, client/src/pages/VocabularyPage.js, server/routes/vocab.routes.js, vercel.json, client/src/config/appConfig.json.
- Notes: Vocabulary에 모드 선택(혼합/단어→뜻/뜻→단어) 추가. 프로/프리미엄은 무제한 일일한도로 처리. 학생 학습/랭크/티어 즉시 반영 확인.

## 2025-10-26 (admin UI + per-type limits + ranking effects)
- Issue: 등급 운영을 수기로 처리해야 했고, 무료 회원 일일 제한을 유형별로 나누어 관리하기 어려웠음. 랭킹에서 유료 회원의 고급 뱃지가 구분되지 않음.
- Fix: 관리자 화면에 멤버십 요청 패널(승인/반려, 빠른 쿠폰 생성)과 사용자 패널(검색, 정지/복구/삭제, 직접 등급 부여) 추가.
- Fix: 무료 회원 일일 제한을 유형별로 분리(단어시험 30, 문제풀이 30), 합산 제한 60으로 보강. 프리미엄/프로/관리자 무제한.
- Fix: 리더보드/내 순위에 프리미엄(은색)·프로(금색) 닉네임 이펙트 적용.
- Docs: README에 멤버십 플랜/오프라인 결제 흐름/관리자 승인 절차 추가.
- Files: client/src/pages/AdminPage.js, client/src/components/admin/{MembershipRequestsPanel,AdminUsersPanel}.jsx, client/src/services/api.service.js, server/{routes,services}.*(usage counters), client/src/pages/{ProfilePage,RankingPage}.js.
- Verify: 관리자 계정으로 요청 승인→등급 반영, 쿠폰 생성→사용자 적용, 무료 계정으로 단어/문제 한도 초과 시 429 메시지 확인.

### 2025-10-26 (membership resolution emails)
- Issue: 입금 확인 요청을 승인/반려했을 때 학생에게 결과 알림이 가지 않음.
- Fix: 요청 승인/반려 시 학생 이메일로 결과 통지(승인: 등급/만료일 안내, 반려: 재요청/문의 안내). 알림 큐 항목도 resolved/dismissed로 갱신.
- Files: server/routes/membership.routes.js
