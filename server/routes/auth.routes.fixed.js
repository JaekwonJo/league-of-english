const express = require('express');
const router = express.Router();
const database = require('../models/database');
const { generateToken, hashPassword, verifyPassword } = require('../middleware/auth');

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

