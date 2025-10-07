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
    flexWrap: 'wrap'
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
    background: 'var(--card-bg, #1f2430)',
    border: '1px solid var(--card-border, rgba(255,255,255,0.08))',
    borderRadius: '14px',
    padding: '16px',
    minHeight: '200px',
    transition: 'all 0.2s ease',
    boxShadow: '0 10px 18px rgba(0,0,0,0.12)'
  },
  cardSelected: {
    borderColor: 'var(--accent, #6c5ce7)',
    boxShadow: '0 12px 24px rgba(108, 92, 231, 0.2)'
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
    background: 'rgba(255,255,255,0.08)',
    padding: '6px 10px',
    borderRadius: '999px'
  },
  checkbox: {
    appearance: 'none',
    width: '20px',
    height: '20px',
    borderRadius: '6px',
    border: '2px solid var(--accent, #6c5ce7)',
    display: 'grid',
    placeItems: 'center',
    cursor: 'pointer',
    background: 'transparent',
    transition: 'all 0.2s ease'
  },
  checkboxChecked: {
    background: 'var(--accent, #6c5ce7)'
  },
  excerpt: {
    flex: 1,
    fontSize: '14px',
    lineHeight: 1.6,
    color: 'var(--text-muted, rgba(255,255,255,0.74))',
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
    background: 'rgba(108, 92, 231, 0.14)',
    border: 'none',
    color: 'var(--accent, #a29bfe)',
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
    background: 'rgba(255,255,255,0.04)',
    borderRadius: '12px',
    padding: '32px',
    textAlign: 'center',
    color: 'var(--text-muted, rgba(255,255,255,0.7))'
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
  disabledMessage
}) => {
  const isSelected = (number) => selected.includes(number);
  const isSelectionDisabled = (number) => {
    if (isSelected(number)) return false;
    if (!maxSelection) return false;
    return selected.length >= maxSelection;
  };

  if (!passages.length) {
    return <div style={gridStyles.empty}>{emptyMessage}</div>;
  }

  return (
    <div style={gridStyles.wrapper}>
      {selectionLabel && (
        <div style={gridStyles.metaRow}>
          <span>{selectionLabel}</span>
          {maxSelection > 0 && (
            <span style={{ fontSize: '13px', color: 'var(--text-muted, rgba(255,255,255,0.6))' }}>
              {selected.length} / {maxSelection}
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
            >
              <div style={gridStyles.header}>
                <span style={gridStyles.badge}>#{number.toString().padStart(2, '0')}</span>
                <input
                  type="checkbox"
                  checked={checked}
                  disabled={disableSelection}
                  onChange={() => !disableSelection && onToggle && onToggle(number)}
                  style={{
                    ...gridStyles.checkbox,
                    ...(checked ? gridStyles.checkboxChecked : {})
                  }}
                  aria-label={`${number}번 지문 선택`}
                />
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

              {disableSelection && !checked && disabledMessage && (
                <div style={{ fontSize: '12px', color: '#ffb347', marginTop: '10px' }}>
                  {disabledMessage}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default PassagePickerGrid;
