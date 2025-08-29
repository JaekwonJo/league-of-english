/**
 * API 서비스 레이어
 * 모든 API 호출을 중앙화
 */

import appConfig from '../config/appConfig.json';

class ApiService {
  constructor() {
    this.baseURL = process.env.REACT_APP_API_URL || appConfig.app.apiUrl;
    this.token = null;
    console.log('API URL:', this.baseURL); // 디버깅용
  }

  /**
   * 토큰 설정
   */
  setToken(token) {
    this.token = token;
    localStorage.setItem('token', token);
  }

  /**
   * 토큰 가져오기
   */
  getToken() {
    if (!this.token) {
      this.token = localStorage.getItem('token');
    }
    return this.token;
  }

  /**
   * 헤더 생성
   */
  getHeaders(contentType = 'application/json') {
    const headers = {
      'Content-Type': contentType
    };

    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    return headers;
  }

  /**
   * 에러 처리
   */
  handleError(error, context = '') {
    console.error(`API Error [${context}]:`, error);
    
    if (error.response) {
      // 서버 응답 에러
      const message = error.response.data?.message || '서버 오류가 발생했습니다.';
      throw new Error(message);
    } else if (error.request) {
      // 네트워크 에러
      throw new Error('서버와 연결할 수 없습니다.');
    } else {
      // 기타 에러
      throw new Error(error.message || '알 수 없는 오류가 발생했습니다.');
    }
  }

  /**
   * GET 요청
   */
  async get(endpoint, params = {}) {
    try {
      const queryString = new URLSearchParams(params).toString();
      const url = `${this.baseURL}${endpoint}${queryString ? '?' + queryString : ''}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: this.getHeaders()
      });

      if (!response.ok) {
        throw response;
      }

      return await response.json();
    } catch (error) {
      this.handleError(error, `GET ${endpoint}`);
    }
  }

  /**
   * POST 요청
   */
  async post(endpoint, data = {}) {
    try {
      const response = await fetch(`${this.baseURL}${endpoint}`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || '요청 처리 실패');
      }

      return await response.json();
    } catch (error) {
      this.handleError(error, `POST ${endpoint}`);
    }
  }

  /**
   * PUT 요청
   */
  async put(endpoint, data = {}) {
    try {
      const response = await fetch(`${this.baseURL}${endpoint}`, {
        method: 'PUT',
        headers: this.getHeaders(),
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        throw response;
      }

      return await response.json();
    } catch (error) {
      this.handleError(error, `PUT ${endpoint}`);
    }
  }

  /**
   * DELETE 요청
   */
  async delete(endpoint) {
    try {
      const response = await fetch(`${this.baseURL}${endpoint}`, {
        method: 'DELETE',
        headers: this.getHeaders()
      });

      if (!response.ok) {
        throw response;
      }

      return await response.json();
    } catch (error) {
      this.handleError(error, `DELETE ${endpoint}`);
    }
  }

  /**
   * 파일 업로드
   */
  async uploadFile(endpoint, file, additionalData = {}) {
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      Object.keys(additionalData).forEach(key => {
        formData.append(key, additionalData[key]);
      });

      const response = await fetch(`${this.baseURL}${endpoint}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.getToken()}`
        },
        body: formData
      });

      if (!response.ok) {
        throw response;
      }

      return await response.json();
    } catch (error) {
      this.handleError(error, `UPLOAD ${endpoint}`);
    }
  }
}

// 싱글톤 인스턴스
const apiService = new ApiService();

// API 메서드 래퍼
export const api = {
  // 인증
  auth: {
    login: (credentials) => apiService.post('/login', credentials),
    register: (userData) => apiService.post('/register', userData),
    logout: () => apiService.post('/logout'),
    refresh: () => apiService.post('/refresh')
  },

  // 문서
  documents: {
    list: (params) => apiService.get('/documents', params),
    get: (id) => apiService.get(`/documents/${id}`),
    upload: (file, data) => apiService.uploadFile('/upload-document', file, data),
    delete: (id) => apiService.delete(`/documents/${id}`)
  },

  // 문제
  problems: {
    getSmartProblems: (data) => apiService.post('/get-smart-problems', data),
    submit: (data) => apiService.post('/problems/submit', data),
    history: (params) => apiService.get('/problems/history', params),
    stats: () => apiService.get('/problems/stats')
  },

  // 사용자
  users: {
    profile: () => apiService.get('/users/profile'),
    updateProfile: (data) => apiService.put('/users/profile', data),
    changePassword: (data) => apiService.post('/users/change-password', data)
  },

  // 랭킹
  ranking: {
    global: (params) => apiService.get('/ranking/global', params),
    school: (params) => apiService.get('/ranking/school', params)
  }
};

export default apiService;