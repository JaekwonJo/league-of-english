const express = require('express');
const { randomBytes } = require('crypto');
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

    // 간단한 욕설/부적절 아이디 필터
    const bannedPatterns = [
      /sex|porn|fuck|shit|bitch|dick|cunt|slut|rape/iu,
      /개새|병신|씨발|썅|좆/iu,
      /nazi|hitler|terror/iu
    ];
    if (bannedPatterns.some((re) => re.test(trimmedUsername))) {
      return res.status(400).json({ message: '부적절한 아이디는 사용할 수 없습니다. 다른 이름을 선택해 주세요.' });
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

    // Allow skipping email verification for beta via env flag
    const skipEmailVerify = (
      String(process.env.LOE_SKIP_EMAIL_VERIFICATION || '').trim() === '1' ||
      !process.env.EMAIL_USER || !process.env.EMAIL_PASS
    );
    if (!skipEmailVerify) {
      try {
        await emailVerificationService.verifyCode(normalizedEmail, verificationCode);
      } catch (verificationError) {
        return res.status(400).json({ message: verificationError.message || '이메일 인증에 실패했습니다.' });
      }
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
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)` ,
        [trimmedUsername, hashedPassword, normalizedEmail, trimmedName, normalizedSchool, parsedGrade, role || 'student', 'free', skipEmailVerify ? 1 : 1]
      );
    } catch (dbError) {
      const dbMessage = String(dbError?.message || '');
      if (dbMessage.includes('users.password')) {
        result = await database.run(
          `INSERT INTO users (username, password, password_hash, email, name, school, grade, role, membership, email_verified)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [trimmedUsername, hashedPassword, hashedPassword, normalizedEmail, trimmedName, normalizedSchool, parsedGrade, role || 'student', 'free', skipEmailVerify ? 1 : 1]
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

// 비밀번호 재설정: 코드 발송(등록과 동일 엔진 사용)
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body || {};
    await emailVerificationService.requestVerificationCode(email);
    res.json({ success: true, message: '이메일로 재설정 코드를 보냈어요. 10분 안에 입력해 주세요!' });
  } catch (error) {
    console.error('[auth] forgot-password error:', error);
    res.status(400).json({ success: false, message: error?.message || '재설정 코드를 전송하지 못했어요.' });
  }
});

// 비밀번호 재설정: 코드 확인 후 새 비밀번호 저장
router.post('/reset-password', async (req, res) => {
  try {
    const { email, code, newPassword } = req.body || {};
    const normalizedEmail = String(email || '').trim().toLowerCase();
    const normalizedPassword = String(newPassword || '');

    if (!normalizedEmail) return res.status(400).json({ success: false, message: '이메일을 입력해 주세요.' });
    if (normalizedPassword.length < 8 || !/[A-Za-z]/.test(normalizedPassword) || !/[0-9]/.test(normalizedPassword)) {
      return res.status(400).json({ success: false, message: '새 비밀번호는 8자 이상, 영문과 숫자를 포함해야 합니다.' });
    }

    await emailVerificationService.verifyCode(normalizedEmail, code);

    const user = await database.get('SELECT id FROM users WHERE email = ?', [normalizedEmail]);
    if (!user) return res.status(404).json({ success: false, message: '사용자를 찾을 수 없습니다.' });

    const hashed = await hashPassword(normalizedPassword);
    try {
      await database.run('UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [hashed, user.id]);
    } catch (e) {
      // legacy fallback
      await database.run('UPDATE users SET password = ?, password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [hashed, hashed, user.id]);
    }

    res.json({ success: true, message: '비밀번호가 재설정되었습니다. 새로운 비밀번호로 로그인해 주세요.' });
  } catch (error) {
    console.error('[auth] reset-password error:', error);
    res.status(400).json({ success: false, message: error?.message || '비밀번호를 재설정하지 못했어요.' });
  }
});

// 로그인
router.post('/guest-login', async (req, res) => {
  try {
    const suffix = `${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const username = `guest_${suffix}`;
    const email = `guest_${suffix}@trial.local`;
    const hashedPassword = await hashPassword(randomBytes(12).toString('hex'));
    const today = new Date().toISOString().split('T')[0];

    const insertResult = await database.run(
      `INSERT INTO users (username, password_hash, email, name, school, grade, role, membership, email_verified, is_active, daily_limit, used_today, last_reset_date)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)` ,
      [
        username,
        hashedPassword,
        email,
        '게스트',
        'Guest',
        1,
        'student',
        'guest',
        1,
        1,
        0,
        0,
        today
      ]
    );

    const userId = insertResult?.lastID || insertResult?.id;
    if (!userId) {
      throw new Error('게스트 계정을 생성하지 못했습니다.');
    }

    const token = generateToken({ id: userId, username, role: 'student' });

    const sanitizedUser = {
      id: userId,
      username,
      email,
      name: '체험 계정',
      school: 'Guest',
      grade: 1,
      role: 'student',
      membership: 'guest',
      membership_expires_at: null,
      daily_limit: 0,
      used_today: 0,
      tier: 'Iron',
      points: 0,
      last_login_at: null,
      login_count: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    res.json({ message: '게스트 모드로 입장했어요!', token, user: sanitizedUser });
  } catch (error) {
    console.error('[auth] guest-login error:', error);
    res.status(500).json({ message: '게스트 로그인에 실패했습니다. 잠시 후 다시 시도해 주세요.' });
  }
});

router.post('/login', async (req, res) => {
  const { username, password } = req.body || {};

  try {
    const user = await database.get('SELECT * FROM users WHERE username = ?', [username]);

    if (!user) {
      return res.status(401).json({ message: '아이디 또는 비밀번호가 올바르지 않습니다.' });
    }

    if (Number(user.is_active) === 0 || String(user.status || '').toLowerCase() === 'suspended') {
      return res.status(403).json({ message: '정지된 계정입니다. 관리자에게 문의해 주세요.' });
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

    const sanitizedUser = {
      id: user.id,
      username: user.username,
      email: user.email,
      name: user.name,
      school: user.school,
      grade: user.grade,
      role: user.role,
      membership: user.membership,
      membership_expires_at: user.membership_expires_at || null,
      daily_limit: user.daily_limit,
      used_today: user.used_today,
      tier: user.tier,
      points: user.points,
      last_login_at: user.last_login_at || null,
      login_count: user.login_count || 0,
      created_at: user.created_at,
      updated_at: user.updated_at
    };

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
