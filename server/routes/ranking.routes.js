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
    const { limit = 100, offset = 0 } = req.query;
    
    // 상위 랭커들 조회 (포인트 순)
    const rankings = await database.all(`
      SELECT 
        id, 
        name, 
        username,
        points, 
        school,
        grade,
        role,
        created_at,
        last_login_at,
        ROW_NUMBER() OVER (ORDER BY points DESC, created_at ASC) as rank
      FROM users 
      WHERE points > 0
      ORDER BY points DESC, created_at ASC
      LIMIT ? OFFSET ?
    `, [parseInt(limit), parseInt(offset)]);

    // 각 사용자의 티어 정보 추가
    const enrichedRankings = rankings.map(user => {
      const tier = getTierInfo(user.points);
      return {
        ...user,
        tier,
        isActive: isRecentlyActive(user.last_login_at)
      };
    });

    // 현재 사용자의 랭킹 정보
    const currentUser = req.user;
    const userRanking = await database.get(`
      SELECT 
        rank,
        points
      FROM (
        SELECT 
          id,
          points,
          ROW_NUMBER() OVER (ORDER BY points DESC, created_at ASC) as rank
        FROM users
        WHERE points > 0
      )
      WHERE id = ?
    `, [currentUser.id]);

    res.json({
      rankings: enrichedRankings,
      currentUser: {
        rank: userRanking?.rank || null,
        points: currentUser.points,
        tier: getTierInfo(currentUser.points)
      },
      metadata: {
        total: await getTotalRankedUsers(),
        limit: parseInt(limit),
        offset: parseInt(offset)
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
    const users = await database.all('SELECT points FROM users WHERE points > 0');
    
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

    if (!rankData || (!rankData.rank && (rankData.points || 0) <= 0)) {
      return res.json({
        myRank: rankData || { rank: null, points: 0 },
        nearbyUsers: []
      });
    }

    const windowStart = Math.max(1, (rankData.rank || 1) - 2);
    const windowEnd = (rankData.rank || 1) + 2;

    const nearbyUsers = await database.all(`
      SELECT 
        rank,
        name,
        points,
        id
      FROM (
        SELECT 
          id,
          name,
          points,
          ROW_NUMBER() OVER (ORDER BY points DESC, created_at ASC) as rank
        FROM users
        WHERE points > 0
      )
      WHERE rank BETWEEN ? AND ?
      ORDER BY rank
    `, [windowStart, windowEnd]);

    res.json({
      myRank: rankData,
      nearbyUsers: nearbyUsers.map((user) => ({
        ...user,
        tier: getTierInfo(user.points),
        isMe: user.id === userId
      }))
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

async function getTotalRankedUsers() {
  const result = await database.get('SELECT COUNT(*) as count FROM users WHERE points > 0');
  return result.count;
}

module.exports = router;
