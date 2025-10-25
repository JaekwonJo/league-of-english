'use strict';

const database = require('../models/database');

function todayDateStr() {
  return new Date().toISOString().slice(0, 10);
}

async function getUsageToday(userId, category) {
  const row = await database.get(
    'SELECT used_count as used FROM usage_counters WHERE user_id = ? AND date = ? AND category = ?',
    [userId, todayDateStr(), String(category)]
  );
  return Number(row?.used || 0);
}

async function addUsage(userId, category, count) {
  const used = Math.max(0, Number(count) || 0);
  if (used === 0) return;
  await database.run(
    `INSERT INTO usage_counters (user_id, date, category, used_count)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(user_id, date, category) DO UPDATE SET used_count = used_count + excluded.used_count`,
    [userId, todayDateStr(), String(category), used]
  );
}

module.exports = {
  getUsageToday,
  addUsage
};

