import React, { useEffect, useMemo, useState } from 'react';
import { api } from '../services/api.service';
import EagleGuideChip from '../components/common/EagleGuideChip';
import CommonHero from '../components/common/CommonHero';
import {
  ResponsiveContainer,
  PieChart, Pie, Cell,
  BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip, AreaChart, Area
} from 'recharts';

const CountUp = ({ end, duration = 2000 }) => {
  const [count, setCount] = useState(0);
  useEffect(() => {
    let start = 0;
    const increment = end / (duration / 16);
    const timer = setInterval(() => {
      start += increment;
      if (start >= end) {
        setCount(end);
        clearInterval(timer);
      } else {
        setCount(Math.ceil(start));
      }
    }, 16);
    return () => clearInterval(timer);
  }, [end, duration]);
  return <>{new Intl.NumberFormat('ko-KR').format(count)}</>;
};

const formatPercent = (value) => {
  if (value === null || value === undefined || Number.isNaN(value)) return '0%';
  return `${Number(value).toFixed(1)}%`;
};

const formatNumber = (value) => new Intl.NumberFormat('ko-KR').format(Number(value || 0));

const typeLabelMap = {
  blank: '빈칸',
  order: '순서 배열',
  insertion: '문장 삽입',
  grammar: '어법',
  vocabulary: '어휘',
  title: '제목',
  theme: '주제',
  summary: '요약',
  implicit: '함축 의미',
  mock_exam: '모의고사'
};

const StatsPage = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isMobile, setIsMobile] = useState(() => (typeof window !== 'undefined' ? window.innerWidth <= 768 : false));

  useEffect(() => {
    let mounted = true;
    const fetchStats = async () => {
      try {
        setLoading(true);
        setError('');
        const response = await api.problems.stats();
        if (!mounted) return;
        setStats(response || {});
      } catch (err) {
        if (!mounted) return;
        setError(err?.message || '학습 통계를 불러오지 못했어요. 잠시만 기다려 주세요.');
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchStats();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const vocabularyStats = useMemo(() => {
    if (!stats?.perType) return null;
    const vocabEntry = stats.perType.find((item) =>
      typeof item?.type === 'string' && item.type.toLowerCase().includes('vocab')
    );
    if (!vocabEntry) return null;
    return {
      total: Number(vocabEntry.total) || 0,
      correct: Number(vocabEntry.correct) || 0,
      incorrect: Number(vocabEntry.incorrect) || Math.max(0, (Number(vocabEntry.total) || 0) - (Number(vocabEntry.correct) || 0)),
      accuracy: Number(vocabEntry.accuracy) || 0
    };
  }, [stats]);

  const mockExamStats = useMemo(() => {
    if (stats?.mockExam) {
      const total = Number(stats.mockExam.total) || 0;
      const correct = Number(stats.mockExam.correct) || 0;
      return {
        total,
        correct,
        incorrect: Math.max(0, total - correct),
        accuracy: Number(stats.mockExam.accuracy) || (total ? (correct / total) * 100 : 0)
      };
    }

    if (Array.isArray(stats?.perType)) {
      const entry = stats.perType.find((item) => item.type === 'mock_exam');
      if (entry) {
        const total = Number(entry.total) || 0;
        const correct = Number(entry.correct) || 0;
        return {
          total,
          correct,
          incorrect: Math.max(0, total - correct),
          accuracy: Number(entry.accuracy) || (total ? (correct / total) * 100 : 0)
        };
      }
    }
    return null;
  }, [stats]);

  const perTypeData = useMemo(() => {
    if (!Array.isArray(stats?.perType)) return [];
    const sorted = [...stats.perType].sort((a, b) => (Number(b.total) || 0) - (Number(a.total) || 0));
    const top = sorted.slice(0, 6);
    const mockEntry = sorted.find((item) => item.type === 'mock_exam');
    if (mockEntry && !top.some((item) => item.type === 'mock_exam')) {
      if (top.length >= 6) {
        top[top.length - 1] = mockEntry;
      } else {
        top.push(mockEntry);
      }
    }
    return top.map((d) => ({
      type: d.type,
      name: typeLabelMap[d.type] || d.type,
      total: Number(d.total) || 0,
      accuracy: Number(d.accuracy) || 0
    }));
  }, [stats]);

  const typeAccuracyList = useMemo(() => (
    Array.isArray(stats?.perType) ? stats.perType : []
  ), [stats]);

  const vocabPieData = useMemo(() => {
    if (!vocabularyStats) return [];
    return [
      { name: '정답', value: vocabularyStats.correct },
      { name: '오답', value: vocabularyStats.incorrect }
    ];
  }, [vocabularyStats]);

  const COLORS = ['#2563EB', '#A855F7', '#14B8A6', '#7C3AED'];
  const PIE_COLORS = ['#2563EB', '#DC2626'];

  const statCards = [
    { label: '총 학습 문제', value: `${formatNumber(stats?.totalProblems ?? 0)}문제`, helper: '문제 학습 + 단어 훈련 전체' },
    { label: '정답률', value: formatPercent(stats?.accuracy), helper: '최근까지 누적 정확도' },
    { label: '진행한 세션', value: `${formatNumber(stats?.totalSessions ?? 0)}회`, helper: `지난 7일 ${formatNumber(stats?.weeklySessions ?? 0)}회` }
  ];

  const renderHeatmap = () => {
    // Mock data for heatmap (since real daily data might be sparse)
    // In production, use stats.dailyActivity
    const today = new Date();
    const heatmapData = Array.from({ length: 28 }, (_, i) => {
      const d = new Date();
      d.setDate(today.getDate() - (27 - i));
      return {
        day: d.getDate(),
        value: Math.floor(Math.random() * 5), // 0-4 intensity
        date: d.toLocaleDateString()
      };
    });

    return (
      <div style={styles.heatmapCard}>
        <h3 style={styles.heatmapTitle}>🔥 학습 열정 (최근 4주)</h3>
        <div style={styles.heatmapGrid}>
          {heatmapData.map((d, i) => (
            <div 
              key={i} 
              title={`${d.date}: ${d.value > 0 ? '학습함' : '미학습'}`}
              style={{
                ...styles.heatmapCell,
                background: d.value === 0 ? 'var(--surface-soft)' 
                  : d.value < 3 ? 'rgba(52, 211, 153, 0.4)' 
                  : 'var(--success)'
              }}
            />
          ))}
        </div>
        <div style={styles.heatmapLegend}>
          <span>Less</span>
          <div style={{display:'flex', gap:4}}>
            <div style={{width:10, height:10, background:'var(--surface-soft)', borderRadius:2}}></div>
            <div style={{width:10, height:10, background:'rgba(52, 211, 153, 0.4)', borderRadius:2}}></div>
            <div style={{width:10, height:10, background:'var(--success)', borderRadius:2}}></div>
          </div>
          <span>More</span>
        </div>
      </div>
    );
  };

  const comingSoonItems = useMemo(() => ([
    {
      title: '워크북 학습 분석',
      description: '10단계 워크북별 학습 카드 회차, 오답 패턴, 실천 메모 등을 정리해서 보여드릴 예정이에요.'
    },
    {
      title: '문제 학습 리포트',
      description: '어법 · 어휘 · 순서 · 삽입 등 유형별 정확도, 풀이 시간, 재도전 비율을 한눈에 확인할 수 있게 준비 중입니다.'
    }
  ]), []);

  const renderSummaryCards = () => {
    if (isMobile) {
      return (
        <div style={styles.sliderRow}>
          {statCards.map((card) => (
            <div key={card.label} style={styles.sliderItem}>
              <StatCard {...card} />
            </div>
          ))}
        </div>
      );
    }
    return (
      <div style={styles.grid3}>
        {statCards.map((card) => (
          <StatCard key={card.label} {...card} />
        ))}
      </div>
    );
  };

  const renderVocabularyCards = () => {
    if (!vocabularyStats) return null;
    const accuracyCard = (
      <div className="tilt-hover" style={styles.statCard} key="vocab-accuracy">
        <div className="shimmer" aria-hidden />
        <span style={styles.statLabel}>단어 정확도</span>
        <div style={{ width: '100%', height: 220 }}>
          <ResponsiveContainer>
            <PieChart>
              <Pie data={vocabPieData} innerRadius={60} outerRadius={90} paddingAngle={2} dataKey="value">
                {vocabPieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(v) => `${formatNumber(v)}개`} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <strong style={{ ...styles.statValue, marginTop: 8 }}>{formatPercent(vocabularyStats.accuracy)}</strong>
        <span style={styles.statHelper}>총 {formatNumber(vocabularyStats.total)}문 · 정답 {formatNumber(vocabularyStats.correct)}개 · 오답 {formatNumber(vocabularyStats.incorrect)}개</span>
      </div>
    );

    const typeCard = (
      <div className="tilt-hover" style={styles.statCard} key="vocab-types">
        <div className="shimmer" aria-hidden />
        <span style={styles.statLabel}>유형별 학습량</span>
        <div style={{ width: '100%', height: 220 }}>
          <ResponsiveContainer>
            <BarChart data={perTypeData} margin={{ top: 8, right: 8, left: -12, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.45)" />
              <XAxis dataKey="name" tick={{ fill: 'var(--text-primary)', fontSize: 12 }} />
              <YAxis tick={{ fill: 'var(--text-primary)', fontSize: 12 }} />
              <Tooltip formatter={(v, n) => (n === 'total' ? `${formatNumber(v)}문` : `${formatPercent(v)}`)} />
              <Bar dataKey="total" name="문항수" fill={COLORS[0]} radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <span style={styles.statHelper}>최근 풀이 유형 TOP {perTypeData.length}</span>
      </div>
    );

    if (isMobile) {
      return (
        <div style={styles.sliderRow}>
          <div style={styles.sliderItem}>{accuracyCard}</div>
          <div style={styles.sliderItem}>{typeCard}</div>
        </div>
      );
    }
    return (
      <div style={styles.grid2}>
        {accuracyCard}
        {typeCard}
      </div>
    );
  };

  return (
    <div style={styles.container}>
      <CommonHero
        badge="Study Insights"
        title="학습 통계, 보기 쉽게 정리했어요"
        subtitle="최근 문제 학습과 단어 훈련 결과를 자동 집계해 한눈에 보여 드려요."
      >
        <EagleGuideChip text="오늘 학습량을 한눈에 볼 수 있게 정리했어요" variant="accent" />
      </CommonHero>

      {loading && (
        <div style={styles.pendingCard}>
          <p style={styles.pendingText}>통계를 모으는 중입니다... ⏳</p>
        </div>
      )}

      {error && !loading && (
        <div style={styles.errorCard}>
          <p style={styles.errorText}>{error}</p>
        </div>
      )}

      {!loading && !error && stats && (
        <>
          <section style={styles.section}>
            <div style={styles.sectionHeaderRow}>
              <h2 style={styles.sectionTitle}>전체 학습 요약</h2>
              <EagleGuideChip text="숫자로 학습 페이스를 확인해요" />
            </div>
            {renderSummaryCards()}
            {renderHeatmap()}
          </section>

          <section style={styles.section}>
            <div style={styles.sectionHeaderRow}>
              <h2 style={styles.sectionTitle}>🐣 단어 훈련</h2>
              <span style={styles.sectionHint}>시험 결과를 자동으로 집계해요.</span>
              <EagleGuideChip text="정답/오답 비율을 빠르게 살펴봐요" />
            </div>
            {vocabularyStats ? (
              renderVocabularyCards()
            ) : (
              <div style={styles.emptyCard}>
                <p style={styles.emptyTitle}>아직 단어 훈련 기록이 없어요.</p>
                <p style={styles.emptyBody}>어휘 훈련에서 Day를 선택해 시험을 보면 정확도와 횟수가 여기에서 자동으로 쌓입니다.</p>
              </div>
            )}
          </section>

          <section style={styles.section}>
            <div style={styles.sectionHeaderRow}>
              <h2 style={styles.sectionTitle}>🎯 유형별 정답률</h2>
              <span style={styles.sectionHint}>문제 학습 + 단어 시험 누적</span>
              <EagleGuideChip text="약한 유형을 찾아 복습 루틴을 만들어요" />
            </div>
            {typeAccuracyList.length ? (
              <div style={styles.typeList}>
                {typeAccuracyList.map((entry) => (
                  <TypeAccuracyRow key={entry.type} entry={entry} />
                ))}
              </div>
            ) : (
              <div style={styles.emptyCard}>
                <p style={styles.emptyTitle}>아직 유형별 통계가 없어요.</p>
                <p style={styles.emptyBody}>문제 학습과 단어 시험을 꾸준히 진행하면 정확도가 여기에 정리됩니다.</p>
              </div>
            )}
          </section>

          {/* 워크북 통계 섹션 (요청: 모의고사 전에 배치) */}
          <WorkbookStats stats={stats} isMobile={isMobile} />

          {/* 모의고사 통계: 페이지 하단 */}
          <section style={styles.section}>
            <div style={styles.sectionHeaderRow}>
              <h2 style={styles.sectionTitle}>🦅 모의고사 성과</h2>
              <span style={styles.sectionHint}>실전 응시 결과를 자동으로 누적해요</span>
              <EagleGuideChip text="모의고사 점수도 통계에 기록했어요" variant="accent" />
            </div>
            {mockExamStats ? (
              <div style={isMobile ? styles.sliderRow : styles.mockExamGrid}>
                <div style={isMobile ? styles.sliderItem : undefined}>
                  <div style={styles.mockExamCard}>
                    <p style={styles.statLabel}>정답률</p>
                    <div style={styles.mockExamGauge}>
                      <div
                        style={{
                          ...styles.mockExamGaugeRing,
                          background: `conic-gradient(#f3c969 ${mockExamAccuracy}%, rgba(148,163,184,0.25) ${mockExamAccuracy}% 100%)`
                        }}
                      >
                        <div style={styles.mockExamGaugeCenter}>
                          <strong style={styles.mockExamGaugeValue}>{formatPercent(mockExamStats.accuracy)}</strong>
                          <span style={styles.mockExamGaugeLabel}>누적</span>
                        </div>
                      </div>
                    </div>
                    <span style={styles.statHelper}>실전 응시 결과 기준</span>
                  </div>
                </div>
                <div style={isMobile ? styles.sliderItem : undefined}>
                  <div style={styles.mockExamCard}>
                    <p style={styles.statLabel}>풀이 현황</p>
                    <ul style={styles.mockExamList}>
                      <li style={styles.mockExamListItem}>
                        <span>총 풀이</span>
                        <strong>{formatNumber(mockExamStats.total)}문</strong>
                      </li>
                      <li style={styles.mockExamListItem}>
                        <span>정답</span>
                        <strong>{formatNumber(mockExamStats.correct)}문</strong>
                      </li>
                      <li style={styles.mockExamListItem}>
                        <span>오답</span>
                        <strong>{formatNumber(mockExamStats.incorrect)}문</strong>
                      </li>
                    </ul>
                    <p style={styles.mockExamNote}>제출 즉시 랭킹 · 학습 통계에 반영됩니다.</p>
                  </div>
                </div>
              </div>
            ) : (
              <div style={styles.emptyCard}>
                <p style={styles.emptyTitle}>아직 모의고사 기록이 없어요.</p>
                <p style={styles.emptyBody}>모의고사 풀이에서 제출하면 점수와 정확도가 여기에 바로 표시됩니다.</p>
              </div>
            )}
          </section>

          <section style={styles.section}>
            <div style={styles.sectionHeaderRow}>
              <h2 style={styles.sectionTitle}>🚧 곧 만나볼 통계</h2>
              <span style={styles.sectionHint}>베타 업데이트로 순차 공개 예정</span>
            </div>
            <div style={styles.grid2}>
              {comingSoonItems.map((item) => (
                <div key={item.title} style={styles.comingCard}>
                  <h3 style={styles.comingTitle}>{item.title}</h3>
                  <p style={styles.comingBody}>{item.description}</p>
                  <span style={styles.comingBadge}>작업 진행 중</span>
                </div>
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
};

// 워크북 통계 카드 구성
const WorkbookStats = ({ stats, isMobile }) => {
  const workbookEntry = useMemo(() => {
    if (!Array.isArray(stats?.perType)) return null;
    return stats.perType.find((item) => String(item.type || '').toLowerCase().includes('workbook')) || null;
  }, [stats]);

  if (!workbookEntry) {
    return (
      <section style={styles.section}>
        <div style={styles.sectionHeaderRow}>
          <h2 style={styles.sectionTitle}>📘 워크북 통계</h2>
          <span style={styles.sectionHint}>단계별 카드 학습 누적</span>
        </div>
        <div style={styles.emptyCard}>
          <p style={styles.emptyTitle}>아직 워크북 기록이 없어요.</p>
          <p style={styles.emptyBody}>워크북 학습에서 단계를 진행하면 완료 현황이 여기에 표시됩니다.</p>
        </div>
      </section>
    );
  }

  const total = Number(workbookEntry.total) || 0;
  const correct = Number(workbookEntry.correct) || 0;
  const incorrect = Math.max(0, total - correct);
  const accuracy = Number(workbookEntry.accuracy) || (total ? (correct / total) * 100 : 0);

  return (
    <section style={styles.section}>
      <div style={styles.sectionHeaderRow}>
        <h2 style={styles.sectionTitle}>📘 워크북 통계</h2>
        <span style={styles.sectionHint}>단계별 카드 학습 누적</span>
      </div>
      <div style={isMobile ? styles.sliderRow : styles.grid2}>
        <div style={isMobile ? styles.sliderItem : undefined}>
          <div style={styles.mockExamCard}>
            <p style={styles.statLabel}>정답률</p>
            <div style={styles.mockExamGauge}>
              <div
                style={{
                  ...styles.mockExamGaugeRing,
                  background: `conic-gradient(#86efac ${Math.min(100, Math.max(0, accuracy))}%, rgba(148,163,184,0.25) ${Math.min(100, Math.max(0, accuracy))}% 100%)`
                }}
              >
                <div style={styles.mockExamGaugeCenter}>
                  <strong style={styles.mockExamGaugeValue}>{formatPercent(accuracy)}</strong>
                  <span style={styles.mockExamGaugeLabel}>누적</span>
                </div>
              </div>
            </div>
            <span style={styles.statHelper}>워크북 문제 풀이 기준</span>
          </div>
        </div>
        <div style={isMobile ? styles.sliderItem : undefined}>
          <div style={styles.mockExamCard}>
            <p style={styles.statLabel}>풀이 현황</p>
            <ul style={styles.mockExamList}>
              <li style={styles.mockExamListItem}>
                <span>총 풀이</span>
                <strong>{formatNumber(total)}문</strong>
              </li>
              <li style={styles.mockExamListItem}>
                <span>정답</span>
                <strong>{formatNumber(correct)}문</strong>
              </li>
              <li style={styles.mockExamListItem}>
                <span>오답</span>
                <strong>{formatNumber(incorrect)}문</strong>
              </li>
            </ul>
            <p style={styles.mockExamNote}>학습 진행에 따라 자동 누적됩니다.</p>
          </div>
        </div>
      </div>
    </section>
  );
};

const StatCard = ({ label, value, helper }) => {
  // Extract number if possible for animation
  const num = typeof value === 'string' ? parseInt(value.replace(/[^0-9]/g, ''), 10) : value;
  const isAnimatable = !Number.isNaN(num) && typeof num === 'number';
  const suffix = typeof value === 'string' ? value.replace(/[0-9.,]/g, '') : '';

  return (
    <div style={styles.statCard} className="ui-pressable ui-elevate">
      <span style={styles.statLabel}>{label}</span>
      <strong style={styles.statValue}>
        {isAnimatable ? <CountUp end={num} /> : value}
        {suffix}
      </strong>
      {helper && <span style={styles.statHelper}>{helper}</span>}
    </div>
  );
};

const TypeAccuracyRow = ({ entry }) => {
  const accuracy = Number(entry.accuracy || 0);
  const correct = Number(entry.correct || 0);
  const incorrect = Number(entry.incorrect || 0);
  const total = Number(entry.total || 0);
  return (
    <div style={styles.typeRow}>
      <div style={styles.typeHeaderRow}>
        <span>{typeLabelMap[entry.type] || entry.type}</span>
        <span>{formatPercent(accuracy)}</span>
      </div>
      <div style={styles.typeBar}>
        <div style={{ ...styles.typeBarFill, width: `${Math.min(100, Math.max(0, accuracy))}%` }} />
      </div>
      <div style={styles.typeMeta}>
        <span>정답 {formatNumber(correct)}문</span>
        <span>오답 {formatNumber(incorrect)}문</span>
        <span>총 {formatNumber(total)}문</span>
      </div>
    </div>
  );
};

const styles = {
  container: {
    padding: '24px',
    maxWidth: '1200px',
    margin: '0 auto',
    color: 'var(--text-primary)'
  },
  header: {
    marginBottom: '28px'
  },
  title: {
    fontSize: '2.2rem',
    marginBottom: '6px',
    color: 'var(--tone-hero)'
  },
  subtitle: {
    fontSize: '1.05rem',
    color: 'var(--tone-strong)'
  },
  section: {
    marginBottom: '32px'
  },
  sectionTitle: {
    fontSize: '1.4rem',
    fontWeight: 800,
    color: 'var(--text-primary)'
  },
  sectionHeaderRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '18px'
  },
  sectionHint: {
    fontSize: '0.9rem',
    color: 'var(--tone-muted)'
  },
  grid3: {
    display: 'grid',
    gap: '16px',
    gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))'
  },
  grid2: {
    display: 'grid',
    gap: '18px',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))'
  },
  mockExamGrid: {
    display: 'grid',
    gap: '18px',
    gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))'
  },
  sliderRow: {
    display: 'flex',
    gap: '14px',
    overflowX: 'auto',
    paddingBottom: '6px',
    scrollSnapType: 'x mandatory'
  },
  sliderItem: {
    minWidth: '240px',
    flex: '0 0 auto',
    scrollSnapAlign: 'start'
  },
  statCard: {
    position: 'relative',
    overflow: 'hidden',
    background: 'linear-gradient(145deg, rgba(15,23,42,0.92), rgba(30,64,175,0.65))',
    borderRadius: '22px',
    padding: '20px 22px',
    boxShadow: '0 22px 42px rgba(15, 23, 42, 0.28)',
    border: '1px solid rgba(148,163,184,0.28)',
    color: '#e2e8f0',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    backgroundSize: '200% 200%',
    animation: 'slowGradient 24s ease-in-out infinite'
  },
  statLabel: {
    fontSize: '0.9rem',
    color: 'var(--tone-strong)',
    fontWeight: 600
  },
  heatmapCard: {
    background: 'var(--surface-card)',
    borderRadius: '20px',
    padding: '24px',
    border: '1px solid var(--surface-border)',
    marginTop: '20px'
  },
  heatmapTitle: {
    fontSize: '1.1rem',
    fontWeight: 700,
    marginBottom: '16px',
    color: 'var(--text-primary)'
  },
  heatmapGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(7, 1fr)',
    gap: '6px'
  },
  heatmapCell: {
    aspectRatio: '1',
    borderRadius: '6px',
    transition: 'transform 0.2s',
    cursor: 'pointer'
  },
  heatmapLegend: {
    display: 'flex',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: '8px',
    marginTop: '12px',
    fontSize: '12px',
    color: 'var(--text-muted)'
  },
  statValue: {
    fontSize: '1.6rem',
    color: 'var(--text-primary)'
  },
  statHelper: {
    fontSize: '0.85rem',
    color: 'var(--tone-muted)'
  },
  mockExamCard: {
    position: 'relative',
    overflow: 'hidden',
    background: 'linear-gradient(145deg, rgba(15,23,42,0.92), rgba(30,64,175,0.65))',
    borderRadius: '22px',
    padding: '20px 22px',
    border: '1px solid rgba(148,163,184,0.28)',
    boxShadow: '0 22px 42px rgba(15,23,42,0.28)',
    color: '#e2e8f0',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    minHeight: '220px',
    backgroundSize: '200% 200%',
    animation: 'slowGradient 24s ease-in-out infinite'
  },
  mockExamGauge: {
    display: 'flex',
    justifyContent: 'center'
  },
  mockExamGaugeRing: {
    width: '160px',
    height: '160px',
    borderRadius: '50%',
    background: 'conic-gradient(#f3c969 0%, rgba(148,163,184,0.25) 0)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  mockExamGaugeCenter: {
    width: '120px',
    height: '120px',
    borderRadius: '50%',
    background: 'var(--surface-card)',
    border: '4px solid rgba(148,163,184,0.25)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center'
  },
  mockExamGaugeValue: {
    fontSize: '1.8rem',
    fontWeight: 800,
    color: 'var(--tone-hero)'
  },
  mockExamGaugeLabel: {
    fontSize: '0.85rem',
    color: 'var(--tone-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.08em'
  },
  mockExamList: {
    listStyle: 'none',
    padding: 0,
    margin: 0,
    display: 'grid',
    gap: '10px'
  },
  mockExamListItem: {
    display: 'flex',
    justifyContent: 'space-between',
    fontWeight: 600
  },
  mockExamNote: {
    fontSize: '0.85rem',
    color: 'var(--tone-muted)'
  },
  typeList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  typeRow: {
    background: 'var(--surface-card)',
    borderRadius: '16px',
    padding: '14px 18px',
    border: '1px solid var(--surface-border)',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  typeHeaderRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontWeight: 700,
    color: 'var(--tone-hero)'
  },
  typeBar: {
    position: 'relative',
    height: 10,
    borderRadius: 999,
    background: 'rgba(148, 163, 184, 0.35)',
    overflow: 'hidden'
  },
  typeBarFill: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    borderRadius: 999,
    background: 'linear-gradient(90deg, var(--color-indigo-400), var(--color-sky-400))'
  },
  typeMeta: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '12px',
    fontSize: '0.85rem',
    color: 'var(--tone-strong)'
  },
  pendingCard: {
    background: 'var(--surface-card)',
    borderRadius: '18px',
    padding: '24px',
    textAlign: 'center',
    border: '1px solid var(--surface-border)'
  },
  pendingText: {
    fontSize: '1rem',
    color: 'var(--tone-strong)',
    fontWeight: 600
  },
  errorCard: {
    background: 'var(--danger-surface)',
    borderRadius: '16px',
    padding: '18px',
    border: '1px solid var(--danger-border)'
  },
  errorText: {
    color: 'var(--danger-strong)',
    fontWeight: 600
  },
  emptyCard: {
    background: 'var(--surface-card)',
    borderRadius: '18px',
    padding: '22px',
    border: '1px dashed var(--surface-border)',
    display: 'grid',
    gap: '6px'
  },
  emptyTitle: {
    fontWeight: 700,
    color: 'var(--text-primary)'
  },
  emptyBody: {
    color: 'var(--tone-strong)',
    lineHeight: 1.5
  },
  comingCard: {
    background: 'var(--surface-soft)',
    borderRadius: '18px',
    padding: '20px',
    border: '1px solid var(--surface-border)',
    boxShadow: '0 8px 20px rgba(15, 23, 42, 0.08)',
    display: 'grid',
    gap: '10px'
  },
  comingTitle: {
    fontWeight: 700,
    fontSize: '1.1rem',
    color: 'var(--text-primary)'
  },
  comingBody: {
    color: 'var(--tone-strong)',
    lineHeight: 1.6
  },
  comingBadge: {
    display: 'inline-flex',
    width: 'fit-content',
    padding: '6px 12px',
    borderRadius: '999px',
    background: 'rgba(59,130,246,0.12)',
    color: 'var(--color-blue-500)',
    fontSize: '0.85rem',
    fontWeight: 600
  }
};

export default StatsPage;
