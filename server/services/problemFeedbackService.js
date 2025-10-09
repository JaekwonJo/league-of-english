const database = require('../models/database');
const notificationService = require('./notificationService');

const FEEDBACK_ACTIONS = Object.freeze({
  LIKE: 'like',
  REPORT: 'report'
});

const FEEDBACK_STATUS = Object.freeze({
  PENDING: 'pending',
  ACKNOWLEDGED: 'acknowledged',
  RESOLVED: 'resolved',
  DISMISSED: 'dismissed'
});

const EVENT_TYPES = Object.freeze({
  SUBMIT_ATTEMPT: 'submit_attempt',
  STATE_CHANGE: 'state_change'
});

const RATE_LIMIT_RULES = Object.freeze({
  USER_WINDOW_MS: 60_000,
  USER_MAX_ATTEMPTS: 12,
  PROBLEM_WINDOW_MS: 45_000,
  PROBLEM_MAX_ATTEMPTS: 4,
  FINGERPRINT_MAX_ATTEMPTS: 24
});

function normalizeReason(reason) {
  if (typeof reason !== 'string') return null;
  const trimmed = reason.trim();
  return trimmed.length ? trimmed : null;
}

function normalizeResolutionNote(note) {
  if (typeof note !== 'string') return null;
  const trimmed = note.trim();
  return trimmed.length ? trimmed : null;
}

function createHttpError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function clampLimit(value, { min = 1, max = 200, fallback = 20 } = {}) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.min(Math.max(Math.floor(numeric), min), max);
}

class ProblemFeedbackService {
  constructor({ db = database, notifications = notificationService } = {}) {
    this.db = db;
    this.notifications = notifications;
  }

  _nowIso() {
    return new Date().toISOString();
  }

  async _enforceRateLimit({ userId, problemId, action, fingerprint }) {
    const nowIso = this._nowIso();
    const userWindowIso = new Date(Date.now() - RATE_LIMIT_RULES.USER_WINDOW_MS).toISOString();
    const problemWindowIso = new Date(Date.now() - RATE_LIMIT_RULES.PROBLEM_WINDOW_MS).toISOString();

    const totalAttemptsRow = await this.db.get(
      `SELECT COUNT(*) AS total
         FROM problem_feedback_events
        WHERE user_id = ?
          AND action = ?
          AND event = ?
          AND created_at >= ?`,
      [userId, action, EVENT_TYPES.SUBMIT_ATTEMPT, userWindowIso]
    );
    if (Number(totalAttemptsRow?.total) >= RATE_LIMIT_RULES.USER_MAX_ATTEMPTS) {
      throw createHttpError(429, '피드백 버튼을 너무 빠르게 누르고 있어요. 잠시 후 다시 시도해 주세요.');
    }

    const perProblemAttemptsRow = await this.db.get(
      `SELECT COUNT(*) AS total
         FROM problem_feedback_events
        WHERE user_id = ?
          AND problem_id = ?
          AND action = ?
          AND event = ?
          AND created_at >= ?`,
      [userId, problemId, action, EVENT_TYPES.SUBMIT_ATTEMPT, problemWindowIso]
    );
    if (Number(perProblemAttemptsRow?.total) >= RATE_LIMIT_RULES.PROBLEM_MAX_ATTEMPTS) {
      throw createHttpError(429, '같은 문항에서 너무 자주 피드백을 보내고 있어요. 조금 쉬었다가 다시 눌러 주세요.');
    }

    if (fingerprint) {
      const fingerWindowIso = new Date(Date.now() - RATE_LIMIT_RULES.USER_WINDOW_MS).toISOString();
      const fingerprintRow = await this.db.get(
        `SELECT COUNT(*) AS total
           FROM problem_feedback_events
          WHERE fingerprint = ?
            AND event = ?
            AND created_at >= ?`,
        [fingerprint, EVENT_TYPES.SUBMIT_ATTEMPT, fingerWindowIso]
      );
      if (Number(fingerprintRow?.total) >= RATE_LIMIT_RULES.FINGERPRINT_MAX_ATTEMPTS) {
        throw createHttpError(429, '같은 기기에서 너무 빠르게 피드백을 전송하고 있어요.');
      }
    }

    return nowIso;
  }

  async _recordEvent({ feedbackId, userId, problemId, action, event, fingerprint, ipAddress, userAgent, detail }) {
    const timestamp = this._nowIso();
    const truncatedDetail = typeof detail === 'string' ? detail.slice(0, 1000) : null;
    try {
      await this.db.run(
        `INSERT INTO problem_feedback_events (feedback_id, user_id, problem_id, action, event, detail, fingerprint, ip_address, user_agent, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)` ,
        [
          feedbackId || null,
          userId,
          problemId,
          action,
          event,
          truncatedDetail,
          fingerprint || null,
          ipAddress || null,
          userAgent || null,
          timestamp
        ]
      );
    } catch (error) {
      console.warn('[problemFeedback] failed to record event:', error?.message || error);
    }
  }

  async _enqueueReportNotification(feedbackId, payload) {
    if (!this.notifications || typeof this.notifications.enqueue !== 'function') {
      return;
    }
    try {
      await this.notifications.enqueue({
        type: 'problem_feedback.report',
        referenceId: feedbackId,
        severity: 'urgent',
        payload
      });
    } catch (error) {
      console.warn('[problemFeedback] failed to enqueue notification:', error?.message || error);
    }
  }

  async _resolveReportNotification(feedbackId, status) {
    if (!this.notifications || typeof this.notifications.resolveByReference !== 'function') {
      return;
    }
    try {
      await this.notifications.resolveByReference({
        type: 'problem_feedback.report',
        referenceId: feedbackId,
        status
      });
    } catch (error) {
      console.warn('[problemFeedback] failed to resolve notification:', error?.message || error);
    }
  }

  async submitFeedback({
    userId,
    problemId,
    action,
    reason,
    clientFingerprint,
    ipAddress,
    userAgent
  }) {
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

    await this._enforceRateLimit({
      userId: numericUserId,
      problemId: numericProblemId,
      action: normalizedAction,
      fingerprint: clientFingerprint
    });

    await this._recordEvent({
      feedbackId: null,
      userId: numericUserId,
      problemId: numericProblemId,
      action: normalizedAction,
      event: EVENT_TYPES.SUBMIT_ATTEMPT,
      fingerprint: clientFingerprint,
      ipAddress,
      userAgent,
      detail: normalizedReason || action
    });

    const existing = await this.db.get(
      'SELECT id, status FROM problem_feedback WHERE user_id = ? AND problem_id = ? AND action = ?',
      [numericUserId, numericProblemId, normalizedAction]
    );

    if (existing && normalizedAction === FEEDBACK_ACTIONS.LIKE) {
      await this.db.run('DELETE FROM problem_feedback WHERE id = ?', [existing.id]);
      await this._recordEvent({
        feedbackId: existing.id,
        userId: numericUserId,
        problemId: numericProblemId,
        action: normalizedAction,
        event: EVENT_TYPES.STATE_CHANGE,
        fingerprint: clientFingerprint,
        ipAddress,
        userAgent,
        detail: 'like_removed'
      });
      return {
        acknowledged: false,
        action: normalizedAction,
        removed: true
      };
    }

    if (existing) {
      await this.db.run(
        `UPDATE problem_feedback
            SET reason = ?,
                status = ?,
                resolution_note = NULL,
                resolved_by = NULL,
                resolved_at = NULL,
                updated_at = CURRENT_TIMESTAMP
          WHERE id = ?`,
        [
          normalizedReason,
          normalizedAction === FEEDBACK_ACTIONS.LIKE ? FEEDBACK_STATUS.ACKNOWLEDGED : FEEDBACK_STATUS.PENDING,
          existing.id
        ]
      );
      await this._recordEvent({
        feedbackId: existing.id,
        userId: numericUserId,
        problemId: numericProblemId,
        action: normalizedAction,
        event: EVENT_TYPES.STATE_CHANGE,
        fingerprint: clientFingerprint,
        ipAddress,
        userAgent,
        detail: normalizedReason || 'feedback_updated'
      });
      if (normalizedAction === FEEDBACK_ACTIONS.REPORT) {
        await this._enqueueReportNotification(existing.id, {
          problemId: numericProblemId,
          reason: normalizedReason,
          updatedAt: this._nowIso()
        });
      }
      return {
        acknowledged: true,
        action: normalizedAction,
        removed: false
      };
    }

    const insertStatus = normalizedAction === FEEDBACK_ACTIONS.LIKE
      ? FEEDBACK_STATUS.ACKNOWLEDGED
      : FEEDBACK_STATUS.PENDING;

    const { id: insertedId } = await this.db.run(
      `INSERT INTO problem_feedback (user_id, problem_id, action, reason, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)` ,
      [
        numericUserId,
        numericProblemId,
        normalizedAction,
        normalizedReason,
        insertStatus,
        this._nowIso(),
        this._nowIso()
      ]
    );

    await this._recordEvent({
      feedbackId: insertedId,
      userId: numericUserId,
      problemId: numericProblemId,
      action: normalizedAction,
      event: EVENT_TYPES.STATE_CHANGE,
      fingerprint: clientFingerprint,
      ipAddress,
      userAgent,
      detail: normalizedReason || 'feedback_created'
    });

    if (normalizedAction === FEEDBACK_ACTIONS.REPORT) {
      await this._enqueueReportNotification(insertedId, {
        problemId: numericProblemId,
        reason: normalizedReason,
        createdAt: this._nowIso()
      });
    }

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
      `SELECT action, COUNT(*) AS total
         FROM problem_feedback
        WHERE problem_id = ?
          AND status != ?
     GROUP BY action`,
      [numericProblemId, FEEDBACK_STATUS.DISMISSED]
    );

    const counts = summaryRows.reduce((acc, row) => {
      acc[row.action] = Number(row.total) || 0;
      return acc;
    }, { like: 0, report: 0 });

    const userState = { like: false, report: false };
    if (Number.isInteger(numericUserId) && numericUserId > 0) {
      const userRows = await this.db.all(
        `SELECT action
           FROM problem_feedback
          WHERE problem_id = ?
            AND user_id = ?`,
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

  async listReports({ status = 'pending', limit = 50 } = {}) {
    const normalizedStatus = typeof status === 'string' ? status.toLowerCase() : 'pending';
    const normalizedLimit = clampLimit(limit, { min: 1, max: 200, fallback: 50 });

    const rows = await this.db.all(
      `SELECT pf.id,
              pf.problem_id,
              pf.user_id,
              pf.reason,
              pf.status,
              pf.created_at,
              pf.updated_at,
              pf.resolution_note,
              pf.resolved_at,
              p.type AS problem_type,
              p.question,
              p.answer,
              p.explanation,
              d.title AS document_title,
              d.id AS document_id
         FROM problem_feedback pf
   LEFT JOIN problems p ON p.id = pf.problem_id
   LEFT JOIN documents d ON d.id = p.document_id
        WHERE pf.action = 'report'
          AND (? = 'all' OR pf.status = ?)
     ORDER BY pf.created_at ASC
        LIMIT ?`,
      [normalizedStatus, normalizedStatus, normalizedLimit]
    );

    const totals = await this.db.all(
      `SELECT status, COUNT(*) AS total
         FROM problem_feedback
        WHERE action = 'report'
     GROUP BY status`
    );

    const summary = totals.reduce((acc, row) => {
      acc[row.status] = Number(row.total) || 0;
      return acc;
    }, {});

    return {
      reports: rows.map((row) => ({
        id: row.id,
        problemId: row.problem_id,
        userId: row.user_id,
        reason: row.reason,
        status: row.status,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        resolutionNote: row.resolution_note,
        resolvedAt: row.resolved_at,
        problem: row.problem_id ? {
          id: row.problem_id,
          type: row.problem_type,
          question: row.question,
          answer: row.answer,
          explanation: row.explanation,
          documentId: row.document_id,
          documentTitle: row.document_title
        } : null
      })),
      summary
    };
  }

  async updateReportStatus({ feedbackId, status, resolvedBy, resolutionNote }) {
    const numericId = Number(feedbackId);
    if (!Number.isInteger(numericId) || numericId <= 0) {
      throw createHttpError(400, '피드백 ID가 올바르지 않아요.');
    }

    const normalizedStatus = typeof status === 'string' ? status.toLowerCase() : '';
    if (!Object.values(FEEDBACK_STATUS).includes(normalizedStatus)) {
      throw createHttpError(400, '지원하지 않는 상태값이에요.');
    }

    const row = await this.db.get(
      'SELECT id, problem_id, status, action FROM problem_feedback WHERE id = ?',
      [numericId]
    );
    if (!row || row.action !== FEEDBACK_ACTIONS.REPORT) {
      throw createHttpError(404, '신고 정보를 찾을 수 없어요. 이미 처리되었을 수도 있어요.');
    }

    const note = normalizeResolutionNote(resolutionNote);
    const resolvedTimestamp = [FEEDBACK_STATUS.RESOLVED, FEEDBACK_STATUS.DISMISSED].includes(normalizedStatus)
      ? this._nowIso()
      : null;

    await this.db.run(
      `UPDATE problem_feedback
          SET status = ?,
              resolution_note = ?,
              resolved_by = ?,
              resolved_at = ?,
              updated_at = CURRENT_TIMESTAMP
        WHERE id = ?`,
      [
        normalizedStatus,
        note,
        resolvedBy || null,
        resolvedTimestamp,
        numericId
      ]
    );

    await this._recordEvent({
      feedbackId: numericId,
      userId: resolvedBy || null,
      problemId: row.problem_id,
      action: FEEDBACK_ACTIONS.REPORT,
      event: EVENT_TYPES.STATE_CHANGE,
      fingerprint: null,
      ipAddress: null,
      userAgent: null,
      detail: `status:${normalizedStatus}`
    });

    if ([FEEDBACK_STATUS.RESOLVED, FEEDBACK_STATUS.DISMISSED].includes(normalizedStatus)) {
      await this._resolveReportNotification(numericId, normalizedStatus);
    }

    return {
      id: numericId,
      status: normalizedStatus,
      resolutionNote: note,
      resolvedAt: resolvedTimestamp
    };
  }
}

const defaultInstance = new ProblemFeedbackService();

module.exports = {
  FEEDBACK_ACTIONS,
  FEEDBACK_STATUS,
  EVENT_TYPES,
  ProblemFeedbackService,
  submitFeedback: defaultInstance.submitFeedback.bind(defaultInstance),
  getFeedbackSummary: defaultInstance.getFeedbackSummary.bind(defaultInstance),
  listProblemReports: defaultInstance.listReports.bind(defaultInstance),
  updateProblemReportStatus: defaultInstance.updateReportStatus.bind(defaultInstance),
  problemFeedbackService: defaultInstance
};
