const express = require('express');
const router = express.Router();
const database = require('../models/database');
const { generateToken, hashPassword, verifyPassword } = require('../middleware/auth');
const { logAuthEvent, EVENT_TYPES } = require('../services/auditLogService');

/**
 * POST /api/register
 * ?�원가??
 */
router.post('/register', async (req, res) => {
  const { username, password, email, name, school, grade, role = 'student' } = req.body;
  
  try {
    // 중복 ?�인
    const existing = await database.get(
      'SELECT id FROM users WHERE username = ? OR email = ?',
      [username, email]
    );
    
    if (existing) {
      return res.status(400).json({ message: '?��? 존재?�는 ?�이???�는 ?�메?�입?�다.' });
    }
    
    // 비�?번호 ?�싱
    const hashedPassword = await hashPassword(password);
    
    // ?�용???�성
    const result = await database.run(
      `INSERT INTO users (username, password_hash, email, name, school, grade, role)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [username, hashedPassword, email, name, school, grade, role]
    );
    
    await logAuthEvent({
      userId: result.id || null,
      username,
      eventType: EVENT_TYPES.REGISTER,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'] || '',
      metadata: { email, role, grade }
    });

    res.status(201).json({
      message: '?�원가?�이 ?�료?�었?�니??',
      userId: result.id
    });
  } catch (error) {
    console.error('?�원가???�류:', error);
    res.status(500).json({ message: '?�버 ?�류가 발생?�습?�다.' });
  }
});

/**
 * POST /api/login
 * 로그??
 */
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  
  try {
    // ?�용??조회 (password 컬럼 ?�용)
    const user = await database.get(
      'SELECT * FROM users WHERE username = ?',
      [username]
    );
    
    if (!user) {
      return res.status(401).json({ message: '?�이???�는 비�?번호가 ?�치?��? ?�습?�다.' });
    }
    
    // 비�?번호 ?�인
    let isValid = false;
    try {
      isValid = await verifyPassword(password, user.password_hash);
    } catch (bcryptError) {
      console.error('비�?번호 검�??�류:', bcryptError);
      // ?�시?��? ?��? 비�?번호?????�으므�?직접 비교
      if (password === user.password) {
        isValid = true;
        // 비�?번호�??�싱?�여 ?�데?�트
        const hashedPassword = await hashPassword(password);
        await database.run(
          'UPDATE users SET password = ? WHERE id = ?',
          [hashedPassword, user.id]
        );
        console.log('비�?번호 ?�싱 ?�데?�트 ?�료:', username);
      }
    }
    
    if (!isValid) {
      return res.status(401).json({ message: '?�이???�는 비�?번호가 ?�치?��? ?�습?�다.' });
    }
    
    // ?�큰 ?�성
    const token = generateToken(user);
    
    // 비�?번호 ?�거
    delete user.password_hash;
    
    await logAuthEvent({
      userId: user.id,
      username: user.username,
      eventType: EVENT_TYPES.LOGIN,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'] || '',
      metadata: { role: user.role, membership: user.membership, success: true }
    });

    res.json({
      message: '로그???�공',
      token: token,
      user: user
    });
  } catch (error) {
    console.error('로그???�류 ?�세:', error.message, error.stack);
    res.status(500).json({ message: '?�버 ?�류가 발생?�습?�다.' });
  }
});

/**
 * POST /api/logout
 * 로그?�웃 (?�라?�언?�에???�큰 ??��)
 */
router.post('/logout', (req, res) => {
  res.json({ message: '로그?�웃 ?�었?�니??' });
});

module.exports = router;



