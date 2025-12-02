import React, { useEffect, useState } from 'react';
import { api } from '../services/api.service';
import CommonHero from '../components/common/CommonHero';

const ReadingTutorSelectPage = () => {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState('전체');
  const [search, setSearch] = useState('');
  const [passageStats, setPassageStats] = useState({});

  const [mode] = useState(() => {
    if (typeof window === 'undefined') return 'reading';
    const params = new URLSearchParams(window.location.search || '');
    return params.get('mode') || 'reading';
  });
  const isWorkbookMode = mode === 'workbook';

  const TABS = ['전체', '모의고사', '교과서', '부교재', '내신', 'EBS 연계'];

  useEffect(() => {
    const loadDocs = async () => {
      try {
        setLoading(true);
        const res = await api.documents.list({ limit: 100 });
        // API 응답은 배열 또는 { data: [...] } 형태일 수 있음
        const list = Array.isArray(res)
          ? res
          : Array.isArray(res?.data)
            ? res.data
            : [];

        // 독해 튜터에는 단어장(type === 'vocabulary' 또는 카테고리 '단어')는 노출하지 않음
        const filtered = list.filter(doc => {
          const type = String(doc.type || '').toLowerCase();
          const category = String(doc.category || '').toLowerCase();
          if (type === 'vocabulary') return false;
          if (category.includes('단어')) return false;
          return true;
        });

        // DEBUG: SHOW EVERYTHING - No filtering at all
        console.log('ReadingTutorSelectPage RAW documents:', filtered);
        setDocuments(filtered);

        // 각 문서별 지문(문제) 개수 비동기 로딩
        const statsEntries = await Promise.all(
          filtered.map(async (doc) => {
            try {
              const status = await api.analysis.status(doc.id);
              const total = status?.data?.total ?? 0;
              return [doc.id, { total, analyzed: status?.data?.analyzed ?? 0 }];
            } catch (err) {
              console.warn('Failed to load passage status for doc', doc.id, err);
              return [doc.id, { total: 0, analyzed: 0 }];
            }
          })
        );
        setPassageStats(Object.fromEntries(statsEntries));
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    loadDocs();
  }, []);

  const handleSelect = (docId) => {
    if (isWorkbookMode) {
      window.location.href = `/reading-tutor/${docId}?mode=workbook`;
    } else {
      window.location.href = `/reading-tutor/${docId}`;
    }
  };

  const filteredDocs = documents
    .filter(doc => {
      if (selectedTab === '전체') return true;

      // Normalize category: remove spaces, lower case
      const rawCat = String(doc.category || '기타');
      const cat = rawCat.replace(/\s+/g, '').toLowerCase();
      const tab = selectedTab.replace(/\s+/g, '').toLowerCase();

      // Exact category matching logic
      if (tab === '모의고사') {
        return cat.includes('모의고사') || cat.includes('mock');
      }
      if (tab === '교과서') {
        return cat.includes('교과서') || cat.includes('textbook');
      }
      if (tab === '부교재') {
        return cat.includes('부교재') || cat.includes('supplement') || cat.includes('올림포스') || cat.includes('수능특강');
      }
      if (tab === '내신') {
        return cat.includes('내신');
      }
      if (tab === 'ebs연계') {
        return cat.includes('ebs');
      }

      return cat.includes(tab);
    })
    .filter(doc => {
      const term = search.trim().toLowerCase();
      if (!term) return true;
      const title = String(doc.title || '').toLowerCase();
      const category = String(doc.category || '').toLowerCase();
      return title.includes(term) || category.includes(term);
    });

  return (
    <div style={styles.container}>
      <CommonHero
        title={isWorkbookMode ? 'AI 워크북 튜터 - 지문 선택 📖' : '독해 튜터 - 지문 선택 📖'}
        subtitle={
          isWorkbookMode
            ? 'AI 워크북으로 복습할 지문이 들어 있는 문서를 선택해 주세요.'
            : 'AI와 함께 분석할 지문을 선택해주세요.'
        }
      />

      <div style={styles.searchRow}>
        <input
          type="text"
          placeholder="문서 제목이나 학교/카테고리로 검색해 보세요."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={styles.searchInput}
        />
      </div>

      <div style={styles.tabs}>
        {TABS.map(tab => (
          <button
            key={tab}
            style={{
              ...styles.tab,
              ...(selectedTab === tab ? styles.tabActive : {})
            }}
            onClick={() => setSelectedTab(tab)}
          >
            {tab}
          </button>
        ))}
      </div>
      
      <div style={styles.list}>
        {/* Debug Info: Remove after fixing */}
        <div style={{padding: 10, fontSize: 12, color: '#666', display: 'none'}}>
          Debug: Loaded {documents.length} docs. Filtered: {filteredDocs.length}.
        </div>

        {loading ? (
          <div style={styles.empty}>목록을 불러오는 중이에요...</div>
        ) : filteredDocs.length === 0 ? (
          <div style={styles.empty}>'{selectedTab}' 카테고리에 등록된 지문이 없어요.</div>
        ) : (
          filteredDocs.map(doc => (
            <div
              key={doc.id}
              className="tilt-hover"
              style={styles.item}
              onClick={() => handleSelect(doc.id)}
            >
              <div style={styles.docIcon}>📄</div>
              <div style={styles.docInfo}>
                <div style={styles.docTitle}>{doc.title}</div>
                <div style={styles.docMeta}>
                  {doc.category || '기본'} ·{' '}
                  {(() => {
                    const created = doc.createdAt || doc.created_at;
                    if (!created) return '날짜 미상';
                    const d = new Date(created);
                    return Number.isNaN(d.getTime()) ? '날짜 미상' : d.toLocaleDateString();
                  })()}
                  {' · '}
                  {(() => {
                    const stat = passageStats[doc.id];
                    if (!stat) return '지문 수 계산 중...';
                    if (!stat.total) return '지문 0개';
                    return `지문 ${stat.total}개`;
                  })()}
                </div>
              </div>
              <button style={styles.startBtn}>시작</button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

const styles = {
  container: {
    maxWidth: '880px',
    margin: '0 auto',
    padding: '24px 20px 32px',
    position: 'relative'
  },
  searchRow: {
    marginTop: '16px',
    marginBottom: '12px'
  },
  searchInput: {
    width: '100%',
    padding: '11px 16px',
    borderRadius: '999px',
    border: '1px solid var(--surface-border)',
    background: 'radial-gradient(circle at 0% 0%, rgba(148, 163, 184, 0.15), transparent 55%), var(--surface-soft)',
    fontSize: '14px',
    boxShadow: '0 10px 30px rgba(15,23,42,0.08)'
  },
  tabs: {
    display: 'flex',
    gap: '10px',
    overflowX: 'auto',
    paddingBottom: '8px',
    marginBottom: '18px',
    scrollbarWidth: 'none'
  },
  tab: {
    padding: '8px 18px',
    borderRadius: '20px',
    background: 'var(--surface-soft)',
    color: 'var(--text-secondary)',
    border: '1px solid var(--border-subtle)',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    fontWeight: '600'
  },
  tabActive: {
    background: 'var(--accent-primary)',
    color: 'white',
    borderColor: 'var(--accent-primary)'
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: '14px'
  },
  item: {
    background: 'linear-gradient(135deg, rgba(15,23,42,0.96), rgba(30,64,175,0.85))',
    borderRadius: '20px',
    padding: '18px 20px',
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    border: '1px solid rgba(148,163,184,0.4)',
    cursor: 'pointer',
    boxShadow: '0 18px 40px rgba(15,23,42,0.4)',
    position: 'relative',
    overflow: 'hidden'
  },
  docIcon: {
    fontSize: '26px',
    opacity: 0.9
  },
  docInfo: {
    flex: 1
  },
  docTitle: {
    fontSize: '16px',
    fontWeight: '700',
    color: '#E5E7EB',
    marginBottom: '4px'
  },
  docMeta: {
    fontSize: '12px',
    color: '#CBD5F5'
  },
  startBtn: {
    background: 'linear-gradient(135deg, #38BDF8, #6366F1)',
    color: '#F9FAFB',
    border: 'none',
    borderRadius: '999px',
    padding: '9px 18px',
    fontSize: '13px',
    fontWeight: 'bold',
    cursor: 'pointer',
    boxShadow: '0 10px 24px rgba(37,99,235,0.55)'
  },
  empty: {
    textAlign: 'center',
    padding: '40px',
    color: 'var(--text-secondary)'
  }
};

export default ReadingTutorSelectPage;
