# CSAT 어법·어휘(Grammar) 문제 템플릿 — Style Contract + Variation Engine

> **핵심 목표**: 수능/모의고사 원형을 복제하면서도, 장치(패턴)는 무한히 확장되는 어법·어휘 통합 문제를 안정적으로 생산한다.
>
> **구조 철학**: 문제의 "겉모양"과 채점 규칙은 항상 같아야 한다(Style Contract). 대신, 어떤 규칙/패턴으로 밑줄을 흔드느냐는 Variaton Engine이 계속 확장한다.

---

## 1. Style Contract (불변식)

이 레이어는 어떤 변형을 쓰더라도 절대 깨지면 안 되는 조건이다.

1. **원문 고정**: 지문 문장 순서·철자·구두점은 그대로 유지. 발췌/재배열 금지.
2. **밑줄 5개(①~⑤)**: 정확히 다섯 곳에 `<u> … </u>`를 삽입하고 circled digits(U+2460~U+2464)를 보기에 매핑한다.
3. **오류 1개**: 다섯 보기 중 **단 하나**만 어법·어휘 오류. 최소 3개는 원문과 글자 단위로 동일.
4. **초급 금지**: 수일치/시제/오타처럼 형태만 보고 바로 보이는 오류는 배제.
5. **해석 + 규칙**: 의미·담화를 읽어야만 판별 가능하도록 구성한다.
6. **정답 유일성**: 나머지 4개는 문법·의미·담화 모두 참이어야 한다.
7. **최소 편집**: 오류는 원문에 가한 1회의 원자 연산(minimal edit)으로 만든다.
8. **결정성**: 동일 입력 + 동일 시드면 언제나 동일 출력이 나와야 한다.

이 Style Contract는 프롬프트/검증/렌더링이 공유하는 절대 규칙이다.

---

## 2. Variation Engine (가변 레이어)

패턴을 "닫힌 목록"으로 두지 않고, **카테고리 + 원자 연산 + 탐색 루프**로 확장 가능한 엔진을 설계한다.

### 2.1 패턴 카테고리 (열린 집합)

* **관계/보문/연결**: that/what/which/where/whether/if, 전치사 잔류·도치
* **병렬/조정**: to V / V-ing / 절 병렬, 의미역 불일치, 상관접속사
* **준동사/Control/Raising**: expect/allow/enable/tend/seem 등 비정형식 구조
* **분사·절축약**: as measured, given, with + NP + V-ing/p.p., dangling 검출
* **가정법·도치·Backshift**: Had S p.p…, It-cleft, Only if/Not until
* **대용·참조**: do/so/one/that/it, this/that/these/those의 장거리 참조
* **비교/수량**: much vs very, as…as, rather than, not so much A as B
* **Collocation/관용**: rely on, be associated with, make sense of …
* **전문 관습**: 과학/경제/법/철학 텍스트 고유 표현(예: to observe 목적용법)
* **담화 표지/정보 구조**: however, thus, meanwhile, indeed 등 위치·구두점
* **어휘 극성/논리**: encourage vs prevent, underestimate vs overestimate 등

> 새 코퍼스를 투입하면, 위 목록에 **추가**한다(닫지 않는다).

### 2.2 원자 연산(Operators)

모든 오류는 아래 연산 중 1회만 적용한다.

* **치환(Substitute)**: 관계사/접속사/전치사/비교표현/담화표지 교체
  * 예) where ↔ which, that ↔ what, on which ↔ which … on, much ↔ very
* **형태 승격·강등(Promote/Demote)**: to V ↔ V-ing, 절 ↔ 구, 분사 ↔ 본동사
* **병렬 왜곡(Coordinational Skew)**: 두 번째 항만 범주/의미역 어긋나게
* **참조 전환(Reference Flip)**: do/so/it/one/that의 지시 대상 바꾸기
* **극성 전환(Polarity Flip)**: 담화 귀결과 충돌하는 어휘 선택
* **스코프/결속 교란**: only/even/also/than/as의 작용 범위 바꾸기
* **정보 구조 변환**: 분사/동격절/부가절 사이 전환(의미 동일 유지)

### 2.3 난이도 노브

* **Triviality = 0**: 형태만 보면 보이는 오류는 폐기
* **장거리 단서**: 답 단서가 2~3문장 뒤에만 존재하도록 설계(+1 난도)
* **교차 의존**: 문법이 맞아도 collocation/논리 양쪽을 모두 봐야만 정답(+1)
* **도메인 관습**: 전문 영역 관습(과학/경제 등)을 맞춰야만 정답(+1)

### 2.4 분포 전략

* 세트(예: 10문항) 구성 시 **코어 60%**, **탐색 40%**.
* 새 패턴은 탐색 슬롯에서 시험 → QA 통과 → 코어로 승격.

---

## 3. 생성 파이프라인 (Deterministic)

1. **입력 수집**: 원문 단락, 난이도 태그, 시드(seed)
2. **구문 분석**: 의존/역할 태깅으로 후보 지점 7~9개 추출
3. **밑줄 선정**: 점수가 높은 5개를 선택(문장당 최대 2개, ≥3개 원문 동일)
4. **연산자 적용**: 선택한 패턴 카테고리에 맞는 원자 연산 1회 적용
5. **난도 튜닝**: 장거리 단서/교차 의존/도메인 관습 중 1~2개 추가
6. **검증**: 정답 유일성, 의미 보존, Style Contract 위반 여부 확인
7. **해설 작성**: 규칙 1문장 + 나머지 4개 정답성 요약 1~2문장
8. **결정성 보장**: 동일 입력・시드면 항상 동일 결과가 나오도록 로그 저장

---

## 4. JSON 사양

```json
{
  "type": "grammar",
  "question": "다음 글의 밑줄 친 부분 중, 어법상 틀린 것은?",
  "passage": "... <u> ... </u> ...",     // 밑줄 5개 유지
  "options": [
    "① <u>...원문 또는 변형...</u>",
    "② ...",
    "③ ...",
    "④ ...",
    "⑤ ..."
  ],
  "correctAnswer": 3,                   // 복수정답형은 correctAnswers
  "explanation": "오류 규칙 + 나머지 보기 근거",
  "sourceLabel": "출처│시험명 연도 회차 문항 (pXX)",
  "grammarPoint": "예: 가정법/Collocation",
  "metadata": {
    "documentTitle": "...",
    "variantTag": "seed 기반",
    "generator": "openai"
  }
}
```

복수정답형(`grammar_multi`)은 `question`을 “옳은 것을 모두 고르시오”로, 정답을 `correctAnswers: [2,4]` 형태로 제공한다.

---

## 5. 검증 체크리스트

- [ ] `type`이 `grammar` 또는 `grammar_multi`
- [ ] `question` 문구가 템플릿과 일치
- [ ] `passage`에 `<u>…</u>`가 정확히 5개 존재
- [ ] `options` 5개가 모두 circled digit + `<u>` 포함
- [ ] 정답 필드가 유형에 맞고 값이 1~5 범위
- [ ] `explanation`이 한국어이며 규칙+근거를 모두 명시
- [ ] `sourceLabel`이 `출처│...` 형식
- [ ] Style Contract 항목 위반 없음 (Triviality 0, Minimal edit 1회 등)

---

## 6. 샘플 (요약)

```
Passage: ... <u>pro-\nviding</u> ... <u>to focus</u> ... <u>monitoring</u> ... <u>remain engaged</u> ... <u>Policies adapt</u> ...
Question: 다음 글의 밑줄 친 부분 중, 어법상 틀린 것은?
Options:
① <u>pro-\nviding</u>
② ...
③ ...
④ <u>remain engaged</u>
⑤ <u>Policies adapt</u>
Answer: ④
Explanation: ④는 to부정사 병렬 구조가므로 `to remain engaged`로 맞춰야 한다. 나머지 보기들은 원문과 의미/형식이 모두 일치한다.
SourceLabel: 출처│2025 Mock 09월 Sejong 21번 (p02)
```

---

## 7. 운영 팁

* **중복 방지**: 한 세트에서 동일 장치를 2회 초과 사용 금지.
* **도메인 다양화**: 과학/경제/철학/심리 등을 균형 있게 순환.
* **변이 로그**: 어떤 패턴/연산자를 썼는지 JSON 메타데이터에 기록 → 재현성 확보.

이 템플릿은 생성기/검증기/UI가 공유하는 기준선이다. Variation Engine은 계속 확장하되, 위 Style Contract만은 반드시 준수한다.
