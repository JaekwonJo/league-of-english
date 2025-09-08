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
    if (document) initializeDocument();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [document]);

  const initializeDocument = async () => {
    try {
      const response = await apiService.get(`/api/documents/${document.id}`);
      if (response && response.success && response.data) {
        let passagesCount = 0;
        if (response.data.parsedContent && Array.isArray(response.data.parsedContent.passages)) {
          passagesCount = response.data.parsedContent.passages.length;
        } else {
          try {
            const parsed = JSON.parse(response.data.content || '{}');
            passagesCount = Array.isArray(parsed.passages) ? parsed.passages.length : 0;
          } catch {
            const text = String(response.data.content || '');
            const blocks = text.split(/\n{2,}/).map(s => s.trim()).filter(s => s.length > 40);
            passagesCount = blocks.length || (text.length ? 1 : 0);
          }
        }

        setTotalPassages(passagesCount);
        setCurrentPassage(prev => {
          if (passagesCount <= 0) return 1;
          if (prev < 1) return 1;
          if (prev > passagesCount) return passagesCount;
          return prev;
        });
        await checkAnalyzedPassages();
      } else {
        setError('문서를 불러올 수 없습니다.');
      }
    } catch (e) {
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
    } catch {
      // ignore
    }
  };

  const analyzePassage = async (passageNumber) => {
    try {
      setLoading(true);
      setError(null);
      setAnalysis(null);

      const clamped = !Number.isInteger(passageNumber) ? 1 : (totalPassages > 0 ? Math.max(1, Math.min(totalPassages, passageNumber)) : Math.max(1, passageNumber));
      if (clamped !== passageNumber) {
        setError(`유효한 지문 번호가 아닙니다. (1-${totalPassages || '?'})`);
        return;
      }

      const endpoint = analysisConfig.api.endpoints.analyzePassage.replace(':documentId', document.id);
      const response = await apiService.post(endpoint, { passageNumber: clamped });
      if (response && response.success) {
        setAnalysis(response.data);
        if (!response.data.cached) setAnalyzedPassages(prev => new Set([...prev, clamped]));
      } else {
        setError(response?.message || '분석 실패');
      }
    } catch (err) {
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
      if (response.success) setAnalysis(response.data);
      else setError(response.message);
    } catch (err) {
      setError('분석 결과를 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handlePassageSelect = (passageNumber) => {
    const clamped = Math.max(1, Math.min(totalPassages || 1, passageNumber));
    setCurrentPassage(clamped);
    if (analyzedPassages.has(clamped)) viewPassageAnalysis(clamped);
    else setAnalysis(null);
  };

  if (!document) return null;

  return (
    <div style={styles.modal}>
      <div style={styles.modalContent}>
        <div style={styles.header}>
          <div>
            <h2 style={styles.title}>📊 개별 지문 분석 · No.{currentPassage}</h2>
            <div style={styles.documentInfo}>
              <div style={styles.documentTitle}>{document.title}</div>
              <div style={styles.documentMeta}>총 {totalPassages}개 지문 | 분석 완료: {analyzedPassages.size}개</div>
            </div>
          </div>
          <button style={styles.closeButton} onClick={onClose}>닫기</button>
        </div>

        <PassageSelector
          totalPassages={totalPassages}
          currentPassage={currentPassage}
          analyzedPassages={analyzedPassages}
          onPassageSelect={handlePassageSelect}
        />

        <div style={styles.content}>
          <div style={styles.passageHeader}>
            <h3>지문 {currentPassage}</h3>
            {!analyzedPassages.has(currentPassage) && (
              <button style={styles.analyzeButton} onClick={() => analyzePassage(currentPassage)} disabled={loading}>
                {loading ? '분석 중…' : '분석하기'}
              </button>
            )}
          </div>

          {error && <div style={styles.error}>{error}</div>}
          {!error && loading && (
            <div style={styles.loading}>
              <div style={styles.spinner}></div>
              <div>분석 중…</div>
            </div>
          )}
          {!loading && analysis && <AnalysisDisplay analysis={analysis} />}
          {!loading && !analysis && !analyzedPassages.has(currentPassage) && (
            <div style={styles.info}>분석 결과가 없습니다. [분석하기]를 눌러 생성하세요.</div>
          )}
        </div>

        <div style={styles.footer}>
          <button
            style={styles.prevButton}
            onClick={() => handlePassageSelect(Math.max(1, (currentPassage || 1) - 1))}
            disabled={currentPassage === 1}
          >
            이전 지문
          </button>
          <span style={styles.pageInfo}>{currentPassage} / {totalPassages}</span>
          <button
            style={styles.nextButton}
            onClick={() => handlePassageSelect(Math.min(totalPassages || (currentPassage || 1), (currentPassage || 1) + 1))}
            disabled={totalPassages > 0 ? (currentPassage === totalPassages) : false}
          >
            다음 지문
          </button>
        </div>
      </div>
    </div>
  );
};

const styles = {
  modal: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  modalContent: { background: 'white', borderRadius: 20, width: '90%', maxWidth: 1200, height: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 30px', borderBottom: '1px solid #e2e8f0' },
  title: { color: '#1f2937', margin: 0, fontSize: '1.5rem' },
  closeButton: { background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: '#6b7280', padding: 5 },
  documentInfo: { marginTop: 8 },
  documentTitle: { color: '#1f2937', margin: '0 0 4px 0', fontSize: '1.1rem' },
  documentMeta: { color: '#6b7280', margin: 0, fontSize: 14 },
  content: { flex: 1, padding: '20px 30px', overflow: 'auto' },
  passageHeader: { display: 'flex', gap: 12, alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  analyzeButton: { background: '#3b82f6', color: 'white', border: 'none', borderRadius: 10, padding: '10px 20px', cursor: 'pointer', fontSize: 14 },
  loading: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 30px', color: '#6b7280' },
  spinner: { width: 40, height: 40, border: '4px solid #e2e8f0', borderTop: '4px solid #3b82f6', borderRadius: '50%', animation: 'spin 1s linear infinite', marginBottom: 20 },
  error: { padding: 30, textAlign: 'center', color: '#ef4444' },
  info: { padding: 30, textAlign: 'center', color: '#6b7280' },
  footer: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 30px', borderTop: '1px solid #e2e8f0' },
  prevButton: { background: '#6b7280', color: 'white', border: 'none', borderRadius: 10, padding: '10px 20px', cursor: 'pointer' },
  nextButton: { background: '#3b82f6', color: 'white', border: 'none', borderRadius: 10, padding: '10px 20px', cursor: 'pointer' },
  pageInfo: { color: '#6b7280', fontSize: 14 }
};

// inject keyframes once
const styleTag = document.createElement('style');
styleTag.textContent = `@keyframes spin { 0%{transform:rotate(0)} 100%{transform:rotate(360deg)} }`;
if (!document.head.querySelector('style[data-passage-analysis]')) {
  styleTag.setAttribute('data-passage-analysis', 'true');
  document.head.appendChild(styleTag);
}

export default PassageAnalysis;

