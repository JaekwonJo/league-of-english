import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import * as LucideIcons from 'lucide-react';
import routesConfig from '../../config/routes.config.json';
import uiConfig from '../../config/ui.config.json';

const MainLayout = ({ children, currentPath }) => {
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const breakpoint = uiConfig.layout.sidebar.breakpoint || 768;
  const [isMobile, setIsMobile] = useState(() => (typeof window !== 'undefined' ? window.innerWidth < breakpoint : false));
  const sidebarRef = useRef(null);

  useEffect(() => {
    const onResize = () => {
      const mobile = window.innerWidth < breakpoint;
      setIsMobile(mobile);
      if (mobile) toggleSidebar(false);
    };
    window.addEventListener('resize', onResize);
    // initialize
    onResize();
    return () => window.removeEventListener('resize', onResize);
  }, [breakpoint]);

  const getRoleLabel = (role) => {
    const roleMap = {
      student: '학생',
      teacher: '교사',
      admin: '관리자'
    };
    return roleMap[role] || role;
  };

  const toggleSidebar = (nextState) => {
    setSidebarOpen((prev) => (typeof nextState === 'boolean' ? nextState : !prev));
  };

  const handleLogout = () => {
    if (window.confirm('로그아웃 하시겠어요?')) {
      logout();
      window.location.href = '/login';
    }
  };

  const handleGuestUpgrade = () => {
    window.location.href = '/login';
  };

  const handleGuestVocabulary = () => {
    navigate('/vocabulary');
  };

  const navigate = (path) => {
    if (typeof window === 'undefined') return;
    if (window.location.pathname === path) {
      if (isMobile) toggleSidebar(false);
      return;
    }
    window.history.pushState({}, '', path);
    window.dispatchEvent(new PopStateEvent('popstate'));
    if (isMobile) toggleSidebar(false);
  };

  const userRole = user?.role || 'student';
  const userMembership = String(user?.membership || '').toLowerCase();
  const isGuest = userMembership === 'guest';
  const guestLockedRoutes = React.useMemo(() => new Set(['/ranking']), []);
  const visibleRoutes = routesConfig.routes.filter((route) => {
    if (!route.roles || !route.roles.includes(userRole)) return false;
    if (!route.memberships || route.memberships.length === 0) return true;
    if (isGuest) return true;
    if (userRole === 'teacher' || userRole === 'admin') return true;
    const allowed = route.memberships.map((item) => String(item).toLowerCase());
    return allowed.includes(userMembership);
  });

  const basePath = React.useMemo(() => {
    if (!currentPath) return '/';
    if (currentPath === '/' || currentPath === '') return '/';
    const direct = routesConfig.routes.find((route) => route.path === currentPath);
    if (direct) return direct.path;
    const partial = routesConfig.routes.find((route) => route.path !== '/' && currentPath.startsWith(`${route.path}/`));
    if (partial) return partial.path;
    return currentPath.replace(/\/$/, '') || '/';
  }, [currentPath]);

  const guestFeatureName = React.useMemo(() => {
    const labelMap = {
      '/study': '문제 학습',
      '/analysis': '분석 자료',
      '/workbook': '워크북 생성',
      '/stats': '학습 통계',
      '/videos': '동영상 강의',
      '/profile': '프로필 관리',
      '/ranking': '랭킹'
    };
    return labelMap[basePath] || '프리미엄 기능';
  }, [basePath]);

  const guestRouteLocked = isGuest && guestLockedRoutes.has(basePath);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentPath]);

  useEffect(() => {
    if (!isMobile || !sidebarOpen) return;
    const handleOutsideClick = (event) => {
      if (!sidebarRef.current) return;
      if (sidebarRef.current.contains(event.target)) return;
      toggleSidebar(false);
    };

    document.addEventListener('click', handleOutsideClick, true);
    document.addEventListener('touchstart', handleOutsideClick, true);
    return () => {
      document.removeEventListener('click', handleOutsideClick, true);
      document.removeEventListener('touchstart', handleOutsideClick, true);
    };
  }, [isMobile, sidebarOpen]);

  const desktopPadding = 'calc(env(safe-area-inset-top, 0px) + 20px) 20px 28px';
  const mobilePadding = isMobile
    ? sidebarOpen
      ? '28px 16px 32px'
      : '104px 16px 32px'
    : desktopPadding;
  const mainStyle = {
    ...styles.main,
    marginLeft: isMobile ? 0 : (sidebarOpen ? uiConfig.layout.sidebar.width : uiConfig.layout.sidebar.collapsedWidth),
    padding: mobilePadding
  };

  const floatingToggleStyle = React.useMemo(() => ({
    ...styles.mobileFloatingToggle,
    ...(sidebarOpen ? styles.mobileFloatingToggleActive : {}),
    ...(sidebarOpen
      ? { left: `calc(${uiConfig.layout.sidebar.width} + 12px)` }
      : { left: '16px' })
  }), [sidebarOpen]);

  return (
    <div style={styles.container}>
      <aside
        ref={sidebarRef}
        style={{
          ...styles.sidebar,
          ...(isMobile ? { overflow: 'hidden' } : { overflow: 'visible' }),
          ...(isMobile
            ? {
                width: sidebarOpen ? uiConfig.layout.sidebar.width : 0,
                transform: sidebarOpen ? 'translateX(0)' : 'translateX(-100%)',
                pointerEvents: sidebarOpen ? 'auto' : 'none',
                opacity: sidebarOpen ? 1 : 0
              }
            : { width: sidebarOpen ? uiConfig.layout.sidebar.width : uiConfig.layout.sidebar.collapsedWidth }
          ),
          ...(isMobile && sidebarOpen ? styles.sidebarOverlay : {}),
          ...(isMobile && !sidebarOpen ? styles.sidebarCollapsedMobile : {})
        }}
      >
        {(!isMobile || sidebarOpen) && (
          <div
            style={styles.logo}
            onClick={() => {
              if (isMobile && sidebarOpen) toggleSidebar(false);
              navigate('/');
            }}
            role={isMobile ? 'button' : undefined}
            aria-label={isMobile ? '메뉴 닫기' : undefined}
            title={isMobile ? '메뉴 닫기' : undefined}
          >
            <span style={styles.logoIcon}>🦅</span>
            {sidebarOpen && <span style={styles.logoText}>League of English</span>}
          </div>
        )}

        <nav style={styles.nav}>
          {visibleRoutes.map((route) => {
            const Icon = LucideIcons[route.icon] || LucideIcons.Circle;
            const normalizedPath = route.path === '/' ? '/' : `${route.path}`;
            const isActive = currentPath === normalizedPath
              || (normalizedPath !== '/' && currentPath.startsWith(`${normalizedPath}/`));
            const isLockedForGuest = isGuest && guestLockedRoutes.has(route.path);

            return (
              <button
                key={route.path}
                style={{
                  ...styles.navItem,
                  ...(isActive ? styles.navItemActive : {}),
                  ...(isLockedForGuest ? styles.navItemLocked : {})
                }}
                onClick={() => navigate(route.path)}
                title={isLockedForGuest ? '회원가입 후 이용 가능' : route.name}
              >
                <Icon size={20} />
                {sidebarOpen && (
                  <span style={styles.navItemLabel}>
                    {route.name}
                    {isLockedForGuest && <span style={styles.navItemBadge}>체험</span>}
                  </span>
                )}
              </button>
            );
          })}
          <div style={styles.navDivider} />
          <button
            type="button"
            style={{
              ...styles.navItem,
              ...styles.navLogoutItem
            }}
            onClick={handleLogout}
            title="로그아웃"
          >
            <LucideIcons.LogOut size={20} />
            {sidebarOpen && <span style={styles.navLogoutLabel}>로그아웃</span>}
          </button>
        </nav>

        <div style={styles.userSection}>
          <div style={styles.userInfo}>
            <div style={styles.avatar}>{user?.name?.charAt(0)?.toUpperCase()}</div>
            {sidebarOpen && (
              <div>
                <p style={styles.userName}>{user?.name}</p>
                <p style={styles.userRole}>{getRoleLabel(user?.role)}</p>
              </div>
            )}
          </div>
        </div>

        {!isMobile && (
          <button
            style={styles.toggleButton}
            onClick={() => toggleSidebar(!sidebarOpen)}
            aria-label="사이드바 접기/펼치기"
          >
            {sidebarOpen ? <LucideIcons.ChevronLeft /> : <LucideIcons.ChevronRight />}
          </button>
        )}
      </aside>

      {isMobile && sidebarOpen && (
        <button
          type="button"
          aria-label="메뉴 닫기"
          style={{
            ...styles.mobileOverlay,
            // Overlay should not block the sidebar area; start right after sidebar width
            left: uiConfig.layout.sidebar.width,
            zIndex: 900
          }}
          onClick={() => toggleSidebar(false)}
        />
      )}

      <main
        style={mainStyle}
        className="main-content"
        onClick={() => {
          if (isMobile && sidebarOpen) {
            toggleSidebar(false);
          }
        }}
      >
        {isMobile && (
          <button
            type="button"
            style={floatingToggleStyle}
            onClick={(event) => {
              event.stopPropagation();
              toggleSidebar();
            }}
            aria-label={sidebarOpen ? '메뉴 닫기' : '메뉴 열기'}
          >
            {sidebarOpen ? <LucideIcons.X size={18} /> : <LucideIcons.Menu size={18} />}
          </button>
        )}
        {isMobile && !sidebarOpen && (
          <div style={styles.mobileTopBar}>
            <button
              type="button"
              onClick={() => navigate('/')}
              style={{ ...styles.mobileBranding, cursor: 'pointer', background: 'transparent', border: 'none' }}
              aria-label="홈으로"
              title="홈으로"
            >
              <span style={styles.mobileBrandIcon}>🦅</span>
              <span style={styles.mobileTitle}>League of English</span>
            </button>
          </div>
        )}
        {children}
        {guestRouteLocked && (
          <div style={styles.guestOverlay}>
            <div style={styles.guestOverlayCard}>
              <span style={styles.guestOverlayIcon}>🔒</span>
              <h2 style={styles.guestOverlayTitle}>{guestFeatureName}은(는) 회원 전용이에요</h2>
              <p style={styles.guestOverlayDescription}>
                가입하면 분석, 워크북, 통계까지 전부 자동으로 열려요!<br />
                지금 회원가입하고 프리미엄 학습을 바로 시작해 볼까요?
              </p>
              <div style={styles.guestOverlayButtons}>
                <button type="button" style={styles.guestOverlayPrimary} onClick={handleGuestUpgrade}>
                  회원가입하고 이용하기
                </button>
                <button type="button" style={styles.guestOverlaySecondary} onClick={handleGuestVocabulary}>
                  어휘 훈련 계속 체험하기
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

const styles = {
  container: {
    display: 'flex',
    minHeight: '100vh',
    background: 'var(--app-background)'
  },
  sidebar: {
    position: 'fixed',
    top: 0,
    left: 0,
    height: '100vh',
    background: 'var(--sidebar-gradient)',
    color: 'var(--sidebar-text-primary)',
    transition: 'width 0.3s ease, transform 0.3s ease, opacity 0.2s ease',
    display: 'flex',
    flexDirection: 'column',
    zIndex: 1000
  },
  sidebarOverlay: {
    boxShadow: '0 0 0 9999px rgba(2,6,23,0.6)'
  },
  sidebarCollapsedMobile: {
    boxShadow: 'none'
  },
  logo: {
    padding: '20px',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    borderBottom: '1px solid var(--sidebar-divider)',
    cursor: 'pointer',
    transition: 'transform 120ms ease'
  },
  logoIcon: {
    fontSize: '32px'
  },
  logoText: {
    fontSize: '18px',
    fontWeight: 'bold',
    color: 'var(--tone-hero)'
  },
  nav: {
    flex: 1,
    padding: '20px 10px',
    display: 'flex',
    flexDirection: 'column',
    gap: '5px'
  },
  navDivider: {
    height: 1,
    background: 'var(--sidebar-divider)',
    margin: '12px 4px'
  },
  navItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 15px',
    background: 'transparent',
    color: 'var(--sidebar-text-muted)',
    border: 'none',
    borderRadius: '10px',
    cursor: 'pointer',
    transition: 'all 0.3s',
    fontSize: '14px',
    textAlign: 'left',
    width: '100%'
  },
  navItemActive: {
    background: 'var(--sidebar-active-bg)',
    color: 'var(--sidebar-active-text)'
  },
  navItemLocked: {
    opacity: 0.75
  },
  navItemLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontWeight: 600
  },
  navItemBadge: {
    fontSize: '10px',
    letterSpacing: '0.4px',
    padding: '2px 6px',
    borderRadius: '999px',
    background: 'rgba(59,130,246,0.18)',
    color: 'var(--tone-hero)',
    textTransform: 'uppercase'
  },
  navLogoutItem: {
    marginTop: '4px',
    color: '#fda4af',
    border: '1px solid rgba(248,113,113,0.25)',
    background: 'rgba(248,113,113,0.08)'
  },
  navLogoutLabel: {
    fontWeight: 600
  },
  userSection: {
    padding: '20px',
    borderTop: '1px solid var(--sidebar-divider)',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  userInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    marginBottom: '15px'
  },
  avatar: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    background: 'var(--sidebar-avatar-gradient)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '18px',
    fontWeight: 'bold'
  },
  userName: {
    fontSize: '14px',
    fontWeight: 'bold',
    margin: 0
  },
  userRole: {
    fontSize: '12px',
    color: 'var(--sidebar-text-muted)',
    margin: 0
  },
  toggleButton: {
    position: 'absolute',
    right: '-15px',
    top: '50%',
    transform: 'translateY(-50%)',
    width: '30px',
    height: '30px',
    borderRadius: '50%',
    background: 'var(--sidebar-button-bg)',
    border: '1px solid var(--sidebar-divider)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'var(--sidebar-button-text)'
  },
  main: {
    position: 'relative',
    flex: 1,
    transition: 'margin-left 0.3s ease',
    minHeight: '100vh',
    background: 'var(--main-background)',
    color: 'var(--text-primary)',
    overflowY: 'auto',
    WebkitOverflowScrolling: 'touch'
  },
  mobileTopBar: {
    position: 'sticky',
    top: 0,
    zIndex: 980,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '14px 18px',
    marginBottom: '12px',
    background: 'linear-gradient(135deg, rgba(12, 74, 210, 0.18), rgba(79, 70, 229, 0.22))',
    borderRadius: '16px',
    boxShadow: '0 14px 32px rgba(15, 23, 42, 0.22)',
    backdropFilter: 'blur(14px)',
    width: '100%'
  },
  mobileBranding: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    justifyContent: 'center'
  },
  mobileBrandIcon: {
    fontSize: '24px'
  },
  mobileTitle: {
    fontWeight: 800,
    fontSize: '16px',
    background: 'linear-gradient(135deg, var(--accent-primary) 0%, var(--violet) 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    letterSpacing: '0.3px',
    fontFamily: "'Pretendard', 'Noto Sans KR', sans-serif"
  },
  mobileOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(15, 23, 42, 0.45)',
    border: 'none',
    zIndex: 900
  },
  mobileFloatingToggle: {
    position: 'fixed',
    top: 'calc(env(safe-area-inset-top, 0px) + 12px)',
    left: '16px',
    width: 46,
    height: 46,
    borderRadius: 16,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, rgba(59,130,246,0.16) 0%, rgba(99,102,241,0.2) 100%)',
    border: '1px solid rgba(99, 102, 241, 0.45)',
    boxShadow: '0 16px 32px rgba(15, 23, 42, 0.18)',
    color: 'var(--accent-primary)',
    zIndex: 1200,
    cursor: 'pointer',
    transition: 'transform 0.2s ease, box-shadow 0.2s ease, background 0.2s ease'
  },
  mobileFloatingToggleActive: {
    background: 'linear-gradient(135deg, rgba(79,70,229,0.92) 0%, rgba(14,165,233,0.92) 100%)',
    borderColor: 'rgba(191,219,254,0.85)',
    color: '#fff',
    transform: 'scale(0.95)'
  },
  guestOverlay: {
    position: 'absolute',
    inset: 0,
    background: 'linear-gradient(135deg, rgba(15,23,42,0.72) 0%, rgba(30,64,175,0.55) 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '24px',
    textAlign: 'center',
    backdropFilter: 'blur(6px)',
    zIndex: 950
  },
  guestOverlayCard: {
    maxWidth: '520px',
    width: '100%',
    borderRadius: '28px',
    padding: '36px 28px',
    background: 'rgba(255, 255, 255, 0.92)',
    boxShadow: '0 24px 48px rgba(15, 23, 42, 0.3)'
  },
  guestOverlayIcon: {
    fontSize: '42px',
    display: 'block',
    marginBottom: '12px'
  },
  guestOverlayTitle: {
    fontSize: '24px',
    fontWeight: 800,
    margin: '0 0 10px',
    color: 'var(--tone-hero)'
  },
  guestOverlayDescription: {
    margin: '0 0 22px',
    color: 'var(--text-muted)',
    lineHeight: 1.6,
    fontSize: '15px'
  },
  guestOverlayButtons: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  guestOverlayPrimary: {
    padding: '16px 22px',
    borderRadius: '14px',
    border: 'none',
    background: 'linear-gradient(135deg, rgba(37,99,235,0.95) 0%, rgba(79,70,229,0.95) 100%)',
    color: '#fff',
    fontWeight: 700,
    fontSize: '16px',
    cursor: 'pointer',
    boxShadow: '0 18px 40px rgba(37,99,235,0.25)'
  },
  guestOverlaySecondary: {
    padding: '14px 20px',
    borderRadius: '14px',
    border: '1px solid rgba(59,130,246,0.45)',
    background: 'rgba(255,255,255,0.85)',
    color: 'var(--tone-hero)',
    fontWeight: 600,
    fontSize: '15px',
    cursor: 'pointer'
  }
};

export default MainLayout;
