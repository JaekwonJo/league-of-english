import React from 'react';

const gridStyles = {
  wrapper: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  metaRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '10px',
    flexWrap: 'wrap',
    color: 'var(--tone-strong)'
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
    gap: '16px'
  },
  card: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    background: 'var(--surface-card)',
    border: '1px solid var(--surface-border)',
    borderRadius: '14px',
    padding: '16px',
    minHeight: '200px',
    transition: 'all 0.2s ease',
    boxShadow: '0 10px 18px var(--surface-shadow)'
  },
  cardSelected: {
    borderColor: 'var(--accent-primary)',
    boxShadow: '0 12px 24px var(--accent-shadow)'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '12px',
    gap: '10px'
  },
  badge: {
    fontSize: '13px',
    fontWeight: '600',
    background: 'var(--accent-soft)',
    padding: '6px 10px',
    borderRadius: '999px',
    color: 'var(--accent-strong)'
  },
  // 체크박스 제거: 카드 클릭으로 선택/해제
  excerpt: {
    flex: 1,
    fontSize: '14px',
    lineHeight: 1.6,
    color: 'var(--tone-strong)',
    margin: 0,
    whiteSpace: 'pre-wrap'
  },
  footer: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: '14px',
    gap: '10px'
  },
  previewButton: {
    background: 'var(--accent-soft)',
    border: 'none',
    color: 'var(--accent-primary)',
    borderRadius: '8px',
    padding: '6px 12px',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: 600,
    transition: 'background 0.2s ease'
  },
  previewButtonDisabled: {
    opacity: 0.4,
    cursor: 'not-allowed'
  },
  empty: {
    background: 'var(--surface-soft)',
    borderRadius: '12px',
    padding: '32px',
    textAlign: 'center',
    color: 'var(--tone-muted)'
  }
};

const PassagePickerGrid = ({
  passages = [],
  selected = [],
  onToggle,
  onPreview,
  maxSelection = 0,
  renderMeta,
  selectionLabel,
  emptyMessage = '표시할 지문이 아직 없어요.',
  selectionEnabled = true
}) => {
  const selectedList = Array.isArray(selected) ? selected : [];
  const isSelected = (number) => selectionEnabled && selectedList.includes(number);
  const isSelectionDisabled = (number) => {
    if (!selectionEnabled) return false;
    if (isSelected(number)) return false;
    if (!maxSelection) return false;
    return selectedList.length >= maxSelection;
  };

  if (!passages.length) {
    return <div style={gridStyles.empty}>{emptyMessage}</div>;
  }

  return (
    <div style={gridStyles.wrapper}>
      {selectionEnabled && selectionLabel && (
        <div style={gridStyles.metaRow}>
          <span>{selectionLabel}</span>
          {selectionEnabled && maxSelection > 0 && (
            <span style={{ fontSize: '13px', color: 'var(--tone-muted)' }}>
              {selectedList.length} / {maxSelection}
            </span>
          )}
        </div>
      )}

      <div style={gridStyles.grid}>
        {passages.map((passage) => {
          const number = passage.passageNumber;
          const checked = isSelected(number);
          const disableSelection = isSelectionDisabled(number);
          return (
            <div
              key={number}
              style={{
                ...gridStyles.card,
                ...(checked ? gridStyles.cardSelected : {}),
                ...(disableSelection ? { opacity: 0.6 } : {})
              }}
              role="button"
              aria-pressed={checked}
              onClick={() => {
                if (!disableSelection && onToggle) onToggle(number);
              }}
            >
              <div style={gridStyles.header}>
                <span style={gridStyles.badge}>#{number.toString().padStart(2, '0')}</span>
                {/* 카드 클릭으로 선택/해제하도록 체크박스는 표시하지 않습니다. */}
              </div>

              <p style={gridStyles.excerpt}>
                {passage.excerpt || '지문 미리보기를 준비하는 중이에요.'}
              </p>

              <div style={gridStyles.footer}>
                <button
                  type="button"
                  onClick={() => onPreview && onPreview(passage)}
                  style={{
                    ...gridStyles.previewButton,
                    ...(onPreview ? {} : gridStyles.previewButtonDisabled)
                  }}
                  disabled={!onPreview}
                >
                  전체 보기
                </button>
                {renderMeta && (() => {
                  const metaNode = renderMeta(passage);
                  if (!metaNode) return null;
                  if (React.isValidElement(metaNode)) {
                    return (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'flex-end' }}>
                        {metaNode}
                      </div>
                    );
                  }
                  return (
                    <div style={{ fontSize: '12px', color: 'var(--text-muted, rgba(255,255,255,0.6))' }}>
                      {metaNode}
                    </div>
                  );
                })()}
              </div>

            </div>
          );
        })}
      </div>
    </div>
  );
};

export default PassagePickerGrid;
