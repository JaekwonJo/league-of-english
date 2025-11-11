const express = require('express');
const router = express.Router();
const database = require('../models/database');
const { generateToken, hashPassword, verifyPassword } = require('../middleware/auth');
const { sendMail } = require('../services/emailService');

// POST /api/register
router.post('/register', async (req, res) => {
  const { username, password, email, name, school, grade, role = 'student' } = req.body;
  try {
    const existing = await database.get(
      'SELECT id FROM users WHERE username = ? OR email = ?',
      [username, email]
    );
    if (existing) {
      return res.status(400).json({ message: '이미 존재하는 아이디 또는 이메일입니다.' });
    }

    const hashed = await hashPassword(password);

    // Try new schema first (password_hash), fallback to legacy (password)
    try {
      const result = await database.run(
        `INSERT INTO users (username, password_hash, email, name, school, grade, role)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [username, hashed, email, name, school, grade, role]
      );
      return res.status(201).json({ message: '회원가입이 완료되었습니다.', userId: result.id });
    } catch (e) {
      if (!String(e.message).includes('no such column: password_hash')) throw e;
      const result = await database.run(
        `INSERT INTO users (username, password, email, name, school, grade, role)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [username, hashed, email, name, school, grade, role]
      );
      return res.status(201).json({ message: '회원가입이 완료되었습니다.', userId: result.id });
    }
  } catch (error) {
    console.error('[auth] register error:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// POST /api/login
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const user = await database.get('SELECT * FROM users WHERE username = ?', [username]);
    if (!user) return res.status(401).json({ message: '아이디 또는 비밀번호가 일치하지 않습니다.' });

    const storedHash = user.password_hash || user.password;
    if (!storedHash) return res.status(401).json({ message: '아이디 또는 비밀번호가 일치하지 않습니다.' });

    const ok = await verifyPassword(password, storedHash);
    if (!ok) return res.status(401).json({ message: '아이디 또는 비밀번호가 일치하지 않습니다.' });

    const token = generateToken(user);
    delete user.password;
    delete user.password_hash;
    res.json({ message: '로그인 성공', token, user });
  } catch (error) {
    console.error('[auth] login error:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// POST /api/logout
router.post('/logout', (req, res) => {
  res.json({ message: '로그아웃 되었습니다.' });
});

module.exports = router;

// POST /api/auth/find-id
// Body: { email }
// Returns: { username, masked, sent }
router.post('/find-id', async (req, res) => {
  try {
    const rawEmail = String(req.body?.email || '').trim().toLowerCase();
    if (!rawEmail || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(rawEmail)) {
      return res.status(400).json({ message: '유효한 이메일 주소를 입력해 주세요.' });
    }

    const user = await database.get('SELECT username, email, name FROM users WHERE LOWER(email) = ?', [rawEmail]);
    if (!user) {
      return res.status(404).json({ message: '해당 이메일로 가입된 계정을 찾지 못했습니다.' });
    }

    const username = String(user.username || '').trim();
    const masked = username.length <= 2
      ? username.replace(/./g, '*')
      : username[0] + '*'.repeat(Math.max(1, username.length - 2)) + username[username.length - 1];

    let sent = false;
    try {
      const html = `
        <div style="font-family: Pretendard, 'Apple SD Gothic Neo', sans-serif; padding: 24px; line-height: 1.7;">
          <h2 style="margin: 0 0 12px 0;">League of English 아이디 안내</h2>
          <p>요청하신 계정의 로그인 아이디를 안내드립니다.</p>
          <p style=\"font-size: 18px; margin: 12px 0 18px 0;\"><strong>아이디:</strong> ${username}</p>
          <p style=\"color:#64748b; font-size: 12px; margin-top: 18px;\">본 메일은 발신 전용입니다. 문제가 있으면 운영팀(jaekwonim@gmail.com)으로 연락해 주세요.</p>
        </div>`;
      await sendMail({ to: user.email, subject: '[League of English] 아이디 안내', html });
      sent = true;
    } catch (mailError) {
      // 이메일 환경이 없으면 화면에 마스킹된 아이디만 반환
      sent = false;
    }

    return res.json({ username, masked, sent });
  } catch (error) {
    console.error('[auth] find-id error:', error);
    res.status(500).json({ message: '아이디 찾기 처리 중 오류가 발생했습니다.' });
  }
});
