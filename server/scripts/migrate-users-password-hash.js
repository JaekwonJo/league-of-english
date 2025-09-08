const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcryptjs');

const dbPath = path.join(__dirname, '..', 'database.db');
const db = new sqlite3.Database(dbPath);

function all(sql, params = []) {
  return new Promise((resolve, reject) => db.all(sql, params, (e, rows) => e ? reject(e) : resolve(rows)));
}
function get(sql, params = []) {
  return new Promise((resolve, reject) => db.get(sql, params, (e, row) => e ? reject(e) : resolve(row)));
}
function run(sql, params = []) {
  return new Promise((resolve, reject) => db.run(sql, params, function (e) { e ? reject(e) : resolve(this); }));
}

(async () => {
  console.log('🔧 Migrating users: ensure password_hash exists and populated');

  const cols = await all('PRAGMA table_info(users)');
  const hasPasswordHash = cols.some(c => c.name === 'password_hash');
  if (!hasPasswordHash) {
    console.log('➡️  Adding column password_hash');
    await run('ALTER TABLE users ADD COLUMN password_hash TEXT');
  } else {
    console.log('✅ Column password_hash already exists');
  }

  const users = await all('SELECT id, username, password, password_hash FROM users');
  let updated = 0;
  for (const u of users) {
    if (!u.password_hash && u.password) {
      const value = u.password.startsWith('$2') ? u.password : await bcrypt.hash(u.password, 10);
      await run('UPDATE users SET password_hash = ? WHERE id = ?', [value, u.id]);
      updated++;
    }
  }
  console.log(`✅ Migration complete. Users updated: ${updated}/${users.length}`);
  db.close();
})().catch(e => { console.error('❌ Migration error:', e); try { db.close(); } catch {} process.exit(1); });

