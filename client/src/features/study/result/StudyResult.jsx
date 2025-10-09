import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { api } from '../../../services/api.service';
import tierConfig from '../../../config/tierConfig.json';
import { palette, layoutStyles } from './resultStyles';
import ResultEffects from './components/ResultEffects';
import RankPanel from './components/RankPanel';
import ResultCard from './components/ResultCard';

const TYPE_LABELS = {
  blank: '빈칸',
  order: '순서 배열',
  insertion: '문장 삽입',
  grammar: '어법',
  vocabulary: '어휘',
  title: '제목',
  theme: '주제',
  summary: '요약',
  implicit: '함축 의미',
  irrelevant: '무관 문장',
};

const StudyResult = ({ results, onRestart, onReview, onHome }) => {
  const { user } = useAuth();
  const [currentLpCount, setCurrentLpCount] = useState(0);
  const [myRank, setMyRank] = useState(null);
  const [nearby, setNearby] = useState([]);
  const [rankError, setRankError] = useState(null);

  const ensureNumber = (value, fallback = 0) => {
    const num = Number(value);
    return Number.isFinite(num) ? num : fallback;
  };

  const fallbackSummary = {
    total: ensureNumber(results?.totalProblems, 0),
    correct: ensureNumber(results?.totalCorrect, 0),
    accuracy: ensureNumber(results?.accuracy, 0),
    pointsDelta: ensureNumber(results?.earnedPoints, 0),
    totalPoints: ensureNumber(user?.points, 0),
  };
  fallbackSummary.incorrect = Math.max(0, fallbackSummary.total - fallbackSummary.correct);

  const summaryRaw = results?.summary || {};
  const summary = {
    total: ensureNumber(summaryRaw.total, fallbackSummary.total),
    correct: ensureNumber(summaryRaw.correct, fallbackSummary.correct),
    incorrect: ensureNumber(summaryRaw.incorrect, fallbackSummary.incorrect),
    accuracy: ensureNumber(summaryRaw.accuracy, fallbackSummary.accuracy),
    pointsDelta: ensureNumber(summaryRaw.pointsDelta, fallbackSummary.pointsDelta),
    totalPoints: ensureNumber(summaryRaw.totalPoints, fallbackSummary.totalPoints),
  };

  const totalTimeSeconds = ensureNumber(results?.totalTime, 0);
  const perTypeStats = Array.isArray(results?.stats?.perType) ? results.stats.perType : [];
  const detailResults = (results?.studyResults || results?.problems || []).map((item) => ({
    userAnswer: item.userAnswer ?? item.answer ?? '',
    correctAnswer: item.correctAnswer ?? item.problem?.answer ?? '',
    isCorrect: typeof item.isCorrect === 'boolean' ? item.isCorrect : Boolean(item.correct),
    timeSpent: item.timeSpent ?? item.elapsed ?? 0,
  }));

  useEffect(() => {
    setCurrentLpCount(0);
    const { pointsDelta } = summary;
    if (!pointsDelta) return undefined;

    const step = Math.max(1, Math.floor(Math.abs(pointsDelta) / 50));
    const direction = pointsDelta >= 0 ? 1 : -1;
    const interval = setInterval(() => {
      setCurrentLpCount((prev) => {
        const next = prev + direction * step;
        if ((direction > 0 && next >= pointsDelta) || (direction < 0 && next <= pointsDelta)) {
          clearInterval(interval);
          return pointsDelta;
        }
        return next;
      });
    }, 30);

    return () => clearInterval(interval);
  }, [summary.pointsDelta]);

  useEffect(() => {
    if (results?.rank) {
      setMyRank(results.rank);
    }
  }, [results?.rank]);

  useEffect(() => {
    const loadRank = async () => {
      try {
        const data = await api.ranking.myRank();
        setMyRank(data?.myRank || null);
        setNearby(data?.nearbyUsers || []);
      } catch (error) {
        setRankError('랭킹 정보를 불러오는 중 오류가 발생했습니다.');
      }
    };
    loadRank();
  }, []);

  const formatTypeLabel = (type) => TYPE_LABELS[type] || type;

  const formatLpDelta = (value) => {
    if (!value) return '0';
    return value > 0 ? `+${value}` : `${value}`;
  };

  const getTierInfo = (pointsOverride) => {
    const points = pointsOverride !== undefined ? pointsOverride : user?.points || 0;
    return (
      tierConfig.tiers.find((tier) => points >= tier.minLP && (tier.maxLP === -1 || points <= tier.maxLP))
      || tierConfig.tiers[0]
    );
  };

  const getResultInfo = (accuracy) => {
    const acc = parseFloat(accuracy);
    if (acc >= 90) {
      return {
        grade: 'A+',
        color: palette.success,
        bgColor: palette.successGradient,
        message: '🎉 축하합니다! 완벽한 성과입니다!',
        effect: 'celebration',
        emoji: '🎊✨🏆',
      };
    }
    if (acc >= 80) {
      return {
        grade: 'A',
        color: palette.accent,
        bgColor: palette.accentGradient,
        message: '👏 잘했어요! 훌륭한 실력입니다!',
        effect: 'good',
        emoji: '👍🌟💪',
      };
    }
    if (acc >= 50) {
      return {
        grade: 'B',
        color: palette.warning,
        bgColor: palette.warningGradientStrong,
        message: '📈 좋아요! 조금만 더 노력하면 완벽해요!',
        effect: 'encourage',
        emoji: '💪📚🎯',
      };
    }
    return {
      grade: 'C',
      color: palette.danger,
      bgColor: palette.dangerGradient,
      message: '🤗 괜찮아요! 다시 도전해서 실력을 늘려보아요!',
      effect: 'comfort',
      emoji: '🤗💝🌈',
    };
  };

  const resultInfo = getResultInfo(summary.accuracy);
  const tierInfo = getTierInfo(summary.totalPoints);

  const summaryPayload = useMemo(() => ({
    accuracy: summary.accuracy,
    totalCorrect: summary.correct,
    totalIncorrect: summary.incorrect,
    totalTimeSeconds,
    totalPoints: summary.totalPoints,
    pointsDelta: summary.pointsDelta,
  }), [summary, totalTimeSeconds]);

  return (
    <div style={pageStyles.wrapper}>
      <ResultEffects effect={resultInfo.effect} emojiSet={resultInfo.emoji} />
      <div style={pageStyles.content}>
        <div style={layoutStyles.container}>
          <RankPanel myRank={myRank} nearby={nearby} rankError={rankError} />
          <ResultCard
            resultInfo={resultInfo}
            summary={summaryPayload}
            tierInfo={tierInfo}
            userPoints={user?.points || 0}
            currentLpCount={currentLpCount}
            perTypeStats={perTypeStats}
            detailResults={detailResults}
            formatTypeLabel={formatTypeLabel}
            formatLpDelta={formatLpDelta}
            onReview={onReview}
            onRestart={onRestart}
            onHome={onHome}
          />
        </div>
      </div>
    </div>
  );
};

const pageStyles = {
  wrapper: {
    position: 'relative',
    minHeight: '100vh',
    background: palette.slateGradient,
    padding: '32px 16px',
    overflow: 'hidden',
  },
  content: {
    position: 'relative',
    zIndex: 5,
  },
};

export default StudyResult;
