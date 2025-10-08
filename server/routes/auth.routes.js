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

    const trimmedUsername = String(username || '').trim();
    if (!trimmedUsername) {
      return res.status(400).json({ message: '아이디를 입력해 주세요.' });
    }

    const trimmedName = String(name || '').trim();
    if (!trimmedName) {
      return res.status(400).json({ message: '이름을 입력해 주세요.' });
    }

    const normalizedPassword = String(password || '');
    if (normalizedPassword.length < 8) {
      return res.status(400).json({ message: '비밀번호는 8자 이상 입력해 주세요.' });
    }
    if (!/[A-Za-z]/.test(normalizedPassword) || !/[0-9]/.test(normalizedPassword)) {
      return res.status(400).json({ message: '비밀번호는 영문과 숫자를 포함해야 합니다.' });
    }

    const normalizedSchool = String(school || '').trim() || 'League of English';

    const parsedGrade = Number(grade);
    if (!Number.isInteger(parsedGrade) || parsedGrade < 1 || parsedGrade > 3) {
      return res.status(400).json({ message: '학년을 1~3으로 선택해 주세요.' });
    }

    try {
      await emailVerificationService.verifyCode(normalizedEmail, verificationCode);
    } catch (verificationError) {
      return res.status(400).json({ message: verificationError.message || '이메일 인증에 실패했습니다.' });
    }

    // 아이디/이메일 중복 확인
    const existing = await database.get(
      'SELECT id FROM users WHERE username = ? OR email = ?',
      [trimmedUsername, normalizedEmail]
    );

    if (existing) {
      return res.status(400).json({ message: '이미 존재하는 아이디 또는 이메일입니다.' });
    }

    const hashedPassword = await hashPassword(normalizedPassword);

    let result;
    try {
      result = await database.run(
        `INSERT INTO users (username, password_hash, email, name, school, grade, role, membership, email_verified)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)`,
        [trimmedUsername, hashedPassword, normalizedEmail, trimmedName, normalizedSchool, parsedGrade, role || 'student', 'free']
      );
    } catch (dbError) {
      const dbMessage = String(dbError?.message || '');
      if (dbMessage.includes('users.password')) {
        result = await database.run(
          `INSERT INTO users (username, password, password_hash, email, name, school, grade, role, membership, email_verified)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
          [trimmedUsername, hashedPassword, hashedPassword, normalizedEmail, trimmedName, normalizedSchool, parsedGrade, role || 'student', 'free']
        );
      } else {
        throw dbError;
      }
    }

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
    const message = String(error?.message || '');
    if (message.includes('UNIQUE constraint failed: users.username') || message.includes('users.email')) {
      return res.status(400).json({ message: '이미 사용 중인 아이디 또는 이메일이에요.' });
    }
    if (message.includes('NOT NULL constraint failed') || message.includes('CHECK constraint failed')) {
      return res.status(400).json({ message: '회원가입에 필요한 필드를 다시 확인해 주세요.' });
    }
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

    try {
      await database.run(
        `UPDATE users
            SET last_login_at = CURRENT_TIMESTAMP,
                last_login_ip = ?,
                login_count = COALESCE(login_count, 0) + 1,
                updated_at = CURRENT_TIMESTAMP
          WHERE id = ?`,
        [req.ip, user.id]
      );
    } catch (updateError) {
      console.warn('[auth] failed to update login metadata:', updateError?.message || updateError);
    }

    const sanitizedUser = await database.get(
      `SELECT id, username, email, name, school, grade, role, membership, membership_expires_at,
              daily_limit, used_today, tier, points, last_login_at, login_count, created_at, updated_at
         FROM users
        WHERE id = ?`,
      [user.id]
    );

    delete sanitizedUser.password_hash;
    delete sanitizedUser.password;

    await logAuthEvent({
      userId: user.id,
      username: user.username,
      eventType: EVENT_TYPES.LOGIN,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'] || '',
      metadata: { role: sanitizedUser.role, membership: sanitizedUser.membership, success: true }
    });

    res.json({ message: '로그인 성공', token, user: sanitizedUser });
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
