import React from 'react';
import { TYPE_LABELS } from '../constants';
import { studyStyles as styles } from '../studyStyles';

const ReviewList = ({ problems }) => (
  <div style={styles.reviewCalloutList}>
    {problems.map((item, index) => (
      <div key={item.id || `preview-${index}`} style={styles.reviewPreviewItem}>
        <div style={styles.reviewPreviewMeta}>
          <span style={styles.reviewPreviewType}>{TYPE_LABELS[item.type] || item.type}</span>
          {item.sourceLabel && <span style={styles.reviewPreviewSource}>{item.sourceLabel}</span>}
        </div>
        <div style={styles.reviewPreviewText}>{item.question || item.mainText || '문항 정보를 불러오고 있어요.'}</div>
      </div>
    ))}
  </div>
);

const ReviewCallout = ({ total, problems = [], loading, refreshing, error, onRefresh, onStart }) => (
  <div style={styles.reviewCallout}>
    <div style={styles.reviewCalloutHeader}>
      <div>
        <div style={styles.reviewBadge}>복습 대기열</div>
        <div style={styles.reviewCalloutTitle}>틀린 문제 {total || 0}문이 기다리고 있어요.</div>
        <div style={styles.reviewCalloutSubtitle}>버튼 한 번으로 다시 찬찬히 복습해 볼까요?</div>
      </div>
      <div style={styles.reviewActions}>
        <button
          type="button"
          style={{
            ...styles.reviewRefreshButton,
            ...(refreshing ? styles.reviewButtonDisabled : {})
          }}
          onClick={onRefresh}
          disabled={refreshing}
        >
          {refreshing ? '불러오는 중…' : '새로고침'}
        </button>
        <button
          type="button"
          style={{
            ...styles.reviewStartButton,
            ...((loading || total <= 0) ? styles.reviewButtonDisabled : {})
          }}
          onClick={onStart}
          disabled={loading || total <= 0}
        >
          {loading ? '준비 중...' : '복습 대기열 시작'}
        </button>
      </div>
    </div>

    {error ? (
      <div style={styles.reviewErrorBox} role="status" aria-live="polite">
        {error}
      </div>
    ) : null}

    {!error && problems.length ? (
      <ReviewList problems={problems} />
    ) : !error ? (
      <div style={styles.reviewEmptyPreview}>최근 틀린 문제가 없어요. 아주 잘하고 있어요! ✨</div>
    ) : null}
  </div>
);

export default ReviewCallout;
