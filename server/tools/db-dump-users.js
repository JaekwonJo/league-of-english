const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '..', 'database.db');
const db = new sqlite3.Database(dbPath);

db.all('SELECT id, username, role, email, password FROM users', (err, rows) => {
  if (err) {
    console.error('Query error:', err);
    process.exit(1);
  }
  console.log('id\tusername\trole\temail\tpassword');
  rows.forEach(r => console.log([r.id, r.username, r.role, r.email, r.password].join('\t')));
  db.close();
});

