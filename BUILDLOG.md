## 2025-09-24
- Issue: Roadmap/next-step tracking was scattered across multiple docs, making daily status hard to grasp.
- Root cause: README, PROJECT_STATE, and BUILDLOG had diverging narratives after recent feature pushes.
- Fix: Consolidated a single roadmap/status table in README and synchronized PROJECT_STATE.md & BUILDLOG.md with today's priorities.
- Files touched: README.md, PROJECT_STATE.md, BUILDLOG.md.
- Verification: Reviewed README section to ensure table renders correctly, confirmed PROJECT_STATE next-step list shows new priorities, reran smoke review on docs (no build/test needed).
## 2025-09-23
- Issue: Grammar API only produced single-error fallback items and the study UI could not handle multi-answer grammar questions.
- Root cause: `aiProblemService` lacked a dedicated grammar generator/prompt, no caching for grammar types, and the React component assumed single numeric answers.
- Fix: Added OpenAI-backed grammar basic/advanced generator with DB caching, created `/generate/grammar`, and rebuilt the study grammar component to support multi-select + answer normalization.
- Files touched: `server/services/aiProblemService.js`, `server/routes/problem.routes.js`, `server/utils/csatProblemNormalizer.js`, `server/utils/problemValidator.js`, `client/src/components/study/GrammarProblemDisplay.js`, `client/src/pages/StudyPage.js`, `client/src/components/study/ProblemDisplay.js`.
- Verification: Generated sample grammar problems via Node smoke script, manually toggled multi-select answers in the React study flow, noted lint failure due to missing config (documented in Known issues).
# BUILDLOG.md

## 2025-09-20
- Issue: 사람 손으로 수정한 `problem manual/*.md`가 PDF 최신본과 어긋나 AI 출력이 흔들렸어요.
- Root cause: 매뉴얼 갱신 절차가 문서화되지 않아 PDF 변경이 즉시 반영되지 않았습니다.
- Fix: `scripts/update-problem-manuals.js`를 추가해 PDF→매뉴얼 변환을 자동화하고 관련 문서를 동기화했습니다.
- Files touched: `scripts/update-problem-manuals.js`, `PROJECT_STATE.md`, `README.md`.
- Verification: `node scripts/update-problem-manuals.js` 실행 후 출력된 매뉴얼을 샘플 점검하고 다음 AI 호출에 입력했습니다.

## 2025-09-18
- Change summary: consolidated the dev workflow around PowerShell `npm run dev:all`, reinforced grammar_span fallbacks, and refreshed problem API options handling.
- Cause: the discarded Linux automation path lacked nvm initialization, so `node` exited immediately.
- Decision: remove the bash automation, add nvm guardrails directly in docs, and focus on the PowerShell path.
- Impact scope: local dev environment, grammar_span UI, problem API (`problem.routes.js`).
- Verification: `npm run dev:all`, then `curl http://localhost:5000/health`, followed by manual grammar problem checks in the React UI.

## 2025-09-19
- Change summary: ??????된 ??롬??트/규칙 기반??로 모든 MCQ ??형????일??JSON ??키마?? 출력??도??개편??고, ??능????크 ??마 카드 UI??문제 ??이??웃????일??다.
- Cause: 기존 API 출력????형마다 ??락 ??드가 ??르?? UI????배경/???? ??택지 ??으????제 ??험 ??름????랐??
- Decision: 매뉴??`problem manual/*.md`)????롬??트??주입, ??패 ????백 로직??구축??고 `generateGrammarSpanProblem`??규칙 기반??로 ??작??했??
- Impact scope: server/services/aiProblemService.js, server/utils/grammarSpanGenerator.js, client/study 문제 카드 ??반.
- Verification: Node ??위 ??스??로 grammar span 규칙 변??을 ??인??고, 주요 ??형????동 ??행??`source`/`mainText`/`options`가 모두 채워지???? 검증했??

## 2025-09-22
- Error: insertion problems truncated sentences and revealed ASCII markers instead of exam-style numerals.
- Cause: legacy window builder trimmed target sentences and reused them when formatting the gap.
- Fix: refactored `InsertionProblemGenerator2` to render full passages then convert markers and choices to circled numbers (①~⑤).
- Files: `server/utils/insertionProblemGenerator2.js`, regenerated `generated_insertion_problems.json`, docs (`PROJECT_STATE.md`, `README.md`).
- Verification: ran `node generate_insertion_problems.js`, reviewed problems 5·19·21 in study preview for correct layout and numbering.


