import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api.service';
import { analysisStyles } from '../styles/analysisStyles';
import PassagePickerGrid from '../components/shared/PassagePickerGrid';
import PassagePreviewModal from '../components/shared/PassagePreviewModal';
import FriendlyError from '../components/common/FriendlyError';

const MAX_VARIANTS_PER_PASSAGE = 2;

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

const CIRCLED_DIGITS = ['①', '②', '③', '④', '⑤', '⑥', '⑦', '⑧', '⑨', '⑩', '⑪', '⑫', '⑬', '⑭', '⑮', '⑯', '⑰', '⑱', '⑲', '⑳'];
const getCircledDigit = (index) => CIRCLED_DIGITS[index] || `${index + 1}.`;

const pickRandom = (items) => items[Math.floor(Math.random() * items.length)];

const STEPS = {
  DOCUMENT: 1,
  PASSAGE: 2,
  ANALYSIS: 3
};

const AnalysisPage = () => {
  const { isAdmin } = useAuth();
  const [documents, setDocuments] = useState([]);
  const [documentSearch, setDocumentSearch] = useState('');
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [passageList, setPassageList] = useState([]);
  const [selectedPassage, setSelectedPassage] = useState(null);
  const [activeVariantIndex, setActiveVariantIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [passageLoading, setPassageLoading] = useState(false);
  const [error, setError] = useState(null);
  const [analysisLimitError, setAnalysisLimitError] = useState(null);
  const [feedbackMessage, setFeedbackMessage] = useState(null);
  const [reportModal, setReportModal] = useState({ open: false, variantIndex: null, reason: '' });
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const stepPathMap = useMemo(() => ({
    [STEPS.DOCUMENT]: '/analysis',
    [STEPS.PASSAGE]: '/analysis/passages',
    [STEPS.ANALYSIS]: '/analysis/detail'
  }), []);
  const getStepFromPath = useCallback((pathname) => {
    if (pathname.startsWith('/analysis/detail')) return STEPS.ANALYSIS;
    if (pathname.startsWith('/analysis/passages')) return STEPS.PASSAGE;
    return STEPS.DOCUMENT;
  }, []);
  const [step, setStep] = useState(() => getStepFromPath(window.location.pathname));
  const navigateToStep = useCallback((nextStep) => {
    const target = stepPathMap[nextStep] || '/analysis';
    if (window.location.pathname !== target) {
      window.history.pushState({}, '', target);
      window.dispatchEvent(new PopStateEvent('popstate'));
    } else {
      setStep(nextStep);
    }
  }, [stepPathMap]);
  useEffect(() => {
    const handler = () => setStep(getStepFromPath(window.location.pathname));
    window.addEventListener('popstate', handler);
    return () => window.removeEventListener('popstate', handler);
  }, [getStepFromPath]);
  const [previewPassage, setPreviewPassage] = useState(null);
  const [generationPrompt, setGenerationPrompt] = useState({ open: false, passage: null });
  const [generationLoading, setGenerationLoading] = useState({
    active: false,
    passageNumber: null,
    count: 1,
    word: null,
    meaning: null,
    quote: null,
    quoteAuthor: null,
    message: null,
    wordHistory: [],
    quoteHistory: []
  });
  useEffect(() => {
    if (!generationLoading.active) return undefined;

    const rotateWord = () => {
      setGenerationLoading((prev) => {
        if (!prev.active) return prev;
        const history = Array.isArray(prev.wordHistory) ? prev.wordHistory : [];
        const usedWords = new Set(history.map((item) => item.word));
        const candidates = GENERATION_WORDS.filter((item) => !usedWords.has(item.word));
        const next = candidates.length ? pickRandom(candidates) : pickRandom(GENERATION_WORDS);
        const alreadyIncluded = history.some((item) => item.word === next.word);
        const nextHistory = alreadyIncluded ? history : [...history, next];
        return {
          ...prev,
          word: next.word,
          meaning: next.meaning,
          wordHistory: nextHistory
        };
      });
    };

    const rotateQuote = () => {
      setGenerationLoading((prev) => {
        if (!prev.active) return prev;
        const history = Array.isArray(prev.quoteHistory) ? prev.quoteHistory : [];
        const usedQuotes = new Set(history.map((item) => item.text));
        const candidates = GENERATION_QUOTES.filter((item) => !usedQuotes.has(item.text));
        const next = candidates.length ? pickRandom(candidates) : pickRandom(GENERATION_QUOTES);
        const alreadyIncluded = history.some((item) => item.text === next.text);
        const nextHistory = alreadyIncluded ? history : [...history, { text: next.text, author: next.author }];
        return {
          ...prev,
          quote: next.text,
          quoteAuthor: next.author,
          quoteHistory: nextHistory
        };
      });
    };

    const wordTimer = window.setInterval(rotateWord, 5000);
    const quoteTimer = window.setInterval(rotateQuote, 7000);

    return () => {
      window.clearInterval(wordTimer);
      window.clearInterval(quoteTimer);
    };
  }, [generationLoading.active]);
  const [selectedVariantIndexes, setSelectedVariantIndexes] = useState([]);
  const [variantDeleteLoading, setVariantDeleteLoading] = useState(false);

  const raiseError = (summary, detail = '', extra = {}) => {
    setError({ summary, detail, ...extra });
  };

  const normalizePassage = (entry = {}) => ({
    passageNumber: entry.passageNumber,
    originalPassage: entry.originalPassage || '',
    variants: Array.isArray(entry.variants) ? entry.variants : [],
    createdAt: entry.createdAt || null
  });

const updatePassageVariantsState = (passageNumber, variants, originalPassage) => {
    setPassageList((prev) => prev.map((item) => {
      if (item.passageNumber !== passageNumber) return item;
      return {
        ...item,
        variants: Array.isArray(variants) ? variants : item.variants || [],
        variantCount: Array.isArray(variants) ? variants.length : (typeof item.variantCount === 'number' ? item.variantCount : 0),
        hasAnalysis: Array.isArray(variants) ? variants.length > 0 : item.hasAnalysis,
        originalPassage: originalPassage || item.originalPassage || item.text
      };
    }));
  };

  const openPreview = (passage) => {
    if (!passage) return;
    setPreviewPassage({
      ...passage,
      text: passage.text || passage.originalPassage || passage.excerpt || ''
    });
  };

  const closePreview = () => setPreviewPassage(null);

  const fetchDocumentsList = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      setAnalysisLimitError(null);

      const response = await api.analysis.list();
      if (response.success) {
        setDocuments(response.data || []);
      } else {
        raiseError('분석 가능한 문서를 불러오는데 실패했습니다.', response.message || 'success: false');
      }
    } catch (err) {
      raiseError('문서 목록을 불러오는 중 문제가 발생했습니다.', err?.message || '');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDocumentsList();
  }, [fetchDocumentsList]);

  useEffect(() => {
    if (step === STEPS.PASSAGE && !selectedDocument) {
      navigateToStep(STEPS.DOCUMENT);
    } else if (step === STEPS.ANALYSIS) {
      if (!selectedDocument) {
        navigateToStep(STEPS.DOCUMENT);
      } else if (!selectedPassage) {
        navigateToStep(STEPS.PASSAGE);
      }
    }
  }, [step, selectedDocument, selectedPassage, navigateToStep]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [step]);

  const normalizedDocumentSearch = documentSearch.trim().toLowerCase();
  const filteredDocuments = useMemo(() => {
    if (!normalizedDocumentSearch) return documents;
    return documents.filter((doc) => {
      const title = String(doc.title || '').toLowerCase();
      const school = String(doc.school || '').toLowerCase();
      const category = String(doc.category || '').toLowerCase();
      return (
        title.includes(normalizedDocumentSearch) ||
        school.includes(normalizedDocumentSearch) ||
        category.includes(normalizedDocumentSearch)
      );
    });
  }, [documents, normalizedDocumentSearch]);

  const handleDocumentClick = async (document) => {
    try {
      setLoading(true);
      setError(null);
      setAnalysisLimitError(null);
      setSelectedDocument(document);
      setSelectedPassage(null);
      setActiveVariantIndex(0);
      setFeedbackMessage(null);
      setReportModal({ open: false, variantIndex: null, reason: '' });
      setGenerationPrompt({ open: false, passage: null });
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

      // 즉시 지문 선택 화면으로 전환해 기존 분석이 보이지 않도록 초기화
      navigateToStep(STEPS.PASSAGE);
      setPassageList([]);

      const passageResponse = await api.analysis.listPassageSummaries(document.id);

      if (!passageResponse.success) {
        raiseError('지문 목록을 불러오는데 실패했습니다.', passageResponse.message || 'success: false');
        setPassageList([]);
        navigateToStep(STEPS.DOCUMENT);
        return;
      }

      const rawPassages = Array.isArray(passageResponse?.data) ? passageResponse.data : [];
      const mappedPassages = rawPassages
        .map((entry) => ({
          ...entry,
          hasAnalysis: Boolean(entry.analyzed || entry.variantCount),
          variants: Array.isArray(entry.variants) ? entry.variants : []
        }))
        .sort((a, b) => a.passageNumber - b.passageNumber);

      setPassageList(mappedPassages);
    } catch (err) {
      raiseError('지문 목록을 불러오는 중 문제가 발생했습니다.', err?.message || '');
      setPassageList([]);
      navigateToStep(STEPS.DOCUMENT);
    } finally {
      setLoading(false);
    }
  };

  const handlePassageClick = async (passage) => {
    if (!selectedDocument) return;
    try {
      setPassageLoading(true);
      setError(null);
      setAnalysisLimitError(null);
      setFeedbackMessage(null);
      setReportModal({ open: false, variantIndex: null, reason: '' });
      setGenerationPrompt({ open: false, passage: null });
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

      const response = await api.analysis.getPassage(selectedDocument.id, passage.passageNumber);
      if (response.success) {
        const normalized = normalizePassage(response.data || {});
        updatePassageVariantsState(passage.passageNumber, normalized.variants, normalized.originalPassage);
        setSelectedPassage(normalized);
        setActiveVariantIndex(0);
        navigateToStep(STEPS.ANALYSIS);
        setFeedbackMessage(null);
        setReportModal({ open: false, variantIndex: null, reason: '' });
      } else {
        raiseError('해당 지문의 분석을 불러오지 못했습니다.', response.message || 'success: false');
      }
    } catch (err) {
      const message = err?.message || '분석을 불러오는 중 오류가 발생했습니다.';
      if (message.includes('하루 10개의 분석본')) {
        setAnalysisLimitError(message);
      } else {
        raiseError('분석을 불러오는 중 오류가 발생했습니다.', err?.message || '');
      }
      navigateToStep(STEPS.PASSAGE);
    } finally {
      setPassageLoading(false);
    }
  };

  const handleGenerateVariants = async (passageNumber, count) => {
    if (!selectedDocument) return false;
    let success = false;
    try {
      setError(null);
      setAnalysisLimitError(null);

      const response = await api.analysis.generate(selectedDocument.id, passageNumber, count);
      if (response.success) {
        const normalized = normalizePassage(response.data || {});
        updatePassageVariantsState(passageNumber, normalized.variants, normalized.originalPassage);
        if (selectedPassage && selectedPassage.passageNumber === passageNumber) {
          setSelectedPassage(normalized);
          setActiveVariantIndex(Math.max(0, normalized.variants.length - 1));
        }
        setFeedbackMessage('새 분석본이 준비됐어요! 🤗');
        success = true;
      } else {
        raiseError('분석본 생성에 실패했습니다.', response.message || 'success: false');
      }
    } catch (err) {
      raiseError('분석본 생성 중 문제가 발생했습니다.', err?.message || '');
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
    if (!passage || remainingSlots(passage) === 0) return;
    setGenerationPrompt({ open: true, passage });
    setFeedbackMessage(null);
    setReportModal({ open: false, variantIndex: null, reason: '' });
  };

  const closeGenerationPrompt = () => setGenerationPrompt({ open: false, passage: null });

  const resetGenerationLoading = () => {
    setGenerationLoading({
      active: false,
      passageNumber: null,
      count: 1,
      word: null,
      meaning: null,
      quote: null,
      quoteAuthor: null,
      message: null,
      wordHistory: [],
      quoteHistory: []
    });
  };

  const startGeneration = async (count) => {
    if (!generationPrompt.passage || !Number.isInteger(count)) return;
    const flavor = buildGenerationFlavor();
    const passageNumber = generationPrompt.passage.passageNumber;
    closeGenerationPrompt();
    setGenerationLoading({
      active: true,
      passageNumber,
      count,
      word: flavor.word,
      meaning: flavor.meaning,
      quote: flavor.quote,
      quoteAuthor: flavor.quoteAuthor,
      message: flavor.message,
      wordHistory: flavor.word ? [{ word: flavor.word, meaning: flavor.meaning }] : [],
      quoteHistory: flavor.quote ? [{ text: flavor.quote, author: flavor.quoteAuthor }] : []
    });

    const ok = await handleGenerateVariants(passageNumber, count);

    resetGenerationLoading();
    if (!ok) {
      setError((prev) => prev || '분석을 생성하지 못했습니다. 다시 시도해 주세요.');
    }
  };

  const handleBackToDocuments = () => {
    navigateToStep(STEPS.DOCUMENT);
    setSelectedDocument(null);
    setSelectedPassage(null);
    setActiveVariantIndex(0);
    setAnalysisLimitError(null);
  };

  const handleBackToPassages = () => {
    navigateToStep(STEPS.PASSAGE);
    setSelectedPassage(null);
    setActiveVariantIndex(0);
    setAnalysisLimitError(null);
    setFeedbackMessage(null);
    setReportModal({ open: false, variantIndex: null, reason: '' });
  };

  const remainingSlots = (passage) => {
    const count = typeof passage?.variantCount === 'number'
      ? passage.variantCount
      : (Array.isArray(passage?.variants) ? passage.variants.length : 0);
    return Math.max(0, MAX_VARIANTS_PER_PASSAGE - count);
  };

  const renderDocumentList = () => (
    <div style={analysisStyles.container}>
      <div style={analysisStyles.header}>
        <h1 style={analysisStyles.title}>📖 문서 분석 자료</h1>
        <p style={analysisStyles.subtitle}>분석할 문서를 선택해 주세요</p>
      </div>

      {loading ? (
        <div style={analysisStyles.loadingContainer}>
          <div style={analysisStyles.spinner} />
          <p>문서 목록을 불러오는 중이에요...</p>
        </div>
      ) : (
        <>
          <div style={analysisStyles.searchRow}>
            <input
              type="search"
              value={documentSearch}
              onChange={(event) => setDocumentSearch(event.target.value)}
              placeholder="문서 제목, 학교, 유형으로 검색해 보세요"
              style={analysisStyles.searchInput}
            />
            {documentSearch && (
              <button type="button" style={analysisStyles.searchClear} onClick={() => setDocumentSearch('')}>
                지우기
              </button>
            )}
          </div>

          {filteredDocuments.length === 0 ? (
            <div style={analysisStyles.emptySearch}>
              <h3>검색 결과가 없어요 😢</h3>
              <p>다른 키워드(예: 학교명, 문서명, 학년)를 입력해 보거나 새 문서를 업로드해 보세요.</p>
            </div>
          ) : (
            <div style={analysisStyles.grid}>
              {filteredDocuments.map((doc) => (
                <div
                  key={doc.id}
                  style={analysisStyles.card}
                  onClick={() => handleDocumentClick(doc)}
                >
                  <div style={analysisStyles.cardHeader}>
                    <h3 style={analysisStyles.cardTitle}>{doc.title}</h3>
                    <span style={analysisStyles.badge}>{doc.category}</span>
                  </div>
                  <div style={analysisStyles.cardContent}>
                    <p><strong>학교:</strong> {doc.school}</p>
                    <p><strong>학년:</strong> {doc.grade}학년</p>
                    <p><strong>업로드:</strong> {new Date(doc.created_at).toLocaleDateString()}</p>
                  </div>
                  <div style={analysisStyles.cardFooter}>
                    <span style={analysisStyles.clickHint}>클릭하면 지문 목록을 볼 수 있어요 →</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );

  const handleHelpfulToggle = async (variant) => {
    if (!selectedDocument || !selectedPassage || !variant?.variantIndex) return;
    try {
      setFeedbackMessage(null);
      const response = await api.analysis.feedback.submit(
        selectedDocument.id,
        selectedPassage.passageNumber,
        { variantIndex: variant.variantIndex, action: 'helpful' }
      );

      if (response?.success && response.data) {
        const normalized = normalizePassage(response.data);
        updatePassageVariantsState(normalized.passageNumber, normalized.variants, normalized.originalPassage);
        setSelectedPassage(normalized);
        const nextIndex = normalized.variants.findIndex((item) => item.variantIndex === variant.variantIndex);
        if (nextIndex >= 0) {
          setActiveVariantIndex(nextIndex);
        }
        const updatedVariant = normalized.variants[nextIndex >= 0 ? nextIndex : 0];
        const message = updatedVariant?.user?.helpful
          ? '이 분석이 도움이 됐다고 표시했어요! 😊'
          : '도움이 됐어요 표시를 취소했어요. 🙌';
        setFeedbackMessage(message);
      }
    } catch (err) {
      setFeedbackMessage(err?.message || '피드백 처리 중 문제가 발생했어요.');
    }
  };

  const openReportModal = (variant) => {
    if (!variant?.variantIndex) return;
    setReportModal({ open: true, variantIndex: variant.variantIndex, reason: '' });
  };

  const closeReportModal = () => {
    setReportModal({ open: false, variantIndex: null, reason: '' });
  };

  const handleReportSubmit = async () => {
    if (!selectedDocument || !selectedPassage || !reportModal.variantIndex) return;
    const trimmed = reportModal.reason.trim();
    if (!trimmed) {
      setFeedbackMessage('신고 사유를 입력해 주세요. ✍️');
      return;
    }
    try {
      setReportSubmitting(true);
      const response = await api.analysis.feedback.submit(
        selectedDocument.id,
        selectedPassage.passageNumber,
        {
          variantIndex: reportModal.variantIndex,
          action: 'report',
          reason: trimmed
        }
      );

      if (response?.success && response.data) {
        const normalized = normalizePassage(response.data);
        updatePassageVariantsState(normalized.passageNumber, normalized.variants, normalized.originalPassage);
        setSelectedPassage(normalized);
        const nextIndex = normalized.variants.findIndex((item) => item.variantIndex === reportModal.variantIndex);
        if (nextIndex >= 0) {
          setActiveVariantIndex(nextIndex);
        }
        setFeedbackMessage('신고가 접수됐어요. 빠르게 확인해서 반영할게요! 🚨');
      }
      closeReportModal();
    } catch (err) {
      setFeedbackMessage(err?.message || '신고 처리 중 문제가 발생했어요.');
    } finally {
      setReportSubmitting(false);
    }
  };

  const renderReportModal = () => {
    if (!reportModal.open) return null;
    return (
      <div style={analysisStyles.modalOverlay}>
        <div style={analysisStyles.modalContentSmall}>
          <h3 style={analysisStyles.modalTitle}>🚨 신고하기</h3>
          <p style={{ color: 'var(--tone-strong)', marginTop: 0 }}>
            어떤 부분이 이상했는지 자세히 알려주시면, 관리자 선생님이 빠르게 확인할 수 있어요.
          </p>
          <textarea
            style={analysisStyles.modalTextarea}
            value={reportModal.reason}
            onChange={(event) => setReportModal((prev) => ({ ...prev, reason: event.target.value }))}
            placeholder="예: 해석이 틀린 것 같아요 / 문법 설명이 이해가 안 돼요"
          />
          <div style={analysisStyles.modalActions}>
            <button type="button" style={analysisStyles.modalSecondaryButton} onClick={closeReportModal} disabled={reportSubmitting}>
              닫기
            </button>
            <button type="button" style={analysisStyles.modalPrimaryButton} onClick={handleReportSubmit} disabled={reportSubmitting}>
              {reportSubmitting ? '전송 중...' : '신고 전송'}
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderFeedbackBar = (variant) => (
    <div style={analysisStyles.feedbackBar}>
      <button
        type="button"
        style={{
          ...analysisStyles.feedbackButton,
          ...(variant?.user?.helpful ? analysisStyles.feedbackButtonActive : {})
        }}
        onClick={() => handleHelpfulToggle(variant)}
      >
        {variant?.user?.helpful ? '💖 도움이 됐어요!' : '👍 도움이 됐어요'}
        <span style={analysisStyles.feedbackCount}>({variant?.stats?.helpfulCount || 0})</span>
      </button>
      <button
        type="button"
        style={analysisStyles.reportButton}
        onClick={() => openReportModal(variant)}
      >
        🚨 신고하기
      </button>
    </div>
  );

  const renderPassageList = () => {
    const renderMeta = (entry) => {
      const slots = remainingSlots(entry);
      const disabled = slots <= 0;
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'flex-end' }}>
          <span style={{ fontSize: '12px', color: 'var(--tone-muted)' }}>
            {entry.variantCount || 0}/{MAX_VARIANTS_PER_PASSAGE} 분석본
          </span>
          <div style={{ display: 'flex', gap: '6px' }}>
            <button
              type="button"
              style={analysisStyles.metaButtonGhost}
              onClick={() => handlePassageClick(entry)}
            >
              분석 보기
            </button>
            <button
              type="button"
              style={{
                ...analysisStyles.metaButtonPrimary,
                ...(disabled ? analysisStyles.metaButtonDisabled : {})
              }}
              onClick={() => openGenerationPrompt(entry)}
              disabled={disabled}
            >
              {disabled ? '가득 찼어요' : '새 분석 생성'}
            </button>
          </div>
        </div>
      );
    };

    return (
      <div style={analysisStyles.container}>
        <div style={analysisStyles.header}>
          <button onClick={handleBackToDocuments} style={analysisStyles.backButton}>← 문서 목록으로</button>
          <h1 style={analysisStyles.title}>📄 {selectedDocument?.title}</h1>
          <p style={analysisStyles.subtitle}>지문을 하나씩 선택해 분석본을 확인하고, 필요하면 AI 분석을 바로 생성해 보세요.</p>
        </div>

        {analysisLimitError && (
          <div style={{ ...analysisStyles.errorContainer, background: 'var(--warning-surface)', color: 'var(--warning-strong)' }}>
            <p>{analysisLimitError}</p>
          </div>
        )}

        {loading ? (
          <div style={analysisStyles.loadingContainer}>
            <div style={analysisStyles.spinner} />
            <p>지문 목록을 정리하고 있어요...</p>
          </div>
        ) : passageList.length ? (
          <PassagePickerGrid
            passages={passageList}
            onPreview={openPreview}
            renderMeta={renderMeta}
            emptyMessage="분석 가능한 지문을 찾지 못했습니다."
            selectionEnabled={false}
          />
        ) : (
          <div style={analysisStyles.emptyState}>
            <h3>📝 아직 저장된 분석본이 없어요</h3>
            <p>지문을 선택해 분석을 생성하면 Variant 1·2를 확인할 수 있어요.</p>
          </div>
        )}
      </div>
    );
  };

  const activeVariant = useMemo(() => {
    if (!selectedPassage) return null;
    const { variants } = selectedPassage;
    if (!Array.isArray(variants) || variants.length === 0) return null;
    return variants[Math.min(activeVariantIndex, variants.length - 1)];
  }, [selectedPassage, activeVariantIndex]);

  useEffect(() => {
    setSelectedVariantIndexes([]);
  }, [selectedPassage?.passageNumber]);

  const toggleVariantSelection = (variantIndex) => {
    if (typeof variantIndex !== 'number') return;
    setSelectedVariantIndexes((prev) => (
      prev.includes(variantIndex)
        ? prev.filter((item) => item !== variantIndex)
        : [...prev, variantIndex]
    ));
  };

  const toggleSelectAllVariants = () => {
    if (!Array.isArray(selectedPassage?.variants)) return;
    const allIndexes = selectedPassage.variants
      .map((variant) => variant.variantIndex)
      .filter((idx) => typeof idx === 'number');
    if (!allIndexes.length) return;
    const allSelected = allIndexes.every((idx) => selectedVariantIndexes.includes(idx));
    setSelectedVariantIndexes(allSelected ? [] : allIndexes);
  };

  const handleBulkDeleteVariants = async () => {
    if (!selectedDocument || !selectedPassage) return;
    if (!selectedVariantIndexes.length) return;
    const confirmDelete = window.confirm(`선택한 분석본 ${selectedVariantIndexes.length}개를 삭제할까요? 삭제 후에는 복구할 수 없어요.`);
    if (!confirmDelete) return;

    try {
      setVariantDeleteLoading(true);
      const response = await api.analysis.deleteVariants(
        selectedDocument.id,
        selectedPassage.passageNumber,
        selectedVariantIndexes
      );

      if (!response?.success) {
        throw new Error(response?.message || '선택한 분석본을 삭제하지 못했습니다.');
      }

      const normalized = normalizePassage(response.data || {});
      updatePassageVariantsState(normalized.passageNumber, normalized.variants, normalized.originalPassage);
      setSelectedPassage(normalized);
      setActiveVariantIndex(0);
      setSelectedVariantIndexes([]);
      setFeedbackMessage('선택한 분석본을 깔끔하게 정리했어요! ✅');
    } catch (err) {
      setFeedbackMessage(err?.message || '분석본 삭제 중 문제가 발생했어요.');
    } finally {
      setVariantDeleteLoading(false);
    }
  };

  const renderVariantMeta = (variant) => {
    const { meta = {} } = variant || {};
    const deepDive = meta.deepDive || {};
    const englishTitles = Array.isArray(meta.englishTitles) ? meta.englishTitles.slice(0, 3) : [];
    const modernApplications = Array.isArray(meta.modernApplications) ? meta.modernApplications.slice(0, 3) : [];

    const koreanTitle = meta.koreanTitle || '한글 제목이 아직 준비되지 않았어요.';
    const koreanMainIdea = meta.koreanMainIdea || '지문의 핵심 내용을 우리말로 다시 정리해 보세요.';
    const authorsClaim = meta.authorsClaim || '작가의 주장을 간단히 정리해 보세요.';
    const englishSummary = meta.englishSummary || '영어 한 줄 요약이 준비되는 중이에요.';
    const englishSummaryKorean = meta.englishSummaryKorean || '한 줄 요약을 우리말로 직접 정리해 보세요.';

    return (
      <div style={analysisStyles.variantMetaGrid}>
        <div style={analysisStyles.metaCard}>
          <div style={analysisStyles.metaTitle}>📝 제목 & 주장</div>
          <ul style={analysisStyles.metaList}>
            {englishTitles.map((title, index) => (
              <li key={`title-${index}`}>
                <strong>{index + 1}.</strong> {title.title}
                {title.isQuestion ? ' ❓' : ''}
                {title.korean ? ` — ${title.korean}` : ''}
              </li>
            ))}
          </ul>
          <p><strong>한글 제목:</strong> {koreanTitle}</p>
          <p><strong>한글 요지:</strong> {koreanMainIdea}</p>
          <p><strong>작가의 주장:</strong> {authorsClaim}</p>
        </div>
        <div style={analysisStyles.metaCard}>
          <div style={analysisStyles.metaTitle}>🎯 핵심 요약</div>
          <p><strong>영어 한 줄 요약:</strong> {englishSummary}</p>
          <p><strong>한글 요약:</strong> {englishSummaryKorean}</p>
          <p><strong>핵심 메시지:</strong> {deepDive.coreMessage || '핵심 메시지를 한 줄로 정리해 보세요.'}</p>
          <p><strong>논리 흐름:</strong> {deepDive.logicalFlow || '글의 흐름을 한 번 더 정리해 보세요.'}</p>
          <p><strong>톤 & 관점:</strong> {deepDive.toneAndStyle || '필자의 톤과 관점을 한 줄로 요약해 보세요.'}</p>
        </div>
        {modernApplications.length ? (
          <div style={analysisStyles.metaCard}>
            <div style={analysisStyles.metaTitle}>🌍 실천 팁</div>
            <ul style={analysisStyles.metaList}>
              {modernApplications.map((item, index) => (
                <li key={`modern-${index}`}>{item}</li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    );
  };

  const renderSentenceCard = (sentence, index, total) => {
    const englishRaw = String(sentence.english || '');
    const topicMatch = englishRaw.match(/^\*\*(.*)\*\*$/);
    const cleanEnglish = topicMatch ? topicMatch[1].trim() : englishRaw;
    const circledDigit = getCircledDigit(index);

    const koreanLine = sentence.korean || '*** 한글 해석: 문장을 우리말로 직접 정리해 보세요.';
    const analysisLine = sentence.analysis || '*** 분석: 문장의 핵심을 한 줄로 정리해 보세요.';
    const backgroundLine = sentence.background || '*** 이 문장에 필요한 배경지식: 관련 교과 내용을 직접 찾아 정리해 보세요.';
    const exampleLine = sentence.example || '*** 이 문장에 필요한 사례: 떠오른 실제 장면을 두 문장 이상으로 적어 보세요.';
    const grammarLine = sentence.grammar || '✏️ 어법 포인트: 중요한 구문을 한 줄로 메모해 보세요.';
    const vocabularyIntro = sentence.vocabulary?.intro || '*** 어휘 포인트: 꼭 외워야 할 단어를 직접 정리해 보세요.';
    const vocabWords = Array.isArray(sentence.vocabulary?.words) ? sentence.vocabulary.words : [];

    const cardStyle = {
      ...analysisStyles.sentenceCard,
      ...(index === total - 1 ? analysisStyles.sentenceCardLast : {})
    };

    const stripPrefixedLine = (value) => String(value || '').replace(/^(?:[*✏️\s]+)?[^:：]+[:：]\s*/u, '').trim();

    const sections = [
      { key: 'korean', label: '한글 해석', value: koreanLine },
      { key: 'analysis', label: '내용 분석', value: analysisLine },
      { key: 'background', label: '이 문장에 필요한 배경지식', value: backgroundLine },
      { key: 'example', label: '이 문장에 필요한 사례', value: exampleLine },
      { key: 'grammar', label: '어법 포인트', value: grammarLine }
    ];

    const fallbackMessages = {
      korean: '문장을 우리말로 직접 정리해 보세요.',
      analysis: '문장의 핵심 메시지를 정리해 보세요.',
      background: '관련 교과 지식을 찾아 메모해 보세요.',
      example: '비슷한 상황을 떠올려 예시를 써 보세요.',
      grammar: '핵심 문법 포인트를 직접 정리해 보세요.'
    };

    return (
      <div key={`sentence-${index}`} style={cardStyle}>
        <div style={analysisStyles.sentenceHeader}>
          <div style={analysisStyles.sentenceTitleRow}>
            <span style={analysisStyles.sentenceNumber}>{circledDigit}</span>
            <span style={analysisStyles.sentenceEnglish}>
              {sentence.isTopicSentence ? (
                <strong>⭐ {cleanEnglish}</strong>
              ) : (
                cleanEnglish
              )}
            </span>
          </div>
          {sentence.isTopicSentence && <span style={analysisStyles.topicBadge}>주제문</span>}
        </div>
        <div style={analysisStyles.sentenceBody}>
          {sections.map((section) => {
            const text = stripPrefixedLine(section.value) || fallbackMessages[section.key] || '';
            const sectionStyle = (section.key === 'background' || section.key === 'example')
              ? { ...analysisStyles.sentenceSection, ...analysisStyles.sentenceSectionEmphasis }
              : analysisStyles.sentenceSection;
            return (
              <div key={`${section.key}-${index}`} style={sectionStyle}>
                <span style={analysisStyles.sentenceLabel}>{section.label}</span>
                <p style={analysisStyles.sentenceText}>{text}</p>
              </div>
            );
          })}
          <div style={analysisStyles.sentenceSection}>
            <span style={analysisStyles.sentenceLabel}>어휘 포인트</span>
            <p style={analysisStyles.sentenceText}>{stripPrefixedLine(vocabularyIntro)}</p>
            {vocabWords.length ? (
              <ul style={analysisStyles.vocabList}>
                {vocabWords.map((word, idx) => (
                  <li key={`word-${index}-${idx}`} style={analysisStyles.vocabListItem}>
                    <div><strong>{word.term}</strong> — {word.meaning}</div>
                    {word.synonyms?.length ? (
                      <div style={analysisStyles.vocabMeta}>동의어: {word.synonyms.join(', ')}</div>
                    ) : null}
                    {word.antonyms?.length ? (
                      <div style={analysisStyles.vocabMeta}>반의어: {word.antonyms.join(', ')}</div>
                    ) : null}
                    {word.note ? (
                      <div style={analysisStyles.vocabMeta}>노트: {word.note}</div>
                    ) : null}
                  </li>
                ))}
              </ul>
            ) : (
              <p style={analysisStyles.sentenceText}>꼭 외워야 할 단어를 직접 정리해 보세요.</p>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderPassageAnalysis = () => {
    const variants = Array.isArray(selectedPassage?.variants) ? selectedPassage.variants : [];
    const totalVariants = variants.length;
    const allSelected = totalVariants > 0 && selectedVariantIndexes.length === totalVariants;

    return (
    <div style={analysisStyles.container}>
      <div style={analysisStyles.header}>
        <button onClick={handleBackToPassages} style={analysisStyles.backButton}>← 지문 목록으로</button>
        <h1 style={analysisStyles.title}>📖 {selectedDocument?.title} — 지문 {selectedPassage?.passageNumber}</h1>
      </div>

      {analysisLimitError && (
        <div style={{ ...analysisStyles.errorContainer, background: 'var(--warning-surface)', color: 'var(--warning-strong)' }}>
          <p>{analysisLimitError}</p>
        </div>
      )}

      {passageLoading && (
        <div style={analysisStyles.loadingContainer}>
          <div style={analysisStyles.spinner} />
          <p>분석본을 따뜻하게 데우는 중이에요 ☕️</p>
        </div>
      )}

      {!passageLoading && selectedPassage && (
        <div style={analysisStyles.analysisContent}>
          <div style={analysisStyles.section}>
            <h2 style={analysisStyles.sectionTitle}>📄 원문</h2>
            <div style={analysisStyles.originalText}>{selectedPassage.originalPassage}</div>
          </div>

          <div style={analysisStyles.variantTabs}>
            {(selectedPassage.variants || []).map((variant, index) => (
              <button
                key={`variant-tab-${variant.variantIndex || index}`}
                type="button"
                style={{
                  ...analysisStyles.variantTab,
                  ...(activeVariantIndex === index ? analysisStyles.variantTabActive : {})
                }}
                onClick={() => {
                  setActiveVariantIndex(index);
                  setFeedbackMessage(null);
                  setReportModal({ open: false, variantIndex: null, reason: '' });
                }}
              >
                분석본 {index + 1}
              </button>
            ))}
          </div>

          {isAdmin && variants.length > 0 && (
            <div style={analysisStyles.variantToolbar}>
              <div style={analysisStyles.variantToolbarLeft}>
                <label style={analysisStyles.variantSelectAll}>
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleSelectAllVariants}
                  />
                  전체 선택
                </label>
                <span style={analysisStyles.variantSelectionInfo}>
                  선택 {selectedVariantIndexes.length} / {variants.length}
                </span>
              </div>
              <button
                type="button"
                style={{
                  ...analysisStyles.variantDeleteButton,
                  ...(selectedVariantIndexes.length ? {} : analysisStyles.variantDeleteButtonDisabled)
                }}
                onClick={handleBulkDeleteVariants}
                disabled={!selectedVariantIndexes.length || variantDeleteLoading}
              >
                {variantDeleteLoading ? '삭제 중...' : '선택 삭제'}
              </button>
            </div>
          )}

          {isAdmin && variants.length > 0 && (
            <div style={analysisStyles.variantSelectionRow}>
              {variants.map((variant, index) => {
                const variantIndex = typeof variant.variantIndex === 'number' ? variant.variantIndex : null;
                if (variantIndex === null) return null;
                const checked = selectedVariantIndexes.includes(variantIndex);
                return (
                  <label key={`variant-select-${variantIndex}`} style={analysisStyles.variantSelectionItem}>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleVariantSelection(variantIndex)}
                    />
                    분석본 {index + 1}
                  </label>
                );
              })}
            </div>
          )}

          {activeVariant ? (
            <>
              <p style={{ color: 'var(--tone-strong)', marginBottom: '12px' }}>
                생성 시각: {new Date(activeVariant.generatedAt || Date.now()).toLocaleString()} · AI가 사랑을 담아 만든 분석본이에요 💡
              </p>
              {renderFeedbackBar(activeVariant)}
              {feedbackMessage && <div style={analysisStyles.feedbackMessage}>{feedbackMessage}</div>}
              {renderVariantMeta(activeVariant)}
              <div style={analysisStyles.section}>
                <h2 style={analysisStyles.sectionTitle}>🔍 문장별 깊이 탐구</h2>
                <div style={analysisStyles.sentenceGrid}>
                  {(activeVariant.sentenceAnalysis || []).map((sentence, idx, arr) => (
                    renderSentenceCard(sentence, idx, arr.length)
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div style={analysisStyles.emptyVariant}>
              아직 저장된 분석본이 없어요. 지문 목록으로 돌아가 “분석본 추가하기” 버튼을 눌러보세요!
            </div>
          )}
          {renderReportModal()}
        </div>
      )}
    </div>
  );
  };

  const handleGlobalRetry = () => {
    setError(null);
    if (step === 1) {
      fetchDocumentsList();
      return;
    }
    if (step === 2 && selectedDocument) {
      handleDocumentClick(selectedDocument);
      return;
    }
    if (step === 3 && selectedDocument) {
      const target = passageList.find((item) => item.passageNumber === selectedPassage?.passageNumber)
        || selectedPassage
        || null;
      if (target) {
        handlePassageClick(target);
        return;
      }
      handleDocumentClick(selectedDocument);
      return;
    }
    fetchDocumentsList();
  };

  const currentView = step === 1
    ? renderDocumentList()
    : step === 2
      ? renderPassageList()
      : step === 3
        ? renderPassageAnalysis()
        : renderDocumentList();

  if (error) {
    return (
      <>
        <FriendlyError
          error={error}
          onRetry={handleGlobalRetry}
          onHome={() => {
            setError(null);
            navigateToStep(STEPS.DOCUMENT);
          }}
        />
        <PassagePreviewModal
          open={Boolean(previewPassage)}
          passage={previewPassage}
          onClose={closePreview}
          documentTitle={selectedDocument?.title}
        />
      </>
    );
  }

  return (
    <>
      {currentView}

      {generationPrompt.open && (() => {
        const passage = generationPrompt.passage;
        if (!passage) return null;
        const slots = remainingSlots(passage);
        return (
          <div style={analysisStyles.generationOverlay}>
            <div style={analysisStyles.generationCard}>
              <div style={analysisStyles.generationBadge}>#{String(passage.passageNumber || 0).padStart(2, '0')}</div>
              <h3 style={analysisStyles.generationTitle}>분석본 1개 생성</h3>
              <p style={analysisStyles.generationSubtitle}>요청마다 분석본 한 개씩 생성돼요. 남은 자리: {slots}개</p>
              {slots > 0 ? (
                <div style={analysisStyles.generationButtons}>
                  <button
                    type="button"
                    style={analysisStyles.generationButton}
                    onClick={() => startGeneration(1)}
                  >
                    1개 만들기
                  </button>
                </div>
              ) : (
                <div style={analysisStyles.generationEmpty}>이미 두 개의 분석본이 준비되어 있어요.</div>
              )}
              <button type="button" style={analysisStyles.generationCancel} onClick={closeGenerationPrompt}>닫기</button>
            </div>
          </div>
        );
      })()}

      {generationLoading.active && (
        <div style={analysisStyles.generationOverlay}>
          <div style={analysisStyles.loadingCard}>
            <div style={analysisStyles.loadingSpinner} />
            <p style={analysisStyles.loadingMessage}>{generationLoading.message || 'AI가 분석본을 정성껏 만드는 중이에요... ⏳'}</p>
            {generationLoading.wordHistory?.length > 0 && (
              <div style={analysisStyles.loadingWordStack}>
                {generationLoading.wordHistory.map((item, index) => (
                  <div key={`loading-word-${item.word}-${index}`} style={analysisStyles.loadingWordBox}>
                    <span style={analysisStyles.loadingWord}>{item.word}</span>
                    <span style={analysisStyles.loadingMeaning}>{item.meaning}</span>
                  </div>
                ))}
              </div>
            )}
            {generationLoading.quoteHistory?.length > 0 && (
              <div style={analysisStyles.loadingQuoteStack}>
                {generationLoading.quoteHistory.map((item, index) => (
                  <div key={`loading-quote-${index}`} style={analysisStyles.loadingQuoteBox}>
                    <blockquote style={analysisStyles.loadingQuote}>“{item.text}”</blockquote>
                    <cite style={analysisStyles.loadingQuoteAuthor}>— {item.author}</cite>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <PassagePreviewModal
        open={Boolean(previewPassage)}
        passage={previewPassage}
        onClose={closePreview}
        documentTitle={selectedDocument?.title}
      />
    </>
  );
};

export default AnalysisPage;
