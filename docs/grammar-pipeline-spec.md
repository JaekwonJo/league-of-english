# Grammar Grammar-Problem Pipeline Redesign

This document lays out how we will rebuild the grammar 문제 생성기 so that 업로드한 지문에서 정확한 5개 밑줄, 오류 유형, 보기, 해설을 안정적으로 만드는 공장을 갖추게 됩니다.

## 1. 목표와 범위
- OpenAI 경로와 fallback 경로가 **동일한 규칙**을 따르도록 설계합니다.
- 밑줄 다섯 개, 오류 유형 태깅, 정답/오답 보기, 해설/오답 근거를 **한 파이프라인** 안에서 다룹니다.
- 통합 검증기와 회귀 테스트를 만들어 **출력 품질을 자동으로 점검**합니다.
- WordNet 한국어 사전을 정비해 **해설이 100% 한국어**로 나오도록 합니다.

## 2. 데이터 라벨링 계획
### 2.1 샘플 선정
1. 최근 업로드 지문 50개를 우선 추출합니다. (문장 수 4~14 사이, 서술문 중심)
2. 지문마다 최소 1개의 실제 오류 문장을 포함하도록 고릅니다.

### 2.2 라벨링 포맷
- 파일: `server/utils/data/grammar-labels.jsonl`
- 각 줄(JSON 객체)에 포함될 필드:
  - `documentId`, `passageIndex`, `sentenceIndex`
  - `originalSentence`
  - `targetSpan`: 밑줄로 표시할 정확한 문자열
  - `errorType`: `subject-verb-agreement`, `verb-tense`, `gerund-usage` 등 사전 정의 키
  - `errorComment`: 한국어 한 문장 설명
  - `suggestedFix`: 올바른 문장 또는 구
  - `notes`: 모호할 때 쓴 메모

### 2.3 라벨링 절차
1. 문장 단위로 분할하고, 길이 12단어 이하인 문장은 후보에서 제외합니다.
2. 문장 안에서 **한 곳**만 밑줄로 표시합니다.
3. 오류 유형은 미리 만든 20개 내외의 체계에서 고릅니다.
4. `targetSpan`은 지문 원문과 글자 단위까지 일치해야 합니다.
5. 라벨링이 끝나면 JSONL 검증 스크립트(`scripts/validate-grammar-labels.js`)로 형식을 확인합니다. *(스크립트는 이후 구현)*

## 3. 지문 전처리 & 세그먼트 추출
1. **문장 분리**: `sentence-splitter` 유틸리티(또는 `Intl.Segmenter`)로 분할.
2. **필터**:
   - 12단어 미만 문장 제외
   - 명령문, 대화문(`"` 포함) 비중 조절
3. **밑줄 후보 생성**:
   - 라벨 데이터가 있으면 동일한 스팬 사용
   - 없으면 품사 기반 규칙(동사구, 준동사, 분사구문 등)으로 후보 추출
4. 후보 스팬이 5개 미만이면:
   - 문장 분할 다시 시도(세미콜론 분리)
   - 없으면 fallback: Wolgo 세트에서 유사 길이 문항을 채워 넣습니다.

## 4. OpenAI 프롬프트 설계
### 4.1 기본 프롬프트 구조
```
역할: 수능 영어 어법 전문 출제자
입력: 지문, 라벨 데이터(있을 경우), 오류 유형 목록, JSON 청사진
지시:
- 밑줄 5개, 보기 5개, 정답 1개(또는 multi 모드) 유지
- 보기 텍스트는 지문 밑줄과 글자 단위 일치
- status/tag/reason 필드 채우기
- 해설 최소 3문장, 한국어
- JSON 그대로 출력 (마크다운 금지)
```

### 4.2 보조 힌트
- `extraDirectives` 배열에 실패 로그를 기반으로 한 수정 지시를 넣습니다.
- 짧은 지문에서는 “서술어 순환 금지, 동일 문장 반복 금지” 지시를 추가합니다.
- 오류 유형 태그는 `errorType` 사전에서 골라 쓰게 합니다.

### 4.3 다중 정답 모드
- 필요 시 `answerMode='correct'`로 바꾸고 `targetCorrectCount`를 지정합니다.
- 프롬프트에서 **정답 배열**과 `status`가 일치하도록 강조합니다.

## 5. 후처리 & 검증
1. **구조 검증**
   - JSON 스키마 검사 (`ajv` 사용 예정)
   - 옵션 5개, circled digits 확인
2. **텍스트 매칭**
   - 각 보기 `text`가 지문에 정확히 등장하는지 확인
   - 동일 문장 반복 여부, 중복 밑줄 감지
3. **오류 일관성**
   - 정답 보기 `status`/`correctAnswer` 일치
   - `reason` 최소 15자, 한국어 감지(영어 비중 30% 이상이면 탈락)
   - `tag`가 정의된 리스트 안에 있는지 확인
4. **콜백 플로우**
   - 실패 시: 재시도 (최대 6회, 모델 승격 포함)
   - 재시도 실패 시: fallback 규칙 엔진(`eobeopTemplate`, 라벨 데이터)으로 대체
5. **로그**
   - 실패 로그 JSONL (`logs/grammar-generation-failures.jsonl`)
   - 라벨 데이터 참조 여부, WordNet gloss 변환 여부 기록

## 6. WordNet 한국어 사전
1. 기존 gloss를 `koreanGloss` 필드로 매핑한 JSON(`server/utils/data/wordnet-ko-gloss.json`) 작성.
2. `documentProblemFallback`, OpenAI 해설 모두 이 사전을 참조.
3. gloss가 없으면 임시로 “(의미 확인 필요)” 경고를 붙이고, QA 큐에 적재.

## 7. 테스트 전략
- **단위 테스트**: 스팬 추출, 오류 유형 매핑, 검증 함수.
- **통합 테스트** (`server/tests/grammarGeneration.e2e.test.js`):
  - 업로드 → OpenAI 모킹 → 검증 → DB 저장까지 시뮬레이션.
  - 짧은 지문, 긴 지문, 다중 정답 케이스 포함.
- **회귀 테스트**: 라벨 데이터와 기대 출력 JSON을 비교하는 스냅샷.
- **QA 체크리스트**:
  1. 5개 밑줄이 모두 다른 문장에 위치하는가?
  2. 해설이 3문장 이상이며 한국어 비율이 100%인가?
  3. 오류 유형 태그가 사전 목록 안에 있는가?
  4. fallback 결과도 동일 검증을 통과하는가?

## 8. 롤아웃 체크리스트
1. `docs/problem-templates/eobeop-grammar.md` 업데이트 (오류 유형 표 포함).
2. 라벨 데이터 50세트 확보 후 `validate-grammar-labels.js` 통과.
3. OpenAI 프롬프트/검증기 코드 반영.
4. `npm test` + `CI=true npm --prefix client test -- --watch=false --runInBand`.
5. QA 체크리스트 수동 점검(5개 샘플 문제).
6. BUILDLOG/PROJECT_STATE 최신화.

---
이 문서는 출제 파이프라인 개발이 진행되는 동안 계속 업데이트합니다. 개발 중 발견한 추가 이슈나 규칙은 여기 또는 추가 Appendix에 바로 기록하세요.
