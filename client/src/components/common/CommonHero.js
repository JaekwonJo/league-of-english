import React from 'react';

// 🎄 CHRISTMAS THEME TOGGLE 🎄
// Set to false to revert to original design
const IS_CHRISTMAS = true;

const CommonHero = ({
  badge = '',
  title = '',
  subtitle = '',
  right = null,
  children = null
}) => {
  const isMobile = typeof window !== 'undefined' ? window.innerWidth <= 768 : false;

  const originalStyles = {
    section: {
      position: 'relative',
      borderRadius: '28px',
      padding: '28px',
      display: 'flex',
      alignItems: isMobile ? 'flex-start' : 'center',
      flexDirection: isMobile ? 'column' : 'row',
      gap: isMobile ? '12px' : '16px',
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
      fontSize: isMobile ? '1.6rem' : '2rem',
      fontWeight: 800,
      letterSpacing: '-0.02em',
      background: 'linear-gradient(90deg, #e5e7eb, #e0e7ff)',
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
      lineHeight: 1.25,
      wordBreak: 'break-word',
      overflowWrap: 'anywhere'
    }
  };

  const christmasStyles = {
    section: {
      ...originalStyles.section,
      background: 'linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%)', // Deep Winter Night Blue
      border: '1px solid rgba(255, 255, 255, 0.1)',
      boxShadow: '0 20px 50px rgba(0,0,0,0.5), 0 0 30px rgba(220, 38, 38, 0.2)', // Red glow
      perspective: '1000px',
      transformStyle: 'preserve-3d',
      overflow: 'hidden'
    },
    aura: {
      position: 'absolute',
      inset: 0,
      background: 'radial-gradient(circle at 10% 10%, rgba(220, 38, 38, 0.15), transparent 50%), radial-gradient(circle at 90% 90%, rgba(22, 163, 74, 0.15), transparent 50%)', // Red & Green
      pointerEvents: 'none'
    },
    badge: {
      ...originalStyles.badge,
      background: 'linear-gradient(90deg, #dc2626 0%, #ef4444 100%)', // Holiday Red
      color: '#fff',
      boxShadow: '0 4px 12px rgba(220, 38, 38, 0.4)'
    },
    title: {
      ...originalStyles.title,
      background: 'linear-gradient(to bottom, #fff 40%, #cbd5e1 100%)', // Snow White
      WebkitTextFillColor: 'white',
      textShadow: '0 2px 10px rgba(255,255,255,0.3)'
    },
    snow: {
      position: 'absolute',
      top: '-10px',
      fontSize: '24px',
      animation: 'fall linear infinite',
      opacity: 0.7,
      userSelect: 'none'
    }
  };

  const activeStyles = IS_CHRISTMAS ? christmasStyles : originalStyles;

  const styles = {
    section: activeStyles.section,
    aura: activeStyles.aura,
    left: {
      flex: '1 1 auto',
      display: 'flex',
      flexDirection: 'column',
      gap: '10px',
      zIndex: 2,
      transform: IS_CHRISTMAS ? 'translateZ(20px)' : 'none' // Slight 3D pop
    },
    badge: activeStyles.badge,
    title: activeStyles.title,
    subtitle: {
      margin: 0,
      fontSize: isMobile ? '0.95rem' : '1rem',
      lineHeight: 1.7,
      color: 'rgba(226,232,240,0.9)',
      wordBreak: 'break-word',
      overflowWrap: 'anywhere',
      textShadow: IS_CHRISTMAS ? '0 1px 4px rgba(0,0,0,0.5)' : 'none'
    },
    right: {
      flex: '0 0 auto',
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      zIndex: 2,
      alignSelf: isMobile ? 'flex-start' : 'auto',
      transform: IS_CHRISTMAS ? 'translateZ(20px)' : 'none'
    }
  };

  // Snowflakes for Christmas mode
  const snowflakes = IS_CHRISTMAS ? (
    <>
      <style>{`
        @keyframes fall {
          0% { transform: translateY(-20px) translateX(0px) rotate(0deg); opacity: 0; }
          10% { opacity: 0.8; }
          100% { transform: translateY(300px) translateX(20px) rotate(360deg); opacity: 0; }
        }
      `}</style>
      {Array.from({ length: 8 }).map((_, i) => (
        <div
          key={i}
          style={{
            ...christmasStyles.snow,
            left: `${Math.random() * 90 + 5}%`,
            animationDuration: `${Math.random() * 3 + 4}s`,
            animationDelay: `${Math.random() * 5}s`,
            fontSize: `${Math.random() * 10 + 14}px`
          }}
        >
          ❄️
        </div>
      ))}
    </>
  ) : null;

  return (
    <section style={styles.section}>
      <div style={styles.aura} aria-hidden="true" />
      {snowflakes}
      <div style={styles.left}>
        {badge && <span style={styles.badge}>{badge} {IS_CHRISTMAS && '🎄'}</span>}
        {title && <h2 style={styles.title}>{title}</h2>}
        {subtitle && <p style={styles.subtitle}>{subtitle}</p>}
        {children}
      </div>
      {right && <div style={styles.right}>{right}</div>}
    </section>
  );
};

export default CommonHero;
