import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import * as LucideIcons from 'lucide-react';
import routesConfig from '../../config/routes.config.json';
import uiConfig from '../../config/ui.config.json';

const MainLayout = ({ children, currentPath }) => {
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { theme } = useTheme();
  const breakpoint = uiConfig.layout.sidebar.breakpoint || 768;
  const [isMobile, setIsMobile] = useState(() => (typeof window !== 'undefined' ? window.innerWidth < breakpoint : false));

  useEffect(() => {
    const onResize = () => {
      const mobile = window.innerWidth < breakpoint;
      setIsMobile(mobile);
      if (mobile) setSidebarOpen(false);
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

  const handleLogout = () => {
    if (window.confirm('로그아웃 하시겠어요?')) {
      logout();
      window.location.href = '/login';
    }
  };

  const navigate = (path) => {
    window.location.href = path;
  };

  const visibleRoutes = routesConfig.routes.filter((route) =>
    route.roles && route.roles.includes(user?.role || 'student')
  );

  return (
    <div style={styles.container}>
      <aside
        style={{
          ...styles.sidebar,
          ...(isMobile
            ? {
                width: sidebarOpen ? uiConfig.layout.sidebar.width : 0,
                transform: sidebarOpen ? 'translateX(0)' : 'translateX(-100%)',
                pointerEvents: sidebarOpen ? 'auto' : 'none'
              }
            : { width: sidebarOpen ? uiConfig.layout.sidebar.width : uiConfig.layout.sidebar.collapsedWidth }
          ),
          ...(isMobile && sidebarOpen ? styles.sidebarOverlay : {}),
          ...(isMobile && !sidebarOpen ? styles.sidebarCollapsedMobile : {})
        }}
      >
        <div style={styles.logo}>
          <span style={styles.logoIcon}>🦉</span>
          {sidebarOpen && <span style={styles.logoText}>League of English</span>}
        </div>

        <nav style={styles.nav}>
          {visibleRoutes.map((route) => {
            const Icon = LucideIcons[route.icon] || LucideIcons.Circle;
            const isActive = currentPath === route.path;

            return (
              <button
                key={route.path}
                style={{
                  ...styles.navItem,
                  ...(isActive ? styles.navItemActive : {})
                }}
                onClick={() => navigate(route.path)}
              >
                <Icon size={20} />
                {sidebarOpen && <span>{route.name}</span>}
              </button>
            );
          })}
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

          {/* Theme toggle removed: dark-only */}

          <button style={styles.logoutButton} onClick={handleLogout}>
            <LucideIcons.LogOut size={20} />
            {sidebarOpen && <span>로그아웃</span>}
          </button>
        </div>

        {!isMobile && (
          <button
            style={styles.toggleButton}
            onClick={() => setSidebarOpen(!sidebarOpen)}
            aria-label="사이드바 접기/펼치기"
          >
            {sidebarOpen ? <LucideIcons.ChevronLeft /> : <LucideIcons.ChevronRight />}
          </button>
        )}
      </aside>

      <main
        style={{
          ...styles.main,
          marginLeft: isMobile ? 0 : (sidebarOpen ? uiConfig.layout.sidebar.width : uiConfig.layout.sidebar.collapsedWidth)
        }}
        className="main-content"
      >
        {isMobile && (
          <div style={styles.mobileTopBar}>
            <button style={styles.mobileMenuBtn} onClick={() => setSidebarOpen(!sidebarOpen)} aria-label="메뉴 열기">
              <LucideIcons.Menu />
            </button>
            <div style={styles.mobileTitle}>League of English</div>
            <button
              style={styles.mobileActionBtn}
              onClick={handleLogout}
              aria-label="로그아웃"
              title="로그아웃"
            >
              <LucideIcons.LogOut size={18} />
            </button>
          </div>
        )}
        {children}
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
    transition: 'width 0.3s ease, transform 0.3s ease',
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
    borderBottom: '1px solid var(--sidebar-divider)'
  },
  logoIcon: {
    fontSize: '32px'
  },
  logoText: {
    fontSize: '18px',
    fontWeight: 'bold'
  },
  nav: {
    flex: 1,
    padding: '20px 10px',
    display: 'flex',
    flexDirection: 'column',
    gap: '5px'
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
  userSection: {
    padding: '20px',
    borderTop: '1px solid var(--sidebar-divider)'
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
  themeToggle: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    width: '100%',
    padding: '10px 15px',
    background: 'var(--sidebar-button-bg)',
    color: 'var(--sidebar-button-text)',
    border: 'none',
    borderRadius: '10px',
    cursor: 'pointer',
    marginBottom: '12px',
    transition: 'opacity 0.2s ease'
  },
  logoutButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    width: '100%',
    padding: '10px 15px',
    background: 'var(--danger-bg)',
    color: 'var(--danger-text)',
    border: 'none',
    borderRadius: '10px',
    cursor: 'pointer',
    transition: 'all 0.3s'
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
    flex: 1,
    transition: 'margin-left 0.3s ease',
    padding: '20px',
    minHeight: '100vh',
    background: 'var(--main-background)',
    color: 'var(--text-primary)'
  },
  mobileTopBar: {
    position: 'sticky',
    top: 0,
    zIndex: 5,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '10px 8px',
    marginBottom: '10px',
    background: 'var(--surface-card)',
    border: '1px solid var(--surface-border)',
    borderRadius: '12px'
  },
  mobileMenuBtn: {
    width: 40,
    height: 36,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    border: '1px solid var(--border-subtle)',
    background: 'var(--surface-soft)'
  },
  mobileTitle: {
    fontWeight: 800,
    color: 'var(--text-primary)'
  },
  mobileActionBtn: {
    width: 40,
    height: 36,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    border: '1px solid var(--border-subtle)',
    background: 'var(--surface-soft)',
    color: 'var(--text-primary)',
    cursor: 'pointer'
  }
};

export default MainLayout;
