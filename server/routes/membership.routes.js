const express = require('express');
const router = express.Router();
const database = require('../models/database');
const { verifyToken } = require('../middleware/auth');
const { sendMail } = require('../services/emailService');

const FREE_DAILY_LIMIT = parseInt(process.env.LOE_FREE_DAILY_LIMIT || '30', 10);
const PREMIUM_DAILY_LIMIT = parseInt(process.env.LOE_PREMIUM_DAILY_LIMIT || '999', 10);

function normalizeCode(code) {
  if (!code) return '';
  return String(code).trim().toUpperCase();
}

async function getUserById(userId) {
  return await database.get(
    `SELECT id, username, name, email, school, grade, role, membership,
            membership_expires_at AS membershipExpiresAt,
            daily_limit AS dailyLimit,
            used_today AS usedToday,
            last_reset_date AS lastResetDate,
            points
       FROM users
      WHERE id = ?`,
    [userId]
  );
}

async function refreshMembership(userId) {
  const user = await getUserById(userId);
  if (!user) return null;

  const { membership, membershipExpiresAt } = user;
  if (membership && membership !== 'free' && membershipExpiresAt) {
    const expires = new Date(membershipExpiresAt);
    const now = new Date();
    if (!Number.isNaN(expires.getTime()) && expires.getTime() < now.getTime()) {
      await database.run(
        'UPDATE users SET membership = ?, membership_expires_at = NULL, daily_limit = ? WHERE id = ?',
        ['free', FREE_DAILY_LIMIT, userId]
      );
      user.membership = 'free';
      user.membershipExpiresAt = null;
      user.dailyLimit = FREE_DAILY_LIMIT;
    }
  }
  return user;
}

function buildSummary(user) {
  return {
    type: user.membership || 'free',
    expiresAt: user.membershipExpiresAt || null,
    dailyLimit: user.dailyLimit,
    usedToday: user.usedToday,
    remainingToday: user.dailyLimit < 0 ? -1 : Math.max(0, (user.dailyLimit || 0) - (user.usedToday || 0))
  };
}

router.get('/status', verifyToken, async (req, res) => {
  try {
    const user = await refreshMembership(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: '사용자를 찾을 수 없습니다.' });
    }
    return res.json({ success: true, data: buildSummary(user), user });
  } catch (error) {
    console.error('[membership] status error:', error);
    return res.status(500).json({ success: false, message: '멤버십 정보를 불러오는 중 문제가 발생했습니다.' });
  }
});

router.post('/redeem', verifyToken, async (req, res) => {
  try {
    const rawCode = req.body?.code;
    const code = normalizeCode(rawCode);
    if (!code) {
      return res.status(400).json({ success: false, message: '쿠폰 코드를 입력해 주세요.' });
    }

    const coupon = await database.get('SELECT * FROM membership_coupons WHERE code = ?', [code]);
    if (!coupon) {
      return res.status(404).json({ success: false, message: '유효하지 않은 쿠폰입니다.' });
    }

    if (Number(coupon.active) !== 1) {
      return res.status(400).json({ success: false, message: '사용이 중지된 쿠폰입니다.' });
    }

    if (coupon.expires_at) {
      const expiresAt = new Date(coupon.expires_at);
      if (!Number.isNaN(expiresAt.getTime()) && expiresAt.getTime() < Date.now()) {
        return res.status(400).json({ success: false, message: '쿠폰이 만료되었습니다.' });
      }
    }

    if (coupon.max_redemptions != null && coupon.redeemed_count != null) {
      if (Number(coupon.redeemed_count) >= Number(coupon.max_redemptions)) {
        return res.status(400).json({ success: false, message: '이미 모두 사용된 쿠폰입니다.' });
      }
    }

    const existing = await database.get(
      'SELECT id FROM membership_coupon_redemptions WHERE coupon_code = ? AND user_id = ?',
      [code, req.user.id]
    );
    if (existing) {
      return res.status(400).json({ success: false, message: '이미 사용한 쿠폰입니다.' });
    }

    const membershipType = (coupon.membership_type || 'premium').toLowerCase();
    const duration = Number(coupon.duration_days) || 0;

    const currentUser = await refreshMembership(req.user.id);
    if (!currentUser) {
      return res.status(404).json({ success: false, message: '사용자를 찾을 수 없습니다.' });
    }

    let newExpiry = null;
    if (duration > 0) {
      const base = (currentUser.membership === membershipType && currentUser.membershipExpiresAt)
        ? new Date(currentUser.membershipExpiresAt)
        : new Date();
      if (Number.isNaN(base.getTime()) || base.getTime() < Date.now()) {
        base.setTime(Date.now());
      }
      base.setDate(base.getDate() + duration);
      newExpiry = base.toISOString();
    }

    const nextDailyLimit = membershipType === 'premium'
      ? Math.max(PREMIUM_DAILY_LIMIT, Number(currentUser.dailyLimit) || 0)
      : currentUser.dailyLimit;

    await database.run(
      'UPDATE users SET membership = ?, membership_expires_at = ?, daily_limit = ? WHERE id = ?',
      [membershipType, newExpiry, nextDailyLimit, req.user.id]
    );

    await database.run(
      'INSERT INTO membership_coupon_redemptions (coupon_code, user_id) VALUES (?, ?)',
      [code, req.user.id]
    );

    await database.run(
      'UPDATE membership_coupons SET redeemed_count = redeemed_count + 1, last_redeemed_at = CURRENT_TIMESTAMP WHERE code = ?',
      [code]
    );

    const updatedUser = await refreshMembership(req.user.id);
    const summary = buildSummary(updatedUser);

    return res.json({
      success: true,
      message: '쿠폰이 적용되었습니다! 즐거운 학습 되세요.',
      data: summary,
      user: updatedUser
    });
  } catch (error) {
    console.error('[membership] redeem error:', error);
    return res.status(500).json({ success: false, message: '쿠폰을 적용하는 중 문제가 발생했습니다.' });
  }
});

router.post('/request', verifyToken, async (req, res) => {
  try {
    const { plan, message = '' } = req.body || {};
    const normalizedPlan = String(plan || '').trim().toLowerCase();
    if (!['premium', 'pro'].includes(normalizedPlan)) {
      return res.status(400).json({ success: false, message: '프리미엄 또는 프로 중 하나를 선택해 주세요.' });
    }

    const user = await getUserById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: '사용자 정보를 찾을 수 없습니다.' });
    }

    await database.run(
      `INSERT INTO membership_requests (user_id, plan, message, status)
       VALUES (?, ?, ?, 'pending')`,
      [req.user.id, normalizedPlan, String(message || '').trim()]
    );

    const adminEmail = process.env.ADMIN_ALERT_EMAIL;
    if (adminEmail) {
      const html = `
        <div style="font-family: Pretendard, 'Apple SD Gothic Neo', sans-serif; padding: 24px; line-height: 1.6;">
          <h2 style="margin-bottom: 16px;">새로운 유료 플랜 입금 확인 요청</h2>
          <p>사용자: <strong>${user.name || user.username}</strong> (${user.username})</p>
          <p>이메일: ${user.email || '미입력'}</p>
          <p>요청 플랜: <strong>${normalizedPlan.toUpperCase()}</strong></p>
          ${message ? `<p>학생 메모: ${message}</p>` : ''}
          <p style="margin-top: 24px;">관리자 페이지에서 멤버십 상태를 변경해 주세요.</p>
        </div>
      `;
      try {
        await sendMail({
          to: adminEmail,
          subject: '[League of English] 유료 플랜 입금 확인 요청',
          html
        });
      } catch (mailError) {
        console.warn('[membership] 관리자 알림 이메일 전송 실패:', mailError?.message || mailError);
      }
    }

    res.json({
      success: true,
      message: '입금 요청이 접수됐어요. 관리자가 확인 후 멤버십을 변경해 드릴게요.'
    });
  } catch (error) {
    console.error('[membership] request error:', error);
    res.status(500).json({ success: false, message: '요청을 처리하는 중 문제가 발생했습니다.' });
  }
});

module.exports = router;
