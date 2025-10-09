const test = require('node:test');
const assert = require('node:assert/strict');

const {
  ProblemFeedbackService,
  FEEDBACK_ACTIONS,
} = require('../services/problemFeedbackService');

class MemoryDb {
  constructor(initialRows = []) {
    this.rows = initialRows.map((row, index) => ({ id: index + 1, ...row }));
    this.nextId = this.rows.length + 1;
  }

  async get(query, params) {
    if (query.startsWith('SELECT id FROM problem_feedback')) {
      const [userId, problemId, action] = params;
      return this.rows.find(
        (row) => row.user_id === userId && row.problem_id === problemId && row.action === action
      ) || null;
    }
    throw new Error(`Unsupported get query in test stub: ${query}`);
  }

  async all(query, params) {
    if (query.startsWith('SELECT action, COUNT(*)')) {
      const [problemId] = params;
      const aggregate = {};
      this.rows
        .filter((row) => row.problem_id === problemId)
        .forEach((row) => {
          aggregate[row.action] = (aggregate[row.action] || 0) + 1;
        });
      return Object.entries(aggregate).map(([action, total]) => ({ action, total }));
    }

    if (query.startsWith('SELECT action FROM problem_feedback')) {
      const [problemId, userId] = params;
      return this.rows
        .filter((row) => row.problem_id === problemId && row.user_id === userId)
        .map((row) => ({ action: row.action }));
    }

    throw new Error(`Unsupported all query in test stub: ${query}`);
  }

  async run(query, params) {
    if (query.startsWith('DELETE FROM problem_feedback')) {
      const [id] = params;
      this.rows = this.rows.filter((row) => row.id !== id);
      return { changes: 1 };
    }

    if (query.startsWith('UPDATE problem_feedback')) {
      const [reason, status, id] = params;
      const target = this.rows.find((row) => row.id === id);
      if (target) {
        target.reason = reason;
        target.status = status;
      }
      return { changes: target ? 1 : 0 };
    }

    if (query.startsWith('INSERT INTO problem_feedback')) {
      const [userId, problemId, action, reason, status] = params;
      const row = {
        id: this.nextId++,
        user_id: userId,
        problem_id: problemId,
        action,
        reason,
        status
      };
      this.rows.push(row);
      return { id: row.id, changes: 1 };
    }

    throw new Error(`Unsupported run query in test stub: ${query}`);
  }
}

test('ProblemFeedbackService toggles like feedback', async () => {
  const db = new MemoryDb();
  const service = new ProblemFeedbackService({ db });

  const first = await service.submitFeedback({
    userId: 1,
    problemId: 10,
    action: FEEDBACK_ACTIONS.LIKE
  });
  assert.equal(first.acknowledged, true);
  assert.equal(first.removed, false);
  assert.equal(db.rows.length, 1);

  const second = await service.submitFeedback({
    userId: 1,
    problemId: 10,
    action: FEEDBACK_ACTIONS.LIKE
  });
  assert.equal(second.removed, true);
  assert.equal(db.rows.length, 0);
});

test('ProblemFeedbackService records report with reason update', async () => {
  const db = new MemoryDb();
  const service = new ProblemFeedbackService({ db });

  await service.submitFeedback({
    userId: 2,
    problemId: 7,
    action: FEEDBACK_ACTIONS.REPORT,
    reason: '오타가 있어요'
  });
  assert.equal(db.rows.length, 1);
  assert.equal(db.rows[0].reason, '오타가 있어요');

  await service.submitFeedback({
    userId: 2,
    problemId: 7,
    action: FEEDBACK_ACTIONS.REPORT,
    reason: '보기 오류'
  });
  assert.equal(db.rows.length, 1);
  assert.equal(db.rows[0].reason, '보기 오류');
});

test('ProblemFeedbackService summary aggregates counts and user state', async () => {
  const db = new MemoryDb([
    { user_id: 1, problem_id: 8, action: 'like' },
    { user_id: 2, problem_id: 8, action: 'like' },
    { user_id: 3, problem_id: 8, action: 'report' }
  ]);
  const service = new ProblemFeedbackService({ db });

  const summary = await service.getFeedbackSummary(8, 2);
  assert.deepEqual(summary.counts, { like: 2, report: 1 });
  assert.deepEqual(summary.user, { like: true, report: false });
});

test('ProblemFeedbackService validates actions', async () => {
  const db = new MemoryDb();
  const service = new ProblemFeedbackService({ db });
  await assert.rejects(
    () => service.submitFeedback({ userId: 1, problemId: 2, action: 'invalid' }),
    (error) => {
      assert.equal(error.status, 400);
      return true;
    }
  );
});
