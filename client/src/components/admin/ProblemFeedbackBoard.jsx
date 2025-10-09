import React from 'react';
import { adminStyles } from '../../styles/adminStyles';

const STATUS_LABELS = {
  pending: '⏳ 대기',
  resolved: '✅ 완료',
  dismissed: '🙅 보류',
  acknowledged: '👍 확인'
};

function stripHtml(html = '') {
  return String(html).replace(/<[^>]+>/g, '').trim();
}

const toLocalString = (timestamp) => {
  if (!timestamp) return '시간 정보 없음';
  try {
    return new Date(timestamp).toLocaleString();
  } catch (error) {
    return timestamp;
  }
};

export function ProblemFeedbackBoard({
  reports,
  summary,
  loading,
  error,
  onRefresh,
  onResolve,
  onDismiss
}) {
  const pendingCount = summary?.pending || 0;
  const resolvedCount = summary?.resolved || 0;
  const dismissedCount = summary?.dismissed || 0;

  return (
    <div style={adminStyles.feedbackSection}>
      <div style={adminStyles.feedbackHeader}>
        <h2 style={adminStyles.cardTitle}>🛠️ 문항 신고 센터</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <span style={adminStyles.feedbackBadge}>대기 {pendingCount}</span>
            <span style={{ ...adminStyles.feedbackBadge, background: '#e8f5e9', color: '#2e7d32' }}>
              완료 {resolvedCount}
            </span>
            <span style={{ ...adminStyles.feedbackBadge, background: '#fff4e5', color: '#e65100' }}>
              보류 {dismissedCount}
            </span>
          </div>
          <button
            type="button"
            onClick={onRefresh}
            style={adminStyles.secondaryButton}
            disabled={loading}
          >
            🔄 새로 고침
          </button>
        </div>
      </div>

      {error && <div style={adminStyles.feedbackError}>{error}</div>}

      {loading ? (
        <div style={adminStyles.loading}>신고 목록을 불러오고 있어요...</div>
      ) : reports.length === 0 ? (
        <div style={adminStyles.feedbackEmpty}>
          현재 확인해야 할 문항 신고가 없어요. 학생들이 문제를 잘 풀고 있네요! 😊
        </div>
      ) : (
        <div style={adminStyles.feedbackList}>
          {reports.map((report) => (
            <div key={report.id} style={adminStyles.feedbackItem}>
              <div style={adminStyles.feedbackMeta}>
                <span>📚 {report.problem?.documentTitle || '문서 정보 없음'}</span>
                <span>유형 {report.problem?.type || '-'}</span>
                <span>{STATUS_LABELS[report.status] || report.status}</span>
                <span>{toLocalString(report.createdAt)} 신고</span>
              </div>
              <div style={{ ...adminStyles.feedbackReason, fontWeight: 'bold' }}>
                {report.reason || '신고 사유가 작성되지 않았습니다.'}
              </div>
              {report.problem?.question && (
                <div style={{ marginTop: '12px', color: 'var(--text-secondary)', fontSize: '14px', lineHeight: 1.5 }}>
                  <strong>문항 미리보기</strong>
                  <div style={{ marginTop: '6px', whiteSpace: 'pre-wrap' }}>
                    {stripHtml(report.problem.question).slice(0, 220)}
                    {stripHtml(report.problem.question).length > 220 ? '…' : ''}
                  </div>
                </div>
              )}
              <div style={adminStyles.feedbackActions}>
                <button
                  type="button"
                  style={adminStyles.feedbackActionResolve}
                  onClick={() => onResolve(report.id)}
                >
                  ✅ 검수 완료
                </button>
                <button
                  type="button"
                  style={adminStyles.feedbackActionDismiss}
                  onClick={() => onDismiss(report.id)}
                >
                  🙅 보류 처리
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default ProblemFeedbackBoard;
