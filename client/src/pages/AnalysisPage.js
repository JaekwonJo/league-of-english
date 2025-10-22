import React, { useState, useEffect, useMemo, useCallback } from 'react';
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

const pickRandom = (items) => items[Math.floor(Math.random() * items.length)];

const AnalysisPage = () => {
  const [documents, setDocuments] = useState([]);
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
  const [step, setStep] = useState(1); // 1: 문서 선택, 2: 지문 선택, 3: 분석 보기
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
    message: null
  });

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
        variantCount: Array.isArray(variants) ? variants.length : 0,
        hasAnalysis: Array.isArray(variants) && variants.length > 0,
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

      const [analysisResponse, passageResponse] = await Promise.all([
        api.analysis.get(document.id),
        api.analysis.listPassageSummaries(document.id)
      ]);

      if (!analysisResponse.success) {
        raiseError('지문 분석 결과를 불러오는데 실패했습니다.', analysisResponse.message || 'success: false');
        setPassageList([]);
        return;
      }

      const normalizedAnalyses = (analysisResponse.data || []).map(normalizePassage);

      const analysisMap = new Map(
        normalizedAnalyses.map((item) => [item.passageNumber, item])
      );

      const rawPassages = Array.isArray(passageResponse?.data) ? passageResponse.data : [];
      const merged = rawPassages.map((entry) => {
        const analysis = analysisMap.get(entry.passageNumber);
        const variants = analysis?.variants || [];
        return {
          ...entry,
          hasAnalysis: variants.length > 0,
          variantCount: variants.length,
          variants,
          originalPassage: analysis?.originalPassage || entry.text || entry.excerpt
        };
      });

      // Ensure analyses without matching raw passage are still visible
      analysisMap.forEach((analysis, number) => {
        if (!merged.find((item) => item.passageNumber === number)) {
          merged.push({
            passageNumber: number,
            excerpt: analysis.originalPassage?.slice(0, 160) || '원문을 찾을 수 없습니다.',
            text: analysis.originalPassage || '',
            hasAnalysis: true,
            variantCount: analysis.variants?.length || 0,
            variants: analysis.variants || [],
            originalPassage: analysis.originalPassage || ''
          });
        }
      });

      merged.sort((a, b) => a.passageNumber - b.passageNumber);
      setPassageList(merged);
      setStep(2);
    } catch (err) {
      raiseError('지문 목록을 불러오는 중 문제가 발생했습니다.', err?.message || '');
      setPassageList([]);
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
        setStep(3);
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
      message: null
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
      message: flavor.message
    });

    const ok = await handleGenerateVariants(passageNumber, count);

    resetGenerationLoading();
    if (!ok) {
      setError((prev) => prev || '분석을 생성하지 못했습니다. 다시 시도해 주세요.');
    }
  };

  const handleBackToDocuments = () => {
    setStep(1);
    setSelectedDocument(null);
    setSelectedPassage(null);
    setActiveVariantIndex(0);
    setAnalysisLimitError(null);
  };

  const handleBackToPassages = () => {
    setStep(2);
    setSelectedPassage(null);
    setActiveVariantIndex(0);
    setAnalysisLimitError(null);
    setFeedbackMessage(null);
    setReportModal({ open: false, variantIndex: null, reason: '' });
  };

  const remainingSlots = (passage) => Math.max(0, MAX_VARIANTS_PER_PASSAGE - (passage?.variants?.length || 0));

  const renderDocumentList = () => (
    <div style={analysisStyles.container}>
      <div style={analysisStyles.header}>
        <h1 style={analysisStyles.title}>📖 문서 분석 자료</h1>
        <p style={analysisStyles.subtitle}>분석할 문서를 선택해 주세요</p>
      </div>

      {loading && (
        <div style={analysisStyles.loadingContainer}>
          <div style={analysisStyles.spinner} />
          <p>문서 목록을 불러오는 중이에요...</p>
        </div>
      )}

      {!loading && !error && (
        <div style={analysisStyles.grid}>
          {documents.map((doc) => (
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
          <p style={{ color: 'var(--text-secondary)', marginTop: 0 }}>
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
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
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

  const renderVariantMeta = (variant) => {
    const { meta = {} } = variant || {};
    const deepDive = meta.deepDive || {};
    const englishTitles = Array.isArray(meta.englishTitles) ? meta.englishTitles : [];
    const modernApplications = Array.isArray(meta.modernApplications) ? meta.modernApplications : [];

    return (
      <div style={analysisStyles.variantMetaGrid}>
        <div style={analysisStyles.metaCard}>
          <div style={analysisStyles.metaTitle}>🎯 핵심 의미</div>
          <p><strong>핵심 메시지:</strong> {deepDive.coreMessage || '핵심 메시지가 아직 정리되지 않았어요.'}</p>
          <p><strong>논리 흐름:</strong> {deepDive.logicalFlow || '글의 흐름을 정리 중이에요.'}</p>
          <p><strong>톤 & 수사법:</strong> {deepDive.toneAndStyle || '톤 정보가 아직 없어요.'}</p>
        </div>
        <div style={analysisStyles.metaCard}>
          <div style={analysisStyles.metaTitle}>📝 영어 제목 & 요약</div>
          <p><strong>영어 한 줄 요약:</strong> {meta.englishSummary || '요약이 준비되는 중이에요.'}</p>
          <p><strong>한글 해석:</strong> {meta.englishSummaryKorean || '요약 해석이 아직 없어요.'}</p>
          <p><strong>작가의 주장:</strong> {meta.authorsClaim || '저자의 주장을 분석 중입니다.'}</p>
          <ul style={analysisStyles.metaList}>
            {englishTitles.map((title, index) => (
              <li key={`title-${index}`}>
                {title.title} — {title.korean}
                {title.isQuestion ? ' (의문형)' : ''}
              </li>
            ))}
          </ul>
        </div>
        <div style={analysisStyles.metaCard}>
          <div style={analysisStyles.metaTitle}>🌍 현대 사례</div>
          {modernApplications.length ? (
            <ul style={analysisStyles.metaList}>
              {modernApplications.map((item, index) => (
                <li key={`modern-${index}`}>{item}</li>
              ))}
            </ul>
          ) : (
            <p>현대 사례는 앞으로 추가될 예정이에요.</p>
          )}
        </div>
      </div>
    );
  };

  const renderSentenceCard = (sentence, index, total) => {
    const englishRaw = String(sentence.english || '');
    const topicMatch = englishRaw.match(/^\*\*(.*)\*\*$/);
    const cleanEnglish = topicMatch ? topicMatch[1].trim() : englishRaw;

    const koreanLine = sentence.korean || '*** 한글 해석: 우리말 해석을 준비하는 중이에요. 잠시만 기다려 주세요! 😊';
    const analysisLine = sentence.analysis || '*** 분석: 의미를 정리하는 중이에요. 조금만 기다리면 완성됩니다! ✨';
    const backgroundLine = sentence.background || '*** 이 문장에 필요한 배경지식: 관련 배경을 모으는 중이에요. 곧 업데이트됩니다. 📚';
    const exampleLine = sentence.example || '*** 이 문장에 필요한 사례: 생활 속 예시를 정리하는 중이에요. 잠시 후 확인해 보세요! 🏫';
    const grammarLine = sentence.grammar || '✏️ 어법 포인트: 중요한 구문을 점검하는 중이에요. 다시 시도해 보세요.';
    const vocabularyIntro = sentence.vocabulary?.intro || '*** 어휘 포인트: 핵심 어휘를 직접 정리해 보아요. 비슷한 말과 반대말을 찾아보면 더 좋아요! 😊';
    const vocabWords = Array.isArray(sentence.vocabulary?.words) ? sentence.vocabulary.words : [];

    const cardStyle = {
      ...analysisStyles.sentenceCard,
      ...(index === total - 1 ? analysisStyles.sentenceCardLast : {})
    };

    return (
      <div key={`sentence-${index}`} style={cardStyle}>
        <div style={analysisStyles.sentenceHeader}>
          <span style={analysisStyles.sentenceEnglish}>
            {sentence.isTopicSentence ? (
              <strong>⭐ {cleanEnglish}</strong>
            ) : (
              cleanEnglish
            )}
          </span>
          {sentence.isTopicSentence && <span style={analysisStyles.topicBadge}>주제문</span>}
        </div>
        <div style={analysisStyles.sentenceKorean}>{koreanLine}</div>
        <div style={analysisStyles.sentenceBody}>
          <div style={analysisStyles.sentenceBlock}>{analysisLine}</div>
          <div style={analysisStyles.sentenceBlock}>{backgroundLine}</div>
          <div style={analysisStyles.sentenceBlock}>{exampleLine}</div>
          <div style={analysisStyles.sentenceBlock}>{grammarLine}</div>
          <div style={analysisStyles.sentenceBlock}>{vocabularyIntro}</div>
          {vocabWords.length ? (
            <ul style={analysisStyles.vocabList}>
              {vocabWords.map((word, idx) => (
                <li key={`word-${index}-${idx}`} style={analysisStyles.vocabListItem}>
                  <strong>{word.term}</strong>: {word.meaning}
                  {word.synonyms?.length ? ` · 동의어: ${word.synonyms.join(', ')}` : ''}
                  {word.antonyms?.length ? ` · 반의어: ${word.antonyms.join(', ')}` : ''}
                  {word.note ? ` · 노트: ${word.note}` : ''}
                </li>
              ))}
            </ul>
          ) : (
            <div style={analysisStyles.sentenceBlock}>*** 어휘 포인트: 핵심 어휘가 아직 준비되지 않았어요. 직접 정리해 보면 어휘력이 쑥 자라요! 💪</div>
          )}
        </div>
      </div>
    );
  };

  const renderPassageAnalysis = () => (
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

          {activeVariant ? (
            <>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '12px' }}>
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
            setStep(1);
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
        const options = Array.from({ length: slots }, (_, idx) => idx + 1);
        return (
          <div style={analysisStyles.generationOverlay}>
            <div style={analysisStyles.generationCard}>
              <div style={analysisStyles.generationBadge}>#{String(passage.passageNumber || 0).padStart(2, '0')}</div>
              <h3 style={analysisStyles.generationTitle}>몇 개 만들까요?</h3>
              <p style={analysisStyles.generationSubtitle}>남은 칸: {slots}개 · 만들고 싶은 분석본 수를 골라 주세요.</p>
              {options.length ? (
                <div style={analysisStyles.generationButtons}>
                  {options.map((count) => (
                    <button
                      key={`analysis-generation-count-${count}`}
                      type="button"
                      style={analysisStyles.generationButton}
                      onClick={() => startGeneration(count)}
                    >
                      {count}개 만들기
                    </button>
                  ))}
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
            {generationLoading.word && (
              <div style={analysisStyles.loadingWordBox}>
                <span style={analysisStyles.loadingWord}>{generationLoading.word}</span>
                <span style={analysisStyles.loadingMeaning}>{generationLoading.meaning}</span>
              </div>
            )}
            {generationLoading.quote && (
              <div style={analysisStyles.loadingQuoteBox}>
                <blockquote style={analysisStyles.loadingQuote}>“{generationLoading.quote}”</blockquote>
                <cite style={analysisStyles.loadingQuoteAuthor}>— {generationLoading.quoteAuthor}</cite>
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
