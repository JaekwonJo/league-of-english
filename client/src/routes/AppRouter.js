/**
 * AppRouter - 라우팅 관리
 * 동적 라우트 로딩 및 권한 체크
 */

import React, { lazy } from 'react';
import { useAuth } from '../contexts/AuthContext';
import MainLayout from '../components/layout/MainLayout';
import routesConfig from '../config/routes.config.json';
import logger from '../utils/logger';

// 페이지 컴포넌트 동적 로딩
const pageComponents = {
  HomePage: lazy(() => import('../pages/HomePage')),
  StudyPage: lazy(() => import('../pages/StudyPage')),
  VocabularyPage: lazy(() => import('../pages/VocabularyPage')),
  StatsPage: lazy(() => import('../pages/StatsPage')),
  RankingPage: lazy(() => import('../pages/RankingPage')),
  ProfilePage: lazy(() => import('../pages/ProfilePage')),
  AdminPage: lazy(() => import('../pages/AdminPage')),
  AnalysisPage: lazy(() => import('../pages/AnalysisPage')),
  LoginPage: lazy(() => import('../pages/LoginPage'))
};

const AppRouter = () => {
  const { user, loading } = useAuth();
  const [currentPath, setCurrentPath] = React.useState(window.location.pathname);

  React.useEffect(() => {
    // 라우트 변경 감지
    const handleRouteChange = () => {
      const newPath = window.location.pathname;
      setCurrentPath(newPath);
      logger.debug('Route changed:', newPath);
    };

    window.addEventListener('popstate', handleRouteChange);
    return () => window.removeEventListener('popstate', handleRouteChange);
  }, []);

  // 로딩 중
  if (loading) {
    return <LoadingScreen />;
  }

  // 로그인되지 않은 경우
  if (!user) {
    const LoginPage = pageComponents.LoginPage;
    return <LoginPage />;
  }

  // 현재 라우트 찾기
  const currentRoute = routesConfig.routes.find(
    route => route.path === currentPath
  ) || routesConfig.routes[0];

  // 권한 체크
  if (!hasPermission(user, currentRoute)) {
    return <UnauthorizedScreen />;
  }

  // 컴포넌트 렌더링
  const PageComponent = pageComponents[currentRoute.component];
  
  if (!PageComponent) {
    logger.error('Component not found:', currentRoute.component);
    return <NotFoundScreen />;
  }

  return (
    <MainLayout currentPath={currentPath}>
      <PageComponent />
    </MainLayout>
  );
};

// 권한 체크 함수
const hasPermission = (user, route) => {
  if (!route.requiresAuth) return true;
  if (!user) return false;
  if (!route.roles || route.roles.length === 0) return true;
  return route.roles.includes(user.role);
};

// 로딩 화면
const LoadingScreen = () => (
  <div style={styles.centerContainer}>
    <div style={styles.spinner}></div>
    <p>로딩 중...</p>
  </div>
);

// 권한 없음 화면
const UnauthorizedScreen = () => (
  <div style={styles.centerContainer}>
    <h2>접근 권한이 없습니다</h2>
    <p>이 페이지에 접근할 권한이 없습니다.</p>
    <button 
      onClick={() => window.location.href = '/'}
      style={styles.button}
    >
      홈으로
    </button>
  </div>
);

// 404 화면
const NotFoundScreen = () => (
  <div style={styles.centerContainer}>
    <h2>페이지를 찾을 수 없습니다</h2>
    <p>요청하신 페이지가 존재하지 않습니다.</p>
    <button 
      onClick={() => window.location.href = '/'}
      style={styles.button}
    >
      홈으로
    </button>
  </div>
);

const styles = {
  centerContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    padding: '20px'
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '4px solid #f3f4f6',
    borderTop: '4px solid #667eea',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite'
  },
  button: {
    marginTop: '20px',
    padding: '12px 24px',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    border: 'none',
    borderRadius: '10px',
    fontSize: '16px',
    fontWeight: 'bold',
    cursor: 'pointer'
  }
};

export default AppRouter;