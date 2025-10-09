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
    if (!document) return;
    try {
      const parsedContent = JSON.parse(document.content);
      const passages = parsedContent.passages || [];
      setTotalPassages(passages.length);
      refreshAnalyzed();
    } catch (e) {
      setError('문서 형식이 올바르지 않습니다.');
    }
  }, [document]);

  const refreshAnalyzed = async () => {
    try {
      const resp = await API.get(`/analysis/${document.id}/passages`);
      if (resp.success && resp.data) setAnalyzedPassages(new Set(resp.data.map(p => p.passageNumber)));
    } catch {}
  };

  const analyzePassage = async (num) => {
    try {
      setLoading(true); setError(null); setAnalysis(null);
      const resp = await API.post(`/analysis/${document.id}/analyze-passage`, { passageNumber: num });
      if (resp.success) {
        setAnalysis(resp.data);
        if (!resp.cached) setAnalyzedPassages(prev => new Set([...prev, num]));
      } else setError(resp.message);
    } catch (e) {
      setError('분석 중 오류가 발생했습니다.');
    } finally { setLoading(false); }
  };

  const viewPassage = async (num) => {
    try {
      setLoading(true); setError(null);
      const resp = await API.get(`/analysis/${document.id}/passage/${num}`);
      if (resp.success) setAnalysis(resp.data); else setError(resp.message);
    } catch (e) { setError('분석 결과 조회 중 오류가 발생했습니다.'); }
    finally { setLoading(false); }
  };

  const handleSelect = (num) => {
    setCurrentPassage(num);
    analyzedPassages.has(num) ? viewPassage(num) : setAnalysis(null);
  };

  if (!document) return null;

  return (
    <div style={styles.modal}>
      <div style={styles.modalContent}>
        <div style={styles.header}>
          <h2 style={styles.title}>개별 지문분석 · No.{currentPassage}</h2>
          <button style={styles.closeButton} onClick={onClose}>닫기</button>
        </div>

        <div style={styles.documentInfo}>
          <h3 style={styles.documentTitle}>{document.title}</h3>
          <p style={styles.documentMeta}>총 {totalPassages}개 지문 · 분석 완료: {analyzedPassages.size}개</p>
        </div>

        <div style={styles.passageSelector}>
          <div style={styles.passageGrid}>
            {Array.from({ length: totalPassages }, (_, i) => i + 1).map((n) => (
              <button
                key={n}
                style={{
                  ...styles.passageButton,
                  ...(currentPassage === n ? styles.passageButtonSelected : {}),
                  ...(analyzedPassages.has(n) ? styles.passageButtonAnalyzed : {})
                }}
                onClick={() => handleSelect(n)}
              >
                {n}
                {analyzedPassages.has(n) && <span style={styles.checkMark}>✓</span>}
              </button>
            ))}
          </div>
        </div>

        <div style={styles.content}>
          <div style={styles.passageHeader}>
            <h3>지문 {currentPassage}</h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {!analyzedPassages.has(currentPassage) && (
                <button style={styles.analyzeButton} onClick={() => analyzePassage(currentPassage)} disabled={loading}>
                  {loading ? '분석 중…' : '분석하기'}
                </button>
              )}
              {analysis && (
                <>
                  <select id="scope" style={{ padding: '8px 10px', borderRadius: 8 }} defaultValue="public" onChange={(e)=>{
                    const grp = document.querySelector('#groupsField');
                    if (grp) grp.style.display = e.target.value==='group' ? 'inline-block' : 'none';
                  }}>
                    <option value="public">전체 공개</option>
                    <option value="school">학교 공개</option>
                    <option value="grade">학년 공개</option>
                    <option value="group">그룹 공개</option>
                  </select>
                  <input id="groupsField" placeholder="그룹을 ,로 구분 입력" style={{ padding:'8px 10px', borderRadius:8, display:'none' }} />
                  <button
                    style={{ ...styles.analyzeButton, background: 'var(--success)' }}
                    onClick={async () => {
                      try {
                        const scope = document.querySelector('#scope').value;
                        const groupsVal = document.querySelector('#groupsField')?.value || '';
                        const groups = groupsVal.split(',').map(s=>s.trim()).filter(Boolean);
                        await API.post(`/analysis/${document.id}/publish-passage`, { passageNumber: currentPassage, scope, groups });
                        alert('해당 지문 분석이 학생에게 공개되었습니다.');
                      } catch {
                        alert('공개 중 오류가 발생했습니다. 관리자 권한이 필요할 수 있습니다.');
                      }
                    }}
                  >
                    저장하기(공개)
                  </button>
                  <button style={{ ...styles.analyzeButton, background: 'var(--color-slate-500)' }} onClick={() => window.print()}>내보내기(PDF)</button>
                </>
              )}
            </div>
          </div>

          {loading && (
            <div style={styles.loading}>
              <div style={styles.spinner}></div>
              <p>AI가 지문을 분석중입니다…</p>
            </div>
          )}

          {error && (<div style={styles.error}><p>{error}</p></div>)}

          {analysis && !loading && (
            <div style={styles.analysisContent}>
              {analysis.sentenceAnalysis && (
                <Section title="① 문장별 분석" content={
                  <div style={styles.sentenceContainer}>
                    {analysis.sentenceAnalysis.map((s, idx) => (
                      <div key={idx} style={styles.sentenceCard}>
                        <div style={styles.sentenceEnglish}>{s.english}</div>
                        <div style={styles.sentenceTranslation}><strong>직역:</strong> {s.translation}</div>
                        <div style={styles.sentenceMeaning}><strong>의미해석:</strong> {s.meaning}</div>
                        {s.example && (<div style={styles.sentenceMeaning}><strong>예시:</strong> {s.example}</div>)}
                        {s.note && (<div style={styles.sentenceMeaning}><strong>설명/배경:</strong> {s.note}</div>)}
                      </div>
                    ))}
                  </div>
                } />
              )}

              {analysis.deepAnalysis && (
                <Section title="② 심화 해설" content={
                  <div style={styles.deepAnalysisBox}>
                    <div><strong>해석:</strong> {analysis.deepAnalysis.interpretation}</div>
                    <div><strong>문맥:</strong> {analysis.deepAnalysis.context}</div>
                    <div><strong>설명:</strong> {analysis.deepAnalysis.commentary}</div>
                  </div>
                } />
              )}

              {analysis.keyExpressions && (
                <Section title="③ 핵심 표현 & 유의어/반의어" content={
                  <div style={styles.expressionGrid}>
                    {analysis.keyExpressions.map((expr, i) => (
                      <div key={i} style={styles.expressionCard}>
                        <div style={styles.expressionTitle}>{expr.expression}</div>
                        <div style={styles.expressionMeaning}>{expr.meaning}</div>
                        {expr.synonyms?.length > 0 && (<div><strong>유의어:</strong> {expr.synonyms.join(', ')}</div>)}
                        {expr.antonyms?.length > 0 && (<div><strong>반의어:</strong> {expr.antonyms.join(', ')}</div>)}
                      </div>
                    ))}
                  </div>
                } />
              )}

              {analysis.examplesAndBackground && (
                <Section title="④ 예시/배경지식" content={
                  <div>
                    {analysis.examplesAndBackground.examples && (
                      <div>
                        <strong>예시:</strong>
                        <ul>
                          {analysis.examplesAndBackground.examples.map((ex, idx) => (<li key={idx}>{ex}</li>))}
                        </ul>
                      </div>
                    )}
                    {analysis.examplesAndBackground.background && (
                      <div style={styles.backgroundBox}><strong>배경:</strong> {analysis.examplesAndBackground.background}</div>
                    )}
                  </div>
                } />
              )}

              {analysis.comprehensive && (
                <Section title="⑤ 종합 메타" content={
                  <div style={styles.comprehensiveBox}>
                    <div><strong>영어 제목:</strong> {analysis.comprehensive.englishTitle}</div>
                    <div><strong>한글 요지:</strong> {analysis.comprehensive.koreanSummary}</div>
                    <div><strong>작가의 주장:</strong> {analysis.comprehensive.authorsClaim}</div>
                    <div><strong>영어요약문:</strong> {analysis.comprehensive.finalSummary}</div>
                  </div>
                } />
              )}
            </div>
          )}
        </div>

        <div style={styles.footer}>
          <button style={styles.prevButton} onClick={() => handleSelect(Math.max(1, currentPassage - 1))} disabled={currentPassage === 1}>이전 지문</button>
          <span style={styles.pageInfo}>{currentPassage} / {totalPassages}</span>
          <button style={styles.nextButton} onClick={() => handleSelect(Math.min(totalPassages, currentPassage + 1))} disabled={currentPassage === totalPassages}>다음 지문</button>
        </div>
      </div>
    </div>
  );
};

const Section = ({ title, content }) => (
  <div style={styles.section}>
    <h4 style={styles.sectionTitle}>{title}</h4>
    <div style={styles.sectionContent}>{content}</div>
  </div>
);

const styles = {
  modal: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  modalContent: { background: 'var(--surface-card)', borderRadius: 20, width: '90%', maxWidth: 1200, height: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 30px', borderBottom: '1px solid var(--border-subtle)' },
  title: { color: 'var(--text-primary)', margin: 0, fontSize: '1.5rem' },
  closeButton: { background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: 'var(--text-secondary)', padding: 5 },
  documentInfo: { padding: '15px 30px', borderBottom: '1px solid var(--border-subtle)', background: 'var(--surface-soft-solid)' },
  documentTitle: { color: 'var(--text-primary)', margin: '0 0 5px 0', fontSize: '1.1rem' },
  documentMeta: { color: 'var(--text-secondary)', margin: 0, fontSize: 14 },
  passageSelector: { padding: '20px 30px', borderBottom: '1px solid var(--border-subtle)' },
  passageGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(50px, 1fr))', gap: 10 },
  passageButton: { padding: 10, background: 'var(--surface-soft-strong)', border: '2px solid transparent', borderRadius: 8, cursor: 'pointer', position: 'relative', transition: 'all .2s' },
  passageButtonSelected: { background: 'var(--accent-primary)', color: 'var(--text-on-accent)', borderColor: 'var(--accent-primary-strong)' },
  passageButtonAnalyzed: { background: 'var(--success)', color: 'var(--text-on-accent)' },
  checkMark: { position: 'absolute', top: 2, right: 4, fontSize: 12 },
  content: { flex: 1, padding: '20px 30px', overflow: 'auto' },
  passageHeader: { display: 'flex', gap: 12, alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  analyzeButton: { background: 'var(--accent-primary)', color: 'var(--text-on-accent)', border: 'none', borderRadius: 10, padding: '10px 20px', cursor: 'pointer', fontSize: 14 },
  loading: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 30px', color: 'var(--text-secondary)' },
  spinner: { width: 40, height: 40, border: '4px solid var(--border-subtle)', borderTop: '4px solid var(--accent-primary)', borderRadius: '50%', animation: 'spin 1s linear infinite', marginBottom: 20 },
  error: { padding: 30, textAlign: 'center', color: 'var(--danger)' },
  analysisContent: { display: 'flex', flexDirection: 'column', gap: 20 },
  section: { marginBottom: 25 },
  sectionTitle: { color: 'var(--text-primary)', fontSize: '1.1rem', marginBottom: 12 },
  sectionContent: { color: 'var(--text-secondary)', lineHeight: 1.6 },
  sentenceContainer: { display: 'flex', flexDirection: 'column', gap: 15 },
  sentenceCard: { background: 'var(--surface-soft-solid)', borderRadius: 10, padding: 15, border: '1px solid var(--border-subtle)' },
  sentenceEnglish: { fontSize: 16, color: 'var(--text-primary)', marginBottom: 10, fontWeight: 500 },
  sentenceTranslation: { fontSize: 14, color: 'var(--text-secondary)', marginBottom: 8 },
  sentenceMeaning: { fontSize: 14, color: 'var(--text-secondary)' },
  deepAnalysisBox: { background: 'var(--surface-soft-strong)', borderRadius: 10, padding: 20, display: 'flex', flexDirection: 'column', gap: 15 },
  expressionGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 15 },
  expressionCard: { background: 'var(--surface-card)', border: '2px solid var(--border-subtle)', borderRadius: 10, padding: 15 },
  expressionTitle: { fontSize: 16, fontWeight: 'bold', color: 'var(--text-primary)', marginBottom: 8 },
  expressionMeaning: { fontSize: 14, color: 'var(--text-secondary)', marginBottom: 10 },
  backgroundBox: { background: 'var(--warning-surface)', borderRadius: 10, padding: 15, border: '1px solid var(--warning)', marginTop: 10 },
  comprehensiveBox: { background: 'linear-gradient(135deg, var(--indigo) 0%, var(--indigo-strong) 100%)', color: 'var(--text-on-accent)', borderRadius: 15, padding: 20, display: 'flex', flexDirection: 'column', gap: 12 },
  footer: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 30px', borderTop: '1px solid var(--border-subtle)' },
  prevButton: { background: 'var(--color-slate-500)', color: 'var(--text-on-accent)', border: 'none', borderRadius: 10, padding: '10px 20px', cursor: 'pointer' },
  nextButton: { background: 'var(--accent-primary)', color: 'var(--text-on-accent)', border: 'none', borderRadius: 10, padding: '10px 20px', cursor: 'pointer' },
  pageInfo: { color: 'var(--text-secondary)', fontSize: 14 }
};

// inject keyframes
const styleTag = document.createElement('style');
styleTag.textContent = `@keyframes spin { 0%{transform:rotate(0)} 100%{transform:rotate(360deg)} }`;
if (!document.head.querySelector('style[data-passage-analysis]')) {
  styleTag.setAttribute('data-passage-analysis', 'true');
  document.head.appendChild(styleTag);
}

export default PassageAnalysis;
