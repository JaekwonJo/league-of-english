import React from 'react';

const CommonHero = ({
  badge = '',
  title = '',
  subtitle = '',
  right = null,
  children = null
}) => {
  const styles = {
    section: {
      position: 'relative',
      borderRadius: '28px',
      padding: '28px',
      display: 'flex',
      alignItems: 'center',
      gap: '16px',
      overflow: 'hidden',
      background: 'linear-gradient(130deg, #0b1220 0%, #111827 50%, #0b1220 100%)',
      color: 'var(--text-on-accent)',
      boxShadow: '0 40px 80px rgba(3,7,18,0.45)'
    },
    aura: {
      position: 'absolute',
      inset: 0,
      background: 'radial-gradient(1200px 400px at -10% -10%, rgba(59,130,246,0.16), transparent 40%), radial-gradient(900px 300px at 110% 120%, rgba(147,51,234,0.14), transparent 40%)',
      pointerEvents: 'none'
    },
    left: {
      flex: '1 1 auto',
      display: 'flex',
      flexDirection: 'column',
      gap: '10px',
      zIndex: 1
    },
    badge: {
      alignSelf: 'flex-start',
      padding: '6px 12px',
      borderRadius: '999px',
      background: 'rgba(255,255,255,0.16)',
      color: '#dbeafe',
      fontWeight: 700,
      letterSpacing: '0.06em',
      fontSize: '0.78rem',
      textTransform: 'uppercase'
    },
    title: {
      margin: 0,
      fontSize: '2rem',
      fontWeight: 800,
      letterSpacing: '-0.02em',
      background: 'linear-gradient(90deg, #e5e7eb, #e0e7ff)',
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent'
    },
    subtitle: {
      margin: 0,
      fontSize: '1rem',
      lineHeight: 1.7,
      color: 'rgba(226,232,240,0.85)'
    },
    right: {
      flex: '0 0 auto',
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      zIndex: 1
    }
  };

  return (
    <section style={styles.section}>
      <div style={styles.aura} aria-hidden="true" />
      <div style={styles.left}>
        {badge && <span style={styles.badge}>{badge}</span>}
        {title && <h2 style={styles.title}>{title}</h2>}
        {subtitle && <p style={styles.subtitle}>{subtitle}</p>}
        {children}
      </div>
      {right && <div style={styles.right}>{right}</div>}
    </section>
  );
};

export default CommonHero;

