const test = require('node:test');
const assert = require('node:assert/strict');

const {
  StudySessionService,
  SESSION_STATUS
} = require('../services/studySessionService');

class SessionMemoryDb {
  constructor() {
    this.sessions = [];
    this.events = [];
    this.nextSessionId = 1;
    this.nextEventId = 1;
  }

  async run(query, params) {
    if (query.startsWith('INSERT INTO study_sessions')) {
      const [userId, sessionKey, payload, status, savedAt, updatedAt] = params;
      const existing = this.sessions.find((row) => row.user_id === userId && row.session_key === sessionKey);
      if (existing) {
        existing.payload = payload;
        existing.status = status;
        existing.updated_at = updatedAt;
        existing.restored_at = null;
        existing.saved_at = existing.saved_at || savedAt;
        return { id: existing.id, changes: 1 };
      }
      const row = {
        id: this.nextSessionId++,
        user_id: userId,
        session_key: sessionKey,
        payload,
        status,
        saved_at: savedAt,
        updated_at: updatedAt,
        restored_at: null
      };
      this.sessions.push(row);
      return { id: row.id, changes: 1 };
    }

    if (query.includes('UPDATE study_sessions') && query.includes('SET restored_at')) {
      const [restoredAt, updatedAt, id] = params;
      const row = this.sessions.find((item) => item.id === id);
      if (row) {
        row.restored_at = restoredAt;
        row.updated_at = updatedAt;
      }
      return { changes: row ? 1 : 0 };
    }

    if (query.includes('UPDATE study_sessions') && query.includes('SET status')) {
      const [status, updatedAt, id] = params;
      const row = this.sessions.find((item) => item.id === id);
      if (row) {
        row.status = status;
        row.updated_at = updatedAt;
        row.restored_at = null;
      }
      return { changes: row ? 1 : 0 };
    }

    if (query.startsWith('INSERT INTO study_session_events')) {
      const [sessionId, userId, event, detail, createdAt] = params;
      this.events.push({
        id: this.nextEventId++,
        session_id: sessionId,
        user_id: userId,
        event,
        detail,
        created_at: createdAt
      });
      return { id: this.nextEventId - 1, changes: 1 };
    }

    throw new Error(`Unsupported run query: ${query}`);
  }

  async get(query, params) {
    if (query.startsWith('SELECT id, payload, status, saved_at, updated_at, restored_at FROM study_sessions')) {
      const [userId, sessionKey] = params;
      return this.sessions.find((row) => row.user_id === userId && row.session_key === sessionKey) || null;
    }

    if (query.startsWith('SELECT id FROM study_sessions WHERE user_id = ?')) {
      const [userId, sessionKey] = params;
      const row = this.sessions.find((item) => item.user_id === userId && item.session_key === sessionKey);
      return row ? { id: row.id } : null;
    }

    return null;
  }
}

test('StudySessionService saves and resumes session', async () => {
  const db = new SessionMemoryDb();
  const service = new StudySessionService({ db });

  const payload = { problems: [1, 2], answers: {} };
  const saveResult = await service.saveSession({ userId: 5, payload });
  assert.equal(saveResult.status, SESSION_STATUS.ACTIVE);
  assert.deepEqual(JSON.parse(db.sessions[0].payload), payload);

  const resume = await service.getActiveSession({ userId: 5 });
  assert.ok(resume);
  assert.equal(resume.status, SESSION_STATUS.ACTIVE);
  assert.deepEqual(resume.payload, payload);
  assert.equal(db.sessions[0].restored_at !== null, true);
});

test('StudySessionService clears session', async () => {
  const db = new SessionMemoryDb();
  const service = new StudySessionService({ db });

  await service.saveSession({ userId: 7, payload: { problems: [] } });
  const result = await service.clearSession({ userId: 7, reason: 'completed' });
  assert.equal(result.cleared, true);
  assert.equal(db.sessions[0].status, SESSION_STATUS.CLEARED);
});
