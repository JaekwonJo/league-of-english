const database = require('../models/database');

const EVENT_TYPES = {
  REGISTER: 'REGISTER',
  LOGIN: 'LOGIN'
};

async function logAuthEvent({ userId = null, username = null, eventType, ipAddress = null, userAgent = null, metadata = null }) {
  if (!eventType) {
    throw new Error('eventType is required');
  }

  let metaJson = null;
  if (metadata) {
    try {
      metaJson = JSON.stringify(metadata);
    } catch (error) {
      console.error('[authLog] metadata stringify failed', error);
      metaJson = null;
    }
  }

  try {
    await database.run(
      `INSERT INTO auth_logs (user_id, username, event_type, ip_address, user_agent, metadata)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [userId, username, eventType, ipAddress, userAgent, metaJson]
    );
  } catch (error) {
    console.error('[authLog] failed to persist event', eventType, error?.message || error);
  }
}

module.exports = {
  logAuthEvent,
  EVENT_TYPES
};
