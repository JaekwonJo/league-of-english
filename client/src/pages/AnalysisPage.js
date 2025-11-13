import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api.service';
import { analysisStyles } from '../styles/analysisStyles';
import PassagePickerGrid from '../components/shared/PassagePickerGrid';
import PassagePreviewModal from '../components/shared/PassagePreviewModal';
import FriendlyError from '../components/common/FriendlyError';
import EagleGuideChip from '../components/common/EagleGuideChip';

const MAX_VARIANTS_PER_PASSAGE = 2;
const MAX_PASSAGE_LABEL_LENGTH = 40;

const GENERATION_WORDS = [
  { word: 'spark', meaning: '불꽃; 아이디어가 시작되는 불씨' },
  { word: 'nurture', meaning: '길러 주다; 애정을 쏟아 키우다' },
  { word: 'momentum', meaning: '관성, 추진력; 계속 나아가게 하는 힘' },
  { word: 'focus', meaning: '집중; 마음을 한곳에 모으는 상태' },
  { word: 'anchor', meaning: '닻; 중심을 잡아 주는 버팀목' },
  { word: 'refine', meaning: '정제하다; 조금씩 다듬어 완성도를 높이다' },
  { word: 'sustain', meaning: '지속시키다; 버티게 하다' },
  { word: 'clarity', meaning: '명확성; 또렷하게 이해되는 상태' },
  { word: 'leap', meaning: '도약하다; 큰 폭으로 나아가다' },
  { word: 'trailblaze', meaning: '길을 개척하다; 새로운 시도를 하다' }
];

const GENERATION_QUOTES = [
  {
    text: 'Education is the kindling of a flame, not the filling of a vessel.',
    author: 'William Butler Yeats',
    authorKr: '윌리엄 버틀러 예이츠',
    translation: '교육은 그릇을 채우는 것이 아니라, 마음에 불을 붙이는 일이에요.'
  },
  {
    text: 'The beautiful thing about learning is that nobody can take it away from you.',
    author: 'B. B. King',
    authorKr: '비비 킹',
    translation: '배움의 아름다움은 누구도 그것을 빼앗을 수 없다는 데 있어요.'
  },
  {
    text: 'Tell me and I forget. Teach me and I remember. Involve me and I learn.',
    author: 'Benjamin Franklin',
    authorKr: '벤저민 프랭클린',
    translation: '들어서는 잊어버리지만, 직접 참여하면 배움이 내 것이 됩니다.'
  },
  {
    text: 'Learning never exhausts the mind.',
    author: 'Leonardo da Vinci',
    authorKr: '레오나르도 다빈치',
    translation: '배움은 마음을 지치게 하지 않고, 오히려 더 단단하게 해 줍니다.'
  },
  {
    text: 'Success is the sum of small efforts, repeated day in and day out.',
    author: 'Robert Collier',
    authorKr: '로버트 콜리어',
    translation: '성공은 매일 반복되는 작은 노력들의 합이에요.'
  },
  {
    text: 'You are never too small to make a difference.',
    author: 'Greta Thunberg',
    authorKr: '그레타 툰베리',
    translation: '당신은 결코 너무 작지 않아요. 노력은 분명 변화를 만듭니다.'
  }
];

const LOADING_MESSAGES = [
  'AI가 문장을 하나씩 뜯어보는 중이에요... ✨',
  '교수님 모드로 분석본을 정성껏 기록하는 중입니다... 📝',
  '학생 눈높이에 맞춰 해석을 다듬는 중이에요... 🌟',
  '실생활 예시와 어법 포인트를 챙기고 있어요... 📚'
];

const VARIANT_HERO_TITLE = '정확성과 맥락을 살린 분석 노트';
const VARIANT_HERO_SUBTITLE = '오늘도 열공 파이팅! 궁금한 문장을 톡톡 눌러 살펴보세요.';

const CIRCLED_DIGITS = ['①', '②', '③', '④', '⑤', '⑥', '⑦', '⑧', '⑨', '⑩', '⑪', '⑫', '⑬', '⑭', '⑮', '⑯', '⑰', '⑱', '⑲', '⑳'];
const getCircledDigit = (index) => CIRCLED_DIGITS[index] || `${index + 1}.`;

const DOCUMENT_CATEGORY_SECTIONS = [
  {
    key: 'mock',
    label: '모의고사',
    icon: '📝',
    hint: '평가원 · 교육청 회차를 이곳에서 모아요',
    matchers: ['모의', '모고', 'mock', '수능', '평가원', '교육청']
  },
  {
    key: 'supplement',
    label: '부교재',
    icon: '📘',
    hint: '워크북 · 프린트 · 특강 자료',
    matchers: ['부교재', '워크북', '프린트', '특강', '자료집']
  },
  {
    key: 'textbook',
    label: '교과서',
    icon: '📙',
    hint: '학교별 교과서 및 자체 교재',
    matchers: ['교과서', '교재', '학교', '본교']
  },
  {
    key: 'others',
    label: '기타 자료',
    icon: '🌟',
    hint: '직접 업로드한 다양한 텍스트',
    matchers: []
  }
];

const pickRandom = (items) => items[Math.floor(Math.random() * items.length)];

const generateWordBatch = (count = 3, exclude = []) => {
  const excludeSet = new Set((exclude || []).map((item) => item.word));
  const available = GENERATION_WORDS.filter((item) => !excludeSet.has(item.word));
  const pool = available.length >= count ? available : GENERATION_WORDS;
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, shuffled.length));
};

const pickQuoteEntry = (excludeText) => {
  const filtered = excludeText ? GENERATION_QUOTES.filter((item) => item.text !== excludeText) : GENERATION_QUOTES;
  const pool = filtered.length ? filtered : GENERATION_QUOTES;
  return pickRandom(pool);
};

const normalizeAnalysisLine = (line) => {
  if (typeof line !== 'string') return line;
  // Replace question tones with a clear explanatory tone
  let cleaned = String(line)
    .replace(/\?+/g, '.')
    .replace(/\.{2,}/g, '.')
    .replace(/\s+/g, ' ')
    .trim();
  // Ensure it reads like a brief lecture-style summary, not a question
  if (/\?$/.test(line) || /(?:어떻게|왜)\s*[^.]*\?$/.test(line)) {
    cleaned = `🧠 핵심 정리: ${cleaned}`;
  }
  return cleaned;
};

// Remove duplicated label prefixes like "📘 한글 해석:" or "🧠 문장 분석:" from value strings
const stripKnownPrefixes = (text) => {
  if (typeof text !== 'string') return text;
  let t = text.trim();
  t = t.replace(/^📘\s*한글\s*해석\s*[:：]\s*/g, '');
  t = t.replace(/^한글\s*해석\s*[:：]\s*/g, '');
  t = t.replace(/^🧠\s*문장\s*분석\s*[:：]\s*/g, '');
  t = t.replace(/^문장\s*분석\s*[:：]\s*/g, '');
  return t.trim();
};

const formatFriendlyDateTime = (input) => {
  if (!input) return null;
  try {
    return new Date(input).toLocaleString('ko-KR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch (err) {
    return null;
  }
};

const STEPS = {
  DOCUMENT: 1,
  PASSAGE: 2,
  ANALYSIS: 3
};

const AnalysisPage = () => {
  const { user, isAdmin } = useAuth();
  const isGuest = (user?.membership || '').toLowerCase() === 'guest';
  const guestViewedPassagesRef = useRef(new Set());

  useEffect(() => {
    if (!isGuest) {
      guestViewedPassagesRef.current.clear();
    }
  }, [isGuest]);
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
  const [labelEditor, setLabelEditor] = useState({
    open: false,
    passage: null,
    value: '',
    error: '',
    submitting: false
  });
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const userRole = user?.role || 'student';
  const canEditLabels = isAdmin || userRole === 'teacher';
  const [collapsedDocSections, setCollapsedDocSections] = useState({});
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
    message: null,
    wordBatch: [],
    quoteEntry: null
  });
  const [hoveredDocumentId, setHoveredDocumentId] = useState(null);
  const searchInputRef = useRef(null);
  useEffect(() => {
    if (!generationLoading.active) return undefined;

    const rotateWord = () => {
      setGenerationLoading((prev) => {
        if (!prev.active) return prev;
        return {
          ...prev,
          wordBatch: generateWordBatch(3, prev.wordBatch)
        };
      });
    };

    const rotateQuote = () => {
      setGenerationLoading((prev) => {
        if (!prev.active) return prev;
        return {
          ...prev,
          quoteEntry: pickQuoteEntry(prev.quoteEntry?.text)
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
    displayLabel: entry.displayLabel || null,
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

  const categorizeDocument = useCallback((doc) => {
    const normalizedCategory = String(doc?.category || '').toLowerCase();
    const matched = DOCUMENT_CATEGORY_SECTIONS.find((section) =>
      section.matchers.some((matcher) => normalizedCategory.includes(matcher))
    );
    if (matched) return matched.key;
    if (/교과|교재/.test(normalizedCategory)) return 'textbook';
    if (/모의|mock|수능/.test(normalizedCategory)) return 'mock';
    if (/부교재|워크북|프린트/.test(normalizedCategory)) return 'supplement';
    return 'others';
  }, []);

  const groupedDocuments = useMemo(() => {
    const base = DOCUMENT_CATEGORY_SECTIONS.reduce((acc, section) => {
      acc[section.key] = [];
      return acc;
    }, {});
    filteredDocuments.forEach((doc) => {
      const key = categorizeDocument(doc);
      if (!base[key]) {
        base[key] = [];
      }
      base[key].push(doc);
    });
    return base;
  }, [filteredDocuments, categorizeDocument]);

  const hasGroupedDocuments = useMemo(() => (
    DOCUMENT_CATEGORY_SECTIONS.some((section) => (groupedDocuments[section.key] || []).length > 0)
  ), [groupedDocuments]);

  const toggleDocSection = useCallback((sectionKey) => {
    setCollapsedDocSections((prev) => ({
      ...prev,
      [sectionKey]: !prev?.[sectionKey]
    }));
  }, []);

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
      resetGenerationLoading();

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

  const handleEditPassageLabel = (passage) => {
    if (!selectedDocument || !canEditLabels) return;
    setLabelEditor({
      open: true,
      passage,
      value: passage.displayLabel || '',
      error: '',
      submitting: false
    });
  };

  const closeLabelModal = () => {
    setLabelEditor({ open: false, passage: null, value: '', error: '', submitting: false });
  };

  const handleLabelInputChange = (value) => {
    setLabelEditor((prev) => ({
      ...prev,
      value,
      error: value.trim().length > MAX_PASSAGE_LABEL_LENGTH
        ? `지문 이름은 최대 ${MAX_PASSAGE_LABEL_LENGTH}자로 입력해 주세요.`
        : ''
    }));
  };

  const handleLabelModalSave = async () => {
    if (!selectedDocument || !labelEditor.passage || labelEditor.submitting) return;
    const trimmed = labelEditor.value.trim();
    if (trimmed.length > MAX_PASSAGE_LABEL_LENGTH) {
      setLabelEditor((prev) => ({
        ...prev,
        error: `지문 이름은 최대 ${MAX_PASSAGE_LABEL_LENGTH}자로 입력해 주세요.`
      }));
      return;
    }

    setLabelEditor((prev) => ({ ...prev, submitting: true, error: '' }));

    try {
      await api.analysis.updatePassageLabel(selectedDocument.id, labelEditor.passage.passageNumber, trimmed);
      setPassageList((prev) => prev.map((item) => (
        item.passageNumber === labelEditor.passage.passageNumber
          ? { ...item, displayLabel: trimmed || null }
          : item
      )));
      setSelectedPassage((prev) => (
        prev && prev.passageNumber === labelEditor.passage.passageNumber
          ? { ...prev, displayLabel: trimmed || null }
          : prev
      ));
      closeLabelModal();
    } catch (error) {
      setLabelEditor((prev) => ({
        ...prev,
        submitting: false,
        error: error?.message || '지문 이름을 저장하지 못했습니다.'
      }));
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
      resetGenerationLoading();

      if (isGuest) {
        const viewed = guestViewedPassagesRef.current;
        const key = passage.passageNumber;
        if (!viewed.has(key) && viewed.size >= 3) {
          setAnalysisLimitError('게스트 체험 계정은 분석 자료를 3개까지만 열람할 수 있어요. 프로 멤버로 업그레이드하면 제한 없이 볼 수 있습니다.');
          setPassageLoading(false);
          return;
        }
      }

      const response = await api.analysis.getPassage(selectedDocument.id, passage.passageNumber);
      if (response.success) {
        const normalized = normalizePassage(response.data || {});
        updatePassageVariantsState(passage.passageNumber, normalized.variants, normalized.originalPassage);
        setSelectedPassage(normalized);
        setActiveVariantIndex(0);
        navigateToStep(STEPS.ANALYSIS);
        setFeedbackMessage(null);
        setReportModal({ open: false, variantIndex: null, reason: '' });
        if (isGuest) {
          guestViewedPassagesRef.current.add(passage.passageNumber);
        }
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

  const buildGenerationFlavor = (prevWordBatch = [], prevQuoteEntry = null) => ({
    wordBatch: generateWordBatch(3, prevWordBatch),
    quoteEntry: pickQuoteEntry(prevQuoteEntry?.text),
    message: pickRandom(LOADING_MESSAGES)
  });

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
      message: null,
      wordBatch: [],
      quoteEntry: null
    });
  };

  const handleWordBatchMore = useCallback(() => {
    setGenerationLoading((prev) => {
      if (!prev.active) return prev;
      return {
        ...prev,
        wordBatch: generateWordBatch(3, prev.wordBatch)
      };
    });
  }, []);

  const startGeneration = async (count) => {
    if (!generationPrompt.passage || !Number.isInteger(count)) return;
    const flavor = buildGenerationFlavor(generationLoading.wordBatch, generationLoading.quoteEntry);
    const passageNumber = generationPrompt.passage.passageNumber;
    closeGenerationPrompt();
    setGenerationLoading({
      active: true,
      passageNumber,
      count,
      message: flavor.message,
      wordBatch: flavor.wordBatch,
      quoteEntry: flavor.quoteEntry
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

  const renderDocumentList = () => {
    const totalDocuments = documents.length;
    // Single calm palette for all cards (less visual noise)
    const calmPalette = { from: 'rgba(30, 58, 138, 0.75)', to: 'rgba(14, 165, 233, 0.45)', shadow: 'rgba(30, 64, 175, 0.35)' };

    return (
      <div style={analysisStyles.container}>
        <section style={analysisStyles.docHero}>
          <div style={analysisStyles.docHeroGlow} />
          <div style={analysisStyles.docHeroContent}>
            <span style={analysisStyles.docHeroBadge}>전문 분석 라운지</span>
            <h1 style={analysisStyles.docHeroHeadline}>📖 문서 분석 자료</h1>
            <p style={analysisStyles.docHeroSub}>
              모의고사와 자체 제작 교재를 한곳에서 정리하고, 필요한 지문만 골라 전문 분석을 바로 받아 보세요. 정돈된 학습 환경이 분석 여정을 끝까지 책임집니다.
            </p>
            <EagleGuideChip text="지문을 탭하면 분석본을 바로 펼쳐 줍니다" variant="accent" />
            <div style={analysisStyles.docHeroSearchRow}>
              <input
                ref={searchInputRef}
                type="search"
                value={documentSearch}
                onChange={(event) => setDocumentSearch(event.target.value)}
                placeholder="문서 제목이나 코드(예: 1-25-10)를 입력해 보세요"
                style={analysisStyles.docSearchInput}
              />
              {documentSearch ? (
                <button type="button" style={analysisStyles.docSearchClear} onClick={() => setDocumentSearch('')}>
                  검색 초기화
                </button>
              ) : (
                <button
                  type="button"
                  style={analysisStyles.docSearchButton}
                  onClick={() => searchInputRef.current?.focus?.()}
                >
                  인기 지문 살펴보기
                </button>
              )}
            </div>
            <p style={analysisStyles.docHeroNote}>Tip: 코드(예: 2-25-10)나 교재명을 입력하면 원하는 문서를 바로 찾을 수 있어요.</p>
            <div style={analysisStyles.docHeroStatPill}>
              <span>📚 등록된 문서</span>
              <strong>{totalDocuments ? `${totalDocuments.toLocaleString()}개` : '준비 중'}</strong>
            </div>
          </div>
        </section>

        {loading ? (
          <div style={analysisStyles.loadingContainer}>
            <div style={analysisStyles.spinner} />
            <p>문서 목록을 정리하는 중이에요...</p>
          </div>
        ) : !hasGroupedDocuments ? (
          <div style={analysisStyles.emptySearch}>
            <h3>검색 결과가 없어요 😢</h3>
            <p>다른 키워드(예: 문서 코드, 제목, 출제 분류)를 입력해 보거나 새 문서를 업로드해 보세요.</p>
          </div>
        ) : (
          <div style={analysisStyles.docCategoryStack}>
            {DOCUMENT_CATEGORY_SECTIONS.map((section) => {
              const docs = groupedDocuments[section.key] || [];
              if (!docs.length) return null;
              const isCollapsed = collapsedDocSections[section.key] ?? false;
              return (
                <section key={section.key} style={analysisStyles.docCategorySection}>
                  <button
                    type="button"
                    style={{
                      ...analysisStyles.docCategoryHeaderButton,
                      ...(isCollapsed ? analysisStyles.docCategoryHeaderButtonCollapsed : {})
                    }}
                    onClick={() => toggleDocSection(section.key)}
                    aria-expanded={!isCollapsed}
                  >
                    <div style={analysisStyles.docCategoryHeaderText}>
                      <span style={analysisStyles.docCategoryTitle}>{section.icon} {section.label}</span>
                      <span style={analysisStyles.docCategoryDescription}>{section.hint}</span>
                    </div>
                    <span style={analysisStyles.docCategoryToggle}>{isCollapsed ? '펼치기' : '접기'}</span>
                  </button>
                  {!isCollapsed && (
                    <div style={analysisStyles.docCategoryGrid}>
                      {docs.map((doc) => {
                        const palette = calmPalette;
                        const isHovered = hoveredDocumentId === doc.id;
                        const description = doc.description || '지문을 선택해 전문 분석을 살펴보세요.';
                        const brandName = 'league of english';
                        const normalizedSchool = String(doc.school || '').trim();
                        const showSchool = normalizedSchool && normalizedSchool.toLowerCase() !== brandName ? normalizedSchool : null;
                        const docMetaItems = [
                          showSchool,
                          doc.grade ? `고${doc.grade}` : null
                        ].filter(Boolean);
                        return (
                          <button
                            key={doc.id}
                            type="button"
                            style={{
                              ...analysisStyles.documentCard,
                              background: `linear-gradient(150deg, ${palette.from}, ${palette.to})`,
                              backgroundSize: '200% 200%',
                              animation: 'slowGradient 24s ease-in-out infinite',
                              boxShadow: isHovered
                                ? `0 32px 60px ${palette.shadow}`
                                : `0 22px 38px ${palette.shadow}`,
                              transform: isHovered ? 'translateY(-4px)' : 'translateY(0)'
                            }}
                            onFocus={() => setHoveredDocumentId(doc.id)}
                            onMouseEnter={() => setHoveredDocumentId(doc.id)}
                            onMouseLeave={() => setHoveredDocumentId(null)}
                            onBlur={() => setHoveredDocumentId(null)}
                            onClick={() => handleDocumentClick(doc)}
                          >
                            <div style={analysisStyles.documentCardBadgeRow}>
                              <span style={analysisStyles.documentCardBadge}>{doc.category || '분류 미지정'}</span>
                              {showSchool && <span style={analysisStyles.documentCardMeta}>{showSchool}</span>}
                            </div>
                            <div style={analysisStyles.documentCardHeader}>
                              <h3 style={analysisStyles.documentCardTitle}>{section.icon} {doc.title}</h3>
                            </div>
                            <p style={analysisStyles.documentCardDescription}>{description}</p>
                            {docMetaItems.length > 0 && (
                              <div style={analysisStyles.documentCardMetaRow}>
                                {docMetaItems.map((item) => (
                                  <span key={item} style={analysisStyles.documentCardMeta}>{item}</span>
                                ))}
                              </div>
                            )}
                            <div style={analysisStyles.documentCardFooter}>
                              <span style={analysisStyles.documentCardHint}>✨ 탭하면 지문 목록이 펼쳐져요</span>
                              <span style={analysisStyles.documentCardPill}>전문 분석</span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </section>
              );
            })}
          </div>
        )}
      </div>
    );
  };

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
          <p style={{ color: 'var(--text-primary)', marginTop: 0 }}>
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

  const renderLabelEditorModal = () => {
    if (!labelEditor.open || !labelEditor.passage) return null;
    const helperText = `최대 ${MAX_PASSAGE_LABEL_LENGTH}자 · 비워두면 기본 번호가 표시됩니다.`;
    return (
      <div style={analysisStyles.modalOverlay}>
        <div style={analysisStyles.modalContentSmall}>
          <h3 style={analysisStyles.modalTitle}>지문 이름 바꾸기</h3>
          <p style={analysisStyles.modalHint}>{helperText}</p>
          <input
            type="text"
            style={analysisStyles.modalInput}
            value={labelEditor.value}
            onChange={(event) => handleLabelInputChange(event.target.value)}
            maxLength={MAX_PASSAGE_LABEL_LENGTH + 20}
            placeholder="예: 01 지구 과학 실험"
          />
          {labelEditor.error && <p style={analysisStyles.modalError}>{labelEditor.error}</p>}
          <div style={analysisStyles.modalActions}>
            <button
              type="button"
              style={analysisStyles.modalSecondaryButton}
              onClick={closeLabelModal}
              disabled={labelEditor.submitting}
            >
              취소
            </button>
            <button
              type="button"
              style={analysisStyles.modalPrimaryButton}
              onClick={handleLabelModalSave}
              disabled={labelEditor.submitting}
            >
              {labelEditor.submitting ? '저장 중...' : '저장하기'}
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
      const labelText = entry.displayLabel || `지문 ${String(entry.passageNumber).padStart(2, '0')}`;
      return (
        <div style={analysisStyles.passageMetaWrap}>
          <div style={analysisStyles.passageLabelRow}>
            <span style={analysisStyles.passageLabelText}>{labelText}</span>
            {canEditLabels && (
              <button
                type="button"
                style={analysisStyles.passageLabelEdit}
                onClick={(event) => {
                  event.stopPropagation();
                  handleEditPassageLabel(entry);
                }}
              >
                이름 수정
              </button>
            )}
          </div>
          <span style={analysisStyles.passageStatChip}>
            분석본 <span style={analysisStyles.passageStatValue}>{(entry.variantCount || 0)}/{MAX_VARIANTS_PER_PASSAGE}</span>
          </span>
          <div style={analysisStyles.passageMetaButtons}>
            <button
              type="button"
              style={analysisStyles.passageMetaGhost}
              onClick={() => handlePassageClick(entry)}
            >
              분석 보기
            </button>
            <button
              type="button"
              style={{
                ...analysisStyles.passageMetaPrimary,
                ...(disabled ? analysisStyles.passageMetaDisabled : {})
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
          <button onClick={handleBackToDocuments} style={analysisStyles.backButton}>← 목록으로 돌아가기</button>
          <h1 style={analysisStyles.title}>📄 {selectedDocument?.title}</h1>
            <div style={analysisStyles.sectionGuideRow}>
              <p style={analysisStyles.subtitle}>지문을 하나씩 살펴보고, 필요하면 전문 분석을 곧바로 생성해 보세요.</p>
              {isAdmin && <EagleGuideChip text="관리자 안내: 분석본이 가득 차면 불필요한 변형을 정리할 수 있어요" />}
            </div>
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
    const englishTitles = Array.isArray(meta.englishTitles) ? meta.englishTitles.slice(0, 2) : [];
    const authorClaims = Array.isArray(meta.authorClaims) ? meta.authorClaims : (meta.authorsClaim ? [meta.authorsClaim] : []);
    // UX: 요청에 따라 관련 예시/체크포인트는 숨깁니다.
    const relatedExamples = [];
    const modernApplications = [];
    const englishSummary = meta.englishSummary || '영어 한 줄 요약이 준비되는 중이에요.';
    const englishSummaryKorean = meta.englishSummaryKorean || '한 줄 요약을 우리말로 직접 정리해 보세요.';

    // Only show one ❓ across the title list regardless of source flags
    let questionRendered = false;

    return (
      <div style={analysisStyles.variantMetaGrid}>
        <div style={analysisStyles.metaCard} className="anim-fadeInUp delay-0">
          <div style={analysisStyles.metaTitle}>📝 영어 제목</div>
          <ul style={analysisStyles.metaList}>
            {englishTitles.length ? englishTitles.map((title, index) => {
              // show ❓ only once (first item), even if multiple titles are questions
              const showQuestion = !questionRendered && (title.isQuestion || /\?$/.test(String(title.title || '')));
              if (showQuestion) questionRendered = true;
              return (
                <li key={`title-${index}`}>
                  <strong>{index + 1}.</strong> {title.title}
                  {showQuestion ? ' ❓' : ''}
                </li>
              );
            }) : <li>영어 제목을 직접 정리해 보세요.</li>}
          </ul>
        </div>
        <div style={analysisStyles.metaCard} className="anim-fadeInUp delay-1">
          <div style={analysisStyles.metaTitle}>💡 작가의 주장</div>
          <ul style={analysisStyles.metaList}>
            {authorClaims.length ? authorClaims.map((claim, index) => (
              <li key={`claim-${index}`}>{claim}</li>
            )) : <li>작가의 주장을 직접 정리해 보세요.</li>}
          </ul>
        </div>
        <div style={analysisStyles.metaCard} className="anim-fadeInUp delay-2">
          <div style={analysisStyles.metaTitle}>🎯 한 줄 요약</div>
          <p><strong>영어:</strong> {englishSummary}</p>
          <p><strong>한국어:</strong> {englishSummaryKorean}</p>
        </div>
        {relatedExamples.length ? (
          <div style={analysisStyles.metaCard} className="anim-fadeInUp delay-3">
            <div style={analysisStyles.metaTitle}>📚 관련 예시</div>
            <ul style={analysisStyles.metaList}>
              {relatedExamples.map((item, index) => (
                <li key={`example-${index}`}>{item}</li>
              ))}
            </ul>
          </div>
        ) : null}
        {modernApplications.length ? (
          <div style={analysisStyles.metaCard} className="anim-fadeInUp delay-3">
            <div style={analysisStyles.metaTitle}>🌟 체크 포인트</div>
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

    const koreanLine = stripKnownPrefixes(sentence.korean || '') || '문장을 우리말로 직접 정리해 보세요.';
    const analysisRaw = stripKnownPrefixes(sentence.breakdown || sentence.analysis || '') || '문장의 핵심을 정리해 보세요.';
    const analysisLine = stripKnownPrefixes(normalizeAnalysisLine(analysisRaw));
    const vocabularyIntro = sentence.vocabulary?.intro || '🎯 어휘 노트: 꼭 외워야 할 단어를 직접 정리해 보세요.';
    const vocabWords = Array.isArray(sentence.vocabulary?.words) ? sentence.vocabulary.words : [];

    const cardStyle = {
      ...analysisStyles.sentenceCard,
      ...(index === total - 1 ? analysisStyles.sentenceCardLast : {})
    };

    const stripPrefixedLine = (value, labelText = '') => {
      const raw = String(value ?? '').trim();
      if (!raw) return '';

      const emojiPrefix = /^[📘🧠🎯⭐✏️\s]+/u;
      const normalizeForCompare = (input) => String(input ?? '')
        .replace(emojiPrefix, '')
        .replace(/[:：\-–—]/g, '')
        .replace(/\s+/g, ' ')
        .trim();

      const labelCandidates = [
        normalizeForCompare(labelText),
        '한글 해석',
        '문장 분석',
        '어휘 노트',
        '해석',
        '분석'
      ].filter(Boolean);

      const base = raw.replace(emojiPrefix, '').trim();
      if (!base) return '';

      const lines = base
        .split(/\r?\n+/)
        .map((line) => line.trim())
        .filter((line) => {
          if (!line) return false;
          const normalized = normalizeForCompare(line);
          return normalized && !labelCandidates.includes(normalized);
        });

      if (!lines.length) return '';

      const patterns = [
        /^한글\s*해석\s*[:：\-–—]?\s*/iu,
        /^문장\s*분석\s*[:：\-–—]?\s*/iu,
        /^어휘\s*노트\s*[:：\-–—]?\s*/iu,
        /^핵심\s*(?:포인트|정리)\s*[:：\-–—]?\s*/iu,
        /^정답\s*체크\s*[:：\-–—]?\s*/iu
      ];

      let cleaned = lines.join(' ').trim();
      patterns.forEach((pattern) => {
        cleaned = cleaned.replace(pattern, '');
      });

      cleaned = cleaned.replace(emojiPrefix, '').trim();
      return cleaned;
    };

    const sections = [
      { key: 'korean', label: '📘 한글 해석', value: koreanLine },
      { key: 'analysis', label: '🧠 문장 분석', value: analysisLine }
    ];

    const fallbackMessages = {
      korean: '문장을 우리말로 직접 정리해 보세요.',
      analysis: '문장의 핵심 메시지를 정리해 보세요.'
    };

    return (
      <div key={`sentence-${index}`} style={cardStyle} className={`anim-fadeInUp delay-${Math.min(index, 3)}`}>
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
            const text = stripPrefixedLine(section.value, section.label) || fallbackMessages[section.key] || '';
            return (
              <div key={`${section.key}-${index}`} style={analysisStyles.sentenceSection}>
                <span style={analysisStyles.sentenceLabel}>{section.label}</span>
                <p style={analysisStyles.sentenceText}>{text}</p>
              </div>
            );
          })}
          <div style={analysisStyles.sentenceSection}>
            <span style={analysisStyles.sentenceLabel}>🎯 어휘 노트</span>
            <p style={analysisStyles.sentenceText}>
              {stripPrefixedLine(vocabularyIntro, '🎯 어휘 노트') || '꼭 외워야 할 단어를 직접 정리해 보세요.'}
            </p>
            {vocabWords.length ? (
              <ul style={analysisStyles.vocabList}>
                {vocabWords.map((word, idx) => (
                  <li key={`word-${index}-${idx}`} style={analysisStyles.vocabListItem}>
                    <div><strong>{word.term}</strong> — {word.meaning}</div>
                    <div style={analysisStyles.vocabMeta}>동의어: {word.synonyms?.length ? word.synonyms.join(', ') : '비슷한 표현을 스스로 정리해 보세요.'}</div>
                    <div style={analysisStyles.vocabMeta}>반의어: {word.antonyms?.length ? word.antonyms.join(', ') : '반대 의미 표현을 직접 찾아보세요.'}</div>
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
    const passageTitle = selectedPassage?.displayLabel || `지문 ${selectedPassage?.passageNumber || ''}`;

    return (
    <div style={analysisStyles.container}>
      <div style={analysisStyles.header}>
        <button onClick={handleBackToPassages} style={analysisStyles.backButton}>← 지문 목록으로</button>
        <h1 style={analysisStyles.title}>📖 {selectedDocument?.title} — {passageTitle}</h1>
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
              <div style={analysisStyles.variantHero}>
                <div style={analysisStyles.variantHeroRow}>
                  {(() => {
                    const updatedLabel = formatFriendlyDateTime(activeVariant.generatedAt);
                    return updatedLabel ? (
                      <span style={analysisStyles.variantHeroPill}>
                        최근 업데이트 · {updatedLabel}
                      </span>
                    ) : null;
                  })()}
                  <span style={analysisStyles.variantHeroBadge}>
                    {passageTitle}
                  </span>
                </div>
                <h2 style={analysisStyles.variantHeroTitle}>{VARIANT_HERO_TITLE}</h2>
                <p style={analysisStyles.variantHeroSubtitle}>{VARIANT_HERO_SUBTITLE}</p>
              </div>
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
            {generationLoading.wordBatch?.length > 0 && (
              <>
                <div style={analysisStyles.loadingWordStack}>
                  {generationLoading.wordBatch.map((item, index) => (
                    <div key={`loading-word-${item.word}-${index}`} style={analysisStyles.loadingWordBox}>
                      <span style={analysisStyles.loadingWord}>{item.word}</span>
                      <span style={analysisStyles.loadingMeaning}>{item.meaning}</span>
                    </div>
                  ))}
                </div>
                <div style={analysisStyles.loadingWordActions}>
                  <button type="button" style={analysisStyles.loadingMoreButton} onClick={handleWordBatchMore}>
                    새 단어 보기 ↻
                  </button>
                </div>
              </>
            )}
            {generationLoading.quoteEntry && (
              <div style={analysisStyles.loadingQuoteStack}>
                <div style={analysisStyles.loadingQuoteBox}>
                  <blockquote style={analysisStyles.loadingQuote}>“{generationLoading.quoteEntry.text}”</blockquote>
                  <cite style={analysisStyles.loadingQuoteAuthor}>
                    — {generationLoading.quoteEntry.authorKr} ({generationLoading.quoteEntry.author})
                  </cite>
                  {generationLoading.quoteEntry.translation && (
                    <p style={analysisStyles.loadingQuoteTranslation}>{generationLoading.quoteEntry.translation}</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {renderLabelEditorModal()}

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
