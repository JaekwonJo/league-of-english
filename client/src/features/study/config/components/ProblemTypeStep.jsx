import React from 'react';
import styles from '../configStyles';
import {
  MAX_TOTAL_PROBLEMS,
  PROBLEM_STEP,
  PROBLEM_TYPES,
} from '../constants';

const ProblemTypeStep = ({
  typeCounts,
  totalProblems,
  orderMode,
  onBack,
  onReset,
  onRandomize,
  onOrderModeChange,
  onChangeByStep,
  onChangeValue,
  onStart,
  canStart,
  onPreviewProblem,
}) => (
  <>
    <div style={styles.section}>
      <div style={styles.sectionTitleRow}>
        <h3 style={styles.sectionTitle}>3단계 · 문항 종류</h3>
        <div style={styles.countBadge}>
          <span style={styles.countLabel}>선택</span>
          <span style={styles.countNumber}>{totalProblems}</span>
          <span style={styles.countDivider}>/</span>
          <span style={styles.countMax}>{MAX_TOTAL_PROBLEMS}</span>
        </div>
      </div>
      <p style={styles.sectionHint}>
        문항 수는 1문제씩 자유롭게 조절할 수 있고, 한 번에 최대 10문제까지 요청할 수 있어요.
        지문을 랜덤으로 골라도 10문 이하로 맞춰져요.
      </p>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '12px', gap: '10px', flexWrap: 'wrap' }}>
        <button type="button" style={styles.randomButton} onClick={onRandomize}>
          랜덤 배치
        </button>
        {typeof onPreviewProblem === 'function' && (
          <button type="button" style={styles.previewButton} onClick={onPreviewProblem}>
            문항 미리보기
          </button>
        )}
      </div>
      <div style={styles.typeGrid}>
        {Object.entries(PROBLEM_TYPES).map(([type, info]) => {
          const count = typeCounts[type] || 0;
          return (
            <div key={type} style={styles.typeCard}>
              <div style={styles.typeHeader}>
                <span style={styles.typeIcon}>{info.icon}</span>
                <div>
                  <div style={styles.typeName}>{info.name}</div>
                  {info.description && (
                    <div style={styles.typeDescription}>{info.description}</div>
                  )}
                </div>
              </div>
              {info.instruction && (
                <div style={styles.typeInstruction}>{info.instruction}</div>
              )}
              <div style={styles.typeControls}>
                <button
                  type="button"
                  style={styles.controlButton}
                  onClick={() => onChangeByStep(type, -PROBLEM_STEP)}
                >
                  -
                </button>
                <input
                  type="number"
                  style={styles.numberInput}
                  value={count}
                  onChange={(event) => onChangeValue(type, event.target.value)}
                  min="0"
                  max={MAX_TOTAL_PROBLEMS}
                  step={PROBLEM_STEP}
                />
                <button
                  type="button"
                  style={styles.controlButton}
                  onClick={() => onChangeByStep(type, PROBLEM_STEP)}
                >
                  +
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>

    <div style={styles.section}>
      <h3 style={styles.sectionTitle}>문항 순서</h3>
      <p style={styles.sectionHint}>
        랜덤을 선택하면 지문 순서와 상관없이 섞어서 출제돼요. 순서를 고정하면 업로드한 지문 순서대로 차근차근 풀 수 있어요.
      </p>
      <div style={styles.orderModeGroup}>
        <label style={styles.orderModeOption}>
          <input
            type="radio"
            name="orderMode"
            value="random"
            checked={orderMode !== 'sequential'}
            onChange={() => onOrderModeChange('random')}
            style={{ marginTop: '4px' }}
          />
          <div>
            <div style={styles.orderModeLabel}>랜덤으로 풀기</div>
            <div style={styles.orderModeDescription}>
              선택한 지문과 유형을 한데 섞어서, 매번 색다른 문제 구성을 받아요.
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
            style={{ marginTop: '4px' }}
          />
          <div>
            <div style={styles.orderModeLabel}>순서대로 풀기</div>
            <div style={styles.orderModeDescription}>
              업로드된 지문 순서대로 문제를 정렬해 안정적으로 학습할 수 있어요.
            </div>
          </div>
        </label>
      </div>
    </div>

    <div style={styles.stepActionsSplit}>
      <button type="button" style={styles.secondaryButton} onClick={onBack}>
        ← 지문 다시 고르기
      </button>
      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
        <button type="button" style={styles.dangerButton} onClick={onReset}>
          초기화
        </button>
        <button
          type="button"
          style={{
            ...styles.startButton,
            ...(canStart ? {} : styles.startButtonDisabled),
          }}
          onClick={onStart}
          disabled={!canStart}
        >
          학습 시작
        </button>
      </div>
    </div>
  </>
);

export default ProblemTypeStep;
