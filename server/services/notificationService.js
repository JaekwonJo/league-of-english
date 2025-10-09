const database = require('../models/database');

const NOTIFICATION_STATUS = Object.freeze({
  PENDING: 'pending',
  ACKNOWLEDGED: 'acknowledged',
  RESOLVED: 'resolved',
  DISMISSED: 'dismissed'
});

function toJson(payload) {
  if (!payload) return null;
  try {
    return JSON.stringify(payload);
  } catch (error) {
    console.warn('[notifications] failed to stringify payload:', error?.message || error);
    return null;
  }
}

function parseJson(text) {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch (error) {
    return null;
  }
}

class NotificationService {
  constructor({ db = database } = {}) {
    this.db = db;
  }

  _nowIso() {
    return new Date().toISOString();
  }

  async enqueue({ type, referenceId = null, severity = 'normal', payload = null }) {
    const payloadJson = toJson(payload);
    const timestamp = this._nowIso();

    const existing = await this.db.get(
      `SELECT id FROM admin_notifications WHERE type = ? AND reference_id = ? AND status = ?`,
      [type, referenceId, NOTIFICATION_STATUS.PENDING]
    );

    if (existing) {
      await this.db.run(
        `UPDATE admin_notifications
            SET payload = ?,
                severity = ?,
                updated_at = CURRENT_TIMESTAMP
          WHERE id = ?`,
        [payloadJson, severity, existing.id]
      );
      return { id: existing.id, status: NOTIFICATION_STATUS.PENDING };
    }

    const { id } = await this.db.run(
      `INSERT INTO admin_notifications (type, reference_id, severity, payload, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)` ,
      [
        type,
        referenceId,
        severity,
        payloadJson,
        NOTIFICATION_STATUS.PENDING,
        timestamp,
        timestamp
      ]
    );

    return { id, status: NOTIFICATION_STATUS.PENDING };
  }

  async resolveByReference({ type, referenceId, status = NOTIFICATION_STATUS.RESOLVED }) {
    if (!Object.values(NOTIFICATION_STATUS).includes(status)) {
      throw new Error('Invalid notification status: ' + status);
    }

    const timestamp = this._nowIso();
    await this.db.run(
      `UPDATE admin_notifications
          SET status = ?,
              updated_at = CURRENT_TIMESTAMP,
              resolved_at = ?
        WHERE type = ?
          AND reference_id = ?
          AND status = ?`,
      [status, timestamp, type, referenceId, NOTIFICATION_STATUS.PENDING]
    );
  }

  async updateStatus(id, status) {
    if (!Object.values(NOTIFICATION_STATUS).includes(status)) {
      throw new Error('Invalid notification status: ' + status);
    }
    const numericId = Number(id);
    if (!Number.isInteger(numericId) || numericId <= 0) {
      throw new Error('Invalid notification id');
    }

    const timestamp = this._nowIso();
    await this.db.run(
      `UPDATE admin_notifications
          SET status = ?,
              updated_at = CURRENT_TIMESTAMP,
              acknowledged_at = CASE WHEN ? = ? THEN CURRENT_TIMESTAMP ELSE acknowledged_at END,
              resolved_at = CASE WHEN ? IN (?, ?) THEN ? ELSE resolved_at END
        WHERE id = ?`,
      [
        status,
        status,
        NOTIFICATION_STATUS.ACKNOWLEDGED,
        status,
        NOTIFICATION_STATUS.RESOLVED,
        NOTIFICATION_STATUS.DISMISSED,
        timestamp,
        numericId
      ]
    );
  }

  async list({ status = NOTIFICATION_STATUS.PENDING, limit = 20 } = {}) {
    const normalizedStatus = typeof status === 'string' ? status.toLowerCase() : NOTIFICATION_STATUS.PENDING;
    const numericLimit = Math.min(Math.max(Number(limit) || 20, 1), 200);

    const rows = await this.db.all(
      `SELECT id, type, reference_id, severity, payload, status, created_at, updated_at, acknowledged_at, resolved_at
         FROM admin_notifications
        WHERE (? = 'all' OR status = ?)
     ORDER BY created_at DESC
        LIMIT ?`,
      [normalizedStatus, normalizedStatus, numericLimit]
    );

    return rows.map((row) => ({
      id: row.id,
      type: row.type,
      referenceId: row.reference_id,
      severity: row.severity,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      acknowledgedAt: row.acknowledged_at,
      resolvedAt: row.resolved_at,
      payload: parseJson(row.payload)
    }));
  }
}

const defaultInstance = new NotificationService();

module.exports = {
  NOTIFICATION_STATUS,
  NotificationService,
  notificationService: defaultInstance,
  enqueue: defaultInstance.enqueue.bind(defaultInstance),
  resolveByReference: defaultInstance.resolveByReference.bind(defaultInstance),
  updateStatus: defaultInstance.updateStatus.bind(defaultInstance),
  list: defaultInstance.list.bind(defaultInstance)
};
