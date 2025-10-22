const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const database = require('../models/database');
const tierUtils = require('../utils/tierUtils');
const studyService = require('../services/studyService');

async function insertUser({ username, points }) {
  const tier = tierUtils.getTierInfo(points).name;
  const result = await database.run(
    `INSERT INTO users (username, password_hash, email, name, school, grade, points, tier)
     VALUES (?, 'hashed-password', ?, ?, '테스트고', 3, ?, ?)`,
    [
      username,
      `${username}@example.com`,
      `테스트 ${username}`,
      points,
      tier
    ]
  );
  return result.id;
}

test('getUserRank calculates tier and progress for high-score users', async () => {
  const suffix = `beta_rank_${Date.now()}`;
  const blueprints = [
    { username: `${suffix}_01`, points: 16000 },
    { username: `${suffix}_02`, points: 10500 },
    { username: `${suffix}_03`, points: 5200 },
    { username: `${suffix}_04`, points: 2500 },
    { username: `${suffix}_05`, points: 1200 }
  ];

  const inserted = [];
  const createdDb = !database.db;
  const relativeDbPath = createdDb ? `tmp/ranking-test-${Date.now()}.sqlite` : null;
  let absoluteDbPath = null;
  try {
    if (createdDb) {
      const tmpDir = path.join(__dirname, '..', '..', 'tmp');
      fs.mkdirSync(tmpDir, { recursive: true });
      process.env.DB_FILE = relativeDbPath;
      absoluteDbPath = path.join(__dirname, '..', relativeDbPath);
      await database.connect();
    }

    for (const blueprint of blueprints) {
      const id = await insertUser(blueprint);
      inserted.push({ id, username: blueprint.username, points: blueprint.points });
    }

    const target = inserted[2]; // 5,200 LP → 기대 랭크 3위, 티어 Platinum
    const rankData = await studyService.getUserRank(target.id);

    assert.equal(rankData.rank, 3);
    assert.equal(rankData.points, target.points);
    assert.equal(rankData.tier.name, 'Platinum');
    assert.equal(rankData.nextTier.name, 'Diamond');

    const expectedProgress = tierUtils.calculateProgress(
      target.points,
      rankData.tier,
      rankData.nextTier
    );
    assert.equal(Math.round(rankData.progressToNext), Math.round(expectedProgress));
  } finally {
    if (inserted.length) {
      const usernames = inserted.map((entry) => entry.username);
      const placeholders = usernames.map(() => '?').join(', ');
      await database.run(
        `DELETE FROM users WHERE username IN (${placeholders})`,
        usernames
      );
    }
    if (createdDb) {
      await database.close();
      if (absoluteDbPath && fs.existsSync(absoluteDbPath)) {
        fs.unlinkSync(absoluteDbPath);
      }
      delete process.env.DB_FILE;
    }
  }
});
