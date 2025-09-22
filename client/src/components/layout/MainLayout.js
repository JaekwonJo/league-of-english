import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import * as LucideIcons from 'lucide-react';
import routesConfig from '../../config/routes.config.json';
import uiConfig from '../../config/ui.config.json';

const MainLayout = ({ children, currentPath }) => {
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(true);

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
          width: sidebarOpen ? uiConfig.layout.sidebar.width : uiConfig.layout.sidebar.collapsedWidth
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

          <button style={styles.logoutButton} onClick={handleLogout}>
            <LucideIcons.LogOut size={20} />
            {sidebarOpen && <span>로그아웃</span>}
          </button>
        </div>

        <button
          style={styles.toggleButton}
          onClick={() => setSidebarOpen(!sidebarOpen)}
          aria-label="사이드바 접기/펼치기"
        >
          {sidebarOpen ? <LucideIcons.ChevronLeft /> : <LucideIcons.ChevronRight />}
        </button>
      </aside>

      <main
        style={{
          ...styles.main,
          marginLeft: sidebarOpen ? uiConfig.layout.sidebar.width : uiConfig.layout.sidebar.collapsedWidth
        }}
      >
        {children}
      </main>
    </div>
  );
};

const styles = {
  container: {
    display: 'flex',
    minHeight: '100vh',
    background: '#F9FAFB'
  },
  sidebar: {
    position: 'fixed',
    top: 0,
    left: 0,
    height: '100vh',
    background: 'linear-gradient(135deg, #1F2937 0%, #111827 100%)',
    color: 'white',
    transition: 'width 0.3s ease',
    display: 'flex',
    flexDirection: 'column',
    zIndex: 1000
  },
  logo: {
    padding: '20px',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
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
    color: 'rgba(255, 255, 255, 0.8)',
    border: 'none',
    borderRadius: '10px',
    cursor: 'pointer',
    transition: 'all 0.3s',
    fontSize: '14px',
    textAlign: 'left',
    width: '100%'
  },
  navItemActive: {
    background: 'rgba(255, 255, 255, 0.1)',
    color: 'white'
  },
  userSection: {
    padding: '20px',
    borderTop: '1px solid rgba(255, 255, 255, 0.1)'
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
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
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
    color: 'rgba(255, 255, 255, 0.6)',
    margin: 0
  },
  logoutButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    width: '100%',
    padding: '10px 15px',
    background: 'rgba(239, 68, 68, 0.1)',
    color: '#EF4444',
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
    background: 'white',
    border: '1px solid #E5E7EB',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#6B7280'
  },
  main: {
    flex: 1,
    transition: 'margin-left 0.3s ease',
    padding: '20px',
    minHeight: '100vh'
  }
};

export default MainLayout;
