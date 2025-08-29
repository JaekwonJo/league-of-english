const express = require('express');
const router = express.Router();
const database = require('../models/database');
const { generateToken, hashPassword, verifyPassword } = require('../middleware/auth');

/**
 * POST /api/register
 * 회원가입
 */
router.post('/register', async (req, res) => {
  const { username, password, email, name, school, grade, role = 'student' } = req.body;
  
  try {
    // 중복 확인
    const existing = await database.get(
      'SELECT id FROM users WHERE username = ? OR email = ?',
      [username, email]
    );
    
    if (existing) {
      return res.status(400).json({ message: '이미 존재하는 아이디 또는 이메일입니다.' });
    }
    
    // 비밀번호 해싱
    const hashedPassword = await hashPassword(password);
    
    // 사용자 생성
    const result = await database.run(
      `INSERT INTO users (username, password, email, name, school, grade, role)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [username, hashedPassword, email, name, school, grade, role]
    );
    
    res.status(201).json({
      message: '회원가입이 완료되었습니다.',
      userId: result.id
    });
  } catch (error) {
    console.error('회원가입 오류:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

/**
 * POST /api/login
 * 로그인
 */
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  
  try {
    // 사용자 조회 (password 컬럼 사용)
    const user = await database.get(
      'SELECT *, password as password_hash FROM users WHERE username = ?',
      [username]
    );
    
    if (!user) {
      return res.status(401).json({ message: '아이디 또는 비밀번호가 일치하지 않습니다.' });
    }
    
    // 비밀번호 확인
    let isValid = false;
    try {
      isValid = await verifyPassword(password, user.password_hash);
    } catch (bcryptError) {
      console.error('비밀번호 검증 오류:', bcryptError);
      // 해시되지 않은 비밀번호일 수 있으므로 직접 비교
      if (password === user.password_hash) {
        isValid = true;
        // 비밀번호를 해싱하여 업데이트
        const hashedPassword = await hashPassword(password);
        await database.run(
          'UPDATE users SET password = ? WHERE id = ?',
          [hashedPassword, user.id]
        );
        console.log('비밀번호 해싱 업데이트 완료:', username);
      }
    }
    
    if (!isValid) {
      return res.status(401).json({ message: '아이디 또는 비밀번호가 일치하지 않습니다.' });
    }
    
    // 토큰 생성
    const token = generateToken(user);
    
    // 비밀번호 제거
    delete user.password_hash;
    delete user.password;
    
    res.json({
      message: '로그인 성공',
      token: token,
      user: user
    });
  } catch (error) {
    console.error('로그인 오류 상세:', error.message, error.stack);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

/**
 * POST /api/logout
 * 로그아웃 (클라이언트에서 토큰 삭제)
 */
router.post('/logout', (req, res) => {
  res.json({ message: '로그아웃 되었습니다.' });
});

module.exports = router;