const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '..', 'database.db');
const db = new sqlite3.Database(dbPath);

function all(sql, params = []) { return new Promise((res, rej) => db.all(sql, params, (e, r) => e ? rej(e) : res(r))); }
function run(sql, params = []) { return new Promise((res, rej) => db.run(sql, params, function (e) { e ? rej(e) : res(this); })); }

(async () => {
  console.log('🔧 Migrating users schema: drop legacy columns (password)');
  const tables = await all("SELECT name FROM sqlite_master WHERE type='table' AND name='users'");
  if (!tables.length) throw new Error('users table not found');

  await run('BEGIN');
  await run(`
    CREATE TABLE IF NOT EXISTS users_new (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      school TEXT,
      grade INTEGER,
      role TEXT DEFAULT 'student',
      membership TEXT DEFAULT 'free',
      daily_limit INTEGER DEFAULT 30,
      used_today INTEGER DEFAULT 0,
      last_reset_date DATE,
      tier TEXT DEFAULT 'Bronze',
      points INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

  // Copy data; prefer password_hash, fallback to password
  const rows = await all('SELECT * FROM users');
  for (const r of rows) {
    const hash = r.password_hash || r.password;
    await run(
      `INSERT INTO users_new (id, username, password_hash, email, name, school, grade, role, membership, daily_limit, used_today, last_reset_date, tier, points, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [r.id, r.username, hash || '', r.email, r.name || '', r.school || '', r.grade || null, r.role || 'student', r.membership || 'free', r.daily_limit || 30, r.used_today || 0, r.last_reset_date || null, r.tier || 'Bronze', r.points || 0, r.created_at || null]
    );
  }

  await run('ALTER TABLE users RENAME TO users_legacy');
  await run('ALTER TABLE users_new RENAME TO users');
  await run('COMMIT');
  console.log('✅ users schema migrated. Old table saved as users_legacy');
  db.close();
})().catch(e => { console.error('❌ Migration error:', e); try { run('ROLLBACK'); } catch {} try { db.close(); } catch {}; process.exit(1); });

