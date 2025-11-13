import React, { useEffect, useMemo, useState } from 'react';
import { api } from '../services/api.service';
import CommonHero from '../components/common/CommonHero';

const PAGE_SIZE = 30;

const StudyHistoryPage = () => {
  const [items, setItems] = useState([]);
  const [order, setOrder] = useState('desc');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [offset, setOffset] = useState(0);

  const load = async (opts = {}) => {
    try {
      setLoading(true);
      setError('');
      const nextOrder = opts.order || order;
      const nextOffset = typeof opts.offset === 'number' ? opts.offset : offset;
      const res = await api.problems.history({ order: nextOrder, limit: PAGE_SIZE, offset: nextOffset });
      if (Array.isArray(res?.data)) {
        setItems(res.data);
        setOrder(res.order || nextOrder);
        setOffset(res.offset || nextOffset);
      } else {
        setItems([]);
      }
    } catch (err) {
      setError(err?.message || '문제 풀이 이력을 불러오지 못했어요.');
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load({ offset: 0 }); }, []);

  const nextDisabled = items.length < PAGE_SIZE;
  const prevDisabled = offset <= 0;

  return (
    <div style={styles.container}>
      <CommonHero
        badge="Study History"
        title="내가 푼 문제 보관함"
        subtitle="복습용 보관함이에요. 이력은 최신순/과거순으로 정렬해서 볼 수 있어요. (LP에는 재반영되지 않습니다)"
      />

      <div style={styles.toolbar}>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            type="button"
            style={{ ...styles.orderButton, ...(order === 'desc' ? styles.orderActive : {}) }}
            onClick={() => load({ order: 'desc', offset: 0 })}
          >
            최신순
          </button>
          <button
            type="button"
            style={{ ...styles.orderButton, ...(order === 'asc' ? styles.orderActive : {}) }}
            onClick={() => load({ order: 'asc', offset: 0 })}
          >
            과거순
          </button>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="button" style={styles.pageButton} onClick={() => !prevDisabled && load({ offset: Math.max(0, offset - PAGE_SIZE) })} disabled={prevDisabled}>이전</button>
          <button type="button" style={styles.pageButton} onClick={() => !nextDisabled && load({ offset: offset + PAGE_SIZE })} disabled={nextDisabled}>다음</button>
        </div>
      </div>

      {loading && <div style={styles.notice}>불러오는 중이에요... ⏳</div>}
      {error && !loading && <div style={{ ...styles.notice, color: 'var(--danger)' }}>{error}</div>}

      {!loading && !error && (
        <div style={styles.grid}>
          {items.map((it) => (
            <article key={`${it.problemId}-${it.answeredAt}`} className="tilt-hover" style={styles.card}>
              <div className="shimmer" aria-hidden />
              <div style={styles.cardHeader}>
                <span style={styles.pill}>{it.type || '문항'}</span>
                <span style={{ ...styles.pill, ...(it.isCorrect ? styles.pillCorrect : styles.pillIncorrect) }}>{it.isCorrect ? '정답' : '오답'}</span>
              </div>
              <h4 style={styles.cardTitle}>{(it.question || '').trim() || '문항'}</h4>
              <p style={styles.cardMeta}>{it.sourceLabel || '출처 미지정'}</p>
              <small style={styles.cardDate}>{new Date(it.answeredAt).toLocaleString()}</small>
            </article>
          ))}
        </div>
      )}
    </div>
  );
};

const styles = {
  container: { padding: 24, maxWidth: 1200, margin: '0 auto' },
  toolbar: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, gap: 12, flexWrap: 'wrap' },
  orderButton: { padding: '10px 14px', borderRadius: 999, border: '1px solid var(--surface-border)', background: 'var(--surface-card)', cursor: 'pointer', fontWeight: 700 },
  orderActive: { background: 'linear-gradient(135deg, rgba(99,102,241,0.95), rgba(14,165,233,0.9))', color: 'var(--text-on-accent)', borderColor: 'transparent' },
  pageButton: { padding: '10px 14px', borderRadius: 10, border: '1px solid var(--surface-border)', background: 'var(--surface-card)', cursor: 'pointer', fontWeight: 700 },
  notice: { padding: 16, borderRadius: 12, background: 'var(--surface-card)', border: '1px solid var(--surface-border)', fontWeight: 600 },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12 },
  card: { position: 'relative', overflow: 'hidden', padding: 16, borderRadius: 18, border: '1px solid rgba(148,163,184,0.28)', background: 'linear-gradient(145deg, rgba(15,23,42,0.92), rgba(30,64,175,0.65))', color: '#e2e8f0', backgroundSize: '200% 200%', animation: 'slowGradient 36s ease-in-out infinite' },
  cardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  pill: { padding: '4px 8px', borderRadius: 999, border: '1px solid rgba(255,255,255,0.25)', background: 'rgba(255,255,255,0.08)', fontSize: 12, fontWeight: 800 },
  pillCorrect: { background: 'rgba(16,185,129,0.22)' },
  pillIncorrect: { background: 'rgba(248,113,113,0.22)' },
  cardTitle: { margin: '6px 0', fontWeight: 800, color: '#f8fafc' },
  cardMeta: { margin: 0, color: 'rgba(226,232,240,0.85)', fontSize: 13 },
  cardDate: { color: 'var(--tone-muted)' }
};

export default StudyHistoryPage;
