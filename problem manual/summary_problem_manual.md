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

(A)는 **행위/전략/메커니즘**, (B)는 **결과/효과/평가** 역할을 한다.

---

## C. (A)/(B) 슬롯 설계 지침

* **(A)**: 행동·전략·관계(예: praising, connecting with winners, inclusive design, mirror neurons). 동사원형·명사구 허용.
* **(B)**: 결과·효과·평가(예: expectations, motivation, species survival, reducing atmospheric carbon, imitation 등).
* **Collocation/논리 검증**: (A)가 바뀌면 (B)도 의미가 무너지도록 상호 의존성을 확보한다.

---

## D. 오답 유형 라이브러리

| 유형 | 설명 |
|------|------|
| Narrow | 예시/부분 현상만 제목화 |
| Broad | 분야 일반론으로 과확장 |
| Detail | 숫자·지명·연도 등 세부 사실 위주 |
| Counter-claim | 글의 결론과 극성 반대 |
| Metaphor-literal | 비유·도입 사례를 그대로 빈칸에 넣음 |
| Role-swap | 원인↔결과, 수단↔목적 전도 |
| Collocation break | 자연 결합 어긋남 |
| Definition | 용어 정의/역사만 제시 |

---

## E. 생성 파이프라인

1. 핵심 의미 추출 → What/Why/So-what 분해.
2. 요약 골격 작성 → `According to the passage, ... (A) ... , which ... (B).`
3. (A) 후보군 선정 → 행위/기제 관련 어휘 정규화.
4. (B) 후보군 선정 → 결과/효과 관련 어휘 정규화.
5. 정답 조합 선택 → (A)-(B) 의존성이 가장 높은 한 쌍 선택.
6. 오답 네 쌍 생성 → Narrow/Broad/Detail/Counter 등 결함 넣기.
7. QA → 유일성·Triviality·Collocation·품사·길이 검증.
8. 출력 → 한국어 지시문 + 영어 요약문 + `① A – B` 형식 보기.

---

## F. 품질 체크리스트

* [ ] 지시문 문구가 완전히 일치한다.
* [ ] 요약문은 18~35단어, (A)/(B) 포함, 마침표로 끝난다.
* [ ] 보기 5개 모두 circled digit + en dash 형식을 지킨다.
* [ ] 정답은 1개, 오답은 서로 다른 결함 유형을 갖는다.
* [ ] Collocation·극성·범위가 지문 뜻과 일치한다.
* [ ] 해설은 한국어로 정답 근거와 주요 오답 결함을 설명한다.
* [ ] `sourceLabel`이 `출처│`로 시작한다.

---

## G. 코퍼스 예시 매핑

* 과도한 칭찬 → 비현실적 기대: (A) *praising* / (B) *expectations*
* 성공한 타인과 연결 → 동기 회복: (A) *connecting with winners* / (B) *motivation*
* 감정의 진화적 역할 → 종 생존: (A) *adaptive mechanisms* / (B) *species survival*
* AI 보조기술 → 포용성 강화: (A) *inclusive design* / (B) *improving accessibility*
* 고래 보호 → 탄소 감소: (A) *environmental guardians* / (B) *reducing atmospheric carbon*
* 거울뉴런 → 모방 학습: (A) *observing* / (B) *imitation*

> 핵심: (A)는 행위/기제, (B)는 귀결/효과. Collocation과 극성을 무너뜨리는 오답을 배치해 정답 1개만 남긴다.
