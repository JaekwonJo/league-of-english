const database = require('../models/database');

const SESSION_STATUS = Object.freeze({
  ACTIVE: 'active',
  CLEARED: 'cleared',
  EXPIRED: 'expired'
});

const SESSION_EVENTS = Object.freeze({
  SAVED: 'saved',
  RESUME_REQUESTED: 'resume_requested',
  RESUME_SUCCESS: 'resume_success',
  CLEARED: 'cleared'
});

function serializePayload(payload) {
  try {
    return JSON.stringify(payload);
  } catch (error) {
    throw new Error('세션 데이터를 저장하는 중 문제가 발생했어요. 다시 시도해 주세요.');
  }
}

function parsePayload(text) {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch (error) {
    return null;
  }
}

class StudySessionService {
  constructor({ db = database } = {}) {
    this.db = db;
  }

  _nowIso() {
    return new Date().toISOString();
  }

  async _logEvent({ sessionId = null, userId, event, detail = null }) {
    const detailText = typeof detail === 'string' ? detail.slice(0, 1000) : detail ? JSON.stringify(detail).slice(0, 1000) : null;
    try {
      await this.db.run(
        `INSERT INTO study_session_events (session_id, user_id, event, detail, created_at)
         VALUES (?, ?, ?, ?, ?)` ,
        [sessionId, userId, event, detailText, this._nowIso()]
      );
    } catch (error) {
      console.warn('[studySession] failed to log event:', error?.message || error);
    }
  }

  async saveSession({ userId, payload, sessionKey = 'active' }) {
    const numericUserId = Number(userId);
    if (!Number.isInteger(numericUserId) || numericUserId <= 0) {
      throw new Error('세션을 저장하려면 로그인이 필요해요.');
    }
    if (!payload || typeof payload !== 'object') {
      throw new Error('저장할 세션 데이터가 올바르지 않아요.');
    }

    const timestamp = this._nowIso();
    const serialized = serializePayload(payload);

    await this.db.run(
      `INSERT INTO study_sessions (user_id, session_key, payload, status, saved_at, updated_at, restored_at)
       VALUES (?, ?, ?, ?, ?, ?, NULL)
       ON CONFLICT(user_id, session_key)
       DO UPDATE SET
         payload = excluded.payload,
         status = excluded.status,
         updated_at = excluded.updated_at,
         restored_at = NULL`,
      [numericUserId, sessionKey, serialized, SESSION_STATUS.ACTIVE, timestamp, timestamp]
    );

    const row = await this.db.get(
      'SELECT id, payload, status, saved_at, updated_at, restored_at FROM study_sessions WHERE user_id = ? AND session_key = ?',
      [numericUserId, sessionKey]
    );

    await this._logEvent({ sessionId: row?.id || null, userId: numericUserId, event: SESSION_EVENTS.SAVED });

    return {
      id: row?.id || null,
      status: row?.status || SESSION_STATUS.ACTIVE,
      savedAt: row?.saved_at || timestamp,
      updatedAt: row?.updated_at || timestamp,
      restoredAt: row?.restored_at || null,
      payload
    };
  }

  async getActiveSession({ userId, sessionKey = 'active' }) {
    const numericUserId = Number(userId);
    if (!Number.isInteger(numericUserId) || numericUserId <= 0) {
      throw new Error('로그인 상태를 확인해 주세요.');
    }

    const row = await this.db.get(
      'SELECT id, payload, status, saved_at, updated_at, restored_at FROM study_sessions WHERE user_id = ? AND session_key = ?',
      [numericUserId, sessionKey]
    );

    await this._logEvent({ sessionId: row?.id || null, userId: numericUserId, event: SESSION_EVENTS.RESUME_REQUESTED });

    if (!row || row.status !== SESSION_STATUS.ACTIVE) {
      return null;
    }

    const payload = parsePayload(row.payload);
    if (!payload) {
      return null;
    }

    const restoredAt = this._nowIso();
    await this.db.run(
      `UPDATE study_sessions
          SET restored_at = ?,
              updated_at = ?
        WHERE id = ?`,
      [restoredAt, restoredAt, row.id]
    );

    await this._logEvent({ sessionId: row.id, userId: numericUserId, event: SESSION_EVENTS.RESUME_SUCCESS });

    return {
      id: row.id,
      status: row.status,
      savedAt: row.saved_at,
      updatedAt: row.updated_at,
      restoredAt,
      payload
    };
  }

  async clearSession({ userId, sessionKey = 'active', reason = null }) {
    const numericUserId = Number(userId);
    if (!Number.isInteger(numericUserId) || numericUserId <= 0) {
      throw new Error('로그인 상태를 확인해 주세요.');
    }

    const row = await this.db.get(
      'SELECT id FROM study_sessions WHERE user_id = ? AND session_key = ?',
      [numericUserId, sessionKey]
    );

    if (!row) {
      await this._logEvent({ sessionId: null, userId: numericUserId, event: SESSION_EVENTS.CLEARED, detail: reason || 'not_found' });
      return { cleared: false };
    }

    await this.db.run(
      `UPDATE study_sessions
          SET status = ?,
              updated_at = ?,
              restored_at = NULL
        WHERE id = ?`,
      [SESSION_STATUS.CLEARED, this._nowIso(), row.id]
    );

    await this._logEvent({ sessionId: row.id, userId: numericUserId, event: SESSION_EVENTS.CLEARED, detail: reason });
    return { cleared: true };
  }
}

const defaultInstance = new StudySessionService();

module.exports = {
  SESSION_STATUS,
  SESSION_EVENTS,
  StudySessionService,
  studySessionService: defaultInstance,
  saveSession: defaultInstance.saveSession.bind(defaultInstance),
  getActiveSession: defaultInstance.getActiveSession.bind(defaultInstance),
  clearSession: defaultInstance.clearSession.bind(defaultInstance)
};
