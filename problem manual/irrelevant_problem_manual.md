# PROBLEM_PROMPTS_IRRELEVANT.md — CSAT ‘무관한 문장(Irrelevant Sentence)’ 문제 파이널 매뉴얼

## A. 문제 정의와 채점 철학
- **정의**: 단락 내 5문장 중 글 전체의 주제·논리 흐름과 **관계없는 문장 1개**를 찾는 문제.
- **측정 역량**: 세부 내용 파악이 아닌, 글의 **주제망(주제–근거–예시–결론)** 구조 이해.
- **채점 철학**:
  - 정답은 주제망에서 이탈한 유일한 문장.
  - 나머지 4문장은 모두 글의 주제·논리망을 구성.
  - 유일정답성 필수.

---

## B. 지문 선택 기준
- **지문 성격**: 설명문·논설문.
- **길이**: 5문장 (4개 연결 + 1개 이탈).
- **조건**:
  - 주제→근거→예시→귀결 구조 유지.
  - 이탈 문장은 표면상 관련 단어가 있어도 **논증 목적**과 기능에서 벗어나야 함.
- **기출 예시**: 2025 수능 35번【28†source】.

---

## C. 출제 포인트 (핵심 규칙)
### 1. 정답 조건
- 글의 핵심 논증을 방해하는 문장.
- 주제와 직접 연결되지 않음.

### 2. 오답 문장 조건
- 주제-근거-예시-결론을 모두 메워야 함.
- 제거하면 글의 핵심이 붕괴.

### 3. 이탈 유형 카탈로그
- (범위 확장) — 상위 일반론으로 새는 문장.
- (주제 전환) — 인접 개념으로 방향 바꿈.
- (시간/대상 불일치) — 시기·집단 불일치.
- (메타 정보) — 행정/가격/식당 등 부차적 정보.

### 4. 난이도 조절 레버
- **상**: 표면상 관련 단어 있음(위장된 이탈).
- **중**: 같은 주제 범주지만 기능이 벗어남.
- **하**: 완전히 동떨어진 내용.

---

## D. 제작 절차 (6단계)
1. 주제-근거-예시-귀결 구조로 4문장 설계.
2. 이탈 유형 중 하나 선택 → 문장 삽입.
3. 문장 번호 1~5 부여.
4. 질문: “Q. 다음 글에서 전체 흐름과 관계없는 문장을 고르세요.”
5. 정답 번호 = 이탈 문장.
6. 해설: 왜 이 문장이 이탈인지 + 다른 문장이 왜 필수인지.

---

## E. 예시 (기출 재구성)

### mainText (예시)
(1) The spread of affordable cars enabled fans to travel to remote venues, boosting sports tourism. (2) Cars offered door-to-door access and space for gear. (3) This convenience extended tourism networks into small towns. (4) As tourism grew, many cities also saw an expansion of trendy restaurants. (5) For sports requiring equipment and long drives, private cars became indispensable.

### 결과(JSON)
```json
{"type":"irrelevant","mainText":"(1) The spread of affordable cars enabled fans to travel to remote venues, boosting sports tourism. (2) Cars offered door-to-door access and space for gear. (3) This convenience extended tourism networks into small towns. (4) As tourism grew, many cities also saw an expansion of trendy restaurants. (5) For sports requiring equipment and long drives, private cars became indispensable.","question":"Q. 다음 글에서 전체 흐름과 관계없는 문장을 고르세요.","options":["1","2","3","4","5"],"answer":4,"explanation":"(1)(2)(3)(5)는 자동차가 스포츠 관광을 확장시켰다는 논지를 강화한다. (4)는 일반 관광과 식당에 관한 내용으로 주제와 기능이 이탈했다.","evidenceLines":["enabled fans to travel to remote venues","private cars became indispensable"],"metadata":{"style":"csat","difficulty":"basic"}}
```

---

## F. 오답 설계 기술
- 정답 외 문장은 모두 논리망에 연결.
- 각 문장은 기능상 (주제/근거/예시/귀결) 역할.
- 중복 문장·사실 오류 금지.

---

## G. 난이도 조절 레버
- **상**: 표면상 유사 단어 삽입.
- **중**: 범위 약간 벗어난 문장.
- **하**: 완전히 동떨어진 문장.

---

## H. 품질 QC 체크리스트
- [ ] 정답 문장 = 주제와 불일치.
- [ ] 나머지 문장 = 주제망 구성 필수.
- [ ] 정답 후보 1개만 존재.
- [ ] 해설 = 정답 근거+다른 문장 필수성.
- [ ] 질문 포맷 준수.

---

## I. 실패 예시 (금지)
- 이탈 문장이 2개.
- 오답 문장이 주제망과 무관.
- 문장이 4개 이하/6개 이상.
- 정답이 문법 오류/문체 차이로만 설명됨.

---

## J. 재시도 정책
- 이탈 문장이 애매하면 유형 교체.
- 정답·오답 기능 재배열.
- 최대 2회 재시도.

---

## K. 결론
이 매뉴얼은 **무관한 문장 문제(35번류)** 출제 철학, 정답·오답 설계, 난이도 조절, 품질 검증을 총망라한다. 이를 따르면 어떤 단락도 **유일정답형 무관 문장 문제**로 안정적으로 제작할 수 있다.

