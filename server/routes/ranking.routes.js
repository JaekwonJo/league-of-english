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

const FALLBACK_PLAYERS = [
  { name: '연습생 민지', username: 'demo-minji', points: 4200, membership: 'pro', school: 'League Prep', grade: '고2' },
  { name: '연습생 도윤', username: 'demo-doyoon', points: 3850, membership: 'premium', school: 'League Prep', grade: '고2' },
  { name: '연습생 수아', username: 'demo-sua', points: 3320, membership: 'free', school: 'League Prep', grade: '고1' },
  { name: '연습생 준호', username: 'demo-junho', points: 2980, membership: 'free', school: 'League Prep', grade: '고1' },
  { name: '연습생 하린', username: 'demo-harin', points: 2680, membership: 'pro', school: 'League Prep', grade: '고3' },
  { name: '연습생 세나', username: 'demo-sena', points: 2410, membership: 'premium', school: 'League Prep', grade: '중3' }
];

/**
 * GET /api/ranking/leaderboard
 * 리더보드 조회 (상위 100명)
 */
router.get('/leaderboard', verifyToken, async (req, res) => {
  const limit = clampPositiveInt(req.query?.limit, 100, 1, 200);
  const offset = clampPositiveInt(req.query?.offset, 0, 0, 100000);

  try {
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

    const totalRankedUsers = await getTotalRankedUsers();

    if (!rankingsRaw.length || totalRankedUsers === 0) {
      return res.status(200).json(buildLeaderboardFallbackResponse({ limit, offset, user: req.user, reason: 'empty' }));
    }

    const enrichedRankings = rankingsRaw.map((user, index) => {
      const tier = getTierInfo(user.points);
      return {
        ...user,
        rank: offset + index + 1,
        tier,
        isActive: isRecentlyActive(user.last_login_at)
      };
    });

    let rankSnapshot;
    try {
      rankSnapshot = await getUserRank(req.user.id);
    } catch (rankError) {
      console.warn('랭킹 계산 중 사용자 정보를 불러오지 못해 기본값으로 대체합니다.', rankError?.message || rankError);
      rankSnapshot = fallbackCurrentUser(req.user);
    }

    res.json({
      rankings: enrichedRankings,
      currentUser: rankSnapshot,
      metadata: {
        total: totalRankedUsers,
        limit,
        offset
      }
    });
  } catch (error) {
    console.error('리더보드 조회 오류:', error);
    res.status(200).json(buildLeaderboardFallbackResponse({ limit, offset, user: req.user, reason: error?.message }));
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
    if (!users.length) {
      return res.status(200).json(buildFallbackDistributionPayload());
    }
    
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
    res.status(200).json(buildFallbackDistributionPayload(error?.message));
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

function buildLeaderboardFallbackResponse({ limit = 10, offset = 0, user, reason }) {
  const safeLimit = Math.max(1, Math.min(limit, 50));
  const rankings = buildFallbackRankings(safeLimit, offset);
  return {
    rankings,
    currentUser: fallbackCurrentUser(user),
    metadata: {
      total: FALLBACK_PLAYERS.length,
      limit: safeLimit,
      offset,
      fallback: true,
      reason
    }
  };
}

function buildFallbackRankings(limit, offset) {
  const rows = [];
  for (let i = 0; i < limit; i += 1) {
    const template = FALLBACK_PLAYERS[(offset + i) % FALLBACK_PLAYERS.length];
    rows.push({
      id: `fallback-${offset + i + 1}`,
      name: template.name,
      username: template.username,
      points: template.points,
      school: template.school,
      grade: template.grade,
      membership: template.membership,
      role: 'student',
      rank: offset + i + 1,
      tier: getTierInfo(template.points),
      isActive: true,
      fallback: true
    });
  }
  return rows;
}

function fallbackCurrentUser(user) {
  const points = Number(user?.points) || 0;
  const tier = getTierInfo(points);
  const nextTier = getNextTier(tier);
  return {
    rank: null,
    points,
    tier,
    nextTier,
    progressToNext: nextTier ? calculateProgress(points, tier, nextTier) : 100,
    fallback: true
  };
}

function buildFallbackDistributionPayload(reason) {
  return {
    distribution: buildFallbackDistribution(),
    totalUsers: FALLBACK_PLAYERS.length,
    fallback: true,
    reason
  };
}

function buildFallbackDistribution() {
  return tierConfig.tiers.map((tier) => {
    const count = FALLBACK_PLAYERS.filter((player) => (
      player.points >= tier.minLP && (tier.maxLP === -1 || player.points <= tier.maxLP)
    )).length;
    return {
      tier: tier.name,
      tierKr: tier.nameKr,
      icon: tier.icon,
      color: tier.color,
      count,
      percentage: FALLBACK_PLAYERS.length
        ? ((count / FALLBACK_PLAYERS.length) * 100).toFixed(1)
        : 0,
      fallback: true
    };
  });
}

module.exports = router;
