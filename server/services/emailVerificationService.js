const database = require('../models/database');
const { sendMail } = require('./emailService');

const CODE_EXPIRY_MINUTES = Number(process.env.EMAIL_CODE_EXPIRY_MINUTES || 10);
const RESEND_COOLDOWN_SECONDS = Number(process.env.EMAIL_CODE_RESEND_COOLDOWN || 60);

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function normalizeCode(code) {
  return String(code || '').trim();
}

function generateCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

async function requestVerificationCode(email) {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(normalizedEmail)) {
    throw new Error('유효한 이메일 주소를 입력해 주세요.');
  }

  const existing = await database.get(
    `SELECT created_at FROM email_verifications
      WHERE email = ?
      ORDER BY created_at DESC
      LIMIT 1`,
    [normalizedEmail]
  );

  if (existing) {
    const lastCreated = new Date(existing.created_at);
    const diff = Date.now() - lastCreated.getTime();
    if (!Number.isNaN(diff) && diff < RESEND_COOLDOWN_SECONDS * 1000) {
      const wait = Math.ceil((RESEND_COOLDOWN_SECONDS * 1000 - diff) / 1000);
      throw new Error(`${wait}초 뒤에 다시 시도해 주세요.`);
    }
  }

  const code = generateCode();
  const expiresAt = new Date(Date.now() + CODE_EXPIRY_MINUTES * 60 * 1000).toISOString();

  await database.run(
    `INSERT INTO email_verifications (email, code, expires_at, verified)
     VALUES (?, ?, ?, 0)`,
    [normalizedEmail, code, expiresAt]
  );

  const html = `
    <div style="font-family: Pretendard, 'Apple SD Gothic Neo', sans-serif; padding: 24px; line-height: 1.6;">
      <h2 style="margin-bottom: 16px;">League of English 이메일 인증</h2>
      <p>안녕하세요! 아래 인증 코드를 입력하면 회원가입을 완료할 수 있어요 😊</p>
      <div style="font-size: 32px; font-weight: bold; letter-spacing: 4px; margin: 24px 0; color: #4f46e5;">
        ${code}
      </div>
      <p>인증 코드는 <strong>${CODE_EXPIRY_MINUTES}분</strong> 동안만 유효해요. 만료되면 새로 받아 주세요.</p>
      <p style="margin-top: 24px; color: #64748b; font-size: 12px;">본 메일은 발신 전용입니다.</p>
    </div>
  `;

  await sendMail({
    to: normalizedEmail,
    subject: '[League of English] 이메일 인증 코드',
    html
  });

  return true;
}

async function verifyCode(email, code) {
  const normalizedEmail = normalizeEmail(email);
  const normalizedCode = normalizeCode(code);

  if (!normalizedCode) {
    throw new Error('이메일로 받은 인증 코드를 입력해 주세요.');
  }

  const record = await database.get(
    `SELECT id, code, expires_at, verified
       FROM email_verifications
      WHERE email = ?
      ORDER BY created_at DESC
      LIMIT 1`,
    [normalizedEmail]
  );

  if (!record) {
    throw new Error('먼저 이메일 인증 코드를 받아 주세요.');
  }

  if (Number(record.verified) === 1) {
    if (record.code === normalizedCode) {
      return true;
    }
    throw new Error('이미 사용된 인증 코드예요. 새로운 코드를 요청해 주세요.');
  }

  if (record.code !== normalizedCode) {
    throw new Error('인증 코드가 일치하지 않아요. 다시 확인해 주세요.');
  }

  const expiresAt = new Date(record.expires_at);
  if (!Number.isNaN(expiresAt.getTime()) && expiresAt.getTime() < Date.now()) {
    throw new Error('인증 코드가 만료됐어요. 새 코드를 받아 주세요.');
  }

  await database.run(
    'UPDATE email_verifications SET verified = 1, verified_at = CURRENT_TIMESTAMP WHERE id = ?',
    [record.id]
  );

  return true;
}

module.exports = {
  requestVerificationCode,
  verifyCode
};
