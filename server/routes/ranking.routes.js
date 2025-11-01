/**
 * 랭킹 관련 API 라우트
 */

const express = require('express');
const router = express.Router();
const database = require('../models/database');
const { verifyToken } = require('../middleware/auth');
const tierConfig = require('../config/tierConfig.json');
const { getTierInfo, getNextTier, calculateProgress } = require('../utils/tierUtils');
const { getUserRank } = require('../services/studyService');

/**
 * GET /api/ranking/leaderboard
 * 리더보드 조회 (상위 100명)
 */
router.get('/leaderboard', verifyToken, async (req, res) => {
  try {
    const limit = clampPositiveInt(req.query?.limit, 100, 1, 200);
    const offset = clampPositiveInt(req.query?.offset, 0, 0, 100000);
    const activeClause = await getActiveFilterClause();

    const rankingsRaw = await database.all(
      `SELECT 
         id,
         name,
         username,
         points,
         school,
         grade,
         role,
         COALESCE(membership, 'free') AS membership,
         created_at,
         last_login_at
       FROM users
      WHERE points > 0${activeClause}
      ORDER BY points DESC, created_at ASC, id ASC
      LIMIT ? OFFSET ?`,
      [limit, offset]
    );

    const enrichedRankings = rankingsRaw.map((user, index) => {
      const tier = getTierInfo(user.points);
      return {
        ...user,
        rank: offset + index + 1,
        tier,
        isActive: isRecentlyActive(user.last_login_at)
      };
    });

    const rankSnapshot = await getUserRank(req.user.id);

    res.json({
      rankings: enrichedRankings,
      currentUser: {
        rank: rankSnapshot?.rank ?? null,
        points: rankSnapshot?.points ?? req.user.points,
        tier: rankSnapshot?.tier ?? getTierInfo(req.user.points)
      },
      metadata: {
        total: await getTotalRankedUsers(),
        limit,
        offset
      }
    });
  } catch (error) {
    console.error('리더보드 조회 오류:', error);
    res.status(500).json({ message: '랭킹을 불러오는데 실패했습니다.' });
  }
});

/**
 * GET /api/ranking/tier-distribution
 * 티어별 분포 조회
 */
router.get('/tier-distribution', verifyToken, async (req, res) => {
  try {
    const activeClause = await getActiveFilterClause();
    const users = await database.all(`SELECT points FROM users WHERE points > 0${activeClause}`);
    
    const distribution = tierConfig.tiers.map(tier => {
      const count = users.filter(user => {
        const userPoints = user.points;
        return userPoints >= tier.minLP && (tier.maxLP === -1 || userPoints <= tier.maxLP);
      }).length;
      
      return {
        tier: tier.name,
        tierKr: tier.nameKr,
        icon: tier.icon,
        color: tier.color,
        count: count,
        percentage: users.length > 0 ? ((count / users.length) * 100).toFixed(1) : 0
      };
    });

    res.json({
      distribution: distribution,
      totalUsers: users.length
    });
  } catch (error) {
    console.error('티어 분포 조회 오류:', error);
    res.status(500).json({ message: '티어 분포를 불러오는데 실패했습니다.' });
  }
});

/**
 * GET /api/ranking/my-rank
 * 현재 사용자 순위 상세 조회
 */
router.get('/my-rank', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const rankData = await getUserRank(userId);

    if (!rankData || rankData.rank === null || (rankData.points || 0) <= 0) {
      return res.json({
        myRank: rankData || { rank: null, points: 0 },
        nearbyUsers: []
      });
    }

    const windowSize = 5;
    const windowStart = Math.max(1, rankData.rank - 2);
    const offset = windowStart - 1;
    const activeClause = await getActiveFilterClause();

    const nearbyRows = await database.all(
      `SELECT id, name, points, last_login_at
         FROM users
        WHERE points > 0${activeClause}
        ORDER BY points DESC, created_at ASC, id ASC
        LIMIT ? OFFSET ?`,
      [windowSize, offset]
    );

    const nearbyUsers = nearbyRows.map((user, index) => ({
      id: user.id,
      name: user.name,
      points: user.points,
      rank: offset + index + 1,
      tier: getTierInfo(user.points),
      isMe: user.id === userId,
      isActive: isRecentlyActive(user.last_login_at)
    }));

    res.json({
      myRank: rankData,
      nearbyUsers
    });
  } catch (error) {
    console.error('내 순위 조회 오류:', error);
    res.status(500).json({ message: '순위를 불러오는데 실패했습니다.' });
  }
});

// 유틸리티 함수들
function isRecentlyActive(lastActivity) {
  if (!lastActivity) return false;
  const threeDaysAgo = new Date();
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
  return new Date(lastActivity) > threeDaysAgo;
}

let hasIsActiveColumnCache = null;

async function getActiveFilterClause() {
  if (hasIsActiveColumnCache === null) {
    hasIsActiveColumnCache = await database.hasColumn('users', 'is_active');
  }
  return hasIsActiveColumnCache ? ' AND COALESCE(is_active, 1) = 1' : '';
}

async function getTotalRankedUsers() {
  const activeClause = await getActiveFilterClause();
  const result = await database.get(
    `SELECT COUNT(*) as count FROM users WHERE points > 0${activeClause}`
  );
  return result?.count || 0;
}

function clampPositiveInt(value, fallback, min, max) {
  const parsed = parseInt(value, 10);
  if (Number.isNaN(parsed)) return fallback;
  const clamped = Math.min(Math.max(parsed, min), max);
  return clamped;
}

module.exports = router;
