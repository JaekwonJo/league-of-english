# 고등학교 영어 어휘 문제 매뉴얼 (문맥상 어색한 표현 고르기)

## 1. 문제 개요
- **목표**: 지문 속 밑줄 친 다섯 개 표현 가운데 문맥과 맞지 않게 바뀐 어휘 1개를 찾아낸다.
- **형식**: 단일 지문 + 밑줄 친 표현 5개(①~⑤) + 단일 정답. 실제 교육청·수능 모의고사와 동일한 구성을 따른다.
- **출제 의도**: 어법은 맞지만 의미가 어색한 표현을 판별해, 문맥 이해력과 collocation 감각을 평가한다.

## 2. 표준 JSON 예시
```json
{
  "type": "vocabulary",
  "question": "다음 글의 밑줄 친 부분 중, 문맥상 낱말의 쓰임이 적절하지 않은 것은?",
  "passage": "Too many people expect things to happen <u>overnight.</u> ... has to be within the parameters of our comfort and <u>confident.</u> ... Have you <u>fallen prey to impatience?</u>",
  "options": [
    "① <u>overnight.</u>",
    "② <u>discourage  us  from  continuing  to  move  forward.</u>",
    "③ <u>confident.</u>",
    "④ <u>tempted to lose interest.</u>",
    "⑤ <u>fallen prey to impatience?</u>"
  ],
  "correctAnswer": 3,
  "explanation": "'편안함과 편리함'이라는 뜻이 자연스러우므로 ③번 confident는 convenience로 고쳐야 한다.",
  "sourceLabel": "출처│2024년 3월 고2 모의고사 어휘 no1",
  "correction": {
    "replacement": "convenience",
    "reason": "comfort and convenience 라는 결합이 문맥상 자연스럽다."
  },
  "optionReasons": [
    { "label": "③", "reason": "confident는 '자신감 있는' 뜻이라 문맥과 모순된다." },
    { "label": "①", "reason": "overnight는 '하룻밤 사이'로 의미상 문제 없다." }
  ]
}
```

## 3. 필수 규칙
1. **문항 문구**
   - 기본 문구: `다음 글의 밑줄 친 부분 중, 문맥상 낱말의 쓰임이 적절하지 않은 것은?`
   - PDF처럼 줄바꿈이 삽입돼도 의미가 동일해야 하며, 정답 번호 `[20]` 등은 별도 메타로 관리한다.
2. **지문(`passage`)**
   - 원문 문장을 삭제하거나 재배열하지 않는다.
   - 밑줄은 `<u>...</u>` 5개만 허용하며, **정답 1개만 원문과 다른 어휘**가 되도록 수정한다.
   - `*`로 시작하는 주석·주해(footnote)는 그대로 유지한다.
3. **보기(`options`)**
   - ①~⑤ 번호 + `<u>...</u>` 조합이어야 하며, 각 항목은 지문의 밑줄 표현과 문자 하나까지 동일해야 한다.
4. **정답(`correctAnswer`)**
   - 1~5 중 하나. 복수 정답이나 배열 사용 금지.
5. **해설(`explanation`)**
   - 한국어 1~2문장으로 충분하다. 실제 정답지처럼 정답 근거와 대체 표현을 명확히 언급한다.
6. **correction**
   - `replacement`: 문맥상 올바른 표현 (예: convenience).
   - `reason`: 해당 표현이 왜 자연스러운지 한국어 설명.
7. **optionReasons**
   - 최소 한 항목(정답 포함)을 한국어로 설명한다. 필요 시 다른 보기의 타당성도 추가한다.
8. **sourceLabel**
   - 실전 포맷을 따라 `출처│2024년 3월 고2 모의고사 어휘 noX`처럼 작성한다.

## 4. 생성 지침
- 정답 표현은 의미가 어긋나도록 한 단어 또는 짧은 구만 바꾼다.
- 나머지 표현은 띄어쓰기·구두점까지 원문과 동일해야 한다.
- footnote, 괄호, 강조부호 등은 손대지 않는다.
- 해설은 실제 정답지처럼 간결하게 작성하되, 대체 표현을 한글·영어 병기해 학습에 도움이 되게 한다.

## 5. 검증 체크리스트
- [ ] `<u>...</u>` 가 정확히 다섯 개인가?
- [ ] 보기 5개가 지문 밑줄과 완전히 일치하는가?
- [ ] `correctAnswer`가 단일 숫자이며 1~5 범위인가?
- [ ] `correction.replacement`가 제공되어 있는가?
- [ ] 해설이 한국어로 정답 근거를 명확히 설명하는가?
- [ ] `optionReasons`에 정답(어색한 표현) 근거가 포함돼 있는가?
- [ ] `sourceLabel`이 `출처│`로 시작하고 회차 정보를 담고 있는가?

---
2025-10-16 업데이트: 2024년 3월 고2 모의고사 어휘 100문항을 기준으로 JSON 스키마·검증 규칙을 재정비했습니다. 기존 의미 유사형 템플릿은 더 이상 사용하지 않습니다.
