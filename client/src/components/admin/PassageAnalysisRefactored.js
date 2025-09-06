import React, { useState, useEffect } from 'react';
import apiService from '../../services/api.service';
import PassageSelector from '../analysis/PassageSelector';
import AnalysisDisplay from '../analysis/AnalysisDisplay';
import analysisConfig from '../../config/analysis.config.json';

const PassageAnalysis = ({ document, onClose }) => {
  const [currentPassage, setCurrentPassage] = useState(1);
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [totalPassages, setTotalPassages] = useState(0);
  const [analyzedPassages, setAnalyzedPassages] = useState(new Set());

  useEffect(() => {
    if (document) {
      initializeDocument();
    }
  }, [document]);

  const initializeDocument = async () => {
    try {
      console.log('🔍 문서 정보 조회 시작:', document.id);
      
      // 문서의 전체 내용을 가져와서 passages 개수 확인
      const response = await apiService.get(`/api/documents/${document.id}`);
      console.log('📄 문서 조회 응답:', response);
      
      if (response && response.success && response.data) {
        const parsedContent = JSON.parse(response.data.content);
        const passages = parsedContent.passages || [];
        console.log(`✅ 문서 파싱 성공: ${passages.length}개 지문`);
        setTotalPassages(passages.length);
        checkAnalyzedPassages();
      } else {
        console.error('❌ 문서 조회 실패:', response);
        setError('문서를 불러올 수 없습니다.');
      }
    } catch (e) {
      console.error('❌ 문서 파싱 오류:', e);
      setError('문서 형식이 올바르지 않습니다.');
    }
  };

  const checkAnalyzedPassages = async () => {
    try {
      const endpoint = analysisConfig.api.endpoints.passages.replace(':documentId', document.id);
      const response = await apiService.get(endpoint);
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
      console.log(`🔍 지문 ${passageNumber} 분석 시작`);
      setLoading(true);
      setError(null);
      setAnalysis(null);
      
      const endpoint = analysisConfig.api.endpoints.analyzePassage.replace(':documentId', document.id);
      console.log('📡 분석 API 호출:', endpoint);
      
      const response = await apiService.post(endpoint, { passageNumber });
      console.log('📄 분석 응답:', response);
      
      if (response && response.success) {
        setAnalysis(response.data);
        if (!response.data.cached) {
          setAnalyzedPassages(prev => new Set([...prev, passageNumber]));
        }
        console.log('✅ 분석 성공');
      } else {
        console.error('❌ 분석 실패:', response);
        setError(response?.message || '분석 실패');
      }
    } catch (err) {
      console.error('❌ 지문 분석 오류:', err);
      setError(err.message || '분석 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const viewPassageAnalysis = async (passageNumber) => {
    try {
      setLoading(true);
      setError(null);
      
      const endpoint = analysisConfig.api.endpoints.getPassage
        .replace(':documentId', document.id)
        .replace(':passageNumber', passageNumber);
      const response = await apiService.get(endpoint);
      
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
        <ModalHeader 
          onClose={onClose}
          document={document}
          totalPassages={totalPassages}
          analyzedCount={analyzedPassages.size}
        />

        <PassageSelector
          totalPassages={totalPassages}
          currentPassage={currentPassage}
          analyzedPassages={analyzedPassages}
          onPassageSelect={handlePassageSelect}
        />

        <PassageContent
          currentPassage={currentPassage}
          isAnalyzed={analyzedPassages.has(currentPassage)}
          loading={loading}
          error={error}
          analysis={analysis}
          onAnalyze={() => analyzePassage(currentPassage)}
        />

        <PassageNavigation
          currentPassage={currentPassage}
          totalPassages={totalPassages}
          onNavigate={handlePassageSelect}
        />
      </div>
    </div>
  );
};

const ModalHeader = ({ onClose, document, totalPassages, analyzedCount }) => (
  <div style={styles.header}>
    <div>
      <h2 style={styles.title}>📊 개별 지문 분석</h2>
      <div style={styles.documentInfo}>
        <h3 style={styles.documentTitle}>{document.title}</h3>
        <p style={styles.documentMeta}>
          총 {totalPassages}개 지문 | 분석 완료: {analyzedCount}개
        </p>
      </div>
    </div>
    <button style={styles.closeButton} onClick={onClose}>✕</button>
  </div>
);

const PassageContent = ({ currentPassage, isAnalyzed, loading, error, analysis, onAnalyze }) => (
  <div style={styles.content}>
    <div style={styles.passageHeader}>
      <h3>지문 {currentPassage}</h3>
      {!isAnalyzed && (
        <button
          style={styles.analyzeButton}
          onClick={onAnalyze}
          disabled={loading}
        >
          {loading ? '분석 중...' : '이 지문 분석하기'}
        </button>
      )}
    </div>

    {loading && <LoadingSpinner />}
    {error && <ErrorDisplay error={error} />}
    {analysis && !loading && <AnalysisDisplay analysis={analysis} />}
    {!analysis && !loading && isAnalyzed && (
      <div style={styles.info}>
        <p>분석 결과를 불러오려면 다시 클릭해주세요.</p>
      </div>
    )}
  </div>
);

const PassageNavigation = ({ currentPassage, totalPassages, onNavigate }) => (
  <div style={styles.footer}>
    <button
      style={styles.prevButton}
      onClick={() => onNavigate(Math.max(1, currentPassage - 1))}
      disabled={currentPassage === 1}
    >
      ← 이전 지문
    </button>
    
    <span style={styles.pageInfo}>
      {currentPassage} / {totalPassages}
    </span>
    
    <button
      style={styles.nextButton}
      onClick={() => onNavigate(Math.min(totalPassages, currentPassage + 1))}
      disabled={currentPassage === totalPassages}
    >
      다음 지문 →
    </button>
  </div>
);

const LoadingSpinner = () => (
  <div style={styles.loading}>
    <div style={styles.spinner}></div>
    <p>AI가 지문을 분석중입니다...</p>
  </div>
);

const ErrorDisplay = ({ error }) => (
  <div style={styles.error}>
    <p>❌ {error}</p>
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
    alignItems: 'flex-start',
    padding: '20px 30px',
    borderBottom: '1px solid #e2e8f0'
  },
  title: {
    color: '#1f2937',
    margin: '0 0 10px 0',
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
    marginTop: '10px'
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
const initAnimation = () => {
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
};

initAnimation();

export default PassageAnalysis;