const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcryptjs');
const config = require('../config/server.config.json');

class Database {
  constructor() {
    this.db = null;
  }

  connect() {
    return new Promise((resolve, reject) => {
      const envDb = process.env.DB_FILE || process.env.DB_PATH;
      const isAbs = envDb && require('path').isAbsolute(envDb);
      const dbPath = envDb ? (isAbs ? envDb : path.join(__dirname, '..', envDb)) : path.join(__dirname, '..', config.database.filename);
      console.log('[db] path:', dbPath);
      this.db = new sqlite3.Database(dbPath, (err) => {
        if (err) {
          console.error('???곗씠?곕쿋?댁뒪 ?곌껐 ?ㅽ뙣:', err);
          reject(err);
        } else {
          console.log('???곗씠?곕쿋?댁뒪 ?곌껐 ?깃났');
          this.initialize().then(resolve).catch(reject);
        }
      });
    });
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
        // users ?뚯씠釉?
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
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          is_active BOOLEAN DEFAULT true
        )`,

        // documents ?뚯씠釉?
        `CREATE TABLE IF NOT EXISTS documents (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          title VARCHAR(255) NOT NULL,
          content TEXT NOT NULL,
          type VARCHAR(20) NOT NULL,
          category VARCHAR(50) DEFAULT '湲고?',
          school VARCHAR(100) DEFAULT '?꾩껜',
          grade INTEGER,
          difficulty VARCHAR(20) DEFAULT 'medium',
          worksheet_type VARCHAR(20),
          created_by INTEGER NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          is_active BOOLEAN DEFAULT true,
          FOREIGN KEY (created_by) REFERENCES users(id)
        )`,

        // problems ?뚯씠釉?
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
          is_ai_generated BOOLEAN DEFAULT false,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (document_id) REFERENCES documents(id)
        )`,

        // study_records ?뚯씠釉?
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

        // problem_generations ?뚯씠釉?
        `CREATE TABLE IF NOT EXISTS problem_generations (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          document_id INTEGER NOT NULL,
          problem_type VARCHAR(30) NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id),
          FOREIGN KEY (document_id) REFERENCES documents(id)
        )`,

        // Vocabulary wordbook documents
        `CREATE TABLE IF NOT EXISTS vocabulary_documents (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          title TEXT NOT NULL,
          original_filename TEXT,
          uploaded_by INTEGER,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (uploaded_by) REFERENCES users(id)
        )`,

        // Vocabulary entries extracted from documents
        `CREATE TABLE IF NOT EXISTS vocabulary_entries (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          doc_id INTEGER NOT NULL,
          word TEXT NOT NULL,
          meaning TEXT NOT NULL,
          pos TEXT,
          extra TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (doc_id) REFERENCES vocabulary_documents(id)
        )`,

        // user_badges: earned badges per user
        `CREATE TABLE IF NOT EXISTS user_badges (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          key VARCHAR(64) NOT NULL,
          label VARCHAR(100) NOT NULL,
          emoji VARCHAR(16) NOT NULL,
          earned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(user_id, key),
          FOREIGN KEY (user_id) REFERENCES users(id)
        )`,

        // document_analyses ?뚯씠釉?(臾몄꽌 遺꾩꽍 ???
        `CREATE TABLE IF NOT EXISTS document_analyses (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          document_id INTEGER NOT NULL,
          analysis_type VARCHAR(50) DEFAULT 'comprehensive',
          summary TEXT,
          key_points TEXT,
          vocabulary TEXT,
          grammar_points TEXT,
          study_guide TEXT,
          comprehension_questions TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (document_id) REFERENCES documents(id)
        )`,

        // passage_analyses ?뚯씠釉?(媛쒕퀎 吏臾?遺꾩꽍 ???
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

        // user_groups (for group-based visibility if extended later)
        `CREATE TABLE IF NOT EXISTS user_groups (
          user_id INTEGER NOT NULL,
          group_name TEXT NOT NULL,
          PRIMARY KEY (user_id, group_name),
          FOREIGN KEY (user_id) REFERENCES users(id)
        )`,

        // analysis_group_permissions (link published analysis to allowed groups)
        `CREATE TABLE IF NOT EXISTS analysis_group_permissions (
          analysis_id INTEGER NOT NULL,
          group_name TEXT NOT NULL,
          PRIMARY KEY (analysis_id, group_name),
          FOREIGN KEY (analysis_id) REFERENCES passage_analyses(id)
        )`,

        // view_logs (who/when viewed which analysis)
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

      let completed = 0;
      queries.forEach(query => {
        this.db.run(query, (err) => {
          if (err) {
            console.error('?뚯씠釉??앹꽦 ?ㅽ뙣:', err);
            reject(err);
          } else {
            completed++;
            if (completed === queries.length) {
              console.log('??紐⑤뱺 ?뚯씠釉??앹꽦 ?꾨즺');
              resolve();
            }
          }
        });
      });
    });
  }

  async updateSchema() {
    return new Promise((resolve, reject) => {
      // ?쒖꽌諛곗뿴 臾몄젣??而щ읆 異붽?
      const alterQueries = [
        `ALTER TABLE problems ADD COLUMN main_text TEXT`,
        `ALTER TABLE problems ADD COLUMN sentences TEXT`,
        `ALTER TABLE problems ADD COLUMN metadata TEXT`,
        `ALTER TABLE passage_analyses ADD COLUMN published BOOLEAN DEFAULT 0`,
        `ALTER TABLE passage_analyses ADD COLUMN visibility_scope TEXT DEFAULT 'public'`
      ];

      let completed = 0;
      let errors = 0;

      alterQueries.forEach((query) => {
        this.db.run(query, (err) => {
          if (err) {
            // 而щ읆???대? 議댁옱?섎뒗 寃쎌슦??臾댁떆
            if (err.message.includes('duplicate column name')) {
              console.log('??而щ읆???대? 議댁옱??', query.split(' ADD COLUMN ')[1].split(' ')[0]);
            } else {
              console.error('?ㅽ궎留??낅뜲?댄듃 ?ㅽ뙣:', err);
              errors++;
            }
          } else {
            console.log('??而щ읆 異붽? ?꾨즺:', query.split(' ADD COLUMN ')[1].split(' ')[0]);
          }
          
          completed++;
          if (completed === alterQueries.length) {
            if (errors === 0) {
              console.log('???ㅽ궎留??낅뜲?댄듃 ?꾨즺');
            } else {
              console.log(`?좑툘 ?ㅽ궎留??낅뜲?댄듃 ?꾨즺 (${errors}媛??ㅻ쪟)`);
            }
            resolve();
          }
        });
      });
    });
  }

  async createDefaultAdmin() {
    return new Promise((resolve, reject) => {
      const checkQuery = 'SELECT * FROM users WHERE username = ?';
      
      this.db.get(checkQuery, [config.admin.defaultUsername], async (err, row) => {
        if (err) {
          reject(err);
        } else if (!row) {
          const hashedPassword = await bcrypt.hash(config.admin.defaultPassword, config.auth.saltRounds);
          
          const insertQuery = `
            INSERT INTO users (username, password_hash, email, name, school, grade, role, membership, tier, points)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `;
          
          this.db.run(insertQuery, [
            config.admin.defaultUsername,
            hashedPassword,
            config.admin.defaultEmail,
            '愿由ъ옄',
            'League of English',
            1,
            'admin',
            'premium',
            'Bronze',
            0
          ], (err) => {
            if (err) {
              console.error('愿由ъ옄 怨꾩젙 ?앹꽦 ?ㅽ뙣:', err);
              reject(err);
            } else {
              console.log('??湲곕낯 愿由ъ옄 怨꾩젙 ?앹꽦 ?꾨즺');
              resolve();
            }
          });
        } else {
          resolve();
        }
      });
    });
  }

  // 荑쇰━ ?ㅽ뻾 ?ы띁 硫붿꽌??
  run(query, params = []) {
    return new Promise((resolve, reject) => {
      this.db.run(query, params, function(err) {
        if (err) reject(err);
        else resolve({ id: this.lastID, changes: this.changes });
      });
    });
  }

  get(query, params = []) {
    return new Promise((resolve, reject) => {
      this.db.get(query, params, (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }

  all(query, params = []) {
    return new Promise((resolve, reject) => {
      this.db.all(query, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  close() {
    return new Promise((resolve, reject) => {
      this.db.close((err) => {
        if (err) reject(err);
        else {
          console.log('?뱤 ?곗씠?곕쿋?댁뒪 ?곌껐 醫낅즺');
          resolve();
        }
      });
    });
  }
}

// ?깃????⑦꽩
const database = new Database();
module.exports = database;



