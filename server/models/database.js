const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const config = require('../config/server.config.json');
const initSqlJs = require('sql.js');

class Database {
  constructor() {
    this.db = null; // sql.js Database
    this.SQL = null; // sql.js module
    this.dbPath = null; // persistence path
    this._dirty = false;
    this._flushTimer = null;
  }

  async connect() {
    const envDb = process.env.DB_FILE || process.env.DB_PATH;
    const isAbs = envDb && path.isAbsolute(envDb);
    this.dbPath = envDb ? (isAbs ? envDb : path.join(__dirname, '..', envDb)) : path.join(__dirname, '..', config.database.filename);
    console.log('[db] path:', this.dbPath);

    const locateFile = (file) => path.join(__dirname, '..', '..', 'node_modules', 'sql.js', 'dist', file);
    this.SQL = await initSqlJs({ locateFile });
    let data = null;
    try { if (fs.existsSync(this.dbPath)) data = fs.readFileSync(this.dbPath); } catch {}
    this.db = data ? new this.SQL.Database(new Uint8Array(data)) : new this.SQL.Database();
    await this.initialize();
  }

  async initialize() {
    await this.createTables();
    await this.updateSchema();
    await this.createDefaultAdmin();
  }

  createTables() {
    return new Promise((resolve, reject) => {
      const queries = [
        // groups table (for admin-managed groups)
        `CREATE TABLE IF NOT EXISTS groups (
          name TEXT PRIMARY KEY,
          description TEXT,
          created_by INTEGER,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`,
        // users
        `CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          username VARCHAR(50) UNIQUE NOT NULL,
          password_hash VARCHAR(255) NOT NULL,
          email VARCHAR(100) UNIQUE NOT NULL,
          name VARCHAR(100) NOT NULL,
          school VARCHAR(100) NOT NULL,
          grade INTEGER NOT NULL CHECK (grade IN (1, 2, 3)),
          role VARCHAR(20) DEFAULT 'student',
          membership VARCHAR(20) DEFAULT 'free',
          membership_expires_at DATETIME,
          daily_limit INTEGER DEFAULT 30,
          used_today INTEGER DEFAULT 0,
          last_reset_date DATE,
          tier VARCHAR(20) DEFAULT 'Bronze',
          points INTEGER DEFAULT 0,
          email_verified BOOLEAN DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          is_active BOOLEAN DEFAULT 1
        )`,

        // documents
        `CREATE TABLE IF NOT EXISTS documents (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          title VARCHAR(255) NOT NULL,
          content TEXT NOT NULL,
          type VARCHAR(20) NOT NULL,
          category VARCHAR(50) DEFAULT '기본',
          school VARCHAR(100) DEFAULT '전체',
          grade INTEGER,
          difficulty VARCHAR(20) DEFAULT 'medium',
          worksheet_type VARCHAR(20),
          created_by INTEGER NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          is_active BOOLEAN DEFAULT 1,
          FOREIGN KEY (created_by) REFERENCES users(id)
        )`,

        // problems
        `CREATE TABLE IF NOT EXISTS problems (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          document_id INTEGER,
          type VARCHAR(30) NOT NULL,
          question TEXT NOT NULL,
          options TEXT,
          answer VARCHAR(255) NOT NULL,
          explanation TEXT,
          difficulty VARCHAR(20) DEFAULT 'medium',
          points INTEGER DEFAULT 10,
          is_ai_generated BOOLEAN DEFAULT 0,
          main_text TEXT,
          sentences TEXT,
          metadata TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (document_id) REFERENCES documents(id)
        )`,

        // problem_exposures (유저별 문제 노출 기록)
        `CREATE TABLE IF NOT EXISTS problem_exposures (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          problem_id INTEGER NOT NULL,
          first_seen_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          last_seen_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          exposure_count INTEGER DEFAULT 1,
          UNIQUE(user_id, problem_id)
        )`,

        // study_records
        `CREATE TABLE IF NOT EXISTS study_records (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          problem_id INTEGER NOT NULL,
          is_correct BOOLEAN NOT NULL,
          user_answer VARCHAR(255),
          time_spent INTEGER,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id),
          FOREIGN KEY (problem_id) REFERENCES problems(id)
        )`,

        // study_session_logs
        `CREATE TABLE IF NOT EXISTS study_session_logs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          total_problems INTEGER NOT NULL,
          correct INTEGER NOT NULL,
          incorrect INTEGER NOT NULL,
          accuracy REAL NOT NULL,
          points_delta INTEGER NOT NULL,
          total_points_after INTEGER NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id)
        )`,

        // problem_generations
        `CREATE TABLE IF NOT EXISTS problem_generations (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          document_id INTEGER NOT NULL,
          problem_type VARCHAR(30) NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id),
          FOREIGN KEY (document_id) REFERENCES documents(id)
        )`,

        `CREATE TABLE IF NOT EXISTS problem_notes (
          problem_id INTEGER PRIMARY KEY,
          note TEXT,
          updated_by INTEGER,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (problem_id) REFERENCES problems(id),
          FOREIGN KEY (updated_by) REFERENCES users(id)
        )`,

        `CREATE TABLE IF NOT EXISTS problem_export_history (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          document_id INTEGER,
          types TEXT,
          counts TEXT,
          problem_ids TEXT,
          total INTEGER DEFAULT 0,
          include_solutions BOOLEAN DEFAULT 1,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id),
          FOREIGN KEY (document_id) REFERENCES documents(id)
        )`,

        `CREATE TABLE IF NOT EXISTS problem_feedback (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          problem_id INTEGER NOT NULL,
          action TEXT NOT NULL,
          reason TEXT,
          status TEXT DEFAULT 'pending',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(user_id, problem_id, action),
          FOREIGN KEY (user_id) REFERENCES users(id),
          FOREIGN KEY (problem_id) REFERENCES problems(id)
        )`,
        'CREATE INDEX IF NOT EXISTS idx_problem_feedback_problem ON problem_feedback(problem_id)',
        'CREATE INDEX IF NOT EXISTS idx_problem_feedback_user ON problem_feedback(user_id)',

        // auth_logs
        `CREATE TABLE IF NOT EXISTS auth_logs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER,
          username VARCHAR(50),
          event_type VARCHAR(20) NOT NULL,
          ip_address VARCHAR(45),
          user_agent TEXT,
          metadata TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id)
        )`,

        // vocabulary_documents
        `CREATE TABLE IF NOT EXISTS vocabulary_documents (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          title TEXT NOT NULL,
          original_filename TEXT,
          uploaded_by INTEGER,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`,

        // passage_analyses
        `CREATE TABLE IF NOT EXISTS passage_analyses (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          document_id INTEGER NOT NULL,
          passage_number INTEGER NOT NULL,
          original_passage TEXT NOT NULL,
          summary TEXT,
          key_points TEXT,
          vocabulary TEXT,
          grammar_points TEXT,
          study_guide TEXT,
          comprehension_questions TEXT,
          published BOOLEAN DEFAULT 0,
          visibility_scope TEXT DEFAULT 'public',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (document_id) REFERENCES documents(id),
          UNIQUE(document_id, passage_number)
        )`,

        // user_groups
        `CREATE TABLE IF NOT EXISTS user_groups (
          user_id INTEGER NOT NULL,
          group_name TEXT NOT NULL,
          PRIMARY KEY (user_id, group_name),
          FOREIGN KEY (user_id) REFERENCES users(id)
        )`,

        // analysis_group_permissions
        `CREATE TABLE IF NOT EXISTS analysis_group_permissions (
          analysis_id INTEGER NOT NULL,
          group_name TEXT NOT NULL,
          PRIMARY KEY (analysis_id, group_name),
          FOREIGN KEY (analysis_id) REFERENCES passage_analyses(id)
        )`,

        // analysis_feedback (추천/신고 기록)
        `CREATE TABLE IF NOT EXISTS analysis_feedback (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          document_id INTEGER NOT NULL,
          passage_number INTEGER NOT NULL,
          variant_index INTEGER NOT NULL,
          user_id INTEGER NOT NULL,
          action TEXT NOT NULL CHECK (action IN ('helpful','report')),
          reason TEXT,
          status TEXT DEFAULT 'pending',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (document_id) REFERENCES documents(id),
          FOREIGN KEY (user_id) REFERENCES users(id),
          UNIQUE(document_id, passage_number, variant_index, user_id, action)
        )`,

        // document visibility rules
        `CREATE TABLE IF NOT EXISTS document_visibility (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          document_id INTEGER NOT NULL,
          visibility_type TEXT NOT NULL CHECK (visibility_type IN ('public','school','grade','student')),
          value TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (document_id) REFERENCES documents(id)
        )`,

        `CREATE TABLE IF NOT EXISTS inquiries (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          subject TEXT NOT NULL,
          message TEXT NOT NULL,
          status TEXT DEFAULT 'pending',
          admin_reply TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id)
        )`,

        // email_verifications
        `CREATE TABLE IF NOT EXISTS email_verifications (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          email TEXT NOT NULL,
          code TEXT NOT NULL,
          expires_at DATETIME NOT NULL,
          verified INTEGER DEFAULT 0,
          verified_at DATETIME,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`,

        // membership_requests
        `CREATE TABLE IF NOT EXISTS membership_requests (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          plan TEXT NOT NULL,
          message TEXT,
          status TEXT DEFAULT 'pending',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id)
        )`,

        // view_logs
        `CREATE TABLE IF NOT EXISTS view_logs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER,
          resource_type TEXT,
          resource_id INTEGER,
          document_id INTEGER,
          passage_number INTEGER,
          action TEXT DEFAULT 'view',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id)
        )`
      ];

      try {
        this._execBatch(queries);
        console.log('모든 테이블 생성 완료');
        resolve();
      } catch (e) {
        console.error('테이블 생성 실패:', e);
        reject(e);
      }
    });
  }

  async updateSchema() {
    return new Promise((resolve) => {
      const alterQueries = [
        `ALTER TABLE problems ADD COLUMN main_text TEXT`,
        `ALTER TABLE problems ADD COLUMN sentences TEXT`,
        `ALTER TABLE problems ADD COLUMN metadata TEXT`,
        `ALTER TABLE passage_analyses ADD COLUMN published BOOLEAN DEFAULT 0`,
        `ALTER TABLE passage_analyses ADD COLUMN visibility_scope TEXT DEFAULT 'public'`,
        `ALTER TABLE passage_analyses ADD COLUMN variants TEXT`,
        `ALTER TABLE users ADD COLUMN email_verified BOOLEAN DEFAULT 0`,
        `ALTER TABLE users ADD COLUMN last_login_at DATETIME`,
        `ALTER TABLE users ADD COLUMN last_login_ip TEXT`,
        `ALTER TABLE users ADD COLUMN login_count INTEGER DEFAULT 0`,
        `ALTER TABLE analysis_feedback ADD COLUMN status TEXT DEFAULT 'pending'`,
        `ALTER TABLE analysis_feedback ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP`,
        `ALTER TABLE email_verifications ADD COLUMN verified_at DATETIME`,
        `ALTER TABLE problem_exposures ADD COLUMN last_result TEXT`,
        `ALTER TABLE problem_exposures ADD COLUMN correct_count INTEGER DEFAULT 0`,
        `ALTER TABLE problem_exposures ADD COLUMN incorrect_count INTEGER DEFAULT 0`,
        `ALTER TABLE problem_exposures ADD COLUMN last_answered_at DATETIME`
      ];

      let errors = 0;
      for (const q of alterQueries) {
        try {
          this._exec(q);
          const col = q.split(' ADD COLUMN ')[1]?.split(' ')[0];
          if (col) console.log('컬럼 추가 완료:', col);
        } catch (err) {
          if (String(err?.message || '').includes('duplicate column name')) {
            const col = q.split(' ADD COLUMN ')[1]?.split(' ')[0];
            console.log('이미 존재하는 컬럼:', col);
          } else {
            console.warn('스키마 업데이트 경고:', err.message || err);
            errors++;
          }
        }
      }
      if (errors === 0) console.log('스키마 업데이트 완료');
      resolve();
    });
  }

  async createDefaultAdmin() {
    return new Promise((resolve, reject) => {
      const checkQuery = 'SELECT * FROM users WHERE username = ?';
      let row = null;
      try {
        row = this.getSync(checkQuery, [config.admin.defaultUsername]);
      } catch (e) { /* ignore */ }

      if (!row) {
        (async () => {
          try {
            const hashedPassword = await bcrypt.hash(config.admin.defaultPassword, config.auth.saltRounds);
            const insertQuery = `
              INSERT INTO users (username, password_hash, email, name, school, grade, role, membership, tier, points)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;
            await this.run(insertQuery, [
              config.admin.defaultUsername,
              hashedPassword,
              config.admin.defaultEmail,
              '관리자',
              'League of English',
              1,
              'admin',
              'premium',
              'Bronze',
              0
            ]);
            console.log('기본 관리자 계정 생성 완료');
            resolve();
          } catch (err) {
            console.error('관리자 계정 생성 실패:', err);
            reject(err);
          }
        })();
      } else {
        resolve();
      }
    });
  }

  // Helpers for sync get during boot
  getSync(query, params = []) {
    const stmt = this.db.prepare(query);
    stmt.bind(this._normalizeParams(params));
    const row = stmt.step() ? stmt.getAsObject() : null;
    stmt.free();
    return row;
  }

  // Public query helpers
  run(query, params = []) {
    return new Promise((resolve, reject) => {
      try {
        const stmt = this.db.prepare(query);
        const normalized = this._normalizeParams(params);
        stmt.bind(normalized);
        stmt.step();
        const firstToken = (query || '').trim().split(/\s+/)[0]?.toUpperCase() || '';
        const changes = typeof this.db.getRowsModified === 'function' ? this.db.getRowsModified() : undefined;
        stmt.free();
        let id = undefined;
        if (firstToken === 'INSERT') {
          try {
            const res = this.db.exec('SELECT last_insert_rowid() as id');
            id = res?.[0]?.values?.[0]?.[0];
          } catch (lookupError) {
            console.error('[db] failed to fetch last_insert_rowid', lookupError?.message || lookupError);
          }
        }
        this._markDirty();
        resolve({ id, changes });
      } catch (e) { reject(e); }
    });
  }

  get(query, params = []) {
    return new Promise((resolve, reject) => {
      try {
        const stmt = this.db.prepare(query);
        stmt.bind(this._normalizeParams(params));
        const row = stmt.step() ? stmt.getAsObject() : null;
        stmt.free();
        resolve(row);
      } catch (e) { reject(e); }
    });
  }

  all(query, params = []) {
    return new Promise((resolve, reject) => {
      try {
        const stmt = this.db.prepare(query);
        stmt.bind(this._normalizeParams(params));
        const rows = [];
        while (stmt.step()) rows.push(stmt.getAsObject());
        stmt.free();
        resolve(rows);
      } catch (e) { reject(e); }
    });
  }

  close() {
    return new Promise((resolve) => {
      try { this._flushSync(); } catch {}
      console.log('데이터베이스 연결 종료');
      resolve();
    });
  }

  // Internal utils
  _normalizeParams(params) { return (params || []).map(v => v === undefined ? null : v); }
  _exec(sql) { this.db.run(sql); this._markDirty(); }
  _execBatch(queries) {
    this.db.run('BEGIN');
    try { for (const q of queries) this.db.run(q); this.db.run('COMMIT'); this._markDirty(); }
    catch (e) { try { this.db.run('ROLLBACK'); } catch {} throw e; }
  }
  _markDirty() {
    this._dirty = true;
    clearTimeout(this._flushTimer);
    this._flushTimer = setTimeout(()=>{ try { this._flushSync(); } catch {} }, 300);
  }
  _flushSync() {
    if (!this._dirty || !this.dbPath) return;
    const data = this.db.export();
    fs.mkdirSync(path.dirname(this.dbPath), { recursive: true });
    fs.writeFileSync(this.dbPath, Buffer.from(data));
    this._dirty = false;
  }
}

const database = new Database();
module.exports = database;
