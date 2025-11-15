import React, { useEffect, useMemo, useState } from 'react';
import apiService, { api } from '../../services/api.service';
import analysisConfig from '../../config/analysis.config.json';
import PassagePickerGrid from '../shared/PassagePickerGrid';
import PassagePreviewModal from '../shared/PassagePreviewModal';

const MAX_VARIANTS_PER_PASSAGE = 1;

const initialReportModal = {
  open: false,
  passageNumber: null,
  variantIndex: null,
  reason: ''
};


const GENERATION_WORDS = [
  { word: 'spark', meaning: '불꽃; 아이디어가 시작되는 불씨' },
  { word: 'nurture', meaning: '길러 주다; 애정을 쏟아 키우다' },
  { word: 'momentum', meaning: '관성, 추진력; 계속 나아가게 하는 힘' },
  { word: 'focus', meaning: '집중; 마음을 한곳에 모으는 상태' }
];

const GENERATION_QUOTES = [
  { text: 'Education is the kindling of a flame, not the filling of a vessel.', author: 'William Butler Yeats' },
  { text: 'The beautiful thing about learning is that nobody can take it away from you.', author: 'B. B. King' },
  { text: 'Tell me and I forget. Teach me and I remember. Involve me and I learn.', author: 'Benjamin Franklin' },
  { text: 'Learning never exhausts the mind.', author: 'Leonardo da Vinci' }
];

const LOADING_MESSAGES = [
  'AI가 문장을 하나씩 뜯어보는 중이에요... ✨',
  '교수님 모드로 분석본을 정성껏 기록하는 중입니다... 📝',
  '학생 눈높이에 맞춰 해석을 다듬는 중이에요... 🌟',
  '실생활 예시와 어법 포인트를 챙기고 있어요... 📚'
];

const pickRandom = (items) => items[Math.floor(Math.random() * items.length)];

const DocumentAnalysis = ({ document, onClose }) => {
  const [passages, setPassages] = useState([]);
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
  const [deleteLoading, setDeleteLoading] = useState(false);

  const [generationPrompt, setGenerationPrompt] = useState({ open: false, passage: null });
  const [generationLoading, setGenerationLoading] = useState({
    active: false,
    passageNumber: null,
    count: 1,
    word: null,
    meaning: null,
    quote: null,
    quoteAuthor: null,
    message: null
  });

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
          : Math.max(0, MAX_VARIANTS_PER_PASSAGE - (item.variantCount || 0)),
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
        remainingSlots: Math.max(0, MAX_VARIANTS_PER_PASSAGE - variantCount)
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
      const message = String(err?.message || '');
      if (message.includes('404') || message.includes('찾을 수 없습니다')) {
        const passage = passages.find((item) => item.passageNumber === passageNumber) || null;
        const fallback = {
          passageNumber,
          originalPassage: passage?.fullText || passage?.text || passage?.excerpt || '',
          variants: []
        };
        syncAnalysisState(fallback);
        setActivePassageNumber(passageNumber);
        setActiveVariantIndex(0);
        setMessage('아직 저장된 분석본이 없어요. 새 분석을 만들어 주세요.');
        setError(null);
      } else {
        setError(message || '분석 결과를 불러오는 중 문제가 발생했습니다.');
      }
    } finally {
      setDetailLoading(false);
    }
  };

  const handleAnalyzePassage = async (passageNumber, options = {}) => {
    const target = Number(passageNumber);
    if (!Number.isInteger(target) || target < 1) return false;
    if (batchLoading) return false;

    let success = false;
    try {
      setBatchLoading(true);
      setMessage('');
      setError(null);

      const endpoint = endpoints.analyzePassage.replace(':documentId', document.id);
      const count = Number(options.count) || 1;
      const response = await apiService.post(endpoint, { passageNumber: target, count });

      if (!response?.success || !response?.data) {
        setError(response?.message || '분석을 생성하지 못했습니다.');
        return false;
      }

      const payload = response.data;
      syncAnalysisState(payload);
      setActivePassageNumber(target);
      if (payload?.variants?.length) {
        setActiveVariantIndex(Math.max(0, payload.variants.length - 1));
      }

      setMessage(response?.message || `지문 ${target} 분석이 준비되었어요.`);
      success = true;
    } catch (err) {
      setError(err?.message || '분석 생성 중 문제가 발생했습니다.');
    } finally {
      setBatchLoading(false);
    }

    return success;
  };

  const buildGenerationFlavor = () => {
    const word = pickRandom(GENERATION_WORDS);
    const quote = pickRandom(GENERATION_QUOTES);
    return {
      word: word.word,
      meaning: word.meaning,
      quote: quote.text,
      quoteAuthor: quote.author,
      message: pickRandom(LOADING_MESSAGES)
    };
  };

  const openGenerationPrompt = (passage) => {
    if (!passage || passage.remainingSlots === 0) return;
    setGenerationPrompt({ open: true, passage });
    setMessage('');
    setError(null);
  };

  const closeGenerationPrompt = () => setGenerationPrompt({ open: false, passage: null });

  const startGeneration = async (count) => {
    if (!generationPrompt.passage || !Number.isInteger(count)) return;
    if (batchLoading) return;
    const { passageNumber } = generationPrompt.passage;
    const flavor = buildGenerationFlavor();
    closeGenerationPrompt();
    setGenerationLoading({
      active: true,
      passageNumber,
      count,
      word: flavor.word,
      meaning: flavor.meaning,
      quote: flavor.quote,
      quoteAuthor: flavor.quoteAuthor,
      message: flavor.message
    });

    const ok = await handleAnalyzePassage(passageNumber, { count });

    setGenerationLoading({
      active: false,
      passageNumber: null,
      count: 1,
      word: null,
      meaning: null,
      quote: null,
      quoteAuthor: null,
      message: null
    });

    if (!ok) {
      setError((prev) => prev || '분석을 생성하지 못했습니다. 다시 시도해 주세요.');
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

  const handleDeleteVariant = async (variant) => {
    if (!activePassageNumber || !variant?.variantIndex) return;
    if (deleteLoading) return;

    // eslint-disable-next-line no-alert
    const confirmed = window.confirm('정말로 이 분석본을 삭제할까요? 삭제하면 다시 되돌릴 수 없어요.');
    if (!confirmed) return;

    try {
      setDeleteLoading(true);
      setMessage('');
      setError(null);
      setFeedbackMessage('');

      const endpoint = endpoints.deleteVariant
        .replace(':documentId', document.id)
        .replace(':passageNumber', activePassageNumber)
        .replace(':variantIndex', variant.variantIndex);

      const response = await apiService.delete(endpoint);
      if (response?.success && response?.data) {
        const payload = response.data;
        syncAnalysisState(payload);
        setActiveVariantIndex(Math.max(0, (payload.variants?.length || 1) - 1));
        setMessage(response?.message || '분석본을 삭제했어요.');
      } else {
        setError(response?.message || '분석본을 삭제하지 못했습니다.');
      }
    } catch (err) {
      setError(err?.message || '분석본 삭제 중 문제가 발생했습니다.');
    } finally {
      setDeleteLoading(false);
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
        <span style={styles.metaInfoText}>저장된 분석본 {passage.variantCount}/{MAX_VARIANTS_PER_PASSAGE}</span>
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
            onClick={() => openGenerationPrompt(passage)}
            disabled={disabled || batchLoading}
          >
            {disabled ? '가득 찼어요' : '새 분석 생성'}
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
          <div style={styles.variantTitleBlock}>
            <h3>지문 {activePassageNumber}</h3>
            <small>생성 시각: {new Date(activeVariant.generatedAt || Date.now()).toLocaleString()}</small>
          </div>
          <button
            type="button"
            style={{
              ...styles.variantDeleteButton,
              ...(deleteLoading ? styles.variantDeleteButtonDisabled : {})
            }}
            onClick={() => handleDeleteVariant(activeVariant)}
            disabled={deleteLoading}
          >
            🗑️ 분석 삭제
          </button>
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
                    {(() => {
                      const englishRaw = String(sentence.english || '');
                      const match = englishRaw.match(/^\*\*(.*)\*\*$/);
                      const clean = (match ? match[1] : englishRaw).trim();
                      return sentence.isTopicSentence ? <strong>⭐ {clean}</strong> : clean;
                    })()}
                  </span>
                  {sentence.isTopicSentence && <span style={styles.topicBadge}>주제문</span>}
                </div>
                <div style={styles.sentenceBody}>
                  <p>{sentence.korean || '*** 한글 해석: 우리말 설명을 준비 중이에요.'}</p>
                  <p>{sentence.analysis || '*** 분석: 의미를 정리하는 중입니다.'}</p>
                  <p>{sentence.background || '*** 이 문장에 필요한 배경지식: 추가 배경 정보를 수집하는 중입니다.'}</p>
                  <p>{sentence.example || '*** 이 문장에 필요한 사례: 생활 속 사례를 정리하는 중이에요.'}</p>
                  <p>{sentence.grammar || '✏️ 어법 포인트: 문법 포인트를 검토하는 중입니다.'}</p>
                  <p>{sentence.vocabulary?.intro || '*** 어휘 포인트: 핵심 어휘를 직접 정리해 주세요.'}</p>
                  {Array.isArray(sentence.vocabulary?.words) && sentence.vocabulary.words.length > 0 && (
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
              <p>지문을 하나씩 선택해 분석을 확인하거나 새로운 분석본을 만들어 주세요. 각 지문은 최대 {MAX_VARIANTS_PER_PASSAGE}개의 분석본을 저장할 수 있어요.</p>
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
                  onPreview={openPreview}
                  renderMeta={renderPassageMeta}
                  selectionEnabled={false}
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
            <p style={{ color: 'var(--text-secondary)' }}>
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

      {generationPrompt.open && (() => {
        const passage = generationPrompt.passage;
        const remainingSlots = Math.max(0, MAX_VARIANTS_PER_PASSAGE - (passage?.variantCount || 0));
        const options = Array.from({ length: remainingSlots }, (_, idx) => idx + 1);
        return (
          <div style={styles.generationOverlay}>
            <div style={styles.generationCard}>
              <div style={styles.generationBadge}>#{String(passage?.passageNumber || 0).padStart(2, '0')}</div>
              <h3 style={styles.generationTitle}>몇 개 만들까요?</h3>
              <p style={styles.generationSubtitle}>남은 칸: {remainingSlots}개 · 만들고 싶은 분석본 수를 골라 주세요.</p>
              {options.length ? (
                <div style={styles.generationButtons}>
                  {options.map((count) => (
                    <button
                      key={`gen-count-${count}`}
                      type="button"
                      style={styles.generationButton}
                      onClick={() => startGeneration(count)}
                    >
                      {count}개 만들기
                    </button>
                  ))}
                </div>
              ) : (
                <div style={styles.generationEmpty}>이미 두 개의 분석본이 준비되어 있어요.</div>
              )}
              <button type="button" style={styles.generationCancel} onClick={closeGenerationPrompt}>닫기</button>
            </div>
          </div>
        );
      })()}

      {generationLoading.active && (
        <div style={styles.generationOverlay}>
          <div style={styles.loadingCard}>
            <div style={styles.loadingSpinner} />
            <p style={styles.loadingMessage}>{generationLoading.message || 'AI가 분석본을 정성껏 만드는 중이에요... ⏳'}</p>
            {generationLoading.word && (
              <div style={styles.loadingWordBox}>
                <span style={styles.loadingWord}>{generationLoading.word}</span>
                <span style={styles.loadingMeaning}>{generationLoading.meaning}</span>
              </div>
            )}
            {generationLoading.quote && (
              <div style={styles.loadingQuoteBox}>
                <blockquote style={styles.loadingQuote}>“{generationLoading.quote}”</blockquote>
                <cite style={styles.loadingQuoteAuthor}>— {generationLoading.quoteAuthor}</cite>
              </div>
            )}
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
    color: 'var(--text-primary)'
  },
  subtitle: {
    margin: '6px 0 0',
    color: 'var(--text-secondary)'
  },
  closeButton: {
    border: 'none',
    background: 'none',
    fontSize: '1.1rem',
    cursor: 'pointer',
    color: 'var(--text-muted)'
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
    color: 'var(--text-secondary)'
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
    color: 'var(--text-secondary)',
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
    color: 'var(--text-secondary)'
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
    color: 'var(--text-muted)',
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
  variantTitleBlock: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4
  },
  variantDeleteButton: {
    border: '1px solid var(--danger)',
    background: 'transparent',
    color: 'var(--danger)',
    borderRadius: 8,
    padding: '6px 12px',
    cursor: 'pointer',
    fontSize: 14
  },
  variantDeleteButtonDisabled: {
    opacity: 0.6,
    cursor: 'not-allowed'
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
    color: 'var(--text-secondary)'
  },
  originalPassage: {
    background: 'var(--surface-soft-strong)',
    padding: '14px',
    borderRadius: 12,
    lineHeight: 1.6,
    color: 'var(--text-secondary)'
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
    color: 'var(--text-primary)'
  },
  sentenceBody: {
    color: 'var(--text-secondary)',
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
    color: 'var(--text-secondary)'
  },
  applicationList: {
    margin: 0,
    paddingLeft: 18,
    color: 'var(--text-secondary)'
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
    color: 'var(--text-secondary)',
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
    color: 'var(--text-secondary)',
    cursor: 'pointer'
  },
  metaInfoText: {
    fontSize: 12,
    color: 'var(--text-muted)'
  },
  metaActionRow: {
    display: 'flex',
    gap: 6
  },
  smallGhostButton: {
    background: 'var(--surface-overlay)',
    color: 'var(--text-secondary)',
    border: 'none',
    borderRadius: 6,
    padding: '6px 10px',
    fontSize: 12,
    cursor: 'pointer'
  },
  smallPrimaryButton: {
    background: 'var(--accent)',
    color: 'var(--text-on-accent)',
    border: 'none',
    borderRadius: 6,
    padding: '6px 10px',
    fontSize: 12,
    cursor: 'pointer',
    boxShadow: '0 8px 14px var(--accent-shadow)'
  },
  smallButtonDisabled: {
    opacity: 0.5,
    cursor: 'not-allowed'
  },
  generationOverlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(10, 12, 16, 0.65)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1350,
    padding: '24px'
  },
  generationCard: {
    width: 'min(420px, 92%)',
    background: 'var(--surface-card)',
    borderRadius: 22,
    padding: '32px 36px',
    boxShadow: '0 32px 60px rgba(15, 23, 42, 0.35)',
    display: 'flex',
    flexDirection: 'column',
    gap: 18,
    textAlign: 'center'
  },
  generationBadge: {
    alignSelf: 'center',
    background: 'rgba(99, 102, 241, 0.15)',
    color: 'var(--accent-primary)',
    padding: '4px 12px',
    borderRadius: 999,
    fontWeight: 600,
    letterSpacing: 1
  },
  generationTitle: {
    margin: 0,
    fontSize: '1.4rem',
    color: 'var(--text-primary)'
  },
  generationSubtitle: {
    margin: 0,
    color: 'var(--text-secondary)',
    lineHeight: 1.5
  },
  generationButtons: {
    display: 'flex',
    gap: 16,
    justifyContent: 'center',
    flexWrap: 'wrap'
  },
  generationEmpty: {
    padding: '16px',
    borderRadius: 12,
    background: 'var(--surface-soft)',
    color: 'var(--text-secondary)'
  },
  generationButton: {
    minWidth: 120,
    padding: '12px 18px',
    borderRadius: 12,
    border: 'none',
    background: 'var(--accent-primary)',
    color: 'var(--text-on-accent)',
    fontWeight: 600,
    cursor: 'pointer',
    boxShadow: '0 14px 30px rgba(99, 102, 241, 0.35)'
  },
  generationCancel: {
    alignSelf: 'center',
    marginTop: 4,
    background: 'none',
    border: 'none',
    color: 'var(--text-muted)',
    cursor: 'pointer'
  },
  loadingCard: {
    width: 'min(460px, 94%)',
    padding: '40px 32px',
    borderRadius: 26,
    background: 'var(--surface-card)',
    boxShadow: '0 32px 60px rgba(15, 23, 42, 0.4)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 20,
    textAlign: 'center'
  },
  loadingSpinner: {
    width: 64,
    height: 64,
    borderRadius: '50%',
    border: '6px solid rgba(148, 163, 184, 0.25)',
    borderTopColor: 'var(--accent-primary)',
    animation: 'spin 1s linear infinite'
  },
  loadingMessage: {
    margin: 0,
    fontSize: '1.1rem',
    color: 'var(--text-primary)'
  },
  loadingWordBox: {
    background: 'var(--surface-soft)',
    borderRadius: 14,
    padding: '12px 16px',
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    width: '100%'
  },
  loadingWord: {
    fontSize: '1.3rem',
    fontWeight: 700,
    color: 'var(--accent-primary)'
  },
  loadingMeaning: {
    color: 'var(--text-secondary)'
  },
  loadingQuoteBox: {
    background: 'rgba(148, 163, 184, 0.12)',
    borderRadius: 14,
    padding: '14px 18px',
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    width: '100%'
  },
  loadingQuote: {
    margin: 0,
    color: 'var(--text-secondary)',
    fontStyle: 'italic'
  },
  loadingQuoteAuthor: {
    alignSelf: 'flex-end',
    color: 'var(--text-muted)',
    fontSize: '0.9rem'
  },

};

export default DocumentAnalysis;
