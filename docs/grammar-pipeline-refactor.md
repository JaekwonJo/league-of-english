# Grammar Generation Overhaul (2025-10-16)

## 목표
1. 업로드된 지문을 기반으로 CSAT 스타일 어법 문제를 100% 규칙 기반으로 생성/검증.
2. API가 돌려주는 결과가 월고 샘플 JSON과 동일한 구조를 유지.
3. 생성, 검증, 보정, 기록 과정을 모듈화해서 실패 지점을 즉시 파악.

## 현황 요약
- `aiProblemService.js`가 모든 문제 유형을 처리하면서 어법 로직이 뒤섞여 유지보수가 어려움.
- `eobeopTemplate.js` 가 프롬프트/검증/도우미를 모두 포함하지만, 재시도 로직·fallback·검증 강제 규칙이 흩어져 있음.
- OpenAI 응답 실패 시 `documentProblemFallback` 으로 문서를 재활용하지만, 샘플 PDF와 구조 비교 자동화가 부족.
- 새로 추출한 2022/2024 Wolgo JSON 이 존재하지만 자동 diff 파이프라인이 없었음 (지금 추가한 스크립트 사용 예정).

## 개선 원칙
- **모듈화**: `grammarGeneration/` 디렉터리를 만들고, 다음 모듈로 분리.
  - `promptBuilder` : 지문 → 프롬프트 문자열.
  - `openAiRunner` : 재시도/모델 승격/로그.
  - `validator` : JSON 스키마, 밑줄, 조건, 길이 검사.
  - `normalizer` : 옵션 정리, 해설 정돈.
  - `diffReporter` : 기준 JSON 대비 차이를 리포트.
  - `fallbackFactory` : 문서 기반/월고 기반 문제.
- **규칙 명문화** (핵심 룰):
  1. 밑줄은 `<u>…</u>` 가 아닌 `*…*` 로만 표시한다는 식의 혼란 제거. → `convertStarsToUnderline` 일관 적용.
  2. 보기 5개, 각 보기엔 `status`, `reason`, `tag`. `reason` 은 한국어 문장, 관련 문법 키워드 포함.
  3. 정답 해설(explanation) 최소 3문장, 120자 이상.
  4. 소스라벨 `출처│` 로 시작하고 placeholder 금지.
  5. 조건(예: `[조건]`) 이 존재하면 결과 JSON 의 `conditions` 배열에 반영.
- **추적 로깅**: 모든 호출에 `variantTag`, `retryCount`, `failureReason`, `diffScore` 를 남기는 JSONL 로그 파일 추가.
- **자동 비교**: `scripts/compare-grammar-datasets.js` 활용해서 새 결과가 Wolgo 기준과 어떻게 다른지 매 배치마다 리포트 저장.
- **테스트 체계**: Node test runner 로 다음 케이스 추가.
  - 프롬프트가 매번 동일한 규격인지 (`promptBuilder.test.js`).
  - validator 가 잘못된 JSON 을 모두 걸러내는지 (`grammarValidator.test.js`).
  - 실제 OpenAI 호출 대신 고정 JSON 으로 end-to-end 시뮬 (`grammarPipeline.test.js`).
  - diff 리포트가 의도한 메시지를 생성하는지 (`grammarDiffReporter.test.js`).

## 구현 단계
1. **분석 & 설계** (현재 문서 단계)
   - 코드 구조와 데이터 흐름을 문서화.
   - 모듈 경로, 함수 명세, I/O 스키마 정의.
2. **디렉터리 생성 및 기존 로직 분할**
   - `server/services/grammarGeneration/` 생성.
   - 기존 함수들을 새로운 모듈로 이동하면서 단위 테스트 작성.
   - `aiProblemService` 에서는 새 모듈 호출만 남김.
3. **검증 강화 & 규칙 적용**
   - conditions, footnotes, segments 갯수 등 엄격 검증.
   - fallback 과 diff 리포트 통합.
   - 재시도 정책(모델 승격 등)을 설정 파일로 분리 (`config/grammarGeneration.json`).
4. **API 연결 & 로그 시스템**
   - `POST /generate/grammar` 요청이 새 파이프라인을 통과하도록 갱신.
   - 로그 경로(`server/logs/grammar-generation.log`) 작성 및 보안(PII 제거).
5. **문서 & 운영 가이드**
- `README`, `PROJECT_STATE`, `BUILDLOG` 업데이트.
- 운영 체크리스트 (`docs/runbooks/grammar-pipeline.md`) 작성.

## 모듈 설계 (초안)

### 디렉터리 구조
```
server/services/grammar-generation/
  ├── index.js                # 외부에 노출되는 단일 진입점 (createGrammarProblem)
  ├── promptBuilder.js        # 프롬프트 생성, manual/blueprint/지문 결합
  ├── openAiRunner.js         # 재시도, 모델 승격, 실패 로깅
  ├── responseParser.js       # JSON 파싱 + 기본 정규화
  ├── validator.js            # 스키마/밑줄/길이/조건 검사
  ├── normalizer.js           # 보기/해설/소스 라벨 정리
  ├── diffReporter.js         # 기준 JSON 대비 차이 계산
  ├── fallbackFactory.js      # 문서/월고 기반 fallback 문제 생성
  ├── config.js               # 모델, 재시도, 최소 길이 등 파라미터
  └── __tests__/
        promptBuilder.test.js
        validator.test.js
        pipeline.e2e.test.js
```

### 데이터 계약 (JSON 스키마 요약)
```json
{
  "type": "grammar",            // 또는 "grammar_multi"
  "questionVariant": "single", // 또는 "multi"
  "question": "다음 글의 밑줄…",
  "passage": "원문 그대로 (밑줄은 <u>…>)",
  "options": [
    {
      "label": "①",
      "text": "<u>…</u>",
      "status": "correct|incorrect",
      "reason": "한국어 문장 (문법 용어 포함)",
      "tag": "주요 문법 카테고리"
    },
    "…"
  ],
  "correctAnswer": 3,          // single
  "correctAnswers": [3,4],     // multi (optional)
  "explanation": "한국어 최소 3문장",
  "sourceLabel": "출처│…",
  "conditions": ["① …", "② …"],
  "footnotes": ["* …"],
  "variantTag": "G-2025-10-16-A",
  "metadata": {
    "retryCount": 1,
    "model": "gpt-4o",
    "diff": {
      "baseline": "wolgo-2024",
      "issues": []
    }
  }
}
```

### 데이터 흐름 요약
1. `createGrammarProblem({ passage, docMeta, constraints })`
2. `promptBuilder` → 월고 매뉴얼, 조건, 밑줄 위치, 원하는 정답 등을 결합한 프롬프트 반환
3. `openAiRunner` → 재시도 정책에 따라 OpenAI 호출 (1~3회, 4회차부터 gpt-4o)
4. `responseParser` → JSON 파싱, 기본 필드 정리
5. `validator` → 밑줄 일치, 이유/해설/조건 길이, 태그 유효성 검사
6. 실패 시 `openAiRunner` 가 받은 피드백을 `promptBuilder` 에 전달하여 extra directives 추가 후 재시도
7. 모든 재시도가 실패하면 `fallbackFactory` 가 Wolgo 기준·문서 기반 문제를 생성
8. 성공하면 `diffReporter` 가 기준 JSON 과 비교해서 차이 보고서를 작성하고 payload.metadata.diff 에 저장
9. `normalizer` 가 최종 JSON 을 프로젝트 표준 형태로 정리 후 반환
10. 호출자는 DB 저장 + 문제 라이브러리 등록 + 로그 남김

### 검증 규칙 상세
- **밑줄**: `<u>` 태그 5개, 각 보기의 `text` 는 `<u>` 를 포함하며 지문 내 동일 문자열.
- **보기 정보**: `reason` 은 18자 이상, `tag` 는 사전에 정의된 카테고리(`subject-verb`, `tense`, `phrases`, …) 중 하나.
- **정답/오답**: `status` 와 `correctAnswer(s)` 가 일관성 있게 맞아야 함.
- **조건/주석**: `[조건]` 블록이 존재하면 `conditions` 배열에 순서대로 넣기.
- **해설**: 최소 3문장, 각 문장 끝은 마침표(`.`) 또는 완결형 종결어미.
- **소스 라벨**: `출처│` 시작, `미정`, `N/A` 등 금지.
- **diff 검증**: Wolgo baseline 의 같은 order 와 비교했을 때 `segments`, `answer`, `reason` 의 핵심 구문이 70% 이상 일치하지 않으면 경고.

### 설정 파일 예시
```json
// server/services/grammar-generation/config.json
{
  "models": [
    { "name": "gpt-4o-mini", "retries": 3 },
    { "name": "gpt-4o", "retries": 3 }
  ],
  "minExplanationChars": 120,
  "minReasonChars": 18,
  "allowedTags": ["subject-verb", "tense", "gerund", "to-infinitive", "participle", "relative", "modal"]
}
```

### 테스트 계획 세부
- `promptBuilder.test.js`: 조건/밑줄/variantTag 입력 시 프롬프트 문자열이 예상 텍스트 포함 확인.
- `validator.test.js`: 잘못된 status, 밑줄 미일치, reason 짧음, sourceLabel 잘못 등 케이스별 실패 확인.
- `pipeline.e2e.test.js`: 모의 OpenAI 응답 사용, 정상→실패→fallback 흐름 검증.
- `diffReporter.test.js`: two JSON 간 차이 계산 로직이 정해진 텍스트 리포트 생성하는지 확인.

위 설계안은 구현 과정에서 보완하며, 변경사항은 본 문서에 계속 기록합니다.

## 2025-10-16 진행 상황
- `server/services/grammar-generation/` 디렉터리와 핵심 모듈(promptBuilder, openAiRunner, directives, history, diffReporter, fallbackFactory, index)을 생성했습니다.
- `createGrammarPipeline` 이 AI 호출 → JSON 파싱 → 검증 → diff 기록 → fallback 전환까지 단일 진입점으로 통합했고, `aiProblemService.generateGrammar` 가 이 모듈을 호출하도록 리팩터링했습니다.
- 실패 로그에서 자동으로 추출한 지시문을 재시도 프롬프트에 주입해 같은 오류가 반복되지 않도록 했고, 재시도 내역/모델명이 `metadata.pipeline` 에 기록되도록 했습니다.
- 비교 스크립트(`scripts/compare-grammar-datasets.js`)를 작성해서 Wolgo 기준 JSON과 새 결과 차이를 `tmp/*.md` 리포트로 남길 수 있게 했습니다.

## 다음 액션
- 모듈별 상세 명세 작성.
- 코드 리팩터 단계별 브랜치/커밋 계획 수립.
- 테스트 스캐폴딩 세팅 (`npm run test:grammar`).
- OpenAI 호출 모킹을 위한 fixture JSON 정리.

이 문서는 이후 단계 진행 상황에 맞춰 계속 업데이트합니다.
