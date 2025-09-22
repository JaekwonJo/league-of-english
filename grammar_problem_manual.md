# PROBLEM_PROMPTS_GRAMMAR_SPAN.md — CSAT ‘어법(Grammar)’ 문제 파이널 매뉴얼

## A. 문제 정의와 채점 철학
- **정의**: 영어 단락에서 5개의 밑줄 중 **정확히 1곳**만 문법 오류로 설정하고, 나머지는 모두 적법한 구조로 둔 뒤 “어법상 옳지 않은 것”을 찾게 하는 문제.
- **측정 역량**: 단순 규칙 암기가 아니라 **문맥 속 문법 구조 판단** + **유일정답성 판별**.
- **채점 철학**:
  - 정답은 **한 번의 수정(1-step fix)**으로 해결 가능해야 함.
  - 나머지 4곳은 ‘헷갈리지만 맞는’ 고난도 함정.
  - **코퍼스 자연성**: 수정 후 문장은 실제 영어 쓰기에서 자연스러워야 한다.
  - **유일정답성** 필수: 정답 외 다른 밑줄은 절대 오류가 되면 안 됨.

---

## B. 지문 선택 기준
- **장르**: 설명문·과학·심리·사회 글.
- **길이**: 120~180어.
- **조건**:
  - 최소 5~7문장.
  - 관계사, 분사, 전치사, 병렬, 수일치, 시제 등 다양한 구문 포함.
- **기출 예시**: 2025 수능 29번【28†source】.

---

## C. 수능형 출제 포인트 (18개 축)
### 빈출 핵심 (★)
1. **주어-동사 수일치(★)**: 의미상 주어, 삽입구 무시.
2. **시제·상·조동사(★)**: 시간축 일관성, 완료·가정법.
3. **태(능/수동)·목적어 구조(★)**: 타동사 목적어, 수동태 보어.
4. **분사·분사구문(★)**: -ing/-ed, dangling participle.
5. **관계사/관계절(★)**: 선행사·격 일치.
6. **명사절/접속사(★)**: what/that/if/whether 구별.
7. **병렬·등위(★)**: 품사·형식 일치.
8. **비교구문(★)**: as~as, 비교급 than.
9. **전치사·관용(★)**: collocation, 자동사/타동사 구별.
10. **관사·한정사(★)**: 불가산/가산, each/every.
11. **대명사 호응(★)**: 단복수, 참조 명확성.

### 중상위 포인트
12. 부정/도치
13. 가정법
14. 부정사·동명사
15. 수식어 위치
16. It/There 구문
17. 연결어(although/because 등)
18. 어순/강조구문

---

## D. 제작 절차 (7단계)
1. **본문 선정**: 설명문 단락.
2. **포인트 추출**: 위 18축 중 8~12개 후보 선정.
3. **의도 오류 1개 삽입**: 수일치·전치사·병렬 중 하나.
4. **나머지 4곳은 맞지만 헷갈리게**: 분사 수식, 관계사 격, 전치사 관용.
5. **밑줄 표기**: `<<1>>…<</1>>` ~ `<<5>>…<</5>>`.
6. **보기**: "1"~"5". 정답은 반드시 하나.
7. **해설 작성**: 규칙명 + 맥락 단서.

---

## E. 예시 (기출 재구성)

### mainText (예시)
Think of yourself. When you decide to get up and get a drink of water, you don’t consciously consider every step. Imagine if we <<1>>had to consider<</1>> every single muscle to move. It would be tiresome, as patients recovering from brain injury <<2>>knows<</2>>. The autopilot parts of our brain do it automatically, <<3>>freeing up<</3>> the conscious mind. It is the older brain parts <<4>>that support<</4>> these processes. Most of the time, <<5>>what you are perceiving<</5>> is based on crude analysis.

### 결과(JSON)
```json
{"type":"grammar_span","mainText":"Think of yourself. When you decide to get up and get a drink of water, you don’t consciously consider every step. Imagine if we <<1>>had to consider<</1>> every single muscle to move. It would be tiresome, as patients recovering from brain injury <<2>>knows<</2>>. The autopilot parts of our brain do it automatically, <<3>>freeing up<</3>> the conscious mind. It is the older brain parts <<4>>that support<</4>> these processes. Most of the time, <<5>>what you are perceiving<</5>> is based on crude analysis.","question":"Q. 다음 글의 밑줄 친 부분 중 문법상 옳지 않은 것을 고르세요.","options":["1","2","3","4","5"],"answer":2,"explanation":"주어-동사 수일치 오류: patients는 복수이므로 knows → know로 고쳐야 한다.","evidenceLines":["patients recovering from brain injury <<2>>knows<</2>>"],"metadata":{"style":"csat","difficulty":"basic"}}
```

---

## F. 오답 설계 기술
1. **거리 두기**: 주어-동사 사이 긴 수식어.
2. **형태 유사**: freeing/free, affect/effect.
3. **관계사 격 함정**: whom/who 혼란.
4. **병렬 불균형**: to do, doing, and to do.
5. **분사 수식 방향**: 능동/수동 의미 구별.
6. **전치사 관용**: familiar with/to, consist of.

---

## G. 난이도 조절 레버
- **상**: 오류 = 장거리 수일치, 가정법, 도치. 함정 = 관계사 전치사, 분사 수식.
- **중**: 오류 = 병렬·전치사. 함정 = 삽입구.
- **하**: 오류 = 단순 수일치·시제. 정답 단서가 바로 근처.

---

## H. 품질 QC 체크리스트
- [ ] 정답 1개만 오류, 나머지 모두 적법.
- [ ] 정답은 1-step 수정 가능.
- [ ] 수정 후 문장이 교과서·언론 수준 자연성.
- [ ] 해설 = 규칙명+맥락 단서.
- [ ] CSAT 포맷 유지.

---

## I. 실패 예시 (금지)
- 오류 2곳 이상.
- 정답이 2개 이상 가능.
- `options`가 5개 미만/초과.
- 정답이 직역/문체 차이.

---

## J. 재시도 정책
- 실패 시 오류유형 교체(수일치→전치사 등).
- 밑줄 위치 조정.
- 최대 2회 재시도.

---

## K. 결론
이 매뉴얼은 **어법 문제(29번류)**의 모든 출제 원리·18개 규칙 총람·난이도 설계·오답 설계 기술·품질 검증 절차를 망라한다. 이를 따르면 어떤 지문도 **유일정답형 어법 문제**로 변환 가능하다.

