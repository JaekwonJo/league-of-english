import React, { useEffect, useState } from 'react';
import { api } from '../services/api.service';
import CommonHero from '../components/common/CommonHero';

const ReadingTutorSelectPage = () => {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState('전체');

  const TABS = ['전체', '모의고사', '교과서', '부교재', 'EBS 연계'];

  useEffect(() => {
    const loadDocs = async () => {
      try {
        setLoading(true);
        const res = await api.documents.list({ limit: 100 });
        if (res?.documents) {
          // Relaxed filter: Show everything except explicit vocabulary
          // If type is missing/null, show it.
          const readingDocs = res.documents.filter(d => d.type !== 'vocabulary');
          console.log('Loaded docs:', res.documents); // Debug log
          setDocuments(readingDocs);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    loadDocs();
  }, []);

  const handleSelect = (docId) => {
    window.location.href = `/reading-tutor/${docId}`;
  };

  const filteredDocs = documents.filter(doc => {
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
    if (tab === 'ebs연계') {
      return cat.includes('ebs');
    }
    
    return cat.includes(tab);
  });

  return (
    <div style={styles.container}>
      <CommonHero
        title="독해 튜터 - 지문 선택 📖"
        subtitle="AI와 함께 분석할 지문을 선택해주세요."
      />

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
            <div key={doc.id} className="tilt-hover" style={styles.item} onClick={() => handleSelect(doc.id)}>
              <div style={styles.docIcon}>📄</div>
              <div style={styles.docInfo}>
                <div style={styles.docTitle}>{doc.title}</div>
                <div style={styles.docMeta}>{doc.category || '기본'} · {new Date(doc.createdAt).toLocaleDateString()}</div>
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
    maxWidth: '800px',
    margin: '0 auto',
    padding: '20px'
  },
  tabs: {
    display: 'flex',
    gap: '10px',
    overflowX: 'auto',
    paddingBottom: '10px',
    marginBottom: '20px',
    scrollbarWidth: 'none'
  },
  tab: {
    padding: '8px 16px',
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
    gap: '12px'
  },
  item: {
    background: 'var(--surface-card)',
    borderRadius: '16px',
    padding: '20px',
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    border: '1px solid var(--surface-border)',
    cursor: 'pointer'
  },
  docIcon: {
    fontSize: '24px',
    opacity: 0.8
  },
  docInfo: {
    flex: 1
  },
  docTitle: {
    fontSize: '16px',
    fontWeight: '700',
    color: 'var(--text-primary)',
    marginBottom: '4px'
  },
  docMeta: {
    fontSize: '12px',
    color: 'var(--text-secondary)'
  },
  startBtn: {
    background: 'var(--accent-primary)',
    color: 'white',
    border: 'none',
    borderRadius: '20px',
    padding: '8px 16px',
    fontSize: '13px',
    fontWeight: 'bold',
    cursor: 'pointer'
  },
  empty: {
    textAlign: 'center',
    padding: '40px',
    color: 'var(--text-secondary)'
  }
};

export default ReadingTutorSelectPage;
