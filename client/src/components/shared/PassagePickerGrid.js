import React from 'react';

// Monotone palette: gradients removed for readability

const gridStyles = {
  wrapper: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px'
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
    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
    gap: '16px'
  },
  card: {
    position: 'relative',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    padding: '16px',
    borderRadius: '22px',
    border: '1px solid var(--surface-border)',
    minHeight: '150px',
    transition: 'transform 0.25s ease, box-shadow 0.25s ease',
    color: 'var(--text-primary)',
    background: 'var(--surface-card)'
  },
  checkBadge: {
    position: 'absolute',
    top: '10px',
    right: '10px',
    background: 'rgba(16,185,129,0.18)',
    color: 'var(--color-green-700, #15803d)',
    borderRadius: '999px',
    padding: '6px 8px',
    fontWeight: 900,
    fontSize: '12px',
    boxShadow: 'none'
  },
  cardSelected: {
    borderColor: 'rgba(79, 70, 229, 0.55)',
    boxShadow: '0 20px 38px rgba(79, 70, 229, 0.32)',
    transform: 'translateY(-4px)'
  },
  badge: {
    fontSize: '1.2rem',
    fontWeight: 800,
    letterSpacing: '-0.01em',
    color: 'var(--tone-hero)'
  },
  helper: {
    margin: '8px 0 0',
    fontSize: '0.85rem',
    color: 'var(--tone-strong)'
  },
  footer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    marginTop: '16px'
  },
  previewButton: {
    background: 'var(--surface-soft)',
    border: '1px solid var(--surface-border)',
    color: 'var(--text-primary)',
    borderRadius: '999px',
    padding: '10px 16px',
    cursor: 'pointer',
    fontSize: '0.85rem',
    fontWeight: 700,
    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
    boxShadow: '0 8px 18px rgba(15, 23, 42, 0.12)'
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
        {passages.map((passage, index) => {
          const number = passage.passageNumber;
          const checked = isSelected(number);
          const disableSelection = isSelectionDisabled(number);
          const fallbackLabel = `#${number.toString().padStart(2, '0')}`;
          const displayLabel = passage.displayLabel || fallbackLabel;
          return (
            <div
              key={number}
              className="ui-pressable ui-elevate"
              style={{
                ...gridStyles.card,
                position: 'relative',
                boxShadow: checked
                  ? '0 20px 36px rgba(15,23,42,0.20)'
                  : '0 10px 22px rgba(15,23,42,0.12)',
                transform: checked ? 'translateY(-6px)' : 'translateY(0)',
                ...(disableSelection ? { opacity: 0.6 } : {})
              }}
              role="button"
              aria-pressed={checked}
              onClick={() => {
                if (!disableSelection && onToggle) onToggle(number);
              }}
            >
              {/* subtle only; shimmer/overlay removed for readability */}
              {checked && (
                <span style={gridStyles.checkBadge} aria-label="선택됨">✓ 선택됨</span>
              )}
              <div>
                <span style={gridStyles.badge}>{displayLabel}</span>
                <p style={gridStyles.helper}>지문 전체보기를 눌러 전문을 확인해 보세요.</p>
              </div>

              <div style={gridStyles.footer}>
                <button
                  type="button"
                  onClick={() => onPreview && onPreview(passage)}
                  className="ui-pressable ui-elevate"
                  style={{
                    ...gridStyles.previewButton,
                    ...(onPreview ? {} : gridStyles.previewButtonDisabled)
                  }}
                  disabled={!onPreview}
                >
                  지문 전체보기
                </button>
                {renderMeta && (() => {
                  const metaNode = renderMeta(passage);
                  if (!metaNode) return null;
                  if (React.isValidElement(metaNode)) {
                    return (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', width: '100%' }}>
                        {metaNode}
                      </div>
                    );
                  }
                  return (
                    <div style={{ fontSize: '12px', color: 'rgba(248,250,252,0.8)' }}>
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
