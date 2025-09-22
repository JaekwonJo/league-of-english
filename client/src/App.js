/**
 * League of English - 메인 App
 * 리팩토링 v2.0 - 모듈러 아키텍처
 */

import React, { Suspense } from 'react';
import { AuthProvider } from './contexts/AuthContext';
import ErrorBoundary from './middleware/errorBoundary';
import AppRouter from './routes/AppRouter';
import logger from './utils/logger';
import './App.css';

// 환경 설정 확인
const checkEnvironment = () => {
  logger.info('🚀 League of English Starting...');
  logger.info('Environment:', process.env.NODE_ENV);
  logger.info('API URL:', process.env.REACT_APP_API_URL || 'http://localhost:5000/api');
  
  // 필수 환경변수 체크
  const required = ['REACT_APP_API_URL'];
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0 && process.env.NODE_ENV === 'production') {
    logger.warn('Missing environment variables:', missing);
  }
};

// 앱 초기화
checkEnvironment();

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <Suspense fallback={<LoadingScreen />}>
          <AppRouter />
        </Suspense>
      </AuthProvider>
    </ErrorBoundary>
  );
}

// 로딩 화면 컴포넌트
const LoadingScreen = () => (
  <div style={styles.loadingContainer}>
    <div style={styles.spinner}></div>
    <h2 style={styles.loadingText}>League of English</h2>
    <p style={styles.loadingSubtext}>로딩 중...</p>
  </div>
);

const styles = {
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
  },
  spinner: {
    width: '60px',
    height: '60px',
    border: '6px solid rgba(255, 255, 255, 0.3)',
    borderTop: '6px solid white',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite'
  },
  loadingText: {
    color: 'white',
    fontSize: '32px',
    marginTop: '30px',
    marginBottom: '10px'
  },
  loadingSubtext: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: '16px'
  }
};

export default App;