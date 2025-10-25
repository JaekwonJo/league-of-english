const express = require('express');
const router = express.Router();
const database = require('../models/database');
const { verifyToken, requireAdmin } = require('../middleware/auth');
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

// --- Admin endpoints ---
// Grant membership directly to a user (by id or username)
router.post('/admin/grant', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { userId, username, type = 'premium', durationDays = 30 } = req.body || {};
    let user = null;
    if (Number.isInteger(Number(userId))) {
      user = await database.get('SELECT id, membership, membership_expires_at, daily_limit FROM users WHERE id = ?', [Number(userId)]);
    } else if (username) {
      user = await database.get('SELECT id, membership, membership_expires_at, daily_limit FROM users WHERE username = ?', [String(username).trim()]);
    }
    if (!user) return res.status(404).json({ success: false, message: '사용자를 찾을 수 없습니다.' });

    let newExpiry = null;
    const now = new Date();
    const base = user.membership === type && user.membership_expires_at ? new Date(user.membership_expires_at) : now;
    if (durationDays && Number(durationDays) > 0) {
      if (Number.isNaN(base.getTime()) || base.getTime() < now.getTime()) base.setTime(now.getTime());
      base.setDate(base.getDate() + Number(durationDays));
      newExpiry = base.toISOString();
    }

    const nextDailyLimit = (String(type) === 'premium' || String(type) === 'pro') ? -1 : FREE_DAILY_LIMIT;
    await database.run(
      'UPDATE users SET membership = ?, membership_expires_at = ?, daily_limit = ? WHERE id = ?',
      [String(type), newExpiry, nextDailyLimit, user.id]
    );

    const updated = await getUserById(user.id);
    return res.json({ success: true, message: '멤버십이 변경되었습니다.', user: updated });
  } catch (error) {
    console.error('[membership] admin grant error:', error);
    res.status(500).json({ success: false, message: '멤버십을 변경하지 못했습니다.' });
  }
});

// List pending membership requests
router.get('/admin/requests', verifyToken, requireAdmin, async (req, res) => {
  try {
    const rows = await database.all(
      `SELECT mr.id, mr.user_id, u.username, u.name, mr.plan, mr.message, mr.status, mr.created_at
         FROM membership_requests mr
         JOIN users u ON u.id = mr.user_id
        WHERE mr.status = 'pending'
        ORDER BY mr.created_at ASC`
    );
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('[membership] list requests error:', error);
    res.status(500).json({ success: false, message: '요청 목록을 불러오지 못했습니다.' });
  }
});

// Resolve a membership request (approve/reject)
router.post('/admin/requests/:id/resolve', verifyToken, requireAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { action, durationDays = 30, type } = req.body || {};
    const row = await database.get('SELECT * FROM membership_requests WHERE id = ?', [id]);
    if (!row) return res.status(404).json({ success: false, message: '요청을 찾을 수 없습니다.' });
    if (row.status !== 'pending') return res.status(400).json({ success: false, message: '이미 처리된 요청입니다.' });

    if (String(action).toLowerCase() === 'approve') {
      const grantType = (type || row.plan || 'premium').toLowerCase();
      const user = await getUserById(row.user_id);
      if (!user) return res.status(404).json({ success: false, message: '사용자를 찾을 수 없습니다.' });
      let newExpiry = null;
      if (durationDays && Number(durationDays) > 0) {
        const base = user.membership === grantType && user.membershipExpiresAt ? new Date(user.membershipExpiresAt) : new Date();
        if (Number.isNaN(base.getTime()) || base.getTime() < Date.now()) base.setTime(Date.now());
        base.setDate(base.getDate() + Number(durationDays));
        newExpiry = base.toISOString();
      }
      const nextDailyLimit = (grantType === 'premium' || grantType === 'pro') ? -1 : user.dailyLimit;
      await database.run(
        'UPDATE users SET membership = ?, membership_expires_at = ?, daily_limit = ? WHERE id = ?',
        [grantType, newExpiry, nextDailyLimit, row.user_id]
      );
      await database.run('UPDATE membership_requests SET status = ? WHERE id = ?', ['approved', id]);
      const updated = await getUserById(row.user_id);
      return res.json({ success: true, message: '요청을 승인했습니다.', user: updated });
    }

    await database.run('UPDATE membership_requests SET status = ? WHERE id = ?', ['rejected', id]);
    res.json({ success: true, message: '요청을 반려했습니다.' });
  } catch (error) {
    console.error('[membership] resolve request error:', error);
    res.status(500).json({ success: false, message: '요청을 처리하지 못했습니다.' });
  }
});

// Create a coupon code (optional offline payment flow)
router.post('/admin/coupons', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { code, membership_type = 'premium', duration_days = 30, max_redemptions = 1 } = req.body || {};
    const finalCode = (code || Math.random().toString(36).slice(2, 8).toUpperCase());
    await database.run(
      `INSERT INTO membership_coupons (code, membership_type, duration_days, max_redemptions, redeemed_count, active)
       VALUES (?, ?, ?, ?, 0, 1)`,
      [finalCode, membership_type, Number(duration_days) || 30, Number(max_redemptions) || 1]
    );
    res.json({ success: true, code: finalCode, membership_type, duration_days });
  } catch (error) {
    console.error('[membership] create coupon error:', error);
    res.status(500).json({ success: false, message: '쿠폰을 생성하지 못했습니다.' });
  }
});
