/**
 * 로깅 유틸리티
 * 개발/프로덕션 환경별 로그 처리
 */

const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3
};

class Logger {
  constructor() {
    this.level = process.env.NODE_ENV === 'production' 
      ? LOG_LEVELS.WARN 
      : LOG_LEVELS.DEBUG;
    
    this.colors = {
      debug: '#9CA3AF',
      info: '#3B82F6',
      warn: '#F59E0B',
      error: '#EF4444'
    };
  }

  formatMessage(level, message, data) {
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${level.toUpperCase()}]`;
    
    if (data) {
      return { prefix, message, data };
    }
    return `${prefix} ${message}`;
  }

  debug(message, data) {
    if (this.level <= LOG_LEVELS.DEBUG) {
      const formatted = this.formatMessage('debug', message, data);
      if (data) {
        console.log(
          `%c${formatted.prefix} ${formatted.message}`,
          `color: ${this.colors.debug}`,
          formatted.data
        );
      } else {
        console.log(`%c${formatted}`, `color: ${this.colors.debug}`);
      }
    }
  }

  info(message, data) {
    if (this.level <= LOG_LEVELS.INFO) {
      const formatted = this.formatMessage('info', message, data);
      if (data) {
        console.info(
          `%c${formatted.prefix} ${formatted.message}`,
          `color: ${this.colors.info}`,
          formatted.data
        );
      } else {
        console.info(`%c${formatted}`, `color: ${this.colors.info}`);
      }
    }
  }

  warn(message, data) {
    if (this.level <= LOG_LEVELS.WARN) {
      const formatted = this.formatMessage('warn', message, data);
      if (data) {
        console.warn(formatted.prefix, formatted.message, formatted.data);
      } else {
        console.warn(formatted);
      }
    }
  }

  error(message, data) {
    if (this.level <= LOG_LEVELS.ERROR) {
      const formatted = this.formatMessage('error', message, data);
      if (data) {
        console.error(formatted.prefix, formatted.message, formatted.data);
      } else {
        console.error(formatted);
      }
      
      // 프로덕션에서는 에러 수집 서비스로 전송
      if (process.env.NODE_ENV === 'production') {
        this.sendToErrorService(message, data);
      }
    }
  }

  sendToErrorService(message, data) {
    // 에러 수집 서비스로 전송 (예: Sentry, LogRocket)
    try {
      // 실제 구현 시 에러 수집 서비스 API 호출
      const errorPayload = {
        message,
        data,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        url: window.location.href
      };
      
      // fetch('/api/logs', { ... })
    } catch (err) {
      // 로깅 실패 시 콘솔에만 출력
      console.error('Failed to send error to service:', err);
    }
  }

  group(label) {
    console.group(label);
  }

  groupEnd() {
    console.groupEnd();
  }

  table(data) {
    console.table(data);
  }

  time(label) {
    console.time(label);
  }

  timeEnd(label) {
    console.timeEnd(label);
  }
}

// 싱글톤 인스턴스
const logger = new Logger();

// 개발 환경에서 전역 접근 가능하게
if (process.env.NODE_ENV === 'development') {
  window.logger = logger;
}

export default logger;