# 📚 LoE 어법·어휘 통합 출제 매뉴얼 Master v7.1 (Professor Edition)

> **핵심 질문**: 문제의 겉모양은 항상 같게 유지하면서, 어떻게 계속 새로운 어법·어휘 장치를 적용할까?
> **답**: *Style Contract*로 형식을 고정하고, *Variation Engine*으로 장치를 확장한다.
> **출처 표기**: `출처│기관 시험명 연도 회차 문항 (pXX)` (페이지 정보가 없으면 생략 가능)

---

## 0. 두 층 구조 요약

| 레이어 | 역할 | 설명 |
|--------|------|------|
| **Style Contract** | 겉모양·채점 규칙 고정 | 원문 전체 제시, 밑줄 5개(①~⑤), 오류 1개, Triviality=0, 정답 유일, 최소 편집 등 절대 규칙을 정의 |
| **Variation Engine** | 장치 확장 | 패턴 카테고리 + 원자 연산 + 난이도 노브로 새로운 어법·어휘 장치를 지속적으로 흡수 |

Style Contract를 깨지 않는 한, Variation Engine은 마음껏 확장해도 된다.

---

## 1. Style Contract (절대 불변식)

1. **원문 고정**: 지문 문장 순서·철자·구두점을 그대로 사용. 발췌/재배열 금지.
2. **밑줄 5개**: `<u> … </u>` 다섯 곳, 보기 번호는 반드시 circled digit(U+2460~U+2464).
3. **오류 1개**: 다섯 보기 중 정확히 하나만 오류. 최소 3개는 원문과 글자 단위 동일.
4. **Triviality=0**: (*we returns*, *would have allow*)처럼 눈에 띄는 초급 오류 금지.
5. **해석 + 규칙**: 의미·담화·문법·어휘를 종합해야 정답 판단이 가능하도록 설계.
6. **정답 유일**: 나머지 4개는 문법·어휘·담화 모두 참.
7. **최소 편집**: 오류는 원문에 가한 **원자 연산 1회**로 생성.
8. **결정성**: 동일 입력 + seed → 동일 출력. log(metadata.variantTag 등)로 재현 가능해야 함.

이 레이어를 위반하면 문제 전체를 폐기한다.

---

## 2. Variation Engine (무한 확장 레이어)

### 2.1 패턴 카테고리 (열린 집합)

패턴은 닫힌 목록이 아니다. 새 코퍼스를 분석할 때마다 아래 카테고리에 추가한다.

**문법/구조 중심**
- 관계·보문·연결: that/what/which/where/whether/if, 전치사 잔류·도치
- 병렬/조정: to V / V-ing / 절 병렬, 의미역 불일치, 상관접속사
- 준동사/Control/Raising: expect/allow/enable/seem/tend/happen 등
- 분사·절축약: as measured, given, with + NP + V-ing/p.p., dangling 검출
- 가정법·도치·Backshift: Had S p.p…, It-cleft, Only if/Not until/Never …
- 대용·참조: do/so/one/that/it, this/that/these/those, anaphora/cataphora
- 비교·수량·강조: much vs very, as…as, rather than, the number of/a number of

**어휘/의미 중심**
- Collocation·관용: rely on, be associated with, make sense of, take account of …
- 어휘 극성/논리: encourage vs discourage, cause vs prevent, underestimate vs overestimate …
- 등록·톤(Register): 공식/비공식, 학술/대중, 긍정/부정 어휘 선택
- 도메인 관습: 과학·경제·법·철학·심리 텍스트 특유 표현(to observe 목적, ceteris paribus 등)
- 담화 표지/정보 구조: however, thus, meanwhile, indeed, in contrast, for one thing …
- 의미 참조 회복: domain-specific 용어, technical term, 약어 등 앞문장과 연결되는 표현

> 새로 발견한 패턴은 즉시 카테고리에 추가하고, QA를 거쳐 코어 패턴으로 승격한다.

### 2.2 원자 연산 (Operators)

모든 오류는 아래 연산 중 **한 번만** 적용한다.

- **치환(Substitute)**: 관계사/접속사/전치사/담화표지/비교표현/전문용어 교체
  - 예: where ↔ which, that ↔ what, on which ↔ which … on, much ↔ very, nevertheless ↔ however
- **형태 승격·강등(Promote/Demote)**: to V ↔ V-ing, 절 ↔ 구, 분사 ↔ 본동사, 동격 ↔ 부가절
- **병렬 왜곡(Coordinational Skew)**: 병렬 항 중 하나만 범주/의미역 어긋나게
- **참조 전환(Reference Flip)**: do/so/it/one/that/these의 지시 대상 바꾸기
- **극성 전환(Polarity Flip)**: 담화 귀결과 충돌하는 어휘 선택 (예: mitigate → exacerbate)
- **스코프/결속 교란(Scope/Binding)**: only/even/also/than/as 범위 교란, 비교 도치 등
- **정보 구조 변환**: 분사↔부가절, 절축약↔본동사, 주절↔부사절 전환 (의미 동일 유지)

### 2.3 난이도 노브 (Knobs)

- **장거리 단서(long-range)**: 정답 근거가 2~3문장 뒤에만 존재 (+1 난도)
- **교차 의존(cross-dependency)**: 문법이 맞아도 collocation/담화 논리를 모두 확인해야 함 (+1)
- **도메인 관습(domain conventions)**: 전문 영역 관습을 충족해야 정답 (+1)
- **어휘 미세 차이(lexical nuance)**: 동의어처럼 보이지만 뉘앙스·구문 요구가 다른 표현 (+1)

### 2.4 분포 전략

- 세트(예: 10문항) 기준 **코어 패턴 60% + 탐색 패턴 40%**.
- 탐색 패턴은 QA 통과 시 코어로 승격한다.

---

## 3. 결정적 출제 절차 (Deterministic Pipeline)

1. **입력 확보**: 원문 단락, 난이도 태그, seed.
2. **후보 탐색**: 의존/역할 태깅으로 밑줄 후보 7~9개 추출
   - 링커/헤드, 병렬 2항, 준동사/분사, 비교/수량, 담화 표지, collocation 핵심어 등
3. **밑줄 5개 확정**: 점수 상위 5개 선정 (문장당 최대 2개, ≥3개 원문 동일)
4. **원자 연산 적용**: 선택한 패턴 카테고리에 가장 잘 맞는 연산 1회 적용
5. **난도 튜닝**: 장거리 단서/교차 의존/도메인 관습/어휘 뉘앙스 중 1~2개 활성화
6. **의미·담화 검증**: 정답 외 4개가 모두 의미상 “참”인지 확인 (collocation/극성/담화 흐름)
7. **Style Contract 검증**: Triviality=0, 최소 편집=1, 밑줄/번호/출처 규격 준수
8. **해설 작성**: 규칙 1문장 + 나머지 4개 근거 1~2문장(한국어, 3문장 이내)
9. **로그 기록**: `metadata.variantTag` 등에 `pattern/operator/knob/seed` 저장 → 재현성 확보

---

## 4. 어휘·의미 설계 가이드

1. **Collocation**: 서로 붙는 표현인지 확인. *take action* ↔ (오류) *make action* 등.
2. **Register**: 학술 vs 일상, 긍정 vs 부정, 격식 vs 비격식 같은 톤/느낌이 문맥과 맞는지 확인.
3. **논리 극성**: 문단의 주장/귀결 방향과 반대되는 어휘를 넣어야 함 (예: prevent ↔ encourage).
4. **도메인 관습**: 과학·경제 등에서는 통용되는 기술어/문장 구조가 정답인지 확인.
5. **의미 해석**: 동형 이의어/구문 ambiguity를 제거. 오답 4개가 문맥에서 자연스러워야 한다.
6. **장거리 참조**: this/that/these/those가 가리키는 대상이 문단 전반과 일치하는지 재검토.

---

## 5. JSON 출력 예시

```json
{
  "type": "grammar",
  "question": "다음 글의 밑줄 친 부분 중, 어법상 틀린 것은?",
  "passage": "... <u> ... </u> ...",
  "options": [
    "① <u>...원문 또는 변형...</u>",
    "② ...",
    "③ ...",
    "④ ...",
    "⑤ ..."
  ],
  "correctAnswer": 4,
  "explanation": "④는 병렬 첫 항 to calibrate와 형태를 맞추기 위해 to remain engaged 여야 합니다. 나머지 보기들은 원문과 의미·형식이 모두 일치합니다.",
  "sourceLabel": "출처│2025 Mock 09월 Sejong 21번 (p02)",
  "grammarPoint": "병렬 구조",
  "metadata": {
    "documentTitle": "문서 제목",
    "variantTag": "doc13_seed42_patternB_operatorSkew",
    "generator": "openai"
  }
}
```

복수정답형(`grammar_multi`)은 `question`을 “어법상 옳은 것을 모두 고르시오”로 바꾸고, `correctAnswers` 배열을 제공한다.

---

## 6. QA 체크리스트 (어법 + 어휘)

- [ ] Style Contract 8개 항목 충족 (밑줄/번호/Triviality/최소 편집/정답 유일)
- [ ] `passage`에 `<u>` 5개, `options` 5개 모두 circled digit + `<u>` 포함
- [ ] 정답 필드가 유형에 맞고 값이 1~5 범위
- [ ] 해설이 한국어이며 규칙·담화·어휘 근거를 모두 명시 (3문장 이내)
- [ ] Collocation/논리 극성/도메인 관습이 문맥과 일치
- [ ] `metadata.variantTag` 등에 pattern/operator/knob/seed 기록

---

## 7. Variation Engine 사례 (어법+어휘 결합)

| 패턴 | 오류 예시 | 원자 연산 | 판정 포인트 |
|------|-----------|-----------|--------------|
| Headless Free Relative | *All we know is **what** apes possess …* → **that** | 치환 | 동격절 vs 자유 관계절 |
| 비교 + 전문 관습 | *The shift was **very** larger …* → **much** larger | 극성/전문 관습 | 비교급 수량 표현 |
| 병렬 의미역 | *to calibrate … **and preventing** drift* → **and (to) prevent** | 병렬 왜곡 | 범주/의미역 일치 |
| Collocation | *take an insight* ↔ **gain an insight** | 치환 | collocation 자연성 |
| 담화 참조 | *This reveals …* (선행 없음) ↔ **This finding reveals …** | 참조 전환 | 장거리 지시 회복 |

---

## 8. 세트 운영 가이드

1. **중복 억제**: 동일 장치는 세트당 최대 2회.
2. **도메인 로테이션**: 과학 → 경제 → 철학 → 심리 → 사회 → 인문 순환.
3. **seed 규칙**: `seed = hash(문서ID + 세트번호)`로 고정 → 재현성 확보.
4. **로그 관리**: `metadata.variantTag`에 `pattern/operator/knob/seed` 기입.
5. **QA 샘플링**: 탐색 패턴 40%는 수동 리뷰 후 배포.

---

## 9. 출력 템플릿 (복붙용)

```
출처│기관 시험명 연도 회차 문항 (pXX)

[원문 전체 단락]
… **① [원문/변형]** … **② [원문/변형]** … **③ [원문/변형]** … **④ [원문/변형]** … **⑤ [원문/변형]** …

**정답: ④**
- 해설: [규칙/오류 설명 1문장]. [나머지 4개가 옳은 이유 1~2문장].
```

---

## 10. 다음 스텝

* 새 패턴을 등록할 때는 **카테고리·원자 연산·난이도 노브**를 함께 기록하고 Variation Engine 로그를 남겨 주세요.
* 요청 시 `seed=문서ID_샘플`로 샘플 5문항과 변이 로그를 즉시 생성할 수 있습니다.

Master v7.1은 “Style Contract를 지키면서 Variation Engine을 확장”하는 표준입니다. 새 어법/어휘 장치를 찾을 때마다 본 문서를 업데이트하세요.
