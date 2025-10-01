const express = require('express');
const router = express.Router();
const database = require('../models/database');
const { generateToken, hashPassword, verifyPassword } = require('../middleware/auth');
const { logAuthEvent, EVENT_TYPES } = require('../services/auditLogService');
const emailVerificationService = require('../services/emailVerificationService');

// 회원가입
router.post('/register', async (req, res) => {
  const {
    username,
    password,
    email,
    name,
    school,
    grade,
    role = 'student',
    verificationCode
  } = req.body || {};

  try {
    const normalizedEmail = String(email || '').trim().toLowerCase();
    if (!normalizedEmail) {
      return res.status(400).json({ message: '이메일을 입력해 주세요.' });
    }

    try {
      await emailVerificationService.verifyCode(normalizedEmail, verificationCode);
    } catch (verificationError) {
      return res.status(400).json({ message: verificationError.message || '이메일 인증에 실패했습니다.' });
    }

    // 아이디/이메일 중복 확인
    const existing = await database.get(
      'SELECT id FROM users WHERE username = ? OR email = ?',
      [username, normalizedEmail]
    );

    if (existing) {
      return res.status(400).json({ message: '이미 존재하는 아이디 또는 이메일입니다.' });
    }

    const hashedPassword = await hashPassword(password);

    const result = await database.run(
      `INSERT INTO users (username, password_hash, email, name, school, grade, role, email_verified)
       VALUES (?, ?, ?, ?, ?, ?, ?, 1)`,
      [username, hashedPassword, normalizedEmail, name, school, grade, role]
    );

    await logAuthEvent({
      userId: result.id || null,
      username,
      eventType: EVENT_TYPES.REGISTER,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'] || '',
      metadata: { email: normalizedEmail, role, grade }
    });

    res.status(201).json({
      message: '회원가입이 완료되었습니다.',
      userId: result.id
    });
  } catch (error) {
    console.error('[auth] register error:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// 인증 코드 전송
router.post('/send-code', async (req, res) => {
  try {
    const { email } = req.body || {};
    await emailVerificationService.requestVerificationCode(email);
    res.json({ success: true, message: '이메일로 인증 코드를 보냈어요. 10분 안에 입력해 주세요!' });
  } catch (error) {
    console.error('[auth] send-code error:', error);
    res.status(400).json({ success: false, message: error?.message || '인증 코드를 전송하지 못했어요.' });
  }
});

// 로그인
router.post('/login', async (req, res) => {
  const { username, password } = req.body || {};

  try {
    const user = await database.get('SELECT * FROM users WHERE username = ?', [username]);

    if (!user) {
      return res.status(401).json({ message: '아이디 또는 비밀번호가 올바르지 않습니다.' });
    }

    let isValid = false;
    try {
      isValid = await verifyPassword(password, user.password_hash);
    } catch (bcryptError) {
      console.error('[auth] password verify error:', bcryptError);
      if (password === user.password) {
        isValid = true;
        const hashedPassword = await hashPassword(password);
        await database.run('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, user.id]);
      }
    }

    if (!isValid) {
      return res.status(401).json({ message: '아이디 또는 비밀번호가 올바르지 않습니다.' });
    }

    const token = generateToken(user);
    delete user.password_hash;
    delete user.password;

    await logAuthEvent({
      userId: user.id,
      username: user.username,
      eventType: EVENT_TYPES.LOGIN,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'] || '',
      metadata: { role: user.role, membership: user.membership, success: true }
    });

    res.json({ message: '로그인 성공', token, user });
  } catch (error) {
    console.error('[auth] login error:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// 로그아웃 (토큰 삭제만 하면 됨)
router.post('/logout', (req, res) => {
  res.json({ message: '로그아웃 되었습니다.' });
});

module.exports = router;
