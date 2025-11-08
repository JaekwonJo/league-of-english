import React from 'react';

const variantTokens = {
  info: {
    background: 'var(--surface-card)',
    border: '1px solid var(--surface-border)',
    color: 'var(--tone-hero)',
    shadow: '0 12px 24px rgba(15, 23, 42, 0.12)'
  },
  accent: {
    background: 'var(--accent-soft)',
    border: '1px solid rgba(59, 130, 246, 0.45)',
    color: 'var(--indigo-strong)',
    shadow: '0 12px 26px rgba(59, 130, 246, 0.22)'
  },
  warning: {
    background: 'var(--warning-surface)',
    border: '1px solid var(--warning-strong)',
    color: 'var(--warning-strong)',
    shadow: '0 12px 24px rgba(217, 119, 6, 0.18)'
  }
};

const EagleGuideChip = ({ text, variant = 'info', onClick, style, icon = '🦅', ariaLive }) => {
  const token = variantTokens[variant] || variantTokens.info;
  const Component = onClick ? 'button' : 'div';

  return (
    <Component
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '8px',
        padding: '7px 14px',
        borderRadius: '999px',
        background: token.background,
        border: token.border,
        color: token.color,
        fontWeight: 600,
        fontSize: '0.92rem',
        lineHeight: 1.3,
        boxShadow: token.shadow,
        cursor: onClick ? 'pointer' : 'default',
        transition: 'transform 0.2s ease, box-shadow 0.2s ease',
        outline: 'none',
        ...style
      }}
      aria-live={ariaLive}
      onFocus={(event) => {
        event.currentTarget.style.boxShadow = '0 0 0 3px rgba(59,130,246,0.25)';
      }}
      onBlur={(event) => {
        event.currentTarget.style.boxShadow = token.shadow;
      }}
    >
      <span aria-hidden="true" style={{ fontSize: '1.15rem' }}>{icon}</span>
      <span style={{ whiteSpace: 'normal' }}>{text}</span>
    </Component>
  );
};

export default EagleGuideChip;
