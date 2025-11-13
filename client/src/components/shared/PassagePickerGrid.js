import React from 'react';

const gradientPalette = [
  { from: 'rgba(15,23,42,0.95)', to: 'rgba(30,64,175,0.75)', shadow: 'rgba(14,165,233,0.28)' },
  { from: 'rgba(49,46,129,0.95)', to: 'rgba(126,34,206,0.75)', shadow: 'rgba(129,140,248,0.3)' },
  { from: 'rgba(13,44,84,0.95)', to: 'rgba(14,165,233,0.75)', shadow: 'rgba(14,165,233,0.28)' },
  { from: 'rgba(45,55,72,0.95)', to: 'rgba(79,70,229,0.75)', shadow: 'rgba(99,102,241,0.3)' }
];

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
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    padding: '16px',
    borderRadius: '22px',
    border: '1px solid rgba(255,255,255,0.18)',
    minHeight: '150px',
    transition: 'transform 0.25s ease, box-shadow 0.25s ease',
    color: '#f8fafc'
  },
  checkBadge: {
    position: 'absolute',
    top: '10px',
    right: '10px',
    background: 'rgba(16,185,129,0.95)',
    color: '#0b1324',
    borderRadius: '999px',
    padding: '6px 8px',
    fontWeight: 900,
    fontSize: '12px',
    boxShadow: '0 8px 18px rgba(16,185,129,0.35)'
  },
  cardSelected: {
    borderColor: 'rgba(79, 70, 229, 0.55)',
    boxShadow: '0 20px 38px rgba(79, 70, 229, 0.32)',
    transform: 'translateY(-4px)'
  },
  badge: {
    fontSize: '1.2rem',
    fontWeight: 900,
    letterSpacing: '0.04em'
  },
  helper: {
    margin: '8px 0 0',
    fontSize: '0.85rem',
    color: 'rgba(248,250,252,0.82)'
  },
  footer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    marginTop: '16px'
  },
  previewButton: {
    background: 'rgba(255,255,255,0.12)',
    border: '1px solid rgba(255,255,255,0.35)',
    color: '#e0e7ff',
    borderRadius: '999px',
    padding: '10px 16px',
    cursor: 'pointer',
    fontSize: '0.85rem',
    fontWeight: 700,
    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
    boxShadow: '0 12px 20px rgba(15, 23, 42, 0.35)'
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
          const palette = gradientPalette[index % gradientPalette.length];
          const fallbackLabel = `#${number.toString().padStart(2, '0')}`;
          const displayLabel = passage.displayLabel || fallbackLabel;
          return (
            <div
              key={number}
              className="ui-pressable ui-elevate"
              style={{
                ...gridStyles.card,
                position: 'relative',
                background: `linear-gradient(155deg, ${palette.from}, ${palette.to})`,
                boxShadow: checked
                  ? `0 34px 56px ${palette.shadow}`
                  : `0 26px 42px ${palette.shadow}`,
                transform: checked ? 'translateY(-6px)' : 'translateY(0)',
                ...(disableSelection ? { opacity: 0.6 } : {})
              }}
              role="button"
              aria-pressed={checked}
              onClick={() => {
                if (!disableSelection && onToggle) onToggle(number);
              }}
            >
              <div className="tilt-hover" style={{ position: 'absolute', inset: 0, borderRadius: '22px', pointerEvents: 'none' }} aria-hidden />
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
