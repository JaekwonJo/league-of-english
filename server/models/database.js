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
      const dbPath = path.join(__dirname, '..', config.database.filename);
      
      this.db = new sqlite3.Database(dbPath, (err) => {
        if (err) {
          console.error('❌ 데이터베이스 연결 실패:', err);
          reject(err);
        } else {
          console.log('✅ 데이터베이스 연결 성공');
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
        // users 테이블
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

        // documents 테이블
        `CREATE TABLE IF NOT EXISTS documents (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          title VARCHAR(255) NOT NULL,
          content TEXT NOT NULL,
          type VARCHAR(20) NOT NULL,
          category VARCHAR(50) DEFAULT '기타',
          school VARCHAR(100) DEFAULT '전체',
          grade INTEGER,
          difficulty VARCHAR(20) DEFAULT 'medium',
          worksheet_type VARCHAR(20),
          created_by INTEGER NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          is_active BOOLEAN DEFAULT true,
          FOREIGN KEY (created_by) REFERENCES users(id)
        )`,

        // problems 테이블
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

        // study_records 테이블
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

        // problem_generations 테이블
        `CREATE TABLE IF NOT EXISTS problem_generations (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          document_id INTEGER NOT NULL,
          problem_type VARCHAR(30) NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id),
          FOREIGN KEY (document_id) REFERENCES documents(id)
        )`,

        // document_analyses 테이블 (문서 분석 저장)
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

        // passage_analyses 테이블 (개별 지문 분석 저장)
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
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (document_id) REFERENCES documents(id),
          UNIQUE(document_id, passage_number)
        )`
      ];

      let completed = 0;
      queries.forEach(query => {
        this.db.run(query, (err) => {
          if (err) {
            console.error('테이블 생성 실패:', err);
            reject(err);
          } else {
            completed++;
            if (completed === queries.length) {
              console.log('✅ 모든 테이블 생성 완료');
              resolve();
            }
          }
        });
      });
    });
  }

  async updateSchema() {
    return new Promise((resolve, reject) => {
      // 순서배열 문제용 컬럼 추가
      const alterQueries = [
        `ALTER TABLE problems ADD COLUMN main_text TEXT`,
        `ALTER TABLE problems ADD COLUMN sentences TEXT`,
        `ALTER TABLE problems ADD COLUMN metadata TEXT`
      ];

      let completed = 0;
      let errors = 0;

      alterQueries.forEach((query) => {
        this.db.run(query, (err) => {
          if (err) {
            // 컬럼이 이미 존재하는 경우는 무시
            if (err.message.includes('duplicate column name')) {
              console.log('✅ 컬럼이 이미 존재함:', query.split(' ADD COLUMN ')[1].split(' ')[0]);
            } else {
              console.error('스키마 업데이트 실패:', err);
              errors++;
            }
          } else {
            console.log('✅ 컬럼 추가 완료:', query.split(' ADD COLUMN ')[1].split(' ')[0]);
          }
          
          completed++;
          if (completed === alterQueries.length) {
            if (errors === 0) {
              console.log('✅ 스키마 업데이트 완료');
            } else {
              console.log(`⚠️ 스키마 업데이트 완료 (${errors}개 오류)`);
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
            '관리자',
            'League of English',
            1,
            'admin',
            'premium',
            'Bronze',
            0
          ], (err) => {
            if (err) {
              console.error('관리자 계정 생성 실패:', err);
              reject(err);
            } else {
              console.log('✅ 기본 관리자 계정 생성 완료');
              resolve();
            }
          });
        } else {
          resolve();
        }
      });
    });
  }

  // 쿼리 실행 헬퍼 메서드
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
          console.log('📊 데이터베이스 연결 종료');
          resolve();
        }
      });
    });
  }
}

// 싱글톤 패턴
const database = new Database();
module.exports = database;