import React from 'react';

const gradientPalette = [
  { from: 'rgba(129, 140, 248, 0.26)', to: 'rgba(96, 165, 250, 0.18)', shadow: 'rgba(99, 102, 241, 0.18)' },
  { from: 'rgba(244, 114, 182, 0.28)', to: 'rgba(251, 191, 36, 0.18)', shadow: 'rgba(244, 114, 182, 0.18)' },
  { from: 'rgba(34, 211, 238, 0.26)', to: 'rgba(16, 185, 129, 0.2)', shadow: 'rgba(56, 189, 248, 0.18)' },
  { from: 'rgba(196, 181, 253, 0.28)', to: 'rgba(244, 114, 182, 0.18)', shadow: 'rgba(167, 139, 250, 0.2)' }
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
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: '22px'
  },
  card: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    padding: '22px',
    borderRadius: '24px',
    border: '1px solid rgba(255,255,255,0.4)',
    background: 'rgba(255,255,255,0.85)',
    minHeight: '220px',
    transition: 'transform 0.25s ease, box-shadow 0.25s ease'
  },
  cardSelected: {
    borderColor: 'rgba(79, 70, 229, 0.55)',
    boxShadow: '0 30px 48px rgba(79, 70, 229, 0.26)',
    transform: 'translateY(-6px)'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '14px',
    gap: '10px'
  },
  badge: {
    fontSize: '0.9rem',
    fontWeight: '700',
    background: 'rgba(79, 70, 229, 0.18)',
    padding: '8px 14px',
    borderRadius: '999px',
    color: '#4338CA',
    boxShadow: '0 12px 24px rgba(79, 70, 229, 0.2)'
  },
  // 체크박스 제거: 카드 클릭으로 선택/해제
  excerpt: {
    flex: 1,
    fontSize: '0.98rem',
    lineHeight: 1.7,
    color: 'rgba(15,23,42,0.72)',
    margin: 0,
    whiteSpace: 'pre-wrap'
  },
  footer: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: '18px',
    gap: '12px'
  },
  previewButton: {
    background: 'rgba(79, 70, 229, 0.18)',
    border: 'none',
    color: '#4338CA',
    borderRadius: '12px',
    padding: '10px 16px',
    cursor: 'pointer',
    fontSize: '0.9rem',
    fontWeight: 700,
    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
    boxShadow: '0 12px 20px rgba(79, 70, 229, 0.18)'
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
          return (
            <div
              key={number}
              style={{
                ...gridStyles.card,
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
