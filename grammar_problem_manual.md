# 📚 LoE 어법·어휘 통합 출제 매뉴얼 Master v7.0 (Professor Edition)

> **목표**: 고2·고3 상위권~최상위 및 TOEFL·GRE급 문제까지 커버하는 실전 어법·어휘 통합 문항을 안정적으로 생산한다.
> **전략**: 문제의 겉모양과 채점 규칙(Style Contract)은 고정, 밑줄 장치(패턴)는 Variation Engine으로 무한 확장.
> **출처 표기**: `출처│기관 시험명 연도 회차 문항 (pXX)`

---

## 0. Style Contract (깨지면 안 되는 절대 규칙)

| 규칙 | 설명 |
|------|------|
| 원문 고정 | 지문 문장 순서·철자·구두점을 그대로 사용. 발췌/재배열 금지 |
| 밑줄 5개 | `<u> … </u>` 다섯 곳에 밑줄, 보기 번호는 반드시 circled digit(U+2460~U+2464) |
| 오류 1개 | 다섯 보기 중 정확히 하나만 오류. 최소 3개는 원문과 글자 단위 동일 |
| Triviality 0 | 눈에 띄는 초급 오류(수일치, 시제, 오타 등) 즉시 폐기 |
| 해석 + 규칙 | 의미·담화·규범을 모두 해석해야 정답 판단 가능 |
| 정답 유일 | 나머지 4개는 문법·어휘·담화 모두 참 |
| 최소 편집 | 오류는 원문에 가한 **원자 연산 1회**로 생성 |
| 결정성 | 동일 입력 + seed → 동일 출력 (재현 가능 로그 필수) |

---

## 1. Variation Engine (확장 가능한 패턴 레이어)

### 1.1 패턴 카테고리 (열린 집합)

* **관계/보문/연결**: that/what/which/where/whether/if, 전치사 잔류·도치
* **병렬/조정**: to V / V-ing / 절 병렬, 의미역 불일치, 상관접속사
* **준동사/Control/Raising**: expect/allow/enable/tend/seem 등 비정형식 구조
* **분사·절축약**: as measured, given, with + NP + V-ing/p.p., dangling 검출
* **가정법·도치·Backshift**: Had S p.p…, It-cleft, Only if/Not until
* **대용·참조**: do/so/one/that/it, this/that/these/those, 장거리 참조
* **비교/수량**: much vs very, as…as, rather than, not so much A as B, the number of
* **Collocation/관용**: rely on, be associated with, suited to, make sense of …
* **전문 관습**: 과학·경제·법·철학 텍스트 특유 관용 표현
* **담화 표지/정보 구조**: however, thus, meanwhile, indeed 등 위치·구두점
* **어휘 극성/논리**: encourage vs prevent, underestimate vs overestimate 등

> 새로 발견한 패턴은 즉시 여기에 추가한다(닫힌 목록이 아니다).

### 1.2 원자 연산 (Operators)

* **치환**: 관계사/접속사/전치사/담화표지/비교표현 교체 (예: where ↔ which)
* **형태 승격·강등**: to V ↔ V-ing, 절 ↔ 구, 분사 ↔ 본동사
* **병렬 왜곡**: 병렬 항 하나의 범주/의미역만 어긋나게
* **참조 전환**: do/so/it/one/that의 지시 대상 변경
* **극성 전환**: 담화 귀결과 충돌하는 어휘 선택 (예: worsen ↔ improve)
* **스코프 교란**: only/even/also/than/as 작용 범위 변경
* **정보 구조 변환**: 분사/동격절/부가절/절축약 간 전환

항상 **1회만** 적용하고 Style Contract를 지킨다.

### 1.3 난이도 노브

* **장거리 단서**: 정답 단서가 2~3문장 뒤에만 존재하도록 설계 (+1 난도)
* **교차 의존**: 문법이 맞아도 collocation/논리를 함께 검토해야 정답 (+1)
* **도메인 관습**: 전문 영역 관습을 정확히 맞춰야 정답 (+1)

### 1.4 분포 전략

* 세트(예: 10문항)마다 **코어 60% + 탐색 40%**
* 탐색 패턴은 QA 통과 시 코어로 승격

---

## 2. 생성 파이프라인 (Deterministic)

1. **입력 파싱**: 원문 단락, 난도 태그, seed
2. **패턴 후보 추출**: 의존/역할 태깅으로 후보 지점 7~9개 파악
   - 링커, 병렬 두 번째 항, 준동사/분사, 비교/수량, 참조/담화
3. **밑줄 선정**: 점수 상위 5개 선택(문장당 최대 2개, ≥3개 원문 동일)
4. **연산자 적용**: 선택한 패턴 카테고리에 맞는 원자 연산 1회 적용
5. **난도 튜닝**: 장거리 단서/교차 의존/도메인 관습 노브 설정
6. **검증 1차**: 정답 유일성, 의미 보존, 최소 편집 여부
7. **검증 2차**: Style Contract 위반 여부, Triviality 재확인
8. **해설 작성**: 규칙 1문장 + 나머지 4개 근거(한국어, 2~3문장 이내)
9. **로그 저장**: `metadata.variantTag` 등에 패턴/연산자/난도/seed 기록

---

## 3. JSON 출력 예시

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

복수정답형(`grammar_multi`)은 `question`을 “어법상 옳은 것을 모두 고르시오”, 정답을 `correctAnswers` 배열로 제공한다.

---

## 4. QA 체크리스트

- [ ] Style Contract 8개 항목 충족
- [ ] 밑줄 5개, circled digit 5개, `passage`와 `options` 매핑 일치
- [ ] 정답 필드가 유형에 맞고 범위(1~5) 준수
- [ ] 해설이 한국어이며 규칙/근거 모두 포함
- [ ] Triviality=0 (초급 오류 없음)
- [ ] 메타데이터에 패턴/연산자/seed 로그 기록

---

## 5. Variation Engine 사례

| 패턴 | 오류 예시 | 원자 연산 | 판정 포인트 |
|------|-----------|-----------|--------------|
| Headless Free Relative | *All we know is **what** apes possess …* → **that** | 치환 | 동격절 vs 자유 관계절 |
| 비교 + 전문 관습 | *shift was **very** larger …* → **much** | 전문 관습 | 비교급 수량 표현 |
| 병렬 의미역 | *to calibrate … **and preventing** drift* → **and (to) prevent** | 병렬 왜곡 | 범주/의미역 일치 |
| 참조 대용 | *so do I* ↔ *so am I* ↔ *so it is* | 참조 전환 | 주절 술어·시제/태 일치 |
| 절축약 → 부가절 | *…, **calling** dopamine …* → *…, **which** calls …* | 정보 구조 변환 | dangling 방지 |

---

## 6. 세트 운영 가이드

1. **중복 억제**: 동일 장치는 세트당 최대 2회
2. **도메인 로테이션**: 과학 → 경제 → 철학 → 심리 → 사회 → 인문 순환
3. **seed 규칙**: `seed = hash(문서ID + 세트번호)`로 고정해 재현성 확보
4. **로그 관리**: `metadata.variantTag`에 `pattern/operator/difficulty` 명시
5. **QA 샘플링**: 탐색 패턴 40%는 수동 리뷰 후 배포

---

## 7. 출력 템플릿

```
출처│기관 시험명 연도 회차 문항 (pXX)

[원문 전체 단락]
… **① [원문/변형]** … **② [원문/변형]** … **③ [원문/변형]** … **④ [원문/변형]** … **⑤ [원문/변형]** …

**정답: ④**
- 해설: [규칙/오류 설명 1문장]. [나머지 4개가 옳은 이유 1~2문장].
```

---

## 8. 다음 스텝

* 새 패턴을 등록할 때는 카테고리/연산자/난도 노브를 함께 쓰고, Variation Engine 로그를 남겨주세요.
* 필요하면 `seed=문서ID_샘플`로 샘플 5문항과 변이 로그를 즉시 만들 수 있습니다.

v7.0부터는 “Style Contract를 지키면서 Variation Engine을 계속 확장”하는 것이 기본 모드입니다. 패턴/연산자를 추가할 때마다 본 문서를 갱신하세요.
