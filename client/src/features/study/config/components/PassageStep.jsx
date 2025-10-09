import React from 'react';
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
}) => (
  <div style={styles.section}>
    <div style={styles.sectionTitleRow}>
      <h3 style={styles.sectionTitle}>2단계 · 지문 선택</h3>
      <span style={styles.selectionBadge}>{selectedPassages.length}개 선택</span>
    </div>
    <p style={styles.sectionHint}>
      문제에 사용할 지문을 골라주세요. 카드 왼쪽 상단의 체크 박스를 눌러 선택하고,
      전체 보기를 누르면 원문을 확인할 수 있어요.
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
          selectionLabel={selectionLabel}
          renderMeta={metaRenderer}
          emptyMessage="표시할 지문이 아직 없어요."
        />
      </>
    ) : (
      <div style={styles.loadingCard}>선택한 자료에서 지문을 찾지 못했어요.</div>
    )}
    <div style={styles.stepActionsSplit}>
      <button type="button" style={styles.secondaryButton} onClick={onBack}>
        ← 이전 단계
      </button>
      <button
        type="button"
        style={{
          ...styles.primaryButton,
          ...(selectedPassages.length ? {} : styles.startButtonDisabled),
        }}
        onClick={onNext}
        disabled={!selectedPassages.length}
      >
        유형 고르러 가기 →
      </button>
    </div>
  </div>
);

export default PassageStep;
