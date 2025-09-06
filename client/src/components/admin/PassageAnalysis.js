import React, { useState, useEffect } from 'react';
import { api as API } from '../../services/api.service';

const PassageAnalysis = ({ document, onClose }) => {
  const [currentPassage, setCurrentPassage] = useState(1);
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [totalPassages, setTotalPassages] = useState(0);
  const [analyzedPassages, setAnalyzedPassages] = useState(new Set());

  useEffect(() => {
    if (document) {
      // 문서의 총 지문 수 파악
      try {
        const parsedContent = JSON.parse(document.content);
        const passages = parsedContent.passages || [];
        setTotalPassages(passages.length);
        
        // 이미 분석된 지문 확인
        checkAnalyzedPassages();
      } catch (e) {
        console.error('문서 파싱 오류:', e);
        setError('문서 형식이 올바르지 않습니다.');
      }
    }
  }, [document]);

  const checkAnalyzedPassages = async () => {
    try {
      const response = await API.get(`/analysis/${document.id}/passages`);
      if (response.success && response.data) {
        const analyzed = new Set(response.data.map(p => p.passageNumber));
        setAnalyzedPassages(analyzed);
      }
    } catch (err) {
      console.error('분석된 지문 확인 실패:', err);
    }
  };

  const analyzePassage = async (passageNumber) => {
    try {
      setLoading(true);
      setError(null);
      setAnalysis(null);
      
      const response = await API.post(`/analysis/${document.id}/analyze-passage`, {
        passageNumber
      });
      
      if (response.success) {
        setAnalysis(response.data);
        if (!response.data.cached) {
          setAnalyzedPassages(prev => new Set([...prev, passageNumber]));
        }
      } else {
        setError(response.message);
      }
    } catch (err) {
      console.error('지문 분석 실패:', err);
      setError('분석 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const viewPassageAnalysis = async (passageNumber) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await API.get(`/analysis/${document.id}/passage/${passageNumber}`);
      
      if (response.success) {
        setAnalysis(response.data);
      } else {
        setError(response.message);
      }
    } catch (err) {
      console.error('분석 조회 실패:', err);
      setError('분석 결과를 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handlePassageSelect = (passageNumber) => {
    setCurrentPassage(passageNumber);
    if (analyzedPassages.has(passageNumber)) {
      viewPassageAnalysis(passageNumber);
    } else {
      setAnalysis(null);
    }
  };

  if (!document) return null;

  return (
    <div style={styles.modal}>
      <div style={styles.modalContent}>
        <div style={styles.header}>
          <h2 style={styles.title}>📊 개별 지문 분석</h2>
          <button style={styles.closeButton} onClick={onClose}>✕</button>
        </div>

        <div style={styles.documentInfo}>
          <h3 style={styles.documentTitle}>{document.title}</h3>
          <p style={styles.documentMeta}>
            총 {totalPassages}개 지문 | 분석 완료: {analyzedPassages.size}개
          </p>
        </div>

        <div style={styles.passageSelector}>
          <div style={styles.passageGrid}>
            {[...Array(totalPassages)].map((_, idx) => {
              const passageNum = idx + 1;
              const isAnalyzed = analyzedPassages.has(passageNum);
              const isSelected = currentPassage === passageNum;
              
              return (
                <button
                  key={passageNum}
                  style={{
                    ...styles.passageButton,
                    ...(isSelected ? styles.passageButtonSelected : {}),
                    ...(isAnalyzed ? styles.passageButtonAnalyzed : {})
                  }}
                  onClick={() => handlePassageSelect(passageNum)}
                >
                  {passageNum}
                  {isAnalyzed && <span style={styles.checkMark}>✓</span>}
                </button>
              );
            })}
          </div>
        </div>

        <div style={styles.content}>
          <div style={styles.passageHeader}>
            <h3>지문 {currentPassage}</h3>
            {!analyzedPassages.has(currentPassage) && (
              <button
                style={styles.analyzeButton}
                onClick={() => analyzePassage(currentPassage)}
                disabled={loading}
              >
                {loading ? '분석 중...' : '이 지문 분석하기'}
              </button>
            )}
          </div>

          {loading && (
            <div style={styles.loading}>
              <div style={styles.spinner}></div>
              <p>AI가 지문을 분석중입니다...</p>
            </div>
          )}

          {error && (
            <div style={styles.error}>
              <p>❌ {error}</p>
            </div>
          )}

          {analysis && !loading && (
            <div style={styles.analysisContent}>
              {/* 1. 문장별 분석 */}
              {analysis.sentenceAnalysis && (
                <AnalysisSection
                  title="📝 문장별 분석"
                  content={
                    <div style={styles.sentenceContainer}>
                      {analysis.sentenceAnalysis.map((sentence, index) => (
                        <div key={index} style={styles.sentenceCard}>
                          <div style={styles.sentenceEnglish}>{sentence.english}</div>
                          <div style={styles.sentenceTranslation}>
                            <strong>직역:</strong> {sentence.translation}
                          </div>
                          <div style={styles.sentenceMeaning}>
                            <strong>의미:</strong> {sentence.meaning}
                          </div>
                        </div>
                      ))}
                    </div>
                  }
                />
              )}

              {/* 2. 의미/분석/해설 */}
              {analysis.deepAnalysis && (
                <AnalysisSection
                  title="🔍 의미/분석/해설"
                  content={
                    <div style={styles.deepAnalysisBox}>
                      <div><strong>해석:</strong> {analysis.deepAnalysis.interpretation}</div>
                      <div><strong>문맥:</strong> {analysis.deepAnalysis.context}</div>
                      <div><strong>해설:</strong> {analysis.deepAnalysis.commentary}</div>
                    </div>
                  }
                />
              )}

              {/* 3. 핵심표현 & 동의어/반의어 */}
              {analysis.keyExpressions && (
                <AnalysisSection
                  title="💡 핵심표현 & 동의어/반의어"
                  content={
                    <div style={styles.expressionGrid}>
                      {analysis.keyExpressions.map((expr, index) => (
                        <div key={index} style={styles.expressionCard}>
                          <div style={styles.expressionTitle}>{expr.expression}</div>
                          <div style={styles.expressionMeaning}>{expr.meaning}</div>
                          {expr.synonyms?.length > 0 && (
                            <div><strong>동의어:</strong> {expr.synonyms.join(', ')}</div>
                          )}
                          {expr.antonyms?.length > 0 && (
                            <div><strong>반의어:</strong> {expr.antonyms.join(', ')}</div>
                          )}
                        </div>
                      ))}
                    </div>
                  }
                />
              )}

              {/* 4. 예시/배경지식 */}
              {analysis.examplesAndBackground && (
                <AnalysisSection
                  title="📚 예시/배경지식"
                  content={
                    <div>
                      {analysis.examplesAndBackground.examples && (
                        <div>
                          <strong>예시:</strong>
                          <ul>
                            {analysis.examplesAndBackground.examples.map((ex, idx) => (
                              <li key={idx}>{ex}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {analysis.examplesAndBackground.background && (
                        <div style={styles.backgroundBox}>
                          <strong>배경지식:</strong> {analysis.examplesAndBackground.background}
                        </div>
                      )}
                    </div>
                  }
                />
              )}

              {/* 5. 종합 정리 */}
              {analysis.comprehensive && (
                <AnalysisSection
                  title="📖 종합 정리"
                  content={
                    <div style={styles.comprehensiveBox}>
                      <div><strong>영어 제목:</strong> {analysis.comprehensive.englishTitle}</div>
                      <div><strong>한글 요지:</strong> {analysis.comprehensive.koreanSummary}</div>
                      <div><strong>작가의 주장:</strong> {analysis.comprehensive.authorsClaim}</div>
                      <div><strong>최종 요약문:</strong> {analysis.comprehensive.finalSummary}</div>
                    </div>
                  }
                />
              )}
            </div>
          )}

          {!analysis && !loading && analyzedPassages.has(currentPassage) && (
            <div style={styles.info}>
              <p>분석 결과를 불러오려면 다시 클릭해주세요.</p>
            </div>
          )}
        </div>

        <div style={styles.footer}>
          <button
            style={styles.prevButton}
            onClick={() => handlePassageSelect(Math.max(1, currentPassage - 1))}
            disabled={currentPassage === 1}
          >
            ← 이전 지문
          </button>
          
          <span style={styles.pageInfo}>
            {currentPassage} / {totalPassages}
          </span>
          
          <button
            style={styles.nextButton}
            onClick={() => handlePassageSelect(Math.min(totalPassages, currentPassage + 1))}
            disabled={currentPassage === totalPassages}
          >
            다음 지문 →
          </button>
        </div>
      </div>
    </div>
  );
};

const AnalysisSection = ({ title, content }) => (
  <div style={styles.section}>
    <h4 style={styles.sectionTitle}>{title}</h4>
    <div style={styles.sectionContent}>
      {typeof content === 'string' ? <p>{content}</p> : content}
    </div>
  </div>
);

const styles = {
  modal: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000
  },
  modalContent: {
    background: 'white',
    borderRadius: '20px',
    width: '90%',
    maxWidth: '1200px',
    height: '90vh',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px 30px',
    borderBottom: '1px solid #e2e8f0'
  },
  title: {
    color: '#1f2937',
    margin: 0,
    fontSize: '1.5rem'
  },
  closeButton: {
    background: 'none',
    border: 'none',
    fontSize: '20px',
    cursor: 'pointer',
    color: '#6b7280',
    padding: '5px'
  },
  documentInfo: {
    padding: '15px 30px',
    borderBottom: '1px solid #e2e8f0',
    background: '#f8fafc'
  },
  documentTitle: {
    color: '#1f2937',
    margin: '0 0 5px 0',
    fontSize: '1.1rem'
  },
  documentMeta: {
    color: '#6b7280',
    margin: 0,
    fontSize: '14px'
  },
  passageSelector: {
    padding: '20px 30px',
    borderBottom: '1px solid #e2e8f0'
  },
  passageGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(50px, 1fr))',
    gap: '10px'
  },
  passageButton: {
    padding: '10px',
    background: '#f1f5f9',
    border: '2px solid transparent',
    borderRadius: '8px',
    cursor: 'pointer',
    position: 'relative',
    transition: 'all 0.2s'
  },
  passageButtonSelected: {
    background: '#3b82f6',
    color: 'white',
    borderColor: '#2563eb'
  },
  passageButtonAnalyzed: {
    background: '#10b981',
    color: 'white'
  },
  checkMark: {
    position: 'absolute',
    top: '2px',
    right: '2px',
    fontSize: '12px'
  },
  content: {
    flex: 1,
    padding: '20px 30px',
    overflow: 'auto'
  },
  passageHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px'
  },
  analyzeButton: {
    background: '#3b82f6',
    color: 'white',
    border: 'none',
    borderRadius: '10px',
    padding: '10px 20px',
    cursor: 'pointer',
    fontSize: '14px'
  },
  loading: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '60px 30px',
    color: '#6b7280'
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '4px solid #e2e8f0',
    borderTop: '4px solid #3b82f6',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    marginBottom: '20px'
  },
  error: {
    padding: '30px',
    textAlign: 'center',
    color: '#ef4444'
  },
  info: {
    padding: '30px',
    textAlign: 'center',
    color: '#6b7280'
  },
  analysisContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px'
  },
  section: {
    marginBottom: '25px'
  },
  sectionTitle: {
    color: '#1f2937',
    fontSize: '1.1rem',
    marginBottom: '12px'
  },
  sectionContent: {
    color: '#374151',
    lineHeight: '1.6'
  },
  sentenceContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '15px'
  },
  sentenceCard: {
    background: '#f8fafc',
    borderRadius: '10px',
    padding: '15px',
    border: '1px solid #e2e8f0'
  },
  sentenceEnglish: {
    fontSize: '16px',
    color: '#1f2937',
    marginBottom: '10px',
    fontWeight: '500'
  },
  sentenceTranslation: {
    fontSize: '14px',
    color: '#475569',
    marginBottom: '8px'
  },
  sentenceMeaning: {
    fontSize: '14px',
    color: '#64748b'
  },
  deepAnalysisBox: {
    background: '#f1f5f9',
    borderRadius: '10px',
    padding: '20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '15px'
  },
  expressionGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '15px'
  },
  expressionCard: {
    background: '#fff',
    border: '2px solid #e2e8f0',
    borderRadius: '10px',
    padding: '15px'
  },
  expressionTitle: {
    fontSize: '16px',
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: '8px'
  },
  expressionMeaning: {
    fontSize: '14px',
    color: '#475569',
    marginBottom: '10px'
  },
  backgroundBox: {
    background: '#fef3c7',
    borderRadius: '10px',
    padding: '15px',
    border: '1px solid #fbbf24',
    marginTop: '10px'
  },
  comprehensiveBox: {
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    borderRadius: '15px',
    padding: '20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  footer: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px 30px',
    borderTop: '1px solid #e2e8f0'
  },
  prevButton: {
    background: '#6b7280',
    color: 'white',
    border: 'none',
    borderRadius: '10px',
    padding: '10px 20px',
    cursor: 'pointer'
  },
  nextButton: {
    background: '#3b82f6',
    color: 'white',
    border: 'none',
    borderRadius: '10px',
    padding: '10px 20px',
    cursor: 'pointer'
  },
  pageInfo: {
    color: '#6b7280',
    fontSize: '14px'
  }
};

// CSS 애니메이션
const styleTag = document.createElement('style');
styleTag.textContent = `
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;
if (!document.head.querySelector('style[data-passage-analysis]')) {
  styleTag.setAttribute('data-passage-analysis', 'true');
  document.head.appendChild(styleTag);
}

export default PassageAnalysis;