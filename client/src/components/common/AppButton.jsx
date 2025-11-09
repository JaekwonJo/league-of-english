import React from 'react';

/**
 * AppButton
 * variant: 'primary' | 'secondary'
 * size: 'md' | 'lg'
 */
const styles = {
  base: {
    border: 'none',
    borderRadius: '16px',
    fontWeight: 700,
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    transition: 'transform 150ms ease, box-shadow 150ms ease',
  },
  primary: {
    background: 'var(--submit-gradient)',
    color: 'var(--text-on-accent)',
    boxShadow: '0 18px 36px var(--submit-shadow)',
  },
  secondary: {
    background: 'var(--surface-muted)',
    color: 'var(--text-primary)',
    border: '1px solid var(--surface-border)',
  },
  md: { padding: '12px 18px', fontSize: '1rem' },
  lg: { padding: '16px 24px', fontSize: '1.05rem' },
  disabled: { opacity: 0.5, cursor: 'not-allowed' }
};

export default function AppButton({ variant = 'primary', size = 'md', style, className = '', disabled, loading = false, leftIcon = null, rightIcon = null, children, ...rest }) {
  const styleObj = {
    ...styles.base,
    ...(variant === 'primary' ? styles.primary : styles.secondary),
    ...(size === 'lg' ? styles.lg : styles.md),
    ...(disabled ? styles.disabled : {}),
    ...(style || {})
  };
  const cls = `ui-focus-ring ui-pressable ${className}`.trim();
  return (
    <button className={cls} style={styleObj} disabled={disabled || loading} {...rest}>
      {leftIcon}
      {loading && (
        <span style={{
          width: 16,
          height: 16,
          border: '2px solid rgba(255,255,255,0.5)',
          borderTop: '2px solid rgba(255,255,255,0.95)',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }} aria-hidden="true" />
      )}
      {children}
      {rightIcon}
    </button>
  );
}
