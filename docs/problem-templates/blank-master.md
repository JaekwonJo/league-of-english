# 빈칸 문제 출제 요약 (Claude × ChatGPT Unified Manual)

> **전체 세부 지침은** `problem manual/빈칸_메뉴얼_GPTxClaude.md` **문서를 반드시 참조하세요.**
> 이 요약본은 프롬프트 구성과 검증 단계에서 확인해야 할 핵심 규칙만 정리했습니다.

## 1. Style Contract
- 원문 문장을 임의로 삭제·추가·재배열하지 않는다.
- 빈칸은 반드시 `____` 한 개로 표기한다.
- 한국어 지시문은 두 가지 중 하나만 사용한다.
  - `다음 빈칸에 들어갈 말로 가장 적절한 것은?` (C-1, C-3, C-4)
  - `다음 글의 빈칸에 들어갈 단어의 영영 풀이로 가장 적절한 것은?` (C-2)
- 보기 5개(①~⑤)는 영어 문장/구/절로 작성하며 3~18개의 단어를 사용한다.
- 숫자나 시각은 반드시 철자로 표기한다(예: `seven p.m.`).

## 2. Four-Family System
| Family | 핵심 목적 | 검증 포인트 |
| --- | --- | --- |
| **C-1** 의미·담화형 | 논지·극성·담화 기능이 일치하는지 | 인과/대조/귀결 신호어, 핵심 주장 |
| **C-2** 영영 풀이형 | 빈칸 단어의 정의가 정확한지 | 사전 정의, 문맥적 제약 |
| **C-3** Paraphrase/Collocation | 의미 동등 + 자연스러운 결합인지 | Collocation, 어휘 결합 제약 |
| **C-4** 문장/절 삽입형 | 담화 흐름이 자연스럽게 이어지는지 | 지시어, 연결어, 주제 재등장 |

`questionFamily` 값과 한국어 지시문이 일치해야 하며, 각 가족별 대표 함정(부분 정답, 반대 의미, 범위 오류 등)을 명시한다.

## 3. JSON 출력 형식 (요약)
```json
{
  "questionFamily": "C-1",
  "question": "다음 빈칸에 들어갈 말로 가장 적절한 것은?",
  "text": "... ____ ...",
  "targetExpression": "removed expression",
  "strategy": "paraphrasing",
  "options": [
    {"label": "①", "text": "candidate phrase", "fallacy": "partial-truth"},
    {"label": "②", "text": "...", "fallacy": "opposite"},
    {"label": "③", "text": "...", "fallacy": "correct"},
    {"label": "④", "text": "...", "fallacy": "scope-error"},
    {"label": "⑤", "text": "...", "fallacy": "logical-leap"}
  ],
  "correctAnswer": 3,
  "distractorReasons": [
    {"label": "①", "reason": "부분 정답", "fallacy": "partial-truth"},
    {"label": "②", "reason": "반대 의미", "fallacy": "opposite"},
    {"label": "④", "reason": "범위 오류", "fallacy": "scope-error"},
    {"label": "⑤", "reason": "논리적 비약", "fallacy": "logical-leap"}
  ],
  "explanation": "Korean rationale",
  "sourceLabel": "출처│기관 연도 회차 문항 (pXX)",
  "notes": {
    "targetExpression": "removed expression",
    "difficulty": "intermediate",
    "estimatedAccuracy": 50
  }
}
```

## 4. 검증 체크리스트
1. **형식**: 지시문·보기 레이블·빈칸 표기·출처 라벨 확인.
2. **논리**: 정답은 유일한가? 오답 4개가 모두 다른 결함을 갖는가?
3. **언어**: 보기 5개가 자연스러운 영어이면서 숫자를 사용하지 않았는가?
4. **설명**: 해설이 한국어 3문장 이상이며 정답 근거와 두 개 이상의 오답 결함을 언급했는가?
5. **난이도**: 예상 정답률 40~60% 범위인지 최종 점검.

> 세부 사례, 확장 패턴, 오답 함정 라이브러리, 난이도 조절 전략은 `problem manual/빈칸_메뉴얼_GPTxClaude.md`에서 확인할 수 있습니다.
