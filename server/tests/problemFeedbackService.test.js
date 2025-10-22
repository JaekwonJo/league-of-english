const test = require('node:test');
const assert = require('node:assert/strict');

const {
  ProblemFeedbackService,
  FEEDBACK_ACTIONS,
  FEEDBACK_STATUS
} = require('../services/problemFeedbackService');

class MemoryDb {
  constructor({ feedback = [], events = [], problems = [], documents = [] } = {}) {
    this.feedback = feedback.map((row, index) => ({ id: index + 1, ...row }));
    this.events = events.map((row, index) => ({ id: index + 1, ...row }));
    this.problems = problems;
    this.documents = documents;
    this.nextFeedbackId = this.feedback.length + 1;
    this.nextEventId = this.events.length + 1;
  }

  async get(query, params) {
    if (query.includes('FROM problem_feedback_events')) {
      if (query.includes('fingerprint = ?')) {
        const [fingerprint, eventType, since] = params;
        const createdAfter = new Date(since || '1900-01-01');
        const total = this.events.filter((event) => {
          if (event.event !== eventType) return false;
          if (event.fingerprint !== fingerprint) return false;
          return new Date(event.created_at) >= createdAfter;
        }).length;
        return { total };
      }

      if (query.includes('problem_id = ?')) {
        const [userId, problemId, action, eventType, since] = params;
        const createdAfter = new Date(since || '1900-01-01');
        const total = this.events.filter((event) => {
          if (event.user_id !== userId) return false;
          if (event.problem_id !== problemId) return false;
          if (event.action !== action) return false;
          if (event.event !== eventType) return false;
          return new Date(event.created_at) >= createdAfter;
        }).length;
        return { total };
      }

      const [userId, action, eventType, since] = params;
      const createdAfter = new Date(since || '1900-01-01');
      const total = this.events.filter((event) => {
        if (event.user_id !== userId) return false;
        if (event.action !== action) return false;
        if (event.event !== eventType) return false;
        return new Date(event.created_at) >= createdAfter;
      }).length;
      return { total };
    }

    if (query.startsWith('SELECT id, status FROM problem_feedback')) {
      const [userId, problemId, action] = params;
      return this.feedback.find(
        (row) => row.user_id === userId && row.problem_id === problemId && row.action === action
      ) || null;
    }

    if (query.startsWith('SELECT id, problem_id, status, action FROM problem_feedback WHERE id = ?')) {
      const [id] = params;
      return this.feedback.find((row) => row.id === id) || null;
    }

    return null;
  }

  async all(query, params) {
    if (query.includes('SELECT action, COUNT(*) AS total') && query.includes('FROM problem_feedback')) {
      const [problemId, excludedStatus] = params;
      const aggregate = {};
      this.feedback
        .filter((row) => row.problem_id === problemId && row.status !== excludedStatus)
        .forEach((row) => {
          aggregate[row.action] = (aggregate[row.action] || 0) + 1;
        });
      return Object.entries(aggregate).map(([action, total]) => ({ action, total }));
    }

    if (query.includes('FROM problem_feedback') && query.includes('user_id = ?')) {
      const [problemId, userId] = params;
      return this.feedback
        .filter((row) => Number(row.problem_id) === Number(problemId) && Number(row.user_id) === Number(userId))
        .map((row) => ({ action: row.action }));
    }

    if (query.includes('FROM problem_feedback pf')) {
      const [status, limit] = [params[0], params[2]];
      const filtered = this.feedback
        .filter((row) => row.action === FEEDBACK_ACTIONS.REPORT)
        .filter((row) => status === 'all' || row.status === status)
        .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
        .slice(0, limit);

      return filtered.map((row) => {
        const problem = this.problems.find((p) => p.id === row.problem_id) || {};
        const document = this.documents.find((d) => d.id === problem.document_id) || {};
        return {
          id: row.id,
          problem_id: row.problem_id,
          user_id: row.user_id,
          reason: row.reason,
          status: row.status,
          created_at: row.created_at,
          updated_at: row.updated_at,
          resolution_note: row.resolution_note,
          resolved_at: row.resolved_at,
          problem_type: problem.type,
          question: problem.question,
          answer: problem.answer,
          explanation: problem.explanation,
          document_title: document.title,
          document_id: document.id
        };
      });
    }

    if (query.includes('SELECT status, COUNT(*) AS total') && query.includes('FROM problem_feedback')) {
      const counts = {};
      this.feedback
        .filter((row) => row.action === FEEDBACK_ACTIONS.REPORT)
        .forEach((row) => {
          counts[row.status] = (counts[row.status] || 0) + 1;
        });
      return Object.entries(counts).map(([status, total]) => ({ status, total }));
    }

    return [];
  }

  async run(query, params) {
    if (query.startsWith('INSERT INTO problem_feedback_events')) {
      const [feedbackId, userId, problemId, action, event, detail, fingerprint, ip, agent, createdAt] = params;
      this.events.push({
        id: this.nextEventId++,
        feedback_id: feedbackId,
        user_id: userId,
        problem_id: problemId,
        action,
        event,
        detail,
        fingerprint,
        ip_address: ip,
        user_agent: agent,
        created_at: createdAt
      });
      return { id: this.nextEventId - 1, changes: 1 };
    }

    if (query.startsWith('DELETE FROM problem_feedback')) {
      const [id] = params;
      this.feedback = this.feedback.filter((row) => row.id !== id);
      return { changes: 1 };
    }

    if (query.includes('UPDATE problem_feedback') && query.includes('SET reason')) {
      const [reason, status, id] = params;
      const row = this.feedback.find((item) => item.id === id);
      if (row) {
        row.reason = reason;
        row.status = status;
        row.updated_at = new Date().toISOString();
        row.resolution_note = null;
        row.resolved_at = null;
        row.resolved_by = null;
      }
      return { changes: row ? 1 : 0 };
    }

    if (query.includes('INSERT INTO problem_feedback')) {
      const [userId, problemId, action, reason, status, createdAt, updatedAt] = params;
      const row = {
        id: this.nextFeedbackId++,
        user_id: userId,
        problem_id: problemId,
        action,
        reason,
        status,
        created_at: createdAt,
        updated_at: updatedAt,
        resolution_note: null,
        resolved_at: null,
        resolved_by: null
      };
      this.feedback.push(row);
      return { id: row.id, changes: 1 };
    }

    if (query.includes('UPDATE problem_feedback') && query.includes('SET status')) {
      const [status, note, resolvedBy, resolvedAt, id] = params;
      const row = this.feedback.find((item) => item.id === id);
      if (row) {
        row.status = status;
        row.resolution_note = note;
        row.resolved_by = resolvedBy;
        row.resolved_at = resolvedAt;
        row.updated_at = new Date().toISOString();
      }
      return { changes: row ? 1 : 0 };
    }

    throw new Error(`Unsupported run query in test stub: ${query}`);
  }
}

test('ProblemFeedbackService toggles like feedback', async () => {
  const db = new MemoryDb();
  const notifications = {
    enqueueCalls: [],
    resolveCalls: [],
    async enqueue(payload) { this.enqueueCalls.push(payload); },
    async resolveByReference(payload) { this.resolveCalls.push(payload); }
  };
  const service = new ProblemFeedbackService({ db, notifications });

  const first = await service.submitFeedback({
    userId: 1,
    problemId: 10,
    action: FEEDBACK_ACTIONS.LIKE,
    clientFingerprint: 'abc'
  });
  assert.equal(first.acknowledged, true);
  assert.equal(first.removed, false);
  assert.equal(db.feedback.length, 1);

  const second = await service.submitFeedback({
    userId: 1,
    problemId: 10,
    action: FEEDBACK_ACTIONS.LIKE,
    clientFingerprint: 'abc'
  });
  assert.equal(second.removed, true);
  assert.equal(db.feedback.length, 0);
});

test('ProblemFeedbackService records report and reuses notification', async () => {
  const db = new MemoryDb();
  const notifications = {
    enqueueCalls: [],
    resolveCalls: [],
    async enqueue(payload) { this.enqueueCalls.push(payload); },
    async resolveByReference(payload) { this.resolveCalls.push(payload); }
  };
  const service = new ProblemFeedbackService({ db, notifications });

  await service.submitFeedback({
    userId: 2,
    problemId: 7,
    action: FEEDBACK_ACTIONS.REPORT,
    reason: '오타가 있어요',
    clientFingerprint: 'device-1'
  });
  assert.equal(db.feedback.length, 1);
  assert.equal(db.feedback[0].reason, '오타가 있어요');
  assert.equal(db.feedback[0].status, FEEDBACK_STATUS.PENDING);
  assert.equal(notifications.enqueueCalls.length, 1);

  await service.submitFeedback({
    userId: 2,
    problemId: 7,
    action: FEEDBACK_ACTIONS.REPORT,
    reason: '보기 오류',
    clientFingerprint: 'device-1'
  });
  assert.equal(db.feedback.length, 1);
  assert.equal(db.feedback[0].reason, '보기 오류');
  assert.equal(notifications.enqueueCalls.length, 2);
});

test('ProblemFeedbackService enforces rate limit', async () => {
  const db = new MemoryDb();
  const notifications = {
    async enqueue() {},
    async resolveByReference() {}
  };
  const service = new ProblemFeedbackService({ db, notifications });

  for (let i = 0; i < 4; i += 1) {
    await service.submitFeedback({
      userId: 5,
      problemId: 11,
      action: FEEDBACK_ACTIONS.REPORT,
      reason: `reason-${i}`,
      clientFingerprint: 'fp-limit'
    });
  }

  await assert.rejects(
    () => service.submitFeedback({
      userId: 5,
      problemId: 11,
      action: FEEDBACK_ACTIONS.REPORT,
      reason: 'too-fast',
      clientFingerprint: 'fp-limit'
    }),
    (error) => {
      assert.equal(error.status, 429);
      return true;
    }
  );
});

test('ProblemFeedbackService summary excludes dismissed reports', async () => {
  const db = new MemoryDb({
    feedback: [
      { user_id: 1, problem_id: 8, action: 'like', status: FEEDBACK_STATUS.ACKNOWLEDGED, created_at: '2024-01-01', updated_at: '2024-01-01' },
      { user_id: 2, problem_id: 8, action: 'report', status: FEEDBACK_STATUS.PENDING, created_at: '2024-01-01', updated_at: '2024-01-01' },
      { user_id: 3, problem_id: 8, action: 'report', status: FEEDBACK_STATUS.DISMISSED, created_at: '2024-01-02', updated_at: '2024-01-02' }
    ]
  });
  const notifications = {
    async enqueue() {},
    async resolveByReference() {}
  };
  const service = new ProblemFeedbackService({ db, notifications });

  const summary = await service.getFeedbackSummary(8, 2);
  assert.equal(summary.counts.like, 1);
  assert.equal(summary.counts.report, 1);
  assert.equal(summary.counts.dislike, 0);
  assert.deepEqual(summary.user, { like: false, dislike: false, report: true });
});

test('ProblemFeedbackService lists and resolves reports', async () => {
  const db = new MemoryDb({
    feedback: [
      {
        id: 1,
        user_id: 3,
        problem_id: 21,
        action: FEEDBACK_ACTIONS.REPORT,
        reason: '지문이 이상해요',
        status: FEEDBACK_STATUS.PENDING,
        created_at: '2024-01-01',
        updated_at: '2024-01-01'
      }
    ],
    problems: [
      { id: 21, type: 'grammar', question: '문제?', answer: '1', explanation: '설명', document_id: 9 }
    ],
    documents: [
      { id: 9, title: '연습 지문' }
    ]
  });
  const notifications = {
    resolved: [],
    async enqueue() {},
    async resolveByReference(payload) { this.resolved.push(payload); }
  };
  const service = new ProblemFeedbackService({ db, notifications });

  const { reports, summary } = await service.listReports({ status: 'pending', limit: 10 });
  assert.equal(reports.length, 1);
  assert.equal(reports[0].problem.documentTitle, '연습 지문');
  assert.equal(summary.pending, 1);

  const updated = await service.updateReportStatus({
    feedbackId: 1,
    status: FEEDBACK_STATUS.RESOLVED,
    resolvedBy: 99,
    resolutionNote: '검토 완료'
  });
  assert.equal(updated.status, FEEDBACK_STATUS.RESOLVED);
  assert.equal(db.feedback[0].status, FEEDBACK_STATUS.RESOLVED);
  assert.equal(notifications.resolved.length, 1);
});
