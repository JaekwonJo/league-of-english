import React, { useEffect, useMemo, useState } from 'react';
import apiService, { api } from '../../services/api.service';
import analysisConfig from '../../config/analysis.config.json';
import PassagePickerGrid from '../shared/PassagePickerGrid';
import PassagePreviewModal from '../shared/PassagePreviewModal';

const MAX_SELECTION = 3;

const initialReportModal = {
  open: false,
  passageNumber: null,
  variantIndex: null,
  reason: ''
};

const DocumentAnalysis = ({ document, onClose }) => {
  const [passages, setPassages] = useState([]);
  const [selected, setSelected] = useState([]);
  const [analysisMap, setAnalysisMap] = useState({});
  const [activePassageNumber, setActivePassageNumber] = useState(null);
  const [activeVariantIndex, setActiveVariantIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [batchLoading, setBatchLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState('');
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [reportModal, setReportModal] = useState(initialReportModal);
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const [previewPassage, setPreviewPassage] = useState(null);

  const endpoints = analysisConfig.api.endpoints;

  const activePassage = useMemo(() => {
    if (!activePassageNumber) return null;
    return analysisMap[activePassageNumber] || null;
  }, [analysisMap, activePassageNumber]);

  const activeVariant = useMemo(() => {
    if (!activePassage || !Array.isArray(activePassage.variants) || activePassage.variants.length === 0) {
      return null;
    }
    return activePassage.variants[Math.min(activeVariantIndex, activePassage.variants.length - 1)];
  }, [activePassage, activeVariantIndex]);

  useEffect(() => {
    if (!document?.id) return;
    setPassages([]);
    setSelected([]);
    setAnalysisMap({});
    setActivePassageNumber(null);
    setActiveVariantIndex(0);
    setError(null);
    setMessage('');
    loadPassageData(document.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [document?.id]);

  const loadPassageData = async (documentId) => {
    try {
      setLoading(true);
      setError(null);
      setMessage('');

      const response = await apiService.get(endpoints.passageList.replace(':documentId', documentId));
      if (!response?.success) {
        setError(response?.message || '지문 목록을 불러오지 못했습니다.');
        setPassages([]);
        return;
      }

      const merged = (response.data || []).map((item) => ({
        passageNumber: item.passageNumber,
        excerpt: item.excerpt || '',
        fullText: item.text || '',
        wordCount: item.wordCount || null,
        charCount: item.charCount || null,
        analyzed: Boolean(item.analyzed),
        variantCount: item.variantCount || 0,
        variants: Array.isArray(item.variants) ? item.variants : [],
        remainingSlots: item.remainingSlots !== undefined
          ? item.remainingSlots
          : Math.max(0, 2 - (item.variantCount || 0)),
        updatedAt: item.updatedAt || null
      }));

      setPassages(merged);
    } catch (err) {
      setError(err?.message || '지문 목록을 불러오는 중 오류가 발생했습니다.');
      setPassages([]);
    } finally {
      setLoading(false);
    }
  };

  const syncAnalysisState = (analysis) => {
    if (!analysis) return;
    setAnalysisMap((prev) => ({
      ...prev,
      [analysis.passageNumber]: analysis
    }));
    setPassages((prev) => prev.map((item) => {
      if (item.passageNumber !== analysis.passageNumber) return item;
      const variantCount = Array.isArray(analysis.variants) ? analysis.variants.length : 0;
      return {
        ...item,
        analyzed: variantCount > 0,
        variantCount,
        remainingSlots: Math.max(0, 2 - variantCount)
      };
    }));
  };

  const fetchPassageAnalysis = async (passageNumber) => {
    try {
      setDetailLoading(true);
      setFeedbackMessage('');
      const endpoint = endpoints.getPassage
        .replace(':documentId', document.id)
        .replace(':passageNumber', passageNumber);
      const response = await apiService.get(endpoint);
      if (response?.success) {
        syncAnalysisState(response.data);
        setActivePassageNumber(passageNumber);
        setActiveVariantIndex(Math.max(0, (response.data.variants?.length || 1) - 1));
      } else {
        setError(response?.message || '분석 결과를 불러오지 못했습니다.');
      }
    } catch (err) {
      setError(err?.message || '분석 결과를 불러오는 중 문제가 발생했습니다.');
    } finally {
      setDetailLoading(false);
    }
  };

  const toggleSelection = (passageNumber) => {
    if (!Number.isInteger(passageNumber)) return;
    if (batchLoading) return;
    const target = passages.find((item) => item.passageNumber === passageNumber);
    if (target && target.remainingSlots === 0 && !selected.includes(passageNumber)) {
      setMessage('이미 두 개의 분석본이 준비된 지문은 추가로 생성할 수 없어요.');
      return;
    }
    setSelected((prev) => {
      if (prev.includes(passageNumber)) {
        return prev.filter((num) => num !== passageNumber);
      }
      if (prev.length >= MAX_SELECTION) {
        setMessage(`한 번에 최대 ${MAX_SELECTION}개의 지문만 선택할 수 있어요.`);
        return prev;
      }
      return [...prev, passageNumber];
    });
  };

  const handleAnalyzeSelected = async (targetList) => {
    const targets = Array.isArray(targetList) && targetList.length
      ? targetList
      : selected;
    const normalizedTargets = Array.from(new Set(
      targets
        .map((value) => Number(value))
        .filter((value) => Number.isInteger(value) && value > 0)
    )).sort((a, b) => a - b);

    if (batchLoading || normalizedTargets.length === 0) return;
    try {
      setBatchLoading(true);
      setMessage('');
      setError(null);
      const endpoint = endpoints.analyzeBatch.replace(':documentId', document.id);
      const response = await apiService.post(endpoint, { passageNumbers: normalizedTargets });

      if (!response?.success && (!response?.failures || response.failures.length === 0)) {
        setError(response?.message || '분석을 생성하지 못했습니다.');
        return;
      }

      const outcomes = response?.outcomes || [];
      if (outcomes.length) {
        const analyzedNow = [];
        const latestByPassage = new Map();
        outcomes.forEach((outcome) => {
          if (outcome?.data) {
            syncAnalysisState(outcome.data);
            analyzedNow.push(outcome.passageNumber);
            latestByPassage.set(outcome.passageNumber, outcome.data);
          }
        });
        if (analyzedNow.length) {
          const first = analyzedNow[0];
          setActivePassageNumber(first);
          const firstAnalysis = latestByPassage.get(first);
          if (firstAnalysis?.variants?.length) {
            setActiveVariantIndex(Math.max(0, firstAnalysis.variants.length - 1));
          }
        }
        setMessage(`${outcomes.length}개의 지문 분석을 완료했어요.`);
      }

      const failures = response?.failures || [];
      if (failures.length) {
        const texts = failures.map((item) => `지문 ${item.passageNumber}: ${item.message}`).join('\n');
        setError(`일부 지문은 분석하지 못했어요.\n${texts}`);
      }
    } catch (err) {
      setError(err?.message || '분석 생성 중 문제가 발생했습니다.');
    } finally {
      setBatchLoading(false);
      setSelected([]);
    }
  };

  const handleHelpfulToggle = async (variant) => {
    if (!activePassageNumber || !variant?.variantIndex) return;
    try {
      setFeedbackMessage('');
      const result = await api.analysis.feedback.submit(
        document.id,
        activePassageNumber,
        {
          variantIndex: variant.variantIndex,
          action: 'helpful'
        }
      );
      if (result?.success) {
        syncAnalysisState(result.data);
        setActiveVariantIndex((index) => Math.min(index, Math.max(0, (result.data.variants?.length || 1) - 1)));
        const nextVariant = result.data.variants?.find((item) => item.variantIndex === variant.variantIndex);
        if (nextVariant?.user?.helpful) {
          setFeedbackMessage('👍 도움이 됐다고 표시했어요!');
        } else {
          setFeedbackMessage('💡 도움이 됐어요 표시를 해제했어요.');
        }
      }
    } catch (err) {
      setFeedbackMessage(err?.message || '피드백 처리 중 문제가 발생했습니다.');
    }
  };

  const openReport = (variant) => {
    if (!activePassageNumber || !variant?.variantIndex) return;
    setReportModal({
      open: true,
      passageNumber: activePassageNumber,
      variantIndex: variant.variantIndex,
      reason: variant?.user?.report?.reason || ''
    });
    setFeedbackMessage('');
  };

  const closeReport = () => {
    setReportModal(initialReportModal);
    setReportSubmitting(false);
  };

  const submitReport = async () => {
    if (!reportModal.open || reportSubmitting) return;
    try {
      setReportSubmitting(true);
      const result = await api.analysis.feedback.submit(
        document.id,
        reportModal.passageNumber,
        {
          variantIndex: reportModal.variantIndex,
          action: 'report',
          reason: reportModal.reason
        }
      );
      if (result?.success) {
        syncAnalysisState(result.data);
        setActiveVariantIndex((index) => Math.min(index, Math.max(0, (result.data.variants?.length || 1) - 1)));
        setFeedbackMessage('🚨 신고가 접수되었어요. 빠르게 확인할게요!');
      }
      closeReport();
    } catch (err) {
      setFeedbackMessage(err?.message || '신고 처리 중 오류가 발생했습니다.');
    } finally {
      setReportSubmitting(false);
    }
  };

  const openPreview = (passage) => {
    if (!passage) return;
    setPreviewPassage({
      ...passage,
      text: passage.fullText || passage.text || passage.excerpt || ''
    });
  };

  const closePreviewModal = () => setPreviewPassage(null);

  const renderVariantTabs = () => {
    if (!activePassage?.variants?.length) return null;
    return (
      <div style={styles.variantTabs}>
        {activePassage.variants.map((variant, index) => (
          <button
            key={`variant-tab-${variant.variantIndex || index}`}
            type="button"
            style={{
              ...styles.variantTab,
              ...(index === activeVariantIndex ? styles.variantTabActive : {})
            }}
            onClick={() => {
              setActiveVariantIndex(index);
              setFeedbackMessage('');
            }}
          >
            분석본 {index + 1}
          </button>
        ))}
      </div>
    );
  };

  const renderPassageMeta = (passage) => {
    if (!passage) return null;
    const disabled = passage.remainingSlots === 0;
    return (
      <>
        <span style={styles.metaInfoText}>{passage.variantCount}/2 분석본</span>
        <div style={styles.metaActionRow}>
          <button
            type="button"
            style={styles.smallGhostButton}
            onClick={() => fetchPassageAnalysis(passage.passageNumber)}
            disabled={detailLoading && activePassageNumber === passage.passageNumber}
          >
            분석 보기
          </button>
          <button
            type="button"
            style={{
              ...styles.smallPrimaryButton,
              ...(disabled || batchLoading ? styles.smallButtonDisabled : {})
            }}
            onClick={() => handleAnalyzeSelected([passage.passageNumber])}
            disabled={disabled || batchLoading}
          >
            {disabled ? '완료' : 'AI 분석'}
          </button>
        </div>
      </>
    );
  };

  const renderVariantDetail = () => {
    if (!activePassageNumber) {
      return <div style={styles.placeholder}>왼쪽에서 지문을 선택하거나 분석을 생성해 주세요.</div>;
    }
    if (detailLoading) {
      return (
        <div style={styles.placeholder}>
          <div style={styles.spinner} />
          <p>분석을 불러오는 중이에요...</p>
        </div>
      );
    }
    if (!activeVariant) {
      return <div style={styles.placeholder}>아직 분석본이 없어요. 지문을 선택하고 분석을 생성해 주세요.</div>;
    }

    const meta = activeVariant.meta || {};
    const deepDive = meta.deepDive || {};
    const englishTitles = Array.isArray(meta.englishTitles) ? meta.englishTitles : [];
    const modernApplications = Array.isArray(meta.modernApplications) ? meta.modernApplications : [];
    const sentenceAnalysis = Array.isArray(activeVariant.sentenceAnalysis) ? activeVariant.sentenceAnalysis : [];

    return (
      <div style={styles.variantContainer}>
        <div style={styles.variantHeader}>
          <h3>지문 {activePassageNumber}</h3>
          <small>생성 시각: {new Date(activeVariant.generatedAt || Date.now()).toLocaleString()}</small>
        </div>
        <div style={styles.feedbackBar}>
          <button
            type="button"
            style={{
              ...styles.feedbackButton,
              ...(activeVariant.user?.helpful ? styles.feedbackButtonActive : {})
            }}
            onClick={() => handleHelpfulToggle(activeVariant)}
          >
            {activeVariant.user?.helpful ? '💖 도움이 됐어요!' : '👍 도움이 됐어요'}
            <span style={styles.feedbackCount}>({activeVariant.stats?.helpfulCount || 0})</span>
          </button>
          <button
            type="button"
            style={styles.reportButton}
            onClick={() => openReport(activeVariant)}
          >
            🚨 신고하기
          </button>
        </div>
        {feedbackMessage && <div style={styles.feedbackMessage}>{feedbackMessage}</div>}

        <section style={styles.section}>
          <h4>📄 원문</h4>
          <div style={styles.originalPassage}>{activePassage?.originalPassage}</div>
        </section>

        <section style={styles.section}>
          <h4>🔍 핵심 의미</h4>
          <div style={styles.metaGrid}>
            <div style={styles.metaCard}>
              <strong>핵심 메시지</strong>
              <p>{deepDive.coreMessage || '핵심 메시지가 준비되는 중입니다.'}</p>
            </div>
            <div style={styles.metaCard}>
              <strong>논리 흐름</strong>
              <p>{deepDive.logicalFlow || '글의 흐름을 정리 중이에요.'}</p>
            </div>
            <div style={styles.metaCard}>
              <strong>톤 & 수사법</strong>
              <p>{deepDive.toneAndStyle || '톤 정보가 아직 없어요.'}</p>
            </div>
          </div>
        </section>

        <section style={styles.section}>
          <h4>📝 문장별 분석</h4>
          <div style={styles.sentenceGrid}>
            {sentenceAnalysis.map((sentence, index) => (
              <div key={`sentence-${index}`} style={styles.sentenceCard}>
                <div style={styles.sentenceHeader}>
                  <span style={styles.sentenceEnglish}>
                    {sentence.isTopicSentence ? `⭐ ${sentence.english}` : sentence.english}
                  </span>
                  {sentence.isTopicSentence && <span style={styles.topicBadge}>주제문</span>}
                </div>
                <div style={styles.sentenceBody}>
                  <p><strong>직역:</strong> {sentence.korean}</p>
                  <p><strong>해석:</strong> {sentence.analysis || sentence.meaning || '설명이 준비 중이에요.'}</p>
                  <p><strong>배경 지식:</strong> {sentence.background || '추가 배경 설명이 없습니다.'}</p>
                  <p><strong>예시:</strong> {sentence.example || '예시가 제공되지 않았어요.'}</p>
                  <p><strong>문법:</strong> {sentence.grammar || '문법 포인트가 정리되는 중입니다.'}</p>
                  {Array.isArray(sentence.vocabulary?.words) && sentence.vocabulary.words.length > 0 && (
                    <div>
                      <strong>어휘:</strong>
                      <ul>
                        {sentence.vocabulary.words.map((word, idx) => (
                          <li key={`word-${index}-${idx}`}>
                            <strong>{word.term}</strong>: {word.meaning}
                            {word.synonyms?.length ? ` · 동의어: ${word.synonyms.join(', ')}` : ''}
                            {word.antonyms?.length ? ` · 반의어: ${word.antonyms.join(', ')}` : ''}
                            {word.note ? ` · 메모: ${word.note}` : ''}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section style={styles.section}>
          <h4>📚 제목 & 요약</h4>
          <div style={styles.metaCard}>
            <p><strong>영어 요약:</strong> {meta.englishSummary || '요약을 준비 중입니다.'}</p>
            <p><strong>한글 해석:</strong> {meta.englishSummaryKorean || '한글 해석이 아직 없어요.'}</p>
            <p><strong>작가의 주장:</strong> {meta.authorsClaim || '작가의 주장을 정리 중입니다.'}</p>
            {englishTitles.length > 0 && (
              <ul style={styles.titleList}>
                {englishTitles.map((item, idx) => (
                  <li key={`title-${idx}`}>
                    {item.title} — {item.korean}
                    {item.isQuestion ? ' (의문형)' : ''}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        <section style={styles.section}>
          <h4>🌍 현대 적용 사례</h4>
          {modernApplications.length ? (
            <ul style={styles.applicationList}>
              {modernApplications.map((item, idx) => (
                <li key={`application-${idx}`}>{item}</li>
              ))}
            </ul>
          ) : (
            <p>현대 사례는 앞으로 추가될 예정이에요.</p>
          )}
        </section>
      </div>
    );
  };

  if (!document) return null;

  return (
    <div style={styles.modal}>
      <div style={styles.modalContent}>
        <div style={styles.header}>
          <div>
            <h2 style={styles.title}>📊 문서 분석 관리</h2>
            <p style={styles.subtitle}>{document.title}</p>
          </div>
          <button type="button" style={styles.closeButton} onClick={onClose}>✕</button>
        </div>

        {message && <div style={styles.message}>{message}</div>}
        {error && <div style={styles.error}>{error}</div>}

        <div style={styles.body}>
          <div style={styles.sidebar}>
            <div style={styles.sidebarHeader}>
              <h3>지문 목록</h3>
              <p>최대 {MAX_SELECTION}개까지 선택 후 한 번에 분석할 수 있어요.</p>
              <button
                type="button"
                style={{
                  ...styles.batchButton,
                  ...(selected.length === 0 || batchLoading ? styles.batchButtonDisabled : {})
                }}
                disabled={selected.length === 0 || batchLoading}
                onClick={handleAnalyzeSelected}
              >
                {batchLoading ? '분석 중…' : `선택 지문 분석 (${selected.length})`}
              </button>
            </div>
            <div style={styles.passageList}>
              {loading ? (
                <div style={styles.placeholder}>
                  <div style={styles.spinner} />
                  <p>지문을 정리하고 있어요...</p>
                </div>
              ) : passages.length ? (
                <PassagePickerGrid
                  passages={passages}
                  selected={selected}
                  onToggle={toggleSelection}
                  onPreview={openPreview}
                  maxSelection={MAX_SELECTION}
                  selectionLabel="분석에 사용할 지문을 골라주세요"
                  disabledMessage="이미 두 개의 분석본이 있어요!"
                  renderMeta={renderPassageMeta}
                />
              ) : (
                <div style={styles.placeholder}>분석 가능한 지문을 찾지 못했어요.</div>
              )}
            </div>
          </div>

          <div style={styles.detailPanel}>
            {renderVariantTabs()}
            {renderVariantDetail()}
          </div>
        </div>
      </div>

      {reportModal.open && (
        <div style={styles.reportOverlay}>
          <div style={styles.reportModal}>
            <h3>🚨 신고하기</h3>
            <p style={{ color: 'var(--color-slate-500)' }}>
              어떤 부분이 이상했는지 자세히 알려주시면, 관리자 선생님이 빠르게 확인할 수 있어요.
            </p>
            <textarea
              style={styles.reportTextarea}
              value={reportModal.reason}
              onChange={(event) => setReportModal((prev) => ({ ...prev, reason: event.target.value }))}
              placeholder="예: 해석이 틀린 것 같아요 / 문법 설명이 이해가 안 돼요"
            />
            <div style={styles.reportActions}>
              <button type="button" onClick={closeReport} style={styles.reportSecondary} disabled={reportSubmitting}>닫기</button>
              <button type="button" onClick={submitReport} style={styles.reportPrimary} disabled={reportSubmitting}>
                {reportSubmitting ? '전송 중…' : '신고 전송'}
              </button>
            </div>
          </div>
        </div>
      )}

      <PassagePreviewModal
        open={Boolean(previewPassage)}
        passage={previewPassage}
        onClose={closePreviewModal}
        documentTitle={document.title}
      />
    </div>
  );
};

const styles = {
  modal: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.45)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1200
  },
  modalContent: {
    width: '92%',
    maxWidth: 1300,
    height: '90vh',
    background: 'var(--surface-card)',
    borderRadius: 24,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    boxShadow: '0 18px 48px rgba(15, 23, 42, 0.18)'
  },
  header: {
    padding: '22px 28px',
    borderBottom: '1px solid var(--border-subtle)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  title: {
    margin: 0,
    fontSize: '1.6rem',
    color: 'var(--color-slate-800)'
  },
  subtitle: {
    margin: '6px 0 0',
    color: 'var(--color-slate-500)'
  },
  closeButton: {
    border: 'none',
    background: 'none',
    fontSize: '1.1rem',
    cursor: 'pointer',
    color: 'var(--color-slate-400)'
  },
  message: {
    background: 'var(--success-surface)',
    color: 'var(--success-strong)',
    padding: '10px 24px'
  },
  error: {
    background: 'var(--danger-surface)',
    color: 'var(--danger)',
    whiteSpace: 'pre-line',
    padding: '10px 24px'
  },
  body: {
    flex: 1,
    display: 'flex',
    minHeight: 0
  },
  sidebar: {
    width: '35%',
    borderRight: '1px solid var(--border-subtle)',
    display: 'flex',
    flexDirection: 'column'
  },
  sidebarHeader: {
    padding: '20px',
    borderBottom: '1px solid var(--border-subtle)'
  },
  passageList: {
    flex: 1,
    overflowY: 'auto',
    padding: '18px'
  },
  passageRow: {
    background: 'var(--surface-soft)',
    borderRadius: 14,
    padding: '16px',
    marginBottom: 12,
    border: '1px solid var(--border-subtle)'
  },
  rowHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  checkboxLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    fontWeight: 600,
    color: 'var(--color-slate-700)'
  },
  badgeGroup: {
    display: 'flex',
    gap: 6
  },
  badge: {
    padding: '4px 8px',
    borderRadius: 8,
    fontSize: 12,
    fontWeight: 600
  },
  passageExcerpt: {
    color: 'var(--color-slate-500)',
    fontSize: 13,
    minHeight: 36
  },
  rowActions: {
    display: 'flex',
    gap: 10,
    marginTop: 12
  },
  viewButton: {
    flex: 1,
    background: 'var(--surface-soft-strong)',
    border: 'none',
    borderRadius: 10,
    padding: '10px 12px',
    cursor: 'pointer',
    color: 'var(--color-slate-600)'
  },
  analyzeButton: {
    flex: 1,
    background: 'var(--accent-primary)',
    color: 'var(--text-on-accent)',
    border: 'none',
    borderRadius: 10,
    padding: '10px 12px',
    cursor: 'pointer'
  },
  analyzeButtonDisabled: {
    background: 'var(--surface-soft-strong)',
    color: 'var(--color-slate-400)',
    cursor: 'not-allowed'
  },
  batchButton: {
    width: '100%',
    marginTop: 12,
    background: 'var(--indigo)',
    color: 'var(--text-on-accent)',
    border: 'none',
    borderRadius: 10,
    padding: '10px 14px',
    cursor: 'pointer',
    fontWeight: 600
  },
  batchButtonDisabled: {
    background: 'var(--surface-soft-strong)',
    color: 'var(--color-slate-400)',
    cursor: 'not-allowed'
  },
  detailPanel: {
    flex: 1,
    padding: '24px',
    overflowY: 'auto'
  },
  variantContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: 24
  },
  variantHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'baseline'
  },
  feedbackBar: {
    display: 'flex',
    gap: 10,
    flexWrap: 'wrap'
  },
  feedbackButton: {
    border: '1px solid var(--accent-primary)',
    background: 'transparent',
    color: 'var(--accent-primary)',
    borderRadius: 10,
    padding: '8px 14px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: 6
  },
  feedbackButtonActive: {
    background: 'var(--accent-primary)',
    color: 'var(--text-on-accent)'
  },
  feedbackCount: {
    fontSize: 12
  },
  reportButton: {
    border: '1px solid var(--danger)',
    background: 'transparent',
    color: 'var(--danger)',
    borderRadius: 10,
    padding: '8px 14px',
    cursor: 'pointer'
  },
  feedbackMessage: {
    background: 'var(--surface-soft)',
    padding: '8px 12px',
    borderRadius: 8,
    color: 'var(--color-slate-600)'
  },
  originalPassage: {
    background: 'var(--surface-soft-strong)',
    padding: '14px',
    borderRadius: 12,
    lineHeight: 1.6,
    color: 'var(--color-slate-700)'
  },
  section: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12
  },
  metaGrid: {
    display: 'grid',
    gap: 12,
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))'
  },
  metaCard: {
    background: 'var(--surface-soft)',
    borderRadius: 12,
    padding: '14px',
    border: '1px solid var(--border-subtle)'
  },
  sentenceGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: 14
  },
  sentenceCard: {
    background: 'var(--surface-card)',
    borderRadius: 12,
    border: '1px solid var(--border-subtle)',
    padding: '14px'
  },
  sentenceHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 8
  },
  sentenceEnglish: {
    fontWeight: 600,
    color: 'var(--color-slate-800)'
  },
  sentenceBody: {
    color: 'var(--color-slate-600)',
    display: 'flex',
    flexDirection: 'column',
    gap: 6
  },
  topicBadge: {
    background: 'var(--accent-primary)',
    color: 'var(--text-on-accent)',
    padding: '2px 8px',
    borderRadius: 999,
    fontSize: 12
  },
  titleList: {
    margin: '6px 0 0 0',
    paddingLeft: 18,
    color: 'var(--color-slate-600)'
  },
  applicationList: {
    margin: 0,
    paddingLeft: 18,
    color: 'var(--color-slate-600)'
  },
  variantTabs: {
    display: 'flex',
    gap: 8,
    marginBottom: 18
  },
  variantTab: {
    border: '1px solid var(--border-subtle)',
    background: 'var(--surface-soft)',
    borderRadius: 8,
    padding: '6px 14px',
    cursor: 'pointer'
  },
  variantTabActive: {
    background: 'var(--accent-primary)',
    color: 'var(--text-on-accent)',
    borderColor: 'var(--accent-primary)'
  },
  placeholder: {
    background: 'var(--surface-soft)',
    color: 'var(--color-slate-500)',
    padding: '40px 20px',
    borderRadius: 12,
    textAlign: 'center'
  },
  spinner: {
    width: 36,
    height: 36,
    borderRadius: '50%',
    border: '4px solid var(--border-subtle)',
    borderTopColor: 'var(--accent-primary)',
    margin: '0 auto 14px',
    animation: 'spin 1s linear infinite'
  },
  reportOverlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(15, 23, 42, 0.45)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1300
  },
  reportModal: {
    width: 420,
    background: 'var(--surface-card)',
    borderRadius: 18,
    padding: '24px',
    display: 'flex',
    flexDirection: 'column',
    gap: 16
  },
  reportTextarea: {
    width: '100%',
    minHeight: 120,
    borderRadius: 12,
    border: '1px solid var(--border-subtle)',
    padding: '12px',
    resize: 'vertical'
  },
  reportActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: 12
  },
  reportPrimary: {
    padding: '10px 16px',
    borderRadius: 10,
    border: 'none',
    background: 'var(--danger)',
    color: 'var(--text-on-accent)',
    cursor: 'pointer'
  },
  reportSecondary: {
    padding: '10px 16px',
    borderRadius: 10,
    border: '1px solid var(--border-subtle)',
    background: 'var(--surface-soft)',
    color: 'var(--color-slate-600)',
    cursor: 'pointer'
  },
  metaInfoText: {
    fontSize: 12,
    color: 'var(--text-muted, rgba(255,255,255,0.65))'
  },
  metaActionRow: {
    display: 'flex',
    gap: 6
  },
  smallGhostButton: {
    background: 'rgba(255,255,255,0.08)',
    color: 'var(--text-muted, rgba(255,255,255,0.8))',
    border: 'none',
    borderRadius: 6,
    padding: '6px 10px',
    fontSize: 12,
    cursor: 'pointer'
  },
  smallPrimaryButton: {
    background: 'var(--accent)',
    color: '#fff',
    border: 'none',
    borderRadius: 6,
    padding: '6px 10px',
    fontSize: 12,
    cursor: 'pointer',
    boxShadow: '0 8px 14px rgba(108,92,231,0.25)'
  },
  smallButtonDisabled: {
    opacity: 0.5,
    cursor: 'not-allowed'
  }
};

export default DocumentAnalysis;
