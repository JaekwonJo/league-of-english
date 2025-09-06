import React from 'react';
import AnalysisSection from './AnalysisSection';

const AnalysisDisplay = ({ analysis }) => {
  if (!analysis) return null;

  return (
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
  );
};

const styles = {
  analysisContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px'
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
  }
};

export default AnalysisDisplay;