import React, { useEffect, useRef, useState } from 'react';
import PassagePickerGrid from '../../../../components/shared/PassagePickerGrid';
import styles from '../configStyles';

const PassageStep = ({
  passages,
  selectedPassages,
  loading,
  onBack,
  onNext,
  onToggle,
  onSelectAll,
  onRandom,
  onClear,
  onPreview,
  selectionLabel,
  metaRenderer,
  maxSelection = 5,
  finalStep = false,
  primaryLabel = '유형 고르러 가기 →',
  backLabel = '← 이전 단계',
}) => {
  const remaining = Math.max(0, maxSelection - selectedPassages.length);
  const actionBarRef = useRef(null);
  const [showScrollHint, setShowScrollHint] = useState(false);
  const [isMobile, setIsMobile] = useState(() => (typeof window !== 'undefined' ? window.innerWidth < 768 : false));

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const target = actionBarRef.current;
    if (!target || typeof IntersectionObserver === 'undefined') {
      setShowScrollHint(false);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        setShowScrollHint(!entry.isIntersecting);
      },
      {
        threshold: 0.6,
      }
    );

    observer.observe(target);
    return () => observer.disconnect();
  }, [selectedPassages.length, passages]);

  const scrollToActions = () => {
    if (actionBarRef.current) {
      actionBarRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  };

  return (
    <div style={styles.section}>
        <div style={styles.sectionTitleRow}>
          <h3 style={styles.sectionTitle}>3단계 · 지문 선택</h3>
        <span style={styles.selectionBadge}>{selectedPassages.length}개 선택</span>
      </div>
      <p style={styles.sectionHint}>
        문제에 사용할 지문을 골라주세요. 지문 카드를 눌러 선택/해제할 수 있고,
        ‘전체 보기’로 원문을 확인할 수 있어요.
      </p>
    <p style={styles.selectionLimitHint}>
      최대 {maxSelection}개까지 선택할 수 있어요. 남은 슬롯: {remaining}개
    </p>
    {loading ? (
      <div style={styles.loadingCard}>
        <div style={styles.spinner} />
        <p>지문을 불러오는 중이에요...</p>
      </div>
    ) : passages.length ? (
      <>
        <div style={styles.bulkActions}>
          <button type="button" style={styles.bulkButton} onClick={onSelectAll}>
            전체 선택
          </button>
          <button type="button" style={styles.bulkRandomButton} onClick={onRandom}>
            랜덤 선택
          </button>
          <button type="button" style={styles.bulkClearButton} onClick={onClear}>
            선택 해제
          </button>
        </div>
        <PassagePickerGrid
          passages={passages}
          selected={selectedPassages}
          onToggle={onToggle}
          onPreview={onPreview}
          maxSelection={maxSelection}
          selectionLabel={selectionLabel}
          renderMeta={metaRenderer}
          emptyMessage="표시할 지문이 아직 없어요."
        />
      </>
    ) : (
      <div style={styles.loadingCard}>선택한 자료에서 지문을 찾지 못했어요.</div>
    )}
    <div ref={actionBarRef} style={styles.passageActionBar}>
      <button type="button" style={styles.secondaryButton} onClick={onBack}>
        {backLabel}
      </button>
      <button
        type="button"
        style={{
          ...(finalStep ? styles.startButton : styles.primaryButton),
          ...(selectedPassages.length ? {} : styles.startButtonDisabled),
        }}
        onClick={onNext}
        disabled={!selectedPassages.length}
      >
        {primaryLabel}
      </button>
    </div>
    {showScrollHint && (
      <button type="button" style={styles.scrollHintButton} onClick={scrollToActions}>
        ⬇️ 학습 시작 버튼 보기
      </button>
    )}
    {finalStep && selectedPassages.length > 0 && isMobile && (
      <button
        type="button"
        style={{
          ...styles.floatingStartButton,
        }}
        onClick={() => {
          if (typeof actionBarRef.current?.scrollIntoView === 'function') {
            actionBarRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
          }
          if (typeof onNext === 'function') {
            onNext();
          }
        }}
      >
        🚀 {primaryLabel || '학습 시작'}
      </button>
    )}
    </div>
  );
};

export default PassageStep;
