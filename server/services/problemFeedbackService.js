const database = require('../models/database');

const FEEDBACK_ACTIONS = Object.freeze({
  LIKE: 'like',
  REPORT: 'report'
});

const FEEDBACK_STATUS = Object.freeze({
  PENDING: 'pending',
  ACKNOWLEDGED: 'acknowledged'
});

function normalizeReason(reason) {
  if (typeof reason !== 'string') return null;
  const trimmed = reason.trim();
  return trimmed.length ? trimmed : null;
}

function createHttpError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

class ProblemFeedbackService {
  constructor({ db = database } = {}) {
    this.db = db;
  }

  async submitFeedback({ userId, problemId, action, reason }) {
    const numericUserId = Number(userId);
    const numericProblemId = Number(problemId);
    if (!Number.isInteger(numericUserId) || numericUserId <= 0) {
      throw createHttpError(400, '유효한 사용자 정보가 필요해요. 다시 로그인 해주세요.');
    }
    if (!Number.isInteger(numericProblemId) || numericProblemId <= 0) {
      throw createHttpError(400, '문항 ID가 올바르지 않아요.');
    }
    const normalizedAction = typeof action === 'string' ? action.toLowerCase() : '';
    if (!Object.values(FEEDBACK_ACTIONS).includes(normalizedAction)) {
      throw createHttpError(400, '지원하지 않는 피드백 유형이에요.');
    }

    const normalizedReason = normalizedAction === FEEDBACK_ACTIONS.REPORT ? normalizeReason(reason) : null;

    const existing = await this.db.get(
      'SELECT id FROM problem_feedback WHERE user_id = ? AND problem_id = ? AND action = ?',
      [numericUserId, numericProblemId, normalizedAction]
    );

    if (existing && normalizedAction === FEEDBACK_ACTIONS.LIKE) {
      await this.db.run('DELETE FROM problem_feedback WHERE id = ?', [existing.id]);
      return {
        acknowledged: false,
        action: normalizedAction,
        removed: true
      };
    }

    if (existing) {
      await this.db.run(
        'UPDATE problem_feedback SET reason = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [normalizedReason, FEEDBACK_STATUS.PENDING, existing.id]
      );
      return {
        acknowledged: true,
        action: normalizedAction,
        removed: false
      };
    }

    await this.db.run(
      `INSERT INTO problem_feedback (user_id, problem_id, action, reason, status)
       VALUES (?, ?, ?, ?, ?)` ,
      [
        numericUserId,
        numericProblemId,
        normalizedAction,
        normalizedReason,
        normalizedAction === FEEDBACK_ACTIONS.LIKE ? FEEDBACK_STATUS.ACKNOWLEDGED : FEEDBACK_STATUS.PENDING
      ]
    );

    return {
      acknowledged: true,
      action: normalizedAction,
      removed: false
    };
  }

  async getFeedbackSummary(problemId, userId) {
    const numericProblemId = Number(problemId);
    const numericUserId = Number(userId);
    if (!Number.isInteger(numericProblemId) || numericProblemId <= 0) {
      throw createHttpError(400, '문항 ID가 올바르지 않아요.');
    }

    const summaryRows = await this.db.all(
      'SELECT action, COUNT(*) AS total FROM problem_feedback WHERE problem_id = ? GROUP BY action',
      [numericProblemId]
    );

    const counts = summaryRows.reduce((acc, row) => {
      acc[row.action] = Number(row.total) || 0;
      return acc;
    }, { like: 0, report: 0 });

    const userState = { like: false, report: false };
    if (Number.isInteger(numericUserId) && numericUserId > 0) {
      const userRows = await this.db.all(
        'SELECT action FROM problem_feedback WHERE problem_id = ? AND user_id = ?',
        [numericProblemId, numericUserId]
      );
      userRows.forEach((row) => {
        if (row.action === FEEDBACK_ACTIONS.LIKE) userState.like = true;
        if (row.action === FEEDBACK_ACTIONS.REPORT) userState.report = true;
      });
    }

    return {
      counts,
      user: userState
    };
  }
}

const defaultInstance = new ProblemFeedbackService();

module.exports = {
  FEEDBACK_ACTIONS,
  FEEDBACK_STATUS,
  ProblemFeedbackService,
  submitFeedback: defaultInstance.submitFeedback.bind(defaultInstance),
  getFeedbackSummary: defaultInstance.getFeedbackSummary.bind(defaultInstance),
  problemFeedbackService: defaultInstance
};
