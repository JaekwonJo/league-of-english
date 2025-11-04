import React from 'react';
import styles from '../configStyles';
import { MAX_TOTAL_PROBLEMS, PROBLEM_TYPES } from '../constants';

const ProblemTypeStep = ({
  selectedType,
  problemCount,
  orderMode,
  onBack,
  onSelectType,
  onOrderModeChange,
  onStart,
  canStart,
  onPreviewProblem,
}) => {
  const typeEntries = Object.entries(PROBLEM_TYPES);
  const activeName = selectedType ? PROBLEM_TYPES[selectedType]?.name : null;
  const selectionSummary = activeName
    ? `${activeName} · 최대 ${problemCount}문`
    : `최대 ${problemCount}문 출제`;

  return (
    <>
      <div style={styles.section}>
        <div style={styles.sectionTitleRow}>
          <h3 style={styles.sectionTitle}>3단계 · 문항 유형 선택</h3>
          <div style={styles.typeSelectionBadge}>{selectionSummary}</div>
        </div>
        <p style={styles.sectionHint}>원하는 문제 유형 하나를 선택해 주세요.</p>
        <div style={styles.typeSelectGrid}>
          {typeEntries.map(([type, info]) => {
            const isActive = selectedType === type;
            return (
              <button
                key={type}
                type="button"
                style={{
                  ...styles.typeSelectCard,
                  ...(isActive ? styles.typeSelectCardActive : {}),
                }}
                onClick={() => onSelectType(type)}
                aria-pressed={isActive}
              >
                <div style={styles.typeSelectIcon}>{info.icon}</div>
                <div style={styles.typeSelectBody}>
                  <div style={styles.typeSelectName}>{info.name}</div>
                  {info.description && (
                    <div style={styles.typeSelectDescription}>{info.description}</div>
                  )}
                  {isActive && <div style={styles.typeSelectBadge}>선택됨</div>}
                </div>
              </button>
            );
          })}
        </div>
        {/* 미리보기 버튼 제거 */}
      </div>

      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>문항 순서</h3>
        <p style={styles.sectionHint}>
          랜덤은 지문과 문제를 섞어서 출제하고, 순차는 업로드한 순서대로 풀 수 있게 해요.
        </p>
        <div style={styles.orderModeGroup}>
          <label style={styles.orderModeOption}>
            <input
              type="radio"
              name="orderMode"
              value="random"
              checked={orderMode !== 'sequential'}
              onChange={() => onOrderModeChange('random')}
            />
            <div>
              <div style={styles.orderModeLabel}>랜덤으로 풀기</div>
              <div style={styles.orderModeDescription}>
                매번 다른 순서로 문제를 제공해 집중력을 높여요.
              </div>
            </div>
          </label>
          <label style={styles.orderModeOption}>
            <input
              type="radio"
              name="orderMode"
              value="sequential"
              checked={orderMode === 'sequential'}
              onChange={() => onOrderModeChange('sequential')}
            />
            <div>
              <div style={styles.orderModeLabel}>순서대로 풀기</div>
              <div style={styles.orderModeDescription}>
                업로드 순서를 그대로 따라가며 안정적으로 복습할 수 있어요.
              </div>
            </div>
          </label>
        </div>
      </div>

      <div style={styles.studyFooterBar}>
        <button type="button" style={styles.secondaryButton} onClick={onBack}>
          ← 지문 다시 고르기
        </button>
        <button
          type="button"
          style={{
            ...styles.startButton,
            ...(canStart ? {} : styles.startButtonDisabled),
          }}
          disabled={!canStart}
          onClick={onStart}
        >
          학습 시작 ({problemCount}문)
        </button>
      </div>
    </>
  );
};

export default ProblemTypeStep;
