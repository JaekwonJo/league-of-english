import React, { useEffect, useState } from 'react';
import { api } from '../services/api.service';
import CommonHero from '../components/common/CommonHero';

const ReadingTutorSelectPage = () => {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadDocs = async () => {
      try {
        setLoading(true);
        const res = await api.documents.list({ limit: 50 });
        if (res?.documents) {
          setDocuments(res.documents);
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

  return (
    <div style={styles.container}>
      <CommonHero
        title="독해 튜터 - 지문 선택 📖"
        subtitle="AI와 함께 분석할 지문을 선택해주세요."
      />
      
      <div style={styles.list}>
        {loading ? (
          <div style={{textAlign:'center', padding: 40}}>목록을 불러오고 있어요...</div>
        ) : documents.length === 0 ? (
          <div style={{textAlign:'center', padding: 40}}>등록된 지문이 없어요.</div>
        ) : (
          documents.map(doc => (
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
  list: {
    marginTop: '20px',
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
  }
};

export default ReadingTutorSelectPage;
