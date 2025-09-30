# 요약(빈칸 A·B) 통합 매뉴얼 · 완성판 (K-CSAT Summary AB · Deterministic)

> **목표**: 영어 지문을 한 문장으로 압축하면서, 빈칸 (A), (B)에 들어갈 핵심 어휘 쌍을 5지선다로 결정론적으로 생성·채점한다.
> **출력 원칙**: 지문과 요약문은 영어, 문두 지시문과 해설은 한국어, 보기와 정답은 영어.

---

## A. Style Contract (불변 규칙)

1. **지문**: 원문 단락 그대로 사용(삭제·추가·재배열 금지).
2. **문두 지시문(한국어)**: `다음 글의 내용을 한 문장으로 요약하고자 한다. 빈칸 (A), (B)에 들어갈 말로 가장 적절한 것은?`
3. **요약문**: 영어 한 문장(18~35단어)으로 작성하며 `(A)`와 `(B)`는 반드시 대문자 괄호 그대로 유지, 마침표로 끝낸다.
4. **보기**: 5지선다(①~⑤), 각 항목은 `① phrase_A – phrase_B` 형식(영어). en dash(–) 앞뒤 공백 1칸 유지.
5. **정답 유일**: 다섯 보기 중 의미·극성·Collocation이 모두 일치하는 조합은 정확히 1개.
6. **Triviality 금지**: 직역 동의어만으로 답이 보이거나, 명백한 품사 오류, 숫자/고유명사 나열, clickbait/감탄형 제목 등을 금지.
7. **톤**: 학술적·중립. A/B는 지문의 핵심 행위·기제와 귀결·효과를 반영한다.

---

## B. 의미 신호 모델 (What → Why → So-what)

| 축 | 설명 | 빈칸 매핑 |
|----|------|-----------|
| **What** | 지문의 주장/핵심 전략 | (A) 후보의 기초 |
| **Why** | 원인·메커니즘·조건 | 요약문 중간부에 반영 |
| **So-what** | 귀결·평가·효과 | (B) 후보의 기초 |

(A)는 주로 **행위/전략/메커니즘**(동사/명사), (B)는 **결과/효과/평가**(명사/형용사) 역할을 한다.

---

## C. (A)/(B) 슬롯 설계 지침

* **(A)**: 행동·전략·관계(예: praising, connecting with winners, inclusive design, mirror neurons). 동사원형·명사구 허용.
* **(B)**: 결과·효과·평가(예: expectations, motivation, species survival, reducing atmospheric carbon, imitation 등).
* **Collocation/논리 검증**: (A)가 바뀌면 (B)도 의미가 무너지도록 상호 의존성을 확보한다.

---

## D. 오답 유형 라이브러리 (각 보기 1결함 이상)

| 유형 | 설명 |
|------|------|
| Narrow | 예시·부분 현상만 제목화 |
| Broad | 분야 일반론으로 과확장 |
| Detail | 숫자·지명·연도 등 세부 사실 위주 |
| Counter-claim | 글의 결론과 극성 반대 |
| Metaphor-literal | 비유·도입 사례를 그대로 빈칸에 넣음 |
| Role-swap | 원인↔결과, 수단↔목적 전도 |
| Collocation break | 자연 결합 어긋남 (*associated with* ↔ *suited to* 등) |
| Definition | 용어 정의/역사만 제시 |

세트 내에서는 동일 유형 반복을 2회 이하로 제한한다.

---

## E. 생성 파이프라인 (결정적 8단계)

1. **핵심 의미 추출**: 지문에서 What/Why/So-what 요소와 반복 키워드 추출.
2. **요약 골격 작성**: `According to the passage, (A) ... , which/thereby (B) ... .` 형태.
3. **(A) 후보군**: 행위·기제 관련 동사/명사 3~5개 선정 후 문법형태 정규화.
4. **(B) 후보군**: 결과·효과 관련 명사/형용사 3~5개 선정 후 극성·범위 정규화.
5. **정답 조합 선택**: (A)-(B) 의존성이 가장 높은 한 쌍을 채택.
6. **오답 4쌍 생성**: D유형을 조합해 의미/극성/Collocation 하나 이상 붕괴.
7. **QA 게이트**: 정답 유일성, Triviality=0, Collocation, 품사, 길이(6~12단어 제한) 등 검증.
8. **출력 포맷 구성**: 한국어 지시문 + 영어 요약문 + 5개의 `① A – B` 보기.

---

## F. 출력 템플릿

```
[영어 지문]

다음 글의 내용을 한 문장으로 요약하고자 한다. 빈칸 (A), (B)에 들어갈 말로 가장 적절한 것은?

According to the passage, ... (A) ... , which ... (B).

① phrase_A – phrase_B
② ...
③ ...
④ ...
⑤ ...

정답: ③
해설: (A)는 [핵심 행위/전략], (B)는 [귀결/효과]에 해당하며, 나머지 보기는 [오답 유형]에 해당한다.
```

---

## G. 난이도 노브

* **장거리 단서**: (B) 근거를 문단 후반에 배치해 추론 난도를 높인다.
* **교차 의존**: (A)·(B) 둘 중 하나만 바꿔도 의미가 붕괴되도록 오답 설계.
* **도메인 관습**: 과학/경제/사회 글에서 전문 Collocation 사용(*species survival*, *reducing atmospheric carbon*, *inclusive workplace* 등).

---

## H. 품질 체크리스트

* [ ] 한국어 지시문 문구가 정확히 일치한다.
* [ ] 요약문은 18~35단어, (A)/(B) 두 번 등장, 마침표로 끝난다.
* [ ] 보기 5개 모두 circled digit + en dash 형식을 지킨다.
* [ ] 정답 유일성 확보, 오답은 서로 다른 결함 유형.
* [ ] Collocation·품사·극성·범위가 지문 뜻과 일치한다.
* [ ] 해설에는 정답 근거와 대표 오답 결함을 한국어로 명시한다.
* [ ] `sourceLabel`은 `출처│`로 시작한다.

---

## I. 코퍼스 예시 매핑

* 과도한 칭찬 → 비현실적 기대: (A) *praising* / (B) *expectations*
* 성공한 타인과 연결 → 동기 회복: (A) *connecting with* / (B) *motivation*
* 감정의 진화적 역할 → 종 생존: (A) *adaptive mechanisms* / (B) *species survival*
* AI 보조기술 → 포용성 향상: (A) *inclusive design* / (B) *improving accessibility*
* 고래 보호 → 탄소 감소: (A) *environmental guardians* / (B) *reducing atmospheric carbon*
* 거울뉴런 → 모방 학습: (A) *observing actors* / (B) *imitation*

---

> **요약**: (A)는 지문의 핵심 행위·전략, (B)는 그로 인한 결과·효과를 담는다. Collocation과 극성을 유도된 오답으로 무너뜨려 오직 한 조합만 정답이 되게 한다.
*** End Patch
PATCH
