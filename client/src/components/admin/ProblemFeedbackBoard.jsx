import React, { useMemo, useState, useEffect } from 'react';
import { adminStyles } from '../../styles/adminStyles';

const STATUS_LABELS = {
  pending: '⏳ 대기',
  resolved: '✅ 완료',
  dismissed: '🙅 보류',
  acknowledged: '👍 확인'
};

const STATUS_OPTIONS = [
  { value: 'all', label: '전체' },
  { value: 'pending', label: '⏳ 대기' },
  { value: 'acknowledged', label: '👍 확인' },
  { value: 'resolved', label: '✅ 완료' },
  { value: 'dismissed', label: '🙅 보류' }
];

const TYPE_OPTIONS = [
  { value: 'all', label: '전체' },
  { value: 'blank', label: '빈칸' },
  { value: 'order', label: '순서 배열' },
  { value: 'insertion', label: '문장 삽입' },
  { value: 'grammar', label: '어법' },
  { value: 'vocabulary', label: '어휘' },
  { value: 'title', label: '제목' },
  { value: 'theme', label: '주제' },
  { value: 'summary', label: '요약' },
  { value: 'implicit', label: '함축 의미' },
  { value: 'irrelevant', label: '무관 문장' }
];

const SORT_OPTIONS = [
  { value: 'recent', label: '최신순' },
  { value: 'oldest', label: '오래된 순' }
];

function stripHtml(html = '') {
  return String(html).replace(/<[^>]+>/g, '').trim();
}

const styles = {
  filterRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '12px',
    margin: '16px 0',
    alignItems: 'flex-end'
  },
  filterControl: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    minWidth: '160px',
    color: 'var(--text-secondary)',
    fontSize: '0.85rem'
  },
  filterSelect: {
    padding: '8px 10px',
    borderRadius: '10px',
    border: '1px solid var(--surface-border)',
    background: 'var(--surface-soft)',
    color: 'var(--text-primary)'
  },
  searchGroup: {
    display: 'flex',
    gap: '8px',
    alignItems: 'center'
  },
  searchInput: {
    flex: 1,
    padding: '8px 12px',
    borderRadius: '10px',
    border: '1px solid var(--surface-border)',
    background: 'var(--surface-soft)',
    color: 'var(--text-primary)'
  },
  searchButton: {
    padding: '8px 14px',
    borderRadius: '10px',
    border: 'none',
    background: 'var(--accent-primary)',
    color: 'var(--text-on-accent)',
    fontWeight: 600,
    cursor: 'pointer'
  }
};

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
  filters,
  documents,
  onRefresh,
  onFilterChange,
  onResolve,
  onDismiss,
  onToast,
  onDeactivate
}) {
  const activeFilters = filters || {};
  const [searchValue, setSearchValue] = useState(activeFilters.search || '');

  useEffect(() => {
    setSearchValue(activeFilters.search || '');
  }, [activeFilters.search]);

  const documentOptions = useMemo(() => {
    if (!Array.isArray(documents)) return [];
    const map = new Map();
    documents.forEach((doc) => {
      if (!doc || !doc.id) return;
      map.set(String(doc.id), doc.title || `문서 ${doc.id}`);
    });
    return Array.from(map.entries()).map(([value, label]) => ({ value, label }));
  }, [documents]);

  const handleFilterChange = (field, value) => {
    if (typeof onFilterChange === 'function') {
      onFilterChange({ [field]: value });
    }
  };

  const applySearch = () => {
    const trimmed = searchValue.trim();
    if (typeof onFilterChange === 'function') {
      onFilterChange({ search: trimmed });
    }
  };

  const handleExport = () => {
    if (!Array.isArray(reports) || reports.length === 0) {
      onToast?.('내보낼 신고가 아직 없어요.', 'warning');
      return;
    }
    try {
      const header = ['ID', '상태', '유형', '문서', '문항 ID', '신고자', '신고 사유', '생성 시각'];
      const rows = reports.map((report) => {
        const documentLabel = report.problem?.documentTitle
          ? report.problem.documentTitle
          : report.problem?.documentId
            ? `문서 ${report.problem.documentId}`
            : '문서 정보 없음';
        return [
          report.id,
          report.status,
          report.problem?.type || '-',
          documentLabel,
          report.problem?.id || '-',
          report.userId || '-',
          (report.reason || '').replace(/\n+/g, ' '),
          report.createdAt || ''
        ];
      });
      const csvContent = [header, ...rows]
        .map((row) => row
          .map((cell) => {
            const value = String(cell ?? '');
            if (value.includes(',') || value.includes('\n') || value.includes('"')) {
              return `"${value.replace(/"/g, '""')}"`;
            }
            return value;
          })
          .join(','))
        .join('\n');

      const blob = new Blob([`\uFEFF${csvContent}`], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const timestamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
      link.download = `loe-problem-feedback-${timestamp}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      onToast?.('신고 목록을 CSV로 내려받았어요. 📤', 'success');
    } catch (exportError) {
      console.error('CSV export failed:', exportError);
      onToast?.('CSV 내보내기 중 문제가 발생했습니다.', 'error');
    }
  };

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
          <span style={adminStyles.feedbackBadgeSuccess}>
            완료 {resolvedCount}
          </span>
          <span style={adminStyles.feedbackBadgeHold}>
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
        <button
          type="button"
          onClick={handleExport}
          style={adminStyles.secondaryButton}
          disabled={loading || !reports.length}
        >
          📤 CSV 저장
        </button>
      </div>
    </div>

    <div style={styles.filterRow}>
      <label style={styles.filterControl}>
        <span>상태</span>
        <select
          value={activeFilters.status || 'pending'}
          onChange={(event) => handleFilterChange('status', event.target.value)}
          style={styles.filterSelect}
          disabled={loading}
        >
          {STATUS_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
      </label>
      <label style={styles.filterControl}>
        <span>유형</span>
        <select
          value={activeFilters.type || 'all'}
          onChange={(event) => handleFilterChange('type', event.target.value)}
          style={styles.filterSelect}
          disabled={loading}
        >
          {TYPE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
      </label>
      <label style={styles.filterControl}>
        <span>문서</span>
        <select
          value={activeFilters.documentId || 'all'}
          onChange={(event) => handleFilterChange('documentId', event.target.value)}
          style={styles.filterSelect}
          disabled={loading}
        >
          <option value="all">전체</option>
          {documentOptions.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
      </label>
      <label style={styles.filterControl}>
        <span>정렬</span>
        <select
          value={activeFilters.sort || 'recent'}
          onChange={(event) => handleFilterChange('sort', event.target.value)}
          style={styles.filterSelect}
          disabled={loading}
        >
          {SORT_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
      </label>
      <div style={{ ...styles.filterControl, flex: 1 }}>
        <span>검색</span>
        <div style={styles.searchGroup}>
          <input
            type="text"
            placeholder="사유, 문서명, 문항 ID 검색"
            value={searchValue}
            onChange={(event) => setSearchValue(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                applySearch();
              }
            }}
            style={styles.searchInput}
            disabled={loading}
          />
          <button type="button" style={styles.searchButton} onClick={applySearch} disabled={loading}>
            🔍 적용
          </button>
        </div>
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
          {reports.map((report) => {
            const isInactive = report?.problem?.isActive === false;
            return (
              <div key={report.id} style={adminStyles.feedbackItem}>
              <div style={adminStyles.feedbackMeta}>
                <span>📚 {report.problem?.documentTitle || '문서 정보 없음'}</span>
                <span>유형 {report.problem?.type || '-'}</span>
                <span>{STATUS_LABELS[report.status] || report.status}</span>
                <span>{toLocalString(report.createdAt)} 신고</span>
                {isInactive && (
                  <span style={{ color: 'var(--danger-strong)', fontWeight: 600 }}>
                    🚫 숨긴 문항
                  </span>
                )}
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
                <button
                  type="button"
                  style={{
                    ...adminStyles.feedbackActionDeactivate,
                    ...(isInactive ? adminStyles.feedbackActionDisabled : {})
                  }}
                  disabled={loading || isInactive}
                  onClick={() => onDeactivate?.(report)}
                >
                  🚨 문항 숨기기
                </button>
              </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default ProblemFeedbackBoard;
