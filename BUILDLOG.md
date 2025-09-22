# BUILDLOG.md

## 2025-09-20
- Issue: ��� ������ ������ `problem manual/*.md`�� PDF �ֽź��� ��߳� AI ����� ���Ⱦ��.
- Root cause: �Ŵ��� ���� ������ ����ȭ���� �ʾ� PDF ������ ��� �ݿ����� �ʾҽ��ϴ�.
- Fix: `scripts/update-problem-manuals.js`�� �߰��� PDF��Ŵ��� ��ȯ�� �ڵ�ȭ�ϰ� ���� ������ ����ȭ�߽��ϴ�.
- Files touched: `scripts/update-problem-manuals.js`, `PROJECT_STATE.md`, `README.md`.
- Verification: `node scripts/update-problem-manuals.js` ���� �� ��µ� �Ŵ����� ���� �����ϰ� ���� AI ȣ�⿡ �Է��߽��ϴ�.

## 2025-09-18
- Change summary: consolidated the dev workflow around PowerShell `npm run dev:all`, reinforced grammar_span fallbacks, and refreshed problem API options handling.
- Cause: the discarded Linux automation path lacked nvm initialization, so `node` exited immediately.
- Decision: remove the bash automation, add nvm guardrails directly in docs, and focus on the PowerShell path.
- Impact scope: local dev environment, grammar_span UI, problem API (`problem.routes.js`).
- Verification: `npm run dev:all`, then `curl http://localhost:5000/health`, followed by manual grammar problem checks in the React UI.

## 2025-09-19
- Change summary: ??????�� ??��??Ʈ/��Ģ ���??�� ��� MCQ ??��????��??JSON ??Ű��?? ���??��??����??��, ??��????ũ ??�� ī�� UI??���� ??��??��????��??��.
- Cause: ���� API ���????������ ??�� ??�尡 ??��?? UI????���/???? ??���� ??��????�� ??�� ??��????��??
- Decision: �Ŵ�??`problem manual/*.md`)????��??Ʈ??����, ??�� ????�� ����??����??�� `generateGrammarSpanProblem`??��Ģ ���??�� ??��??��??
- Impact scope: server/services/aiProblemService.js, server/utils/grammarSpanGenerator.js, client/study ���� ī�� ??��.
- Verification: Node ??�� ??��??�� grammar span ��Ģ ��??�� ??��??��, �ֿ� ??��????�� ??��??`source`/`mainText`/`options`�� ��� ä����???? ������??

## 2025-09-22
- Error: insertion problems truncated sentences and revealed ASCII markers instead of exam-style numerals.
- Cause: legacy window builder trimmed target sentences and reused them when formatting the gap.
- Fix: refactored `InsertionProblemGenerator2` to render full passages then convert markers and choices to circled numbers (��~��).
- Files: `server/utils/insertionProblemGenerator2.js`, regenerated `generated_insertion_problems.json`, docs (`PROJECT_STATE.md`, `README.md`).
- Verification: ran `node generate_insertion_problems.js`, reviewed problems 5��19��21 in study preview for correct layout and numbering.
