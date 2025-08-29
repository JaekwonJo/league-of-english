/**
 * 에러 바운더리 컴포넌트
 * React 에러를 캐치하고 처리
 */

import React from 'react';
import logger from '../utils/logger';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error) {
    // 다음 렌더링에서 에러 UI를 표시
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // 에러 로깅
    logger.error('React Error Boundary:', {
      error: error.toString(),
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString()
    });

    this.setState({
      error,
      errorInfo
    });

    // 프로덕션에서는 에러 리포팅 서비스로 전송
    if (process.env.NODE_ENV === 'production') {
      this.reportError(error, errorInfo);
    }
  }

  reportError(error, errorInfo) {
    // 에러 리포팅 서비스로 전송 (예: Sentry)
    const errorReport = {
      message: error.toString(),
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString(),
      url: window.location.href
    };

    // API로 에러 리포트 전송
    fetch('/api/errors/report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(errorReport)
    }).catch(err => {
      console.error('Failed to report error:', err);
    });
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={styles.container}>
          <div style={styles.errorBox}>
            <h1 style={styles.title}>😢 문제가 발생했습니다</h1>
            <p style={styles.message}>
              예상치 못한 오류가 발생했습니다. 
              불편을 드려 죄송합니다.
            </p>
            
            {process.env.NODE_ENV === 'development' && (
              <details style={styles.details}>
                <summary style={styles.summary}>에러 상세 정보</summary>
                <pre style={styles.errorText}>
                  {this.state.error && this.state.error.toString()}
                  {this.state.errorInfo && this.state.errorInfo.componentStack}
                </pre>
              </details>
            )}

            <div style={styles.actions}>
              <button onClick={this.handleReset} style={styles.button}>
                새로고침
              </button>
              <button 
                onClick={() => window.location.href = '/'} 
                style={styles.buttonSecondary}
              >
                홈으로
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

const styles = {
  container: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    padding: '20px'
  },
  errorBox: {
    background: 'white',
    borderRadius: '20px',
    padding: '40px',
    maxWidth: '600px',
    width: '100%',
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)'
  },
  title: {
    fontSize: '28px',
    color: '#111827',
    marginBottom: '20px',
    textAlign: 'center'
  },
  message: {
    fontSize: '16px',
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: '30px'
  },
  details: {
    marginBottom: '30px',
    padding: '20px',
    background: '#F3F4F6',
    borderRadius: '10px'
  },
  summary: {
    cursor: 'pointer',
    fontWeight: 'bold',
    marginBottom: '10px'
  },
  errorText: {
    fontSize: '12px',
    color: '#EF4444',
    overflow: 'auto',
    maxHeight: '200px'
  },
  actions: {
    display: 'flex',
    gap: '10px',
    justifyContent: 'center'
  },
  button: {
    padding: '12px 24px',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    border: 'none',
    borderRadius: '10px',
    fontSize: '16px',
    fontWeight: 'bold',
    cursor: 'pointer'
  },
  buttonSecondary: {
    padding: '12px 24px',
    background: '#F3F4F6',
    color: '#111827',
    border: 'none',
    borderRadius: '10px',
    fontSize: '16px',
    fontWeight: 'bold',
    cursor: 'pointer'
  }
};

export default ErrorBoundary;