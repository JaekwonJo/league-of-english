// League of English - 메인 서버 파일
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const pdfParse = require('pdf-parse');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const app = express();
const PORT = process.env.PORT || 5000;

// 환경변수 디버깅
console.log('🔍 환경변수 확인:');
console.log('JWT_SECRET:', process.env.JWT_SECRET ? '✅ 설정됨' : '❌ 없음');
console.log('OPENAI_API_KEY:', process.env.OPENAI_API_KEY ? '✅ 설정됨' : '❌ 없음');
console.log('PORT:', process.env.PORT || 5000);

// OpenAI 설정 (API 키가 있을 때만)
let openai = null;
if (process.env.OPENAI_API_KEY) {
  const OpenAI = require('openai');
  openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
  });
  console.log('✅ OpenAI API 키 설정 완료');
} else {
  console.log('⚠️ OpenAI API 키가 없습니다. 규칙 기반 문제만 생성됩니다.');
}

// 미들웨어
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// 파일 업로드 설정
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB 제한
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['application/pdf', 'text/plain'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('PDF 또는 TXT 파일만 업로드 가능합니다.'));
    }
  }
});

// 데이터베이스 초기화
const db = new sqlite3.Database(path.join(__dirname, 'database.db'));
// 테이블 생성
db.serialize(() => {
  // 사용자 테이블
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      school TEXT DEFAULT '샘플학교',
      grade INTEGER DEFAULT 1,
      role TEXT DEFAULT 'student',
      membership TEXT DEFAULT 'free',
      daily_limit INTEGER DEFAULT 30,
      used_today INTEGER DEFAULT 0,
      last_reset_date DATE,
      tier TEXT DEFAULT 'Bronze',
      points INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 문서 테이블
  db.run(`
    CREATE TABLE IF NOT EXISTS documents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      source TEXT,
      type TEXT DEFAULT 'worksheet',
      category TEXT,
      school TEXT DEFAULT '샘플학교',
      grade INTEGER DEFAULT 1,
      created_by INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (created_by) REFERENCES users(id)
    )
  `);

  // 문제 테이블
  db.run(`
    CREATE TABLE IF NOT EXISTS problems (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      document_id INTEGER,
      type TEXT NOT NULL,
      question TEXT NOT NULL,
      options TEXT,
      answer TEXT NOT NULL,
      explanation TEXT,
      difficulty TEXT DEFAULT 'medium',
      points INTEGER DEFAULT 10,
      is_ai_generated BOOLEAN DEFAULT 0,
      source_info TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (document_id) REFERENCES documents(id)
    )
  `);

  // 학습 기록 테이블
  db.run(`
    CREATE TABLE IF NOT EXISTS study_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      problem_id INTEGER NOT NULL,
      is_correct BOOLEAN NOT NULL,
      user_answer TEXT,
      time_spent INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (problem_id) REFERENCES problems(id)
    )
  `);

  // 초기 관리자 계정 생성
  const adminPassword = bcrypt.hashSync('admin123', 10);
  db.run(`
    INSERT OR IGNORE INTO users (username, password, email, name, role, school)
    VALUES (?, ?, ?, ?, ?, ?)
  `, ['admin', adminPassword, 'admin@loe.com', '관리자', 'admin', '샘플학교']);

  console.log('✅ 데이터베이스 초기화 완료');
});

// ==================== API 엔드포인트 ====================

// 회원가입
app.post('/api/register', async (req, res) => {
  const { username, password, email, name, school, grade } = req.body;
  
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    
    db.run(
      `INSERT INTO users (username, password, email, name, school, grade) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [username, hashedPassword, email, name, school || '샘플학교', grade || 1],
      function(err) {
        if (err) {
          if (err.message.includes('UNIQUE')) {
            return res.status(400).json({ error: '이미 존재하는 아이디 또는 이메일입니다.' });
          }
          return res.status(500).json({ error: err.message });
        }
        
        res.json({ 
          success: true, 
          message: '회원가입 성공!',
          userId: this.lastID 
        });
      }
    );
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 로그인
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  
  if (!username || !password) {
    return res.status(400).json({ error: '아이디와 비밀번호를 입력해주세요.' });
  }
  
  if (!process.env.JWT_SECRET) {
    return res.status(500).json({ error: 'JWT 시크릿 키가 설정되지 않았습니다.' });
  }
  
  db.get(
    'SELECT * FROM users WHERE username = ?',
    [username],
    async (err, user) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      
      if (!user) {
        return res.status(401).json({ error: '아이디 또는 비밀번호가 틀렸습니다.' });
      }
      
      try {
        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
          return res.status(401).json({ error: '아이디 또는 비밀번호가 틀렸습니다.' });
        }
        
        const token = jwt.sign(
          { 
            id: user.id, 
            username: user.username, 
            role: user.role 
          },
          process.env.JWT_SECRET,
          { expiresIn: '7d' }
        );
        
        res.json({
          success: true,
          token,
          user: {
            id: user.id,
            username: user.username,
            name: user.name,
            email: user.email,
            role: user.role,
            school: user.school,
            grade: user.grade,
            tier: user.tier,
            points: user.points
          }
        });
      } catch (bcryptError) {
        console.error('비밀번호 검증 오류:', bcryptError);
        return res.status(500).json({ error: '로그인 처리 중 오류가 발생했습니다.' });
      }
    }
  );
});

// JWT 인증 미들웨어
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: '인증이 필요합니다.' });
  }
  
  if (!process.env.JWT_SECRET) {
    return res.status(500).json({ error: 'JWT 시크릿 키가 설정되지 않았습니다.' });
  }
  
  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: '유효하지 않은 토큰입니다.' });
    }
    req.user = user;
    next();
  });
}

// 문서 업로드
app.post('/api/upload-document', authenticateToken, upload.single('file'), async (req, res) => {
  try {
    const { title, category, source } = req.body;
    const file = req.file;
    
    if (!file) {
      return res.status(400).json({ error: '파일이 없습니다.' });
    }
    
    // 🔥 파일명 형식 검증: 학년_책제목_범위.pdf
    const originalName = file.originalname;
    
    // 🔧 한글 인코딩 문제 해결 - Buffer를 올바른 UTF-8로 디코딩
    let decodedName;
    try {
      // Buffer.from을 사용해 올바른 UTF-8 디코딩 시도
      const buffer = Buffer.from(originalName, 'latin1');
      decodedName = buffer.toString('utf8');
      console.log(`🔧 디코딩 시도: ${originalName} -> ${decodedName}`);
    } catch (error) {
      decodedName = originalName;
      console.log(`⚠️ 디코딩 실패, 원본 사용: ${originalName}`);
    }
    
    const nameWithoutExt = decodedName.replace(/\.(pdf|txt)$/i, '');
    const nameParts = nameWithoutExt.split('_');
    
    console.log(`🔍 [파일명 검증] 원본 파일명: ${originalName}`);
    console.log(`🔍 [파일명 검증] 디코딩된 파일명: ${decodedName}`);
    console.log(`🔍 [파일명 검증] 분리된 부분: ${nameParts.join(' | ')}`);
    
    if (nameParts.length !== 3) {
      return res.status(400).json({ 
        error: '파일명 형식이 잘못되었습니다. 올바른 형식: "학년_책제목_범위.pdf"\n예시: "고1_올림포스2_2학기중간고사.pdf"' 
      });
    }
    
    const [grade, bookTitle, range] = nameParts;
    
    // 학년 검증 (고1, 고2, 고3) - 인코딩 문제 고려
    const isValidGrade = grade.includes('1') || grade.includes('2') || grade.includes('3');
    const hasGradePattern = grade.includes('고') || grade.includes('ê³');
    
    if (!isValidGrade || !hasGradePattern) {
      return res.status(400).json({ 
        error: '학년은 "고1", "고2", "고3" 형식이어야 합니다.\n현재: ' + grade + '\n디코딩된 이름: ' + decodedName
      });
    }
    
    // 책제목과 범위가 비어있지 않은지 검증
    if (!bookTitle.trim() || !range.trim()) {
      return res.status(400).json({ 
        error: '책제목과 범위는 비어있을 수 없습니다.\n책제목: ' + bookTitle + ', 범위: ' + range 
      });
    }
    
    console.log(`✅ 파일명 검증 통과: ${grade} | ${bookTitle} | ${range}`);
    
    if (!title || !category || !source) {
      return res.status(400).json({ error: '제목, 카테고리, 출처를 모두 입력해주세요.' });
    }
    
    let content = '';
    
    // 파일 타입에 따른 처리
    if (file.mimetype === 'application/pdf') {
      const pdfBuffer = fs.readFileSync(file.path);
      const pdfData = await pdfParse(pdfBuffer);
      content = cleanPDFText(pdfData.text);
    } else {
      content = fs.readFileSync(file.path, 'utf-8');
    }
    
    // 한글 제거 (영어 지문만 추출)
    console.log('📄 원본 텍스트 길이:', content.length);
    console.log('📄 원본 텍스트 미리보기:', content.substring(0, 200));
    
    content = removeKoreanText(content);
    
    console.log('✅ 처리 후 텍스트 길이:', content.length);
    console.log('✅ 처리 후 텍스트 미리보기:', content.substring(0, 200));
    
    if (!content || content.length < 30) {  // 100 → 30으로 완화
      // 파일 삭제 후 에러 반환
      if (fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }
      console.error('❌ 추출된 텍스트가 너무 짧습니다:', content.length, '자');
      return res.status(400).json({ error: '유효한 영어 텍스트를 찾을 수 없습니다. (추출된 텍스트: ' + content.length + '자)' });
    }
    
    // 현재 사용자 정보 가져오기
    db.get('SELECT school FROM users WHERE id = ?', [req.user.id], (err, user) => {
      if (err) {
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
        return res.status(500).json({ error: '사용자 정보를 가져오는데 실패했습니다.' });
      }
      
      // 데이터베이스에 저장
      db.run(
        `INSERT INTO documents (title, content, source, category, school, created_by) 
         VALUES (?, ?, ?, ?, ?, ?)`,
        [title, content, source, category, user ? user.school : '샘플학교', req.user.id],
        function(err) {
          if (err) {
            if (fs.existsSync(file.path)) {
              fs.unlinkSync(file.path);
            }
            return res.status(500).json({ error: err.message });
          }
          
          // 파일 삭제
          if (fs.existsSync(file.path)) {
            fs.unlinkSync(file.path);
          }
          
          res.json({
            success: true,
            message: '문서 업로드 성공!',
            documentId: this.lastID
          });
        }
      );
    });
  } catch (error) {
    // 에러 발생 시 파일 정리
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ error: error.message });
  }
});

// 문서 목록 조회
app.get('/api/documents', authenticateToken, (req, res) => {
  // 사용자 정보를 먼저 가져와서 school 정보 확인
  db.get('SELECT school FROM users WHERE id = ?', [req.user.id], (err, user) => {
    if (err) {
      return res.status(500).json({ error: '사용자 정보를 가져오는데 실패했습니다.' });
    }
    
    const query = req.user.role === 'admin' 
      ? 'SELECT * FROM documents ORDER BY created_at DESC'
      : 'SELECT * FROM documents WHERE school = ? ORDER BY created_at DESC';
    
    const params = req.user.role === 'admin' ? [] : [user ? user.school : '샘플학교'];
    
    db.all(query, params, (err, documents) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json({ documents: documents || [] });
    });
  });
});

// 문서 삭제 (관리자만)
app.delete('/api/documents/:id', authenticateToken, (req, res) => {
  // 관리자 권한 확인
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: '관리자 권한이 필요합니다.' });
  }

  const docId = req.params.id;
  
  // 먼저 문서 존재 확인
  db.get('SELECT * FROM documents WHERE id = ?', [docId], (err, doc) => {
    if (err) {
      return res.status(500).json({ error: '문서 조회 실패' });
    }
    if (!doc) {
      return res.status(404).json({ error: '문서를 찾을 수 없습니다.' });
    }
    
    // 문서 삭제
    db.run('DELETE FROM documents WHERE id = ?', [docId], function(err) {
      if (err) {
        return res.status(500).json({ error: '문서 삭제 실패' });
      }
      
      console.log(`✅ 문서 삭제 완료: ID ${docId}, 제목: ${doc.title}`);
      res.json({ success: true, message: '문서가 삭제되었습니다.' });
    });
  });
});

// 스마트 문제 가져오기 (핵심 기능)
app.post('/api/get-smart-problems', authenticateToken, async (req, res) => {
  try {
    const { 
      documentId, 
      problemCount = 10, 
      problemTypes,
      difficulty = 'medium'
    } = req.body;
    
    // 문서 가져오기
    db.get(
      'SELECT * FROM documents WHERE id = ?',
      [documentId],
      async (err, document) => {
        if (err || !document) {
          return res.status(404).json({ error: '문서를 찾을 수 없습니다.' });
        }
        
        const problems = [];
        const passages = parsePassages(document.content, document.source);
        
        // 🔥 DEBUG: parsePassages 결과 확인
        console.log(`🔍 [DEBUG] parsePassages 결과:`);
        console.log(`   - passages.length: ${passages ? passages.length : 'undefined'}`);
        console.log(`   - passages 타입: ${typeof passages}`);
        console.log(`   - passages 내용:`, passages);
        
        // 지문이 없으면 오류 반환
        if (!passages || passages.length === 0) {
          console.error('❌ 지문 파싱 실패: 사용 가능한 지문이 없습니다.');
          return res.status(400).json({ 
            error: '이 문서에서 영어 지문을 추출할 수 없습니다. 문서 형식을 확인해주세요.' 
          });
        }
        
        console.log(`✅ 총 ${passages.length}개 지문으로 문제 생성 시작`);
        
        // 각 유형별로 문제 생성 (중복 방지)
        let passageIndex = 0;
        
        for (const [type, count] of Object.entries(problemTypes || {})) {
          if (count > 0) {
            console.log(`🎯 ${type} 문제 ${count}개 생성 시작`);
            
            for (let i = 0; i < count; i++) {
              // 각 문제마다 다른 지문 사용 (순환)
              const passage = passages[passageIndex % passages.length];
              passageIndex++; // 다음 지문으로 이동
              
              // 각 문제에 고유한 타임스탬프와 랜덤 값으로 완전 고유 ID 생성
              const uniqueId = `${type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}_${i}`;
              
              // 규칙 기반 문제 (순서배열, 문장삽입)
              if (type === 'order' || type === 'insertion') {
                const problem = generateRuleBasedProblem(type, passage, difficulty, uniqueId);
                if (problem) {
                  problem.id = uniqueId;
                  problems.push(problem);
                  console.log(`✅ ${type} 문제 생성 완료 (ID: ${uniqueId}): ${problem.source}`);
                } else {
                  console.log(`❌ ${type} 문제 생성 실패 - 다른 지문으로 재시도`);
                  // 다른 지문으로 재시도 (완전 새로운 ID)
                  const retryId = `${type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}_retry_${i}`;
                  const nextPassage = passages[(passageIndex) % passages.length];
                  passageIndex++;
                  const retryProblem = generateRuleBasedProblem(type, nextPassage, difficulty, retryId);
                  if (retryProblem) {
                    retryProblem.id = retryId;
                    problems.push(retryProblem);
                    console.log(`✅ ${type} 문제 재시도 성공 (ID: ${retryId}): ${retryProblem.source}`);
                  }
                }
              } 
              // AI 생성 문제
              else {
                try {
                  const problem = await generateAIProblem(type, passage, difficulty, uniqueId);
                  if (problem) {
                    problem.id = uniqueId;
                    problems.push(problem);
                    console.log(`✅ AI ${type} 문제 생성 완료 (ID: ${uniqueId})`);
                  }
                } catch (error) {
                  console.log(`❌ AI ${type} 문제 생성 실패:`, error.message);
                }
              }
            }
          }
        }
        
        res.json({
          success: true,
          problems: problems
        });
      }
    );
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 답안 제출 및 채점
app.post('/api/submit-answer', authenticateToken, (req, res) => {
  const { problemId, userAnswer, timeSpent } = req.body;
  
  db.get(
    'SELECT * FROM problems WHERE id = ?',
    [problemId],
    (err, problem) => {
      if (err || !problem) {
        return res.status(404).json({ error: '문제를 찾을 수 없습니다.' });
      }
      
      const isCorrect = userAnswer === problem.answer;
      const points = isCorrect ? problem.points : 0;
      
      // 학습 기록 저장
      db.run(
        `INSERT INTO study_records (user_id, problem_id, is_correct, user_answer, time_spent)
         VALUES (?, ?, ?, ?, ?)`,
        [req.user.id, problemId, isCorrect ? 1 : 0, userAnswer, timeSpent],
        (err) => {
          if (err) {
            return res.status(500).json({ error: err.message });
          }
          
          // 포인트 업데이트
          if (isCorrect) {
            db.run(
              'UPDATE users SET points = points + ? WHERE id = ?',
              [points, req.user.id]
            );
          }
          
          res.json({
            success: true,
            isCorrect,
            correctAnswer: problem.answer,
            explanation: problem.explanation,
            pointsEarned: points
          });
        }
      );
    }
  );
});

// 통계 조회
app.get('/api/stats', authenticateToken, (req, res) => {
  db.get(
    `SELECT 
      COUNT(*) as totalProblems,
      SUM(is_correct) as correctCount,
      AVG(time_spent) as avgTime
     FROM study_records 
     WHERE user_id = ?`,
    [req.user.id],
    (err, stats) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json(stats);
    }
  );
});

// ==================== 헬퍼 함수들 ====================

// PDF 텍스트 정리
function cleanPDFText(text) {
  return text
    .replace(/Page \d+/g, '')
    .replace(/\s+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// 🚀 개선된 PDF 파싱 시스템 (왼쪽 영어, 오른쪽 한글 분리)
function removeKoreanText(text) {
  console.log('📚 PDF 문서 파싱 시작...');
  
  // 0단계: 한 줄로 붙어있는 텍스트를 문제 번호 기준으로 분리
  console.log('🔧 텍스트 전처리: 한 줄 텍스트를 문제 번호로 분리');
  
  // 문제 번호 패턴으로 분리 (숫자. p숫자-no.숫자)
  const processedText = text
    .replace(/(\d{1,2}\.\s*p\d+-no\.\d+)/g, '\n$1')  // 문제 번호 앞에 줄바꿈 추가
    .replace(/([.!?])\s+([A-Z])/g, '$1\n$2')  // 문장 끝 후 대문자로 시작하는 새 문장
    .replace(/([가-힣]{10,})\s*([A-Z])/g, '$1\n$2');  // 긴 한글 텍스트 후 영어
  
  console.log('✅ 전처리 후 텍스트 길이:', processedText.length);
  
  // 1단계: 문서 제목 추출 (더 유연하게)  
  const lines = processedText.split('\n');
  let documentTitle = '';
  
  // 제목 패턴 확장 - 더 많은 패턴 지원
  for (let i = 0; i < Math.min(15, lines.length); i++) {
    const line = lines[i].trim();
    
    // 다양한 제목 패턴 감지
    if (/하루\d+개|고\d_\d{4}|올림포스\d?|인제고|모의고사|인천시|\d{4}년|\d+월|영어|읽기영역|문제지|본문해석/.test(line)) {
      documentTitle = line;
      console.log(`📖 문서 제목 발견: ${documentTitle}`);
      break;
    }
  }
  
  // 2단계: 영어 지문 추출 - 더 똑똑한 분리 로직
  const englishSections = [];
  let currentProblemNumber = 0;
  
  console.log('🔍 문제 번호 패턴 검색 시작...');
  console.log(`📝 총 라인 수: ${lines.length}개`);
  
  // 문제 번호 패턴 찾기 (더 포괄적으로 개선)
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // 각 라인 디버깅 (처음 20줄만)
    if (i < 20) {
      console.log(`Line ${i}: "${line}"`);
    }
    
    // 다양한 문제 번호 패턴 감지
    let problemMatch = null;
    
    // 패턴 1: 워크시트메이커 "1. p2-no.20", "2. p3-no.21"
    const worksheetMatch = line.match(/^(\d{1,2})\.\s*p\d+-no\.(\d{1,2})/);
    if (worksheetMatch) {
      // 워크시트메이커에서는 실제 문제 번호(no.20)를 사용
      problemMatch = [worksheetMatch[0], worksheetMatch[2]]; // [전체매치, 실제문제번호]
      console.log(`📝 워크시트메이커 패턴 감지: "${line}" → 문제 ${worksheetMatch[2]}번`);
    }
    else {
      // 패턴 2: "18번", "19번" 
      problemMatch = line.match(/^(\d{1,2})\s*번/);
      if (!problemMatch) {
        // 패턴 3: "18.", "19."
        problemMatch = line.match(/^(\d{1,2})\.\s*/);
      }
      if (!problemMatch) {
        // 패턴 4: "18 ", "19 " (숫자 뒤 공백)
        problemMatch = line.match(/^(\d{1,2})\s+/);
      }
      if (!problemMatch) {
        // 패턴 5: 라인이 숫자로만 구성 (18, 19)
        problemMatch = line.match(/^(\d{1,2})$/);
      }
      if (!problemMatch && line.length <= 3) {
        // 패턴 6: 매우 짧은 라인에서 숫자 찾기
        problemMatch = line.match(/(\d{1,2})/);
      }
    }
    
    if (problemMatch) {
      const detectedNumber = parseInt(problemMatch[1]);
      
      // 유효한 문제 번호인지 검증 (1-50 사이)
      if (detectedNumber >= 1 && detectedNumber <= 50) {
        currentProblemNumber = detectedNumber.toString();
        console.log(`🎯 문제 ${currentProblemNumber}번 발견 (패턴: "${line}")`);
        
        // 해당 문제의 영어 지문 추출
        const englishText = extractEnglishFromProblem(lines, i, currentProblemNumber);
        if (englishText && englishText.length > 30) {  // 50 → 30으로 완화
          englishSections.push({
            number: currentProblemNumber,
            source: `${documentTitle} - 문제 ${currentProblemNumber}번`,
            content: englishText
          });
          console.log(`✅ 문제 ${currentProblemNumber}번 영어 지문 추출 완료 (${englishText.length}자)`);
          console.log(`   미리보기: ${englishText.substring(0, 80)}...`);
        } else {
          console.log(`⚠️ 문제 ${currentProblemNumber}번 지문이 너무 짧음 (${englishText ? englishText.length : 0}자)`);
        }
      }
    }
  }
  
  // 3단계: 일반적인 영어 라인 추출 (문제 번호가 없는 경우)
  if (englishSections.length === 0) {
    console.log('⚠️ 문제 번호 패턴을 찾을 수 없어 일반 영어 추출 모드 실행');
    
    const allEnglishLines = [];
    for (const line of lines) {
      if (isAdvancedEnglishLine(line)) {
        // 한글이 섞인 라인에서 영어 부분만 추출
        const englishOnly = extractEnglishFromMixedLine(line);
        if (englishOnly.length > 10) {
          allEnglishLines.push(englishOnly);
        }
      }
    }
    
    // 연속된 영어 라인들을 그룹화
    const groups = groupConsecutiveEnglishLines(allEnglishLines);
    groups.forEach((group, index) => {
      if (group.length > 2) { // 최소 3줄 이상
        const combinedText = group.join(' ').trim();
        if (combinedText.length > 100) {
          englishSections.push({
            number: index + 1,
            source: `${documentTitle} - 지문 ${index + 1}`,
            content: combinedText
          });
        }
      }
    });
  }
  
  // 4단계: 최종 결과 생성
  if (englishSections.length === 0) {
    console.log('❌ 유효한 영어 지문을 찾을 수 없습니다');
    return '';
  }
  
  const result = englishSections.map(section => 
    `[출처: ${section.source}]\n${section.content}`
  ).join('\n\n');
  
  console.log(`📊 최종 PDF 파싱 결과:`);
  console.log(`   문서 제목: ${documentTitle}`);
  console.log(`   추출된 지문 수: ${englishSections.length}개`);
  console.log(`   총 텍스트 길이: ${result.length}자`);
  
  return result;
}

// 📖 특정 문제에서 영어 지문 추출하는 함수
function extractEnglishFromProblem(lines, startIndex, problemNumber) {
  const englishLines = [];
  let nextProblemIndex = -1;
  
  // 다음 문제 번호 찾기 (워크시트메이커 패턴 포함)
  for (let i = startIndex + 1; i < lines.length; i++) {
    const line = lines[i].trim();
    let nextProblemMatch = null;
    
    // 워크시트메이커 패턴: "2. p3-no.21"
    nextProblemMatch = line.match(/^(\d{1,2})\.\s*p\d+-no\.(\d{1,2})/);
    if (nextProblemMatch) {
      const nextProblemNum = nextProblemMatch[2];
      if (nextProblemNum != problemNumber) {
        nextProblemIndex = i;
        break;
      }
    }
    
    // 일반적인 패턴: "18번", "19.", "20 "
    if (!nextProblemMatch) {
      nextProblemMatch = line.match(/^(\d{1,2})(?:번?|\.|\s)/);
      if (nextProblemMatch && nextProblemMatch[1] != problemNumber) {
        nextProblemIndex = i;
        break;
      }
    }
  }
  
  // 문제 범위 내에서 영어 라인 추출 (한글 제거)
  const endIndex = nextProblemIndex > 0 ? nextProblemIndex : lines.length;
  for (let i = startIndex + 1; i < endIndex; i++) {
    const line = lines[i].trim();
    if (isAdvancedEnglishLine(line)) {
      // 한글이 섞인 라인에서 영어 부분만 추출
      const englishOnly = extractEnglishFromMixedLine(line);
      if (englishOnly.length > 10) {  // 최소 길이 조건
        englishLines.push(englishOnly);
      }
    }
  }
  
  return englishLines.join(' ').trim();
}

// 🔍 영어 부분만 추출하는 함수 (한글 해석지용)
function extractEnglishFromMixedLine(line) {
  const trimmed = line.trim();
  
  // 영어 부분만 추출 (한글, 한글 부호 제거)
  const englishOnly = trimmed
    .replace(/[가-힣ㄱ-ㅎㅏ-ㅣ]/g, ' ')  // 한글 → 공백
    .replace(/[""''「」『』〈〉《》【】]/g, ' ')  // 한글 부호 → 공백
    .replace(/\s+/g, ' ')  // 연속 공백 → 단일 공백
    .trim();
  
  return englishOnly;
}

// 🔍 극도로 강화된 영어 라인 감지 (수정된 버전)
function isAdvancedEnglishLine(line) {
  const trimmed = line.trim();
  
  // 1차: 기본 조건
  if (trimmed.length < 5) return false;
  
  // 2차: 영어 부분만 추출
  const englishPart = extractEnglishFromMixedLine(trimmed);
  if (englishPart.length < 5) return false;
  
  // 3차: PDF 메타데이터 제거 - 더 포괄적으로
  if (/^[\d\s\-=_+*~`!@#$%^&|\\;:'"<>,.?\/\(\)\[\]【】「」『』〈〉《》\{\}]+$/.test(trimmed)) return false;
  if (/^Page\s+\d+|^\d+\s*\/\s*\d+|^\d{4}-\d{2}-\d{2}|^Date:|^Time:|^고\d|^문제|^번호/i.test(trimmed)) return false;
  
  // 3차: 영어 단어 개수 체크 (영어 부분에서)
  const englishWords = (englishPart.match(/\b[a-zA-Z]{2,}\b/g) || []);
  if (englishWords.length < 2) return false;
  
  // 4차: 기본 영어 단어 포함 여부
  const hasBasicWords = /\b(the|and|or|but|in|on|at|to|for|of|with|by|from|a|an|this|that|these|those|is|are|was|were|have|has|had|will|would|can|could|may|might|should|must|do|does|did|get|got|make|made|take|took|come|came|go|went|see|saw|know|knew|think|thought|say|said|tell|told|give|gave|one|two|three|first|second|third|people|person|time|work|life|way|day|man|woman|child|world|school|place|hand|part|case|fact|group|number|point|government|company)\b/i.test(englishPart);
  
  // 5차: 숫자로만 이루어진 라인 제외
  if (/^\d+[\s\d\-.,]*$/.test(englishPart)) return false;
  
  // 최종 판단: 영어 단어가 있고, 기본 단어가 포함되어 있거나 충분한 길이
  return (hasBasicWords || englishWords.length >= 3 || englishPart.length >= 20);
}

// 📝 연속된 영어 라인들을 그룹화하는 함수
function groupConsecutiveEnglishLines(lines) {
  const groups = [];
  let currentGroup = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    if (currentGroup.length === 0) {
      currentGroup.push(line);
    } else {
      // 이전 라인과 연관성 체크
      const prevLine = currentGroup[currentGroup.length - 1];
      if (linesAreRelated(prevLine, line)) {
        currentGroup.push(line);
      } else {
        // 새 그룹 시작
        if (currentGroup.length > 0) {
          groups.push([...currentGroup]);
        }
        currentGroup = [line];
      }
    }
  }
  
  if (currentGroup.length > 0) {
    groups.push(currentGroup);
  }
  
  return groups;
}

// 🔗 두 라인이 연관성이 있는지 체크
function linesAreRelated(line1, line2) {
  // 문장이 완결되지 않았거나 연결어로 시작하는 경우
  if (!line1.trim().match(/[.!?]$/)) return true;
  if (/^(and|or|but|so|because|however|therefore|moreover|furthermore|in addition|for example|for instance)/i.test(line2.trim())) return true;
  
  // 공통 키워드가 있는 경우
  const words1 = line1.toLowerCase().match(/\b[a-z]{3,}\b/g) || [];
  const words2 = line2.toLowerCase().match(/\b[a-z]{3,}\b/g) || [];
  const commonWords = words1.filter(word => words2.includes(word));
  
  return commonWords.length >= 2;
}

// 📝 출처에서 Unit/Day 정보 추출
function extractUnitFromSource(source) {
  if (!source) return null;
  
  // Day 패턴 찾기
  const dayMatch = source.match(/Day\s*(\d+)/i);
  if (dayMatch) return `Day ${dayMatch[1]}`;
  
  // Unit 패턴 찾기  
  const unitMatch = source.match(/Unit\s*(\d+)/i);
  if (unitMatch) return `Unit ${unitMatch[1]}`;
  
  // p. 패턴 찾기
  const pageMatch = source.match(/p\.?\s*(\d+)/i);
  if (pageMatch) return `p.${pageMatch[1]}`;
  
  return null;
}

// 🔢 출처에서 문제번호 추출
function extractProblemNumberFromSource(source) {
  if (!source) return null;
  
  // "- 18번", "- 19번" 패턴 찾기
  const numberMatch = source.match(/(\d+)번/);
  if (numberMatch) return `${numberMatch[1]}번`;
  
  // "no.1", "no.2" 패턴 찾기
  const noMatch = source.match(/no\.?\s*(\d+)/i);
  if (noMatch) return `문제 ${noMatch[1]}`;
  
  return null;
}

// 🔍 영어 라인인지 판단하는 헬퍼 함수
function isEnglishLine(line) {
  const trimmed = line.trim();
  
  // 길이 체크
  if (trimmed.length < 10) return false;
  
  // 한글 체크 - 하나라도 있으면 제외
  if (/[가-힣ㄱ-ㅎㅏ-ㅣ]/.test(trimmed)) return false;
  
  // 숫자나 특수문자만 있는 라인 제외
  if (/^\s*[\d\-=_+*~`!@#$%^&|\\;:'"<>,.?\/\s\(\)\[\]【】「」『』〈〉《》]+$/.test(trimmed)) return false;
  
  // 영어 단어 개수 체크
  const englishWords = (trimmed.match(/\b[a-zA-Z]+\b/g) || []);
  if (englishWords.length < 3) return false;
  
  // 영어 비율 체크
  const englishChars = (trimmed.match(/[a-zA-Z]/g) || []).length;
  const totalChars = trimmed.replace(/\s/g, '').length;
  const englishRatio = totalChars > 0 ? englishChars / totalChars : 0;
  
  return englishRatio >= 0.8;
}

// 🚀 워크시트메이커 지문 파싱 (정형화된 형식)
function parsePassages(content, source) {
  console.log('📖 [DEBUG] parsePassages 함수 호출됨 - 올림포스 PDF 지문 파싱 시작...');
  console.log('📖 [DEBUG] content 길이:', content.length);
  console.log('📖 [DEBUG] source:', source);
  const passages = [];
  
  // 1. p.XX 패턴으로 분리 (p.32 수능 ANALYSIS, p.34 no.01 등)
  console.log('🔍 p.숫자 패턴 검색 중...');
  
  // 🔧 다양한 형식 모두 지원: 
  // - "Day 11 1. p54~56-no.1" (하루6개1등급 형식)
  // - "1. p2-no.20" (24년9월모의고사 형식)  
  // - "1. p32-수능 대비 ANALYSIS" (올림포스 형식)
  // 더 간단하고 포괄적인 패턴 사용
  const pageMatches = [...content.matchAll(/(\d+)\.\s*p([\d\~\-]+)(?:-no\.(\d+)|[-\s]*([^\n]+))?/gim)];
  console.log(`📋 발견된 페이지 패턴: ${pageMatches.length}개`);
  
  // 디버깅용: 처음 500자 확인 (줄바꿈 포함)
  console.log(`🔍 Content 처음 500자:`, content.substring(0, 500));
  console.log(`🔍 줄바꿈 확인:`, content.substring(0, 200).includes('\n') ? '줄바꿈 있음' : '줄바꿈 없음');
  
  // 실제 줄별로 보기 (처음 5줄)
  const lines = content.split('\n');
  console.log(`🔍 전체 줄 수: ${lines.length}`);
  console.log(`🔍 처음 5줄:`, lines.slice(0, 5));
  
  if (pageMatches.length > 0) {
    pageMatches.forEach((match, idx) => {
      console.log(`  매치 ${idx + 1}: "${match[0]}" -> ${match[1] || 'Day'} p.${match[2]} ${match[3]}`);
    });
  }
  
  if (pageMatches.length > 0) {
    // Single match일 때도 처리하기 위해 조건 변경
    for (let i = 0; i < pageMatches.length; i++) {
      const currentMatch = pageMatches[i];
      const problemNum = currentMatch[1];       // 1, 2, 3, etc.
      const pageInfo = currentMatch[2];         // 페이지 번호 (54~56, 2, 32 등)
      const noNumber = currentMatch[3] || '';   // no.뒤의 번호 (있으면)
      const additionalInfo = (currentMatch[4] || '').trim(); // 추가 정보 (수능 대비 ANALYSIS 등)
      
      // 🔧 출처 정보를 간결하게 생성 (중복 제거)
      let simpleSource = `p${pageInfo}`;
      if (noNumber) {
        simpleSource += `-no.${noNumber}`;
      } else if (additionalInfo && !additionalInfo.startsWith('-')) {
        // 추가 정보가 있고 '-'로 시작하지 않을 때만 추가
        const cleanInfo = additionalInfo.replace(/^[-\s]+/, '').trim();
        if (cleanInfo) {
          simpleSource += `-${cleanInfo}`;
        }
      }
      
      console.log(`🔧 [DEBUG] 파싱 중 - problemNum: ${problemNum}, pageInfo: "${pageInfo}", simpleSource: "${simpleSource}"`);
      
      // 현재 페이지부터 다음 페이지까지의 내용 추출
      const startIndex = currentMatch.index;
      const endIndex = i < pageMatches.length - 1 
        ? pageMatches[i + 1].index 
        : content.length;
      
      let pageContent = content.substring(startIndex, endIndex);
      
      // 첫 줄(페이지 정보) 제거
      pageContent = pageContent.replace(currentMatch[0], '').trim();
      
      // 영어 지문만 추출 (한글 제거)
      const englishLines = pageContent.split('\n').filter(line => {
        const cleaned = line.trim();
        // 영어 비율이 70% 이상인 라인만 선택
        if (cleaned.length < 10) return false;
        const englishCount = (cleaned.match(/[a-zA-Z]/g) || []).length;
        const englishRatio = englishCount / cleaned.length;
        return englishRatio > 0.7 && !/[가-힣]/.test(cleaned);
      });
      
      const englishContent = englishLines.join(' ').trim();
      const wordCount = (englishContent.match(/\b[a-zA-Z]+\b/g) || []).length;
      
      if (englishContent.length >= 100 && wordCount >= 30) {
        passages.push({
          text: englishContent,
          source: simpleSource, // 간결한 형태: "p54~56-no.1"
          sourceInfo: simpleSource,
          number: passages.length + 1,
          pageInfo: pageInfo,
          problemNumber: problemNum
        });
        
        console.log(`✅ 지문 ${passages.length}: ${simpleSource}`);
        console.log(`   단어 수: ${wordCount}개, 길이: ${englishContent.length}자`);
        console.log(`   미리보기: ${englishContent.substring(0, 80)}...`);
      } else {
        console.log(`❌ 지문 제외: ${simpleSource} (단어 ${wordCount}개, 길이 ${englishContent.length}자)`);
      }
    }
  }
  
  // 2. 숫자. 패턴으로 추가 분리 시도
  if (passages.length < 5) {
    console.log('🔍 숫자. 패턴으로 추가 검색 중...');
    
    const numberMatches = [...content.matchAll(/^\s*(\d{1,2})\.\s*([^\n]*)/gm)];
    console.log(`📋 발견된 숫자 패턴: ${numberMatches.length}개`);
    
    for (let i = 0; i < numberMatches.length; i++) {
      const currentMatch = numberMatches[i];
      const problemNum = currentMatch[1];
      const description = currentMatch[2].trim();
      
      const startIndex = currentMatch.index;
      const endIndex = i < numberMatches.length - 1 
        ? numberMatches[i + 1].index 
        : content.length;
      
      let problemContent = content.substring(startIndex, endIndex);
      problemContent = problemContent.replace(currentMatch[0], '').trim();
      
      // 영어 지문만 추출
      const englishLines = problemContent.split('\n').filter(line => {
        const cleaned = line.trim();
        if (cleaned.length < 10) return false;
        const englishCount = (cleaned.match(/[a-zA-Z]/g) || []).length;
        const englishRatio = englishCount / cleaned.length;
        return englishRatio > 0.7 && !/[가-힣]/.test(cleaned);
      });
      
      const englishContent = englishLines.join(' ').trim();
      const wordCount = (englishContent.match(/\b[a-zA-Z]+\b/g) || []).length;
      
      if (englishContent.length >= 100 && wordCount >= 30) {
        // 중복 방지
        const isDuplicate = passages.some(p => 
          p.text.substring(0, 100) === englishContent.substring(0, 100)
        );
        
        if (!isDuplicate) {
          passages.push({
            text: englishContent,
            source: `문제 ${problemNum}번 - ${description}`,
            sourceInfo: `${problemNum}번 문제 - ${description}`,
            number: passages.length + 1,
            problemNumber: problemNum,
            description: description
          });
          
          console.log(`✅ 추가 지문 ${passages.length}: 문제 ${problemNum}번`);
        }
      }
    }
  }
  
  // 3. 마지막 수단: 큰 영어 블록으로 분리
  if (passages.length < 3) {
    console.log('🔍 큰 영어 블록으로 분리 시도...');
    
    const bigBlocks = content.split(/\n\s*\n/);
    bigBlocks.forEach((block, index) => {
      const cleaned = block.trim();
      const englishCount = (cleaned.match(/[a-zA-Z]/g) || []).length;
      const englishRatio = englishCount / cleaned.length;
      const wordCount = (cleaned.match(/\b[a-zA-Z]+\b/g) || []).length;
      
      if (cleaned.length >= 200 && wordCount >= 50 && englishRatio > 0.8 && !/[가-힣]/.test(cleaned)) {
        const isDuplicate = passages.some(p => 
          p.text.substring(0, 100) === cleaned.substring(0, 100)
        );
        
        if (!isDuplicate) {
          passages.push({
            text: cleaned,
            source: `지문 ${passages.length + 1}`,
            sourceInfo: `지문 ${passages.length + 1}`,
            number: passages.length + 1
          });
          
          console.log(`✅ 블록 지문 ${passages.length}: ${wordCount}개 단어`);
        }
      }
    });
  }
  
  console.log(`📊 최종 지문 파싱 결과: ${passages.length}개 지문 생성`);
  return passages;
}

// 정규표현식 특수문자 이스케이프 헬퍼 함수
function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// 🚀 수능 형식 문제 생성 (순서배열, 문장삽입)
function generateRuleBasedProblem(type, passage, difficulty, problemId = null) {
  // 🔥 DEBUG: passage 검증
  console.log(`🔍 [DEBUG] generateRuleBasedProblem 호출됨:`);
  console.log(`   - type: ${type}`);
  console.log(`   - passage:`, passage);
  console.log(`   - passage.text 존재: ${passage && passage.text ? 'YES' : 'NO'}`);
  
  // passage 또는 passage.text가 없는 경우 에러 처리
  if (!passage || !passage.text) {
    console.error('❌ generateRuleBasedProblem: passage 또는 passage.text가 없습니다.');
    console.error('   - passage:', passage);
    return null;
  }
  
  const allSentences = passage.text.match(/[^.!?]+[.!?]+/g) || [];
  
  // 🔥 한글이 포함된 문장은 완전히 제외하고 문장 정제 (더 관대한 조건으로 변경)
  const sentences = allSentences
    .filter(sentence => {
      const cleanSent = sentence.trim();
      
      // 한글 체크
      if (/[가-힣ㄱ-ㅎㅏ-ㅣ]/.test(cleanSent)) return false;
      
      // 영어 단어 최소 5개 체크 (조건 완화)
      const wordCount = (cleanSent.match(/\b[a-zA-Z]+\b/g) || []).length;
      if (wordCount < 5) return false;
      
      // 문장 길이 체크 (최소 25자 이상, 조건 완화)
      if (cleanSent.length < 25) return false;
      
      return true;
    })
    .map(s => s.trim()); // slice 제거: 모든 문장 사용!
  
  console.log(`📝 문제 생성용 문장: 전체 ${allSentences.length}개 → 필터링 후 ${sentences.length}개`);
  
  if (sentences.length < 3) {
    console.log(`❌ 유효한 문장이 부족합니다 (${sentences.length}개)`);
    return null;
  }
  
  if (type === 'order') {
    // 🎯 수능 순서배열 문제 형식 - 전체 원문 사용!!
    console.log(`📚 순서배열 문제 생성 시작 - 난이도: ${difficulty}`);
    console.log(`📝 전체 문장 수: ${sentences.length}개`);
    
    // 난이도별 배열 문장 개수 설정
    let arrangeSentenceCount;
    if (difficulty === 'basic') {
      arrangeSentenceCount = 3;  // 기본: A, B, C
    } else if (difficulty === 'medium') {
      arrangeSentenceCount = 4;  // 중급: A, B, C, D
    } else {
      arrangeSentenceCount = 5;  // 고급: A, B, C, D, E
    }
    
    // 전체 문장이 부족한 경우 조정
    if (sentences.length < arrangeSentenceCount + 1) {
      arrangeSentenceCount = Math.max(2, sentences.length - 1);
      console.log(`⚠️ 문장 부족으로 ${arrangeSentenceCount}개로 조정`);
    }
    
    console.log(`✅ 최종 설정: ${arrangeSentenceCount}개 문장 배열 (${String.fromCharCode(65, 65+1, 65+2, arrangeSentenceCount >= 4 ? 65+3 : null, arrangeSentenceCount >= 5 ? 65+4 : null).replace(/,null/g, '')})`);
    
    // 🔥 핵심: 전체 문장 사용!!!
    const givenSentence = sentences[0];  // 첫 문장은 주어진 문장
    const remainingSentences = sentences.slice(1);  // 나머지 전체 문장
    
    // 배열할 문장 선택 (나머지 전체에서 필요한 개수만큼)
    let sentencesToArrange;
    if (remainingSentences.length <= arrangeSentenceCount) {
      // 남은 문장이 배열 개수보다 적거나 같으면 전체 사용
      sentencesToArrange = remainingSentences;
      arrangeSentenceCount = sentencesToArrange.length;  // 실제 개수로 조정
    } else {
      // 남은 문장이 많으면 앞에서부터 필요한 개수만큼 선택
      sentencesToArrange = remainingSentences.slice(0, arrangeSentenceCount);
    }
    
    console.log(`📖 사용 문장: 주어진 1개 + 배열 ${sentencesToArrange.length}개 = 총 ${1 + sentencesToArrange.length}개`);
    console.log(`📄 전체 원문 ${sentences.length}개 문장 중 ${1 + sentencesToArrange.length}개 사용`);
    
    // 문장들을 섞기 위한 랜덤 함수
    const random = () => Math.random();
    
    // 배열할 문장들을 섞기
    const shuffled = [...sentencesToArrange];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    
    // 라벨 생성 (A, B, C, D, E...)
    const labels = [];
    for (let i = 0; i < sentencesToArrange.length; i++) {
      labels.push(`(${String.fromCharCode(65 + i)})`); 
    }
    
    console.log(`📝 생성된 라벨: ${labels.join(', ')}`);
    console.log(`🔀 섞인 순서로 배치된 문장들:`);
    shuffled.forEach((s, i) => {
      console.log(`   ${labels[i]} "${s.substring(0, 50)}..."`);
    });
    
    // 정답 순서 생성 (원래 순서대로 복원하는 순서)
    const correctOrder = sentencesToArrange.map((originalSent) => {
      const shuffledIndex = shuffled.indexOf(originalSent);
      return String.fromCharCode(65 + shuffledIndex);
    }).join(' - ');
    
    console.log(`✅ 정답 순서: ${correctOrder}`);
    
    // 전체 지문 구성 (출처 + 전체 텍스트)
    const fullPassage = passage.text.replace(/\s+/g, ' ').trim();
    const sourceInfo = passage.source || '출처 미상';
    
    // 출처에서 p32-수능 대비 ANALYSIS 같은 정보 추출
    const unitInfo = extractDetailedUnitInfo(sourceInfo);
    
    return {
      type: 'order',
      question: `다음 글에서 주어진 글 다음에 이어질 글의 순서로 가장 적절한 것은?`,
      sourceInfo: passage.source, // 🔧 간결한 출처 정보 (예: p32-수능대비ANALYSIS)
      givenSentence: givenSentence,
      passage: shuffled.map((s, i) => `${labels[i]} ${s.trim()}`).join('\n\n'),
      options: generateOrderOptions(sentencesToArrange.length, difficulty),
      answer: '①', // 첫 번째 옵션을 정답으로 설정
      explanation: `문장들의 논리적 흐름과 연결성을 고려한 순서입니다. 정답: ${correctOrder}`,
      source: passage.source || '출처 미상',
      difficulty: difficulty,
      sentenceCount: actualArrangeCount,  // 실제 사용된 문장 수
      correctOrder: correctOrder // 디버깅용
    };
    
  } else if (type === 'insertion') {
    // 🎯 수능 문장삽입 문제 형식 (매번 다른 문장 사용)
    if (sentences.length < 4) {
      console.log(`❌ 문장삽입에 필요한 문장 부족 (${sentences.length}개)`);
      return null;
    }
    
    // problemId를 이용해 시드 생성 (같은 지문이더라도 다른 문제 생성)
    const seed = problemId ? problemId.split('_').reduce((acc, val) => acc + val.charCodeAt(0), 0) : Date.now();
    Math.random = (() => {
      let s = seed % 2147483647;
      if (s <= 0) s += 2147483646;
      return () => { return (s = s * 16807 % 2147483647) / 2147483647; };
    })();
    
    // 삽입할 문장을 랜덤하게 선택 (첫 번째와 마지막 문장은 제외)
    const availableIndices = sentences.map((_, idx) => idx).slice(1, -1);
    const insertIndex = availableIndices[Math.floor(Math.random() * availableIndices.length)];
    const insertSentence = sentences[insertIndex];
    const remainingSentences = sentences.filter((_, idx) => idx !== insertIndex);
    
    console.log(`📝 문장삽입 문제: ${insertIndex}번째 문장을 삽입 문장으로 선택 (총 ${sentences.length}개)`);
    console.log(`🎯 삽입 문장: ${insertSentence.substring(0, 50)}...`);
    
    // 나머지 문장들을 본문으로 구성
    const textSentences = remainingSentences.slice(0, 4); // 최대 4개 문장만 사용
    
    // 삽입 위치 표시 (①, ②, ③, ④, ⑤)
    const positions = ['①', '②', '③', '④', '⑤'];
    const markedText = textSentences
      .map((sentence, idx) => {
        return `${positions[idx]} ${sentence.trim()}`;
      })
      .join(' ') + ` ${positions[textSentences.length]}`;
    
    // 정답 위치를 랜덤하게 선택 (1-5 중)
    const correctPosition = Math.floor(Math.random() * 5) + 1;
    const answerOptions = ['①', '②', '③', '④', '⑤'];
    
    // Math.random 원복
    Math.random = Math.random;
    
    return {
      type: 'insertion',
      question: `글의 흐름으로 보아, 주어진 문장이 들어가기에 가장 적절한 곳은?`,
      targetSentence: insertSentence,
      passage: markedText,
      options: ['① 1', '② 2', '③ 3', '④ 4', '⑤ 5'],
      answer: answerOptions[correctPosition - 1],
      explanation: `문맥의 흐름상 주어진 문장이 ${correctPosition}번 위치에서 가장 자연스럽게 연결됩니다.`,
      source: passage.source || '출처 미상',
      unit: extractUnitFromSource(passage.source),
      problemNumber: extractProblemNumberFromSource(passage.source),
      difficulty: difficulty,
      insertIndex: insertIndex, // 디버깅용
      uniqueId: problemId
    };
  }
  
  return null;
}

// 순서 옵션 생성 (수능 형식) - 완전히 재구성
function generateOrderOptions(arrangeSentenceCount, difficulty) {
  const labels = [];
  for (let i = 0; i < arrangeSentenceCount; i++) {
    labels.push(String.fromCharCode(65 + i)); // A, B, C, D
  }
  
  console.log(`🔧 순서 옵션 생성: ${arrangeSentenceCount}개 문장 배열 (${labels.join(', ')})`);
  
  if (arrangeSentenceCount === 3) {
    // 기본: 3개 문장 배열 (A, B, C)
    return [
      '① (A) - (B) - (C)',
      '② (A) - (C) - (B)',
      '③ (B) - (A) - (C)',
      '④ (B) - (C) - (A)',
      '⑤ (C) - (A) - (B)'
    ];
  } else if (arrangeSentenceCount === 4) {
    // 중급: 4개 문장 배열 (A, B, C, D)
    return [
      '① (A) - (B) - (C) - (D)',
      '② (A) - (C) - (B) - (D)',
      '③ (B) - (A) - (C) - (D)',
      '④ (B) - (C) - (A) - (D)',
      '⑤ (C) - (A) - (B) - (D)'
    ];
  } else if (arrangeSentenceCount === 5) {
    // 고급: 5개 문장 배열 (A, B, C, D, E)
    return [
      '① (A) - (B) - (C) - (D) - (E)',
      '② (A) - (C) - (B) - (D) - (E)',
      '③ (B) - (A) - (C) - (D) - (E)',
      '④ (B) - (C) - (A) - (D) - (E)',
      '⑤ (C) - (A) - (B) - (D) - (E)'
    ];
  } else {
    // 폴백: 동적 생성
    const shuffledOptions = [];
    const optionLabels = ['①', '②', '③', '④', '⑤'];
    
    for (let i = 0; i < 5; i++) {
      const shuffled = [...labels].sort(() => Math.random() - 0.5);
      shuffledOptions.push(`${optionLabels[i]} (${shuffled.join(') - (')})`);
    }
    return shuffledOptions;
  }
}

// AI 문제 생성
async function generateAIProblem(type, passage, difficulty, problemId = null) {
  try {
    const typePrompts = {
      blank: '빈칸 채우기',
      grammar: '어법',
      vocabulary: '어휘',
      title: '제목',
      theme: '주제'
    };
    
    if (!openai) {
      console.warn('OpenAI API를 사용할 수 없어 규칙 기반 문제로 대체합니다.');
      return generateRuleBasedProblem('order', passage, difficulty, problemId);
    }
    
    const response = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content: `당신은 수능 영어 문제 출제 전문가입니다. 
          주어진 지문으로 ${typePrompts[type]} 문제를 만들어주세요.
          난이도: ${difficulty}
          
          다음 JSON 형식으로 응답해주세요:
          {
            "question": "문제 질문",
            "options": ["① 선택지1", "② 선택지2", "③ 선택지3", "④ 선택지4", "⑤ 선택지5"],
            "answer": "정답 번호 (①, ②, ③, ④, ⑤ 중 하나)",
            "explanation": "정답 해설"
          }`
        },
        {
          role: 'user',
          content: `지문: ${passage.text}`
        }
      ],
      temperature: 0.7,
      max_tokens: 1000
    });
    
    // AI 응답 파싱
    const aiResponse = response.choices[0].message.content;
    
    try {
      const parsedResponse = JSON.parse(aiResponse);
      
      return {
        type: type,
        question: parsedResponse.question || `다음 글의 ${typePrompts[type]}로 가장 적절한 것은?`,
        passage: passage.text,
        options: parsedResponse.options || [
          '① 선택지 1',
          '② 선택지 2', 
          '③ 선택지 3',
          '④ 선택지 4',
          '⑤ 선택지 5'
        ],
        answer: parsedResponse.answer || '①',
        explanation: parsedResponse.explanation || 'AI가 생성한 설명입니다.',
        source: passage.source || '출처 미상',
        unit: extractUnitFromSource(passage.source),
        problemNumber: extractProblemNumberFromSource(passage.source),
        difficulty: difficulty,
        isAiGenerated: true
      };
    } catch (parseError) {
      console.warn('AI 응답 파싱 실패, 기본 구조 사용:', parseError);
      return {
        type: type,
        question: `다음 글의 ${typePrompts[type]}로 가장 적절한 것은?`,
        passage: passage.text,
        options: [
          '① 선택지 1',
          '② 선택지 2',
          '③ 선택지 3', 
          '④ 선택지 4',
          '⑤ 선택지 5'
        ],
        answer: '①',
        explanation: aiResponse.substring(0, 200) + '...',
        source: passage.source || '출처 미상',
        unit: extractUnitFromSource(passage.source),
        problemNumber: extractProblemNumberFromSource(passage.source),
        difficulty: difficulty,
        isAiGenerated: true
      };
    }
  } catch (error) {
    console.error('AI 문제 생성 실패:', error.message);
    // 폴백: 규칙 기반 문제 반환
    return generateRuleBasedProblem('order', passage, difficulty);
  }
}

// 📖 상세한 출처 정보 추출 함수 (p32-수능 대비 ANALYSIS 등)
function extractDetailedUnitInfo(source) {
  if (!source) return '출처 미상';
  
  // 패턴 1: "p32-수능 대비 ANALYSIS" 형식
  const pagePattern = source.match(/p(\d+)[-\s]*([^-\n]+)/i);
  if (pagePattern) {
    const pageNum = pagePattern[1];
    const description = pagePattern[2].trim();
    return `${pageNum}페이지 - ${description}`;
  }
  
  // 패턴 2: "문제 X번" 형식  
  const problemPattern = source.match(/문제\s*(\d+)번/);
  if (problemPattern) {
    return `${problemPattern[1]}번 문제`;
  }
  
  // 패턴 3: 기본 제목에서 추출
  const titlePattern = source.match(/올림포스2.*?[-–]\s*(.+)/);
  if (titlePattern) {
    return titlePattern[1].trim();
  }
  
  return source;
}

// 서버 시작
app.listen(PORT, () => {
  console.log(`
  ╔══════════════════════════════════════╗
  ║   🚀 League of English Server        ║
  ║   포트: ${PORT}                        ║
  ║   주소: http://localhost:${PORT}        ║
  ╚══════════════════════════════════════╝
  `);
});
