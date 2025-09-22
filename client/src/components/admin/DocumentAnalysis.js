import React, { useState, useEffect, useCallback } from 'react';
import { api as API } from '../../services/api.service';

const DocumentAnalysis = ({ document, onClose }) => {
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchAnalysis = useCallback(async () => {
    if (!document?.id) return;
    try {
      setLoading(true);
      setError(null);

      const response = await API.analysis.get(document.id);
      if (response.success) {
        setAnalysis(response.data);
      } else {
        setError(response.message);
      }
    } catch (err) {
      console.error('분석 조회 실패:', err);
      setError('분석을 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  }, [document?.id]);

  useEffect(() => {
    if (document) {
      fetchAnalysis();
    }
  }, [document, fetchAnalysis]);


  if (!document) return null;

  return (
    <div style={analysisStyles.modal}>
      <div style={analysisStyles.modalContent}>
        <div style={analysisStyles.header}>
          <h2 style={analysisStyles.title}>📊 문서 분석</h2>
          <button 
            style={analysisStyles.closeButton}
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        <div style={analysisStyles.documentInfo}>
          <h3 style={analysisStyles.documentTitle}>{document.title}</h3>
          <p style={analysisStyles.documentMeta}>
            {document.category} · {document.school} · 고{document.grade}
          </p>
        </div>

        {loading && (
          <div style={analysisStyles.loading}>
            <div style={analysisStyles.spinner}></div>
            <p>AI가 문서를 분석중입니다...</p>
          </div>
        )}

        {error && (
          <div style={analysisStyles.error}>
            <p>❌ {error}</p>
            <button 
              style={analysisStyles.retryButton}
              onClick={fetchAnalysis}
            >
              다시 시도
            </button>
          </div>
        )}

        {analysis && !loading && !error && (
          <div style={analysisStyles.content}>
            {analysis.cached && (
              <div style={analysisStyles.cachedBadge}>
                💾 캐시된 분석 결과
              </div>
            )}

            {/* 새로운 형식 확인 */}
            {analysis.sentenceAnalysis ? (
              <>
                {/* 1. 문장별 분석 */}
                <AnalysisSection
                  title="📝 문장별 분석"
                  content={
                    <div style={analysisStyles.sentenceContainer}>
                      {analysis.sentenceAnalysis.map((sentence, index) => (
                        <div key={index} style={analysisStyles.sentenceCard}>
                          <div style={analysisStyles.sentenceEnglish}>
                            {sentence.english}
                          </div>
                          <div style={analysisStyles.sentenceTranslation}>
                            <strong>직역:</strong> {sentence.translation}
                          </div>
                          <div style={analysisStyles.sentenceMeaning}>
                            <strong>의미:</strong> {sentence.meaning}
                          </div>
                        </div>
                      ))}
                    </div>
                  }
                />

                {/* 2. 의미/분석/해설 */}
                <AnalysisSection
                  title="🔍 의미/분석/해설"
                  content={
                    <div style={analysisStyles.deepAnalysisBox}>
                      <div style={analysisStyles.analysisItem}>
                        <strong>해석:</strong> {analysis.deepAnalysis?.interpretation}
                      </div>
                      <div style={analysisStyles.analysisItem}>
                        <strong>문맥:</strong> {analysis.deepAnalysis?.context}
                      </div>
                      <div style={analysisStyles.analysisItem}>
                        <strong>해설:</strong> {analysis.deepAnalysis?.commentary}
                      </div>
                    </div>
                  }
                />

                {/* 3. 핵심표현 & 동의어/반의어 */}
                <AnalysisSection
                  title="💡 핵심표현 & 동의어/반의어"
                  content={
                    <div style={analysisStyles.expressionGrid}>
                      {analysis.keyExpressions?.map((expr, index) => (
                        <div key={index} style={analysisStyles.expressionCard}>
                          <div style={analysisStyles.expressionTitle}>
                            {expr.expression}
                          </div>
                          <div style={analysisStyles.expressionMeaning}>
                            {expr.meaning}
                          </div>
                          {expr.synonyms?.length > 0 && (
                            <div style={analysisStyles.wordList}>
                              <span style={analysisStyles.wordLabel}>동의어:</span> 
                              {expr.synonyms.join(', ')}
                            </div>
                          )}
                          {expr.antonyms?.length > 0 && (
                            <div style={analysisStyles.wordList}>
                              <span style={analysisStyles.wordLabel}>반의어:</span> 
                              {expr.antonyms.join(', ')}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  }
                />

                {/* 4. 예시/배경지식 */}
                <AnalysisSection
                  title="📚 예시/배경지식"
                  content={
                    <div>
                      {analysis.examplesAndBackground?.examples?.length > 0 && (
                        <div style={analysisStyles.examplesBox}>
                          <strong>예시 문장:</strong>
                          <ul style={analysisStyles.list}>
                            {analysis.examplesAndBackground.examples.map((example, index) => (
                              <li key={index} style={analysisStyles.listItem}>
                                {example}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {analysis.examplesAndBackground?.background && (
                        <div style={analysisStyles.backgroundBox}>
                          <strong>배경 지식:</strong>
                          <p>{analysis.examplesAndBackground.background}</p>
                        </div>
                      )}
                    </div>
                  }
                />

                {/* 5. 종합 정리 */}
                <AnalysisSection
                  title="📖 종합 정리"
                  content={
                    <div style={analysisStyles.comprehensiveBox}>
                      <div style={analysisStyles.comprehensiveItem}>
                        <strong>영어 제목:</strong> {analysis.comprehensive?.englishTitle}
                      </div>
                      <div style={analysisStyles.comprehensiveItem}>
                        <strong>한글 요지:</strong> {analysis.comprehensive?.koreanSummary}
                      </div>
                      <div style={analysisStyles.comprehensiveItem}>
                        <strong>작가의 주장:</strong> {analysis.comprehensive?.authorsClaim}
                      </div>
                      <div style={analysisStyles.comprehensiveItem}>
                        <strong>최종 요약문:</strong> {analysis.comprehensive?.finalSummary}
                      </div>
                    </div>
                  }
                />
              </>
            ) : (
              /* 기존 형식 유지 */
              <>
                <AnalysisSection
                  title="📄 핵심 요약"
                  content={analysis.summary}
                />

                <AnalysisSection
                  title="🔑 주요 포인트"
                  content={
                    <ul style={analysisStyles.list}>
                      {analysis.keyPoints?.map((point, index) => (
                        <li key={index} style={analysisStyles.listItem}>
                          {point}
                        </li>
                      ))}
                    </ul>
                  }
                />

                <AnalysisSection
                  title="📚 중요 어휘"
                  content={
                    <div style={analysisStyles.vocabularyGrid}>
                      {analysis.vocabulary?.map((vocab, index) => (
                        <div key={index} style={analysisStyles.vocabularyCard}>
                          <strong>{vocab.word}</strong>
                          <span>{vocab.meaning}</span>
                        </div>
                      ))}
                    </div>
                  }
                />

                <AnalysisSection
                  title="✏️ 문법 포인트"
                  content={
                    <ul style={analysisStyles.list}>
                      {analysis.grammarPoints?.map((point, index) => (
                        <li key={index} style={analysisStyles.listItem}>
                          {point}
                        </li>
                      ))}
                    </ul>
                  }
                />

                <AnalysisSection
                  title="📖 학습 가이드"
                  content={analysis.studyGuide}
                />

                <AnalysisSection
                  title="❓ 이해도 확인 문제"
                  content={
                    <ol style={analysisStyles.questionList}>
                      {analysis.comprehensionQuestions?.map((question, index) => (
                        <li key={index} style={analysisStyles.questionItem}>
                          {question}
                        </li>
                      ))}
                    </ol>
                  }
                />
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

const AnalysisSection = ({ title, content }) => (
  <div style={analysisStyles.section}>
    <h4 style={analysisStyles.sectionTitle}>{title}</h4>
    <div style={analysisStyles.sectionContent}>
      {typeof content === 'string' ? <p>{content}</p> : content}
    </div>
  </div>
);

const analysisStyles = {
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
    maxWidth: '800px',
    maxHeight: '90vh',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column'
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
    padding: '20px 30px',
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
  content: {
    padding: '20px 30px',
    overflow: 'auto',
    flex: 1
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
  retryButton: {
    background: '#3b82f6',
    color: 'white',
    border: 'none',
    borderRadius: '10px',
    padding: '10px 20px',
    cursor: 'pointer',
    marginTop: '15px'
  },
  cachedBadge: {
    background: '#e0f2fe',
    color: '#0284c7',
    padding: '8px 16px',
    borderRadius: '20px',
    fontSize: '14px',
    marginBottom: '20px',
    display: 'inline-block'
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
  list: {
    paddingLeft: '20px',
    margin: 0
  },
  listItem: {
    marginBottom: '8px'
  },
  vocabularyGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '10px'
  },
  vocabularyCard: {
    background: '#f1f5f9',
    padding: '12px',
    borderRadius: '8px',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px'
  },
  questionList: {
    paddingLeft: '20px',
    margin: 0
  },
  questionItem: {
    marginBottom: '10px'
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
    fontWeight: '500',
    lineHeight: '1.6'
  },
  sentenceTranslation: {
    fontSize: '14px',
    color: '#475569',
    marginBottom: '8px',
    lineHeight: '1.5'
  },
  sentenceMeaning: {
    fontSize: '14px',
    color: '#64748b',
    lineHeight: '1.5'
  },
  deepAnalysisBox: {
    background: '#f1f5f9',
    borderRadius: '10px',
    padding: '20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '15px'
  },
  analysisItem: {
    lineHeight: '1.6'
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
  wordList: {
    fontSize: '13px',
    color: '#64748b',
    marginBottom: '5px'
  },
  wordLabel: {
    fontWeight: '600',
    color: '#475569'
  },
  examplesBox: {
    marginBottom: '15px'
  },
  backgroundBox: {
    background: '#fef3c7',
    borderRadius: '10px',
    padding: '15px',
    border: '1px solid #fbbf24'
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
  comprehensiveItem: {
    lineHeight: '1.6'
  }
};

// CSS 애니메이션을 위한 스타일 태그 추가
const style = document.createElement('style');
style.textContent = `
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;
document.head.appendChild(style);

export default DocumentAnalysis;