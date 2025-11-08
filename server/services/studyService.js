const database = require('../models/database');
const { getTierInfo, getNextTier, calculateProgress } = require('../utils/tierUtils');
const { clearSession: clearStudySession } = require('./studySessionService');

const POINTS_CORRECT = 10;
const POINTS_INCORRECT = -5;

function sanitizeResults(results = []) {
  if (!Array.isArray(results)) return [];
  const cleaned = [];
  const seen = new Set();

  results.forEach((entry) => {
    if (!entry || typeof entry !== 'object') return;
    const problemId = Number(entry.problemId || entry.problem_id || entry.id);
    if (!Number.isInteger(problemId) || problemId <= 0) return;
    const key = `${problemId}-${entry.userAnswer ?? ''}`;
    if (seen.has(key)) return;
    seen.add(key);

    const isCorrect = Boolean(entry.isCorrect || entry.correct);
    const userAnswer = entry.userAnswer !== undefined && entry.userAnswer !== null
      ? String(entry.userAnswer).slice(0, 255)
      : '';
    const timeSpent = Number(entry.timeSpent || entry.time_spent || 0);
    const problemType = entry.problemType || entry.type || null;

    cleaned.push({
      problemId,
      isCorrect,
      userAnswer,
      timeSpent: Number.isFinite(timeSpent) && timeSpent >= 0 ? Math.round(timeSpent) : 0,
      problemType: problemType ? String(problemType) : null
    });
  });

  return cleaned;
}

async function recordStudySession(userId, rawResults = []) {
  const numericUserId = Number(userId);
  if (!Number.isInteger(numericUserId) || numericUserId <= 0) {
    throw new Error('Invalid userId');
  }

  const userRow = await database.get('SELECT id, points, tier, name, username, school, grade FROM users WHERE id = ?', [numericUserId]);
  if (!userRow) {
    throw new Error('User not found');
  }

  const results = sanitizeResults(rawResults);
  if (!results.length) {
    return {
      summary: { total: 0, correct: 0, incorrect: 0, accuracy: 0, pointsDelta: 0, totalPoints: Number(userRow.points) || 0 },
      stats: await getUserStats(numericUserId),
      rank: await getUserRank(numericUserId),
      updatedUser: {
        ...userRow,
        points: Number(userRow.points) || 0,
        tier: userRow.tier
      }
    };
  }

  let correct = 0;
  for (const entry of results) {
    if (entry.isCorrect) correct += 1;
    try {
      await database.run(
        'INSERT INTO study_records (user_id, problem_id, is_correct, user_answer, time_spent) VALUES (?, ?, ?, ?, ?)',
        [numericUserId, entry.problemId, entry.isCorrect ? 1 : 0, entry.userAnswer, entry.timeSpent]
      );
    } catch (error) {
      console.warn('[studyService] failed to insert study record:', error?.message || error);
    }
    try {
      const resultLabel = entry.isCorrect ? 'correct' : 'incorrect';
      const correctIncrement = entry.isCorrect ? 1 : 0;
      const incorrectIncrement = entry.isCorrect ? 0 : 1;
      await database.run(
        "INSERT INTO problem_exposures (user_id, problem_id, first_seen_at, last_seen_at, exposure_count, last_result, correct_count, incorrect_count, last_answered_at) " +
          "VALUES (?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 1, ?, ?, ?, CURRENT_TIMESTAMP) " +
          "ON CONFLICT(user_id, problem_id) DO UPDATE SET last_result = excluded.last_result, last_answered_at = CURRENT_TIMESTAMP, last_seen_at = CURRENT_TIMESTAMP, correct_count = COALESCE(problem_exposures.correct_count, 0) + excluded.correct_count, incorrect_count = COALESCE(problem_exposures.incorrect_count, 0) + excluded.incorrect_count",
        [numericUserId, entry.problemId, resultLabel, correctIncrement, incorrectIncrement]
      );
    } catch (error) {
      console.warn('[studyService] failed to update exposure outcome:', error?.message || error);
    }
  }

  const incorrect = results.length - correct;
  const basePoints = Number(userRow.points) || 0;
  const delta = correct * POINTS_CORRECT + incorrect * POINTS_INCORRECT;
  const totalPoints = Math.max(0, basePoints + delta);
  const tierInfo = getTierInfo(totalPoints);

  await database.run(
    'UPDATE users SET points = ?, tier = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    [totalPoints, tierInfo.name, numericUserId]
  );

  const stats = await getUserStats(numericUserId);
  const rank = await getUserRank(numericUserId);

  try {
    await database.run(
      `INSERT INTO study_session_logs (user_id, total_problems, correct, incorrect, accuracy, points_delta, total_points_after)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        numericUserId,
        results.length,
        correct,
        incorrect,
        results.length ? Math.round((correct / results.length) * 1000) / 10 : 0,
        delta,
        totalPoints
      ]
    );
  } catch (logError) {
    console.warn('[studyService] failed to log study session:', logError?.message || logError);
  }

  try {
    await clearStudySession({ userId: numericUserId, reason: 'submitted' });
  } catch (sessionError) {
    console.warn('[studyService] failed to clear saved session:', sessionError?.message || sessionError);
  }

  return {
    summary: {
      total: results.length,
      correct,
      incorrect,
      accuracy: results.length ? Math.round((correct / results.length) * 1000) / 10 : 0,
      pointsDelta: delta,
      totalPoints
    },
    stats,
    rank,
    updatedUser: {
      id: numericUserId,
      name: userRow.name,
      username: userRow.username,
      school: userRow.school,
      grade: userRow.grade,
      points: totalPoints,
      tier: tierInfo.name,
      tierInfo
    }
  };
}

async function getUserStats(userId) {
  const numericUserId = Number(userId);
  if (!Number.isInteger(numericUserId) || numericUserId <= 0) {
    throw new Error('Invalid userId');
  }

  const totals = await database.get(
    'SELECT COUNT(*) AS totalProblems, SUM(CASE WHEN is_correct = 1 THEN 1 ELSE 0 END) AS totalCorrect FROM study_records WHERE user_id = ?',
    [numericUserId]
  );

  const totalProblems = Number(totals?.totalProblems) || 0;
  const totalCorrect = Number(totals?.totalCorrect) || 0;
  const accuracy = totalProblems ? Math.round((totalCorrect / totalProblems) * 1000) / 10 : 0;

  const sessionsRow = await database.get(
    'SELECT COUNT(*) AS sessions FROM study_session_logs WHERE user_id = ?',
    [numericUserId]
  );

  const weeklyRow = await database.get(
    "SELECT COUNT(*) AS sessions FROM study_session_logs WHERE user_id = ? AND created_at >= datetime('now', '-7 days')",
    [numericUserId]
  );

  let totalSessions = Number(sessionsRow?.sessions) || 0;
  let weeklySessions = Number(weeklyRow?.sessions) || 0;

  if (totalSessions === 0) {
    const legacySessions = await database.get(
      "SELECT COUNT(DISTINCT DATE(created_at)) AS sessions FROM study_records WHERE user_id = ?",
      [numericUserId]
    );
    totalSessions = Number(legacySessions?.sessions) || 0;
  }

  if (weeklySessions === 0) {
    const legacyWeekly = await database.get(
      "SELECT COUNT(DISTINCT DATE(created_at)) AS sessions FROM study_records WHERE user_id = ? AND created_at >= datetime('now', '-7 days')",
      [numericUserId]
    );
    weeklySessions = Number(legacyWeekly?.sessions) || 0;
  }

  const typeRows = await database.all(
    `SELECT p.type AS type,
            COUNT(*) AS total,
            SUM(CASE WHEN sr.is_correct = 1 THEN 1 ELSE 0 END) AS correct
       FROM study_records sr
       JOIN problems p ON p.id = sr.problem_id
      WHERE sr.user_id = ?
   GROUP BY p.type
   ORDER BY total DESC`,
    [numericUserId]
  );

  const perType = typeRows.map((row) => {
    const total = Number(row.total) || 0;
    const correct = Number(row.correct) || 0;
    const typeAccuracy = total ? Math.round((correct / total) * 1000) / 10 : 0;
    return {
      type: row.type || 'unknown',
      total,
      correct,
      incorrect: Math.max(0, total - correct),
      accuracy: typeAccuracy
    };
  });

  const mockExamEntry = perType.find((entry) => entry.type === 'mock_exam') || null;

  return {
    totalProblems,
    totalCorrect,
    accuracy,
    totalSessions,
    weeklySessions,
    perType,
    mockExam: mockExamEntry
  };
}

async function getUserRank(userId) {
  const numericUserId = Number(userId);
  if (!Number.isInteger(numericUserId) || numericUserId <= 0) {
    throw new Error('Invalid userId');
  }

  const hasIsActive = await database.hasColumn('users', 'is_active');

  const userRow = await database.get(
    hasIsActive
      ? 'SELECT id, points, COALESCE(created_at, "1970-01-01") AS created_at, COALESCE(is_active, 1) AS is_active FROM users WHERE id = ?'
      : 'SELECT id, points, COALESCE(created_at, "1970-01-01") AS created_at, 1 AS is_active FROM users WHERE id = ?',
    [numericUserId]
  );

  const points = Number(userRow?.points) || 0;
  const tier = getTierInfo(points);
  const nextTier = getNextTier(tier);

  if (!userRow || !userRow.is_active) {
    return {
      rank: null,
      points,
      tier,
      nextTier,
      progressToNext: nextTier ? calculateProgress(points, tier, nextTier) : 100
    };
  }

  let rank = null;
  if (points > 0) {
    const activeClause = hasIsActive ? ' AND COALESCE(is_active, 1) = 1' : '';
    const rankRow = await database.get(
      `SELECT COUNT(*) + 1 AS rank
         FROM users
        WHERE points > 0${activeClause}
          AND (
                points > ?
             OR (points = ? AND COALESCE(created_at, '1970-01-01') < COALESCE(?, '1970-01-01'))
             OR (points = ? AND COALESCE(created_at, '1970-01-01') = COALESCE(?, '1970-01-01') AND id < ?)
          )`,
      [
        points,
        points,
        userRow.created_at,
        points,
        userRow.created_at,
        numericUserId
      ]
    );
    rank = rankRow?.rank ?? 1;
  }

  return {
    rank,
    points,
    tier,
    nextTier,
    progressToNext: nextTier ? calculateProgress(points, tier, nextTier) : 100
  };
}

module.exports = {
  recordStudySession,
  getUserStats,
  getUserRank
};
