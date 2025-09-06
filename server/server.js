/**
 * League of English - 메인 서버
 * 리팩토링 버전 2.0
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

// 설정 파일
const config = require('./config/server.config.json');

// 데이터베이스
const database = require('./models/database');

// 라우터
const authRoutes = require('./routes/auth.routes');
const documentRoutes = require('./routes/document.routes');
const problemRoutes = require('./routes/problem.routes');
const rankingRoutes = require('./routes/ranking.routes');
const analysisRoutes = require('./routes/analysis');

// Express 앱 초기화
const app = express();
const PORT = process.env.PORT || config.server.port;

// UTF-8 인코딩 설정
process.env.NODE_ENV = process.env.NODE_ENV || 'development';

// 미들웨어 설정
app.use(cors(config.server.corsOptions));
app.use(express.json({ limit: config.server.jsonLimit }));
app.use(express.urlencoded({ extended: true, limit: config.server.jsonLimit, charset: 'utf8' }));

// 환경변수 체크
console.log('🔍 환경변수 확인:');
console.log('JWT_SECRET:', process.env.JWT_SECRET ? '✅ 설정됨' : '❌ 없음');
console.log('OPENAI_API_KEY:', process.env.OPENAI_API_KEY ? '✅ 설정됨' : '❌ 없음');
console.log('PORT:', PORT);

// 라우터 연결
app.use('/api/auth', authRoutes);
app.use('/api', documentRoutes);
app.use('/api', problemRoutes);
app.use('/api/ranking', rankingRoutes);
app.use('/api/analysis', analysisRoutes);

// 헬스체크
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    version: '2.0.0'
  });
});

// 404 핸들러
app.use((req, res) => {
  res.status(404).json({ 
    message: 'API 엔드포인트를 찾을 수 없습니다.',
    path: req.path 
  });
});

// 에러 핸들러
app.use((err, req, res, next) => {
  console.error('서버 에러:', err);
  res.status(err.status || 500).json({
    message: err.message || '서버 내부 오류가 발생했습니다.',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// 서버 시작
async function startServer() {
  try {
    // 데이터베이스 연결
    await database.connect();
    
    // 서버 시작
    app.listen(PORT, () => {
      console.log('========================================');
      console.log('🎮 League of English Server v2.0');
      console.log(`🚀 서버가 포트 ${PORT}에서 실행 중입니다.`);
      console.log(`📍 http://localhost:${PORT}`);
      console.log('========================================');
    });
  } catch (error) {
    console.error('❌ 서버 시작 실패:', error);
    process.exit(1);
  }
}

// 종료 처리
process.on('SIGINT', async () => {
  console.log('\n👋 서버를 종료합니다...');
  await database.close();
  process.exit(0);
});

// 서버 시작
startServer();