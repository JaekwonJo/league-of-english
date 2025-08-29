const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const config = require('../config/server.config.json');

// JWT 토큰 생성
const generateToken = (user) => {
  const payload = {
    id: user.id,
    username: user.username,
    role: user.role
  };
  
  return jwt.sign(
    payload,
    process.env.JWT_SECRET || config.auth.secretKey,
    { expiresIn: config.auth.tokenExpiry }
  );
};

// JWT 토큰 검증 미들웨어
const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ message: '인증 토큰이 없습니다.' });
  }
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || config.auth.secretKey);
    req.user = decoded;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: '토큰이 만료되었습니다.' });
    }
    return res.status(403).json({ message: '유효하지 않은 토큰입니다.' });
  }
};

// 관리자 권한 확인 미들웨어
const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: '관리자 권한이 필요합니다.' });
  }
  next();
};

// 교사 이상 권한 확인 미들웨어
const requireTeacherOrAdmin = (req, res, next) => {
  if (req.user.role !== 'teacher' && req.user.role !== 'admin') {
    return res.status(403).json({ message: '교사 이상 권한이 필요합니다.' });
  }
  next();
};

// 비밀번호 해싱
const hashPassword = async (password) => {
  return await bcrypt.hash(password, config.auth.saltRounds);
};

// 비밀번호 검증
const verifyPassword = async (password, hash) => {
  return await bcrypt.compare(password, hash);
};

// 일일 제한 확인 미들웨어
const checkDailyLimit = async (req, res, next) => {
  const database = require('../models/database');
  const userId = req.user.id;
  
  try {
    // 사용자 정보 조회
    const user = await database.get(
      'SELECT daily_limit, used_today, last_reset_date, membership FROM users WHERE id = ?',
      [userId]
    );
    
    if (!user) {
      return res.status(404).json({ message: '사용자를 찾을 수 없습니다.' });
    }
    
    // 날짜 확인 및 리셋
    const today = new Date().toISOString().split('T')[0];
    if (user.last_reset_date !== today) {
      await database.run(
        'UPDATE users SET used_today = 0, last_reset_date = ? WHERE id = ?',
        [today, userId]
      );
      user.used_today = 0;
    }
    
    // 프리미엄 회원은 제한 없음
    if (user.membership === 'premium') {
      next();
      return;
    }
    
    // 일일 제한 확인
    if (user.used_today >= user.daily_limit) {
      return res.status(429).json({ 
        message: '일일 문제 제한에 도달했습니다.',
        limit: user.daily_limit,
        used: user.used_today
      });
    }
    
    req.dailyLimit = {
      limit: user.daily_limit,
      used: user.used_today,
      remaining: user.daily_limit - user.used_today
    };
    
    next();
  } catch (error) {
    console.error('일일 제한 확인 실패:', error);
    res.status(500).json({ message: '서버 오류' });
  }
};

// 사용량 업데이트
const updateUsage = async (userId, count = 1) => {
  const database = require('../models/database');
  
  try {
    await database.run(
      'UPDATE users SET used_today = used_today + ? WHERE id = ?',
      [count, userId]
    );
  } catch (error) {
    console.error('사용량 업데이트 실패:', error);
  }
};

module.exports = {
  generateToken,
  verifyToken,
  requireAdmin,
  requireTeacherOrAdmin,
  hashPassword,
  verifyPassword,
  checkDailyLimit,
  updateUsage
};