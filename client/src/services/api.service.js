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

  // 내부: fetch 타임아웃 지원 (기본 60초)
  async _fetchWithTimeout(url, options = {}, timeoutMs = 60000, context = '') {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), Math.max(1000, timeoutMs));
    try {
      const response = await fetch(url, { ...options, signal: controller.signal });
      return response;
    } catch (error) {
      if (error?.name === 'AbortError') {
        throw new Error('요청이 오래 걸려 중단되었어요. 잠시 후 다시 시도해 주세요.');
      }
      throw error;
    } finally {
      clearTimeout(id);
    }
  }

  /**
   * 토큰 설정
   */
  setToken(token) {
    this.token = token;
    localStorage.setItem('token', token);
  }

  clearToken() {
    this.token = null;
    try {
      localStorage.removeItem('token');
    } catch (error) {
      console.warn('[api] clearToken error:', error?.message || error);
    }
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
  async handleError(error, context = '') {
    console.error(`API Error [${context}]:`, error);
    
    if (error instanceof Response) {
      // fetch API Response 객체
      try {
        const errorData = await error.json();
        throw new Error(errorData.message || `서버 오류 (${error.status})`);
      } catch (jsonError) {
        try {
          const text = await error.text();
          if (text) {
            throw new Error(text);
          }
        } catch (textError) {
          /* ignore */
        }
        throw new Error(`서버 오류 (${error.status}): ${error.statusText || '요청을 처리하지 못했습니다.'}`);
      }
    } else if (error.name === 'TypeError' && error.message.includes('fetch')) {
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
      const headers = this.getHeaders();
      // Allow longer timeouts for analysis endpoints
      let timeoutMs = 15000;
      if (/^\/analysis\//.test(endpoint) || endpoint === '/analysis/list' || /^\/analysis\/status\//.test(endpoint)) {
        timeoutMs = 600000;
      } else if (/^\/mock-exam(\b|\/)/.test(endpoint)) {
        timeoutMs = Math.max(timeoutMs, 30000);
      }
      
      console.log('🔍 API GET Request:', {
        url,
        headers,
        token: this.getToken() ? 'EXISTS' : 'MISSING'
      });
      
      const response = await this._fetchWithTimeout(url, {
        method: 'GET',
        headers: headers
      }, timeoutMs, `GET ${endpoint}`);

      if (!response.ok) {
        throw response;
      }

      return await response.json();
    } catch (error) {
      await this.handleError(error, `GET ${endpoint}`);
    }
  }

  /**
   * GET (text 응답)
   */
  async getText(endpoint, params = {}) {
    try {
      const queryString = new URLSearchParams(params).toString();
      const url = `${this.baseURL}${endpoint}${queryString ? '?' + queryString : ''}`;
      const headers = this.getHeaders();

      const response = await this._fetchWithTimeout(url, {
        method: 'GET',
        headers
      }, 15000, `GET_TEXT ${endpoint}`);

      if (!response.ok) {
        throw response;
      }

      return await response.text();
    } catch (error) {
      await this.handleError(error, `GET_TEXT ${endpoint}`);
    }
  }

  /**
   * POST 요청
   */
  async post(endpoint, data = {}, customTimeoutMs = null) {
    try {
      // Long-running endpoints need longer timeouts
      let timeoutMs = customTimeoutMs || 20000;
      if (!customTimeoutMs) {
        if (/\/generate\/csat-set$/.test(endpoint)) timeoutMs = 60000;
        if (/\/analysis\//.test(endpoint)) timeoutMs = Math.max(timeoutMs, 600000);
        if (endpoint === '/workbooks/generate-all') timeoutMs = Math.max(timeoutMs, 600000);
        if (/\/vocabulary\/sets\/.+\/quiz$/.test(endpoint)) timeoutMs = Math.max(timeoutMs, 30000);
        if (/\/problems\/export\/pdf$/.test(endpoint)) timeoutMs = Math.max(timeoutMs, 60000);
        if (/^\/mock-exam\/.+\/(submit|explanations)$/.test(endpoint)) timeoutMs = Math.max(timeoutMs, 60000);
      }

      const response = await this._fetchWithTimeout(`${this.baseURL}${endpoint}`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(data)
      }, timeoutMs, `POST ${endpoint}`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || '요청 처리 실패');
      }

      return await response.json();
    } catch (error) {
      await this.handleError(error, `POST ${endpoint}`);
    }
  }

  async postForBlob(endpoint, data = {}) {
    try {
      const response = await this._fetchWithTimeout(`${this.baseURL}${endpoint}`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(data)
      }, 30000, `POST_BLOB ${endpoint}`);

      if (!response.ok) {
        let errorMessage = '요청 처리 실패';
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorMessage;
        } catch (parseError) {
          /* ignore parse error */
        }
        throw new Error(errorMessage);
      }

      return await response.blob();
    } catch (error) {
      await this.handleError(error, `POST_BLOB ${endpoint}`);
    }
  }

  /**
   * PUT 요청
   */
  async put(endpoint, data = {}) {
    try {
      const response = await this._fetchWithTimeout(`${this.baseURL}${endpoint}`, {
        method: 'PUT',
        headers: this.getHeaders(),
        body: JSON.stringify(data)
      }, 20000, `PUT ${endpoint}`);

      if (!response.ok) {
        throw response;
      }

      return await response.json();
    } catch (error) {
      await this.handleError(error, `PUT ${endpoint}`);
    }
  }

  async patch(endpoint, data = {}) {
    try {
      const response = await this._fetchWithTimeout(`${this.baseURL}${endpoint}`, {
        method: 'PATCH',
        headers: this.getHeaders(),
        body: JSON.stringify(data)
      }, 20000, `PATCH ${endpoint}`);

      if (!response.ok) {
        throw response;
      }

      return await response.json();
    } catch (error) {
      await this.handleError(error, `PATCH ${endpoint}`);
    }
  }

  /**
   * DELETE 요청
   */
  async delete(endpoint, data) {
    try {
      const response = await this._fetchWithTimeout(`${this.baseURL}${endpoint}`, {
        method: 'DELETE',
        headers: this.getHeaders(),
        ...(data !== undefined ? { body: JSON.stringify(data) } : {})
      }, 15000, `DELETE ${endpoint}`);

      if (!response.ok) {
        throw response;
      }

      return await response.json();
    } catch (error) {
      await this.handleError(error, `DELETE ${endpoint}`);
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

      const response = await this._fetchWithTimeout(`${this.baseURL}${endpoint}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.getToken()}`
        },
        body: formData
      }, 60000, `UPLOAD ${endpoint}`);

      if (!response.ok) {
        throw response;
      }

      return await response.json();
    } catch (error) {
      await this.handleError(error, `UPLOAD ${endpoint}`);
    }
  }

  async uploadFormData(endpoint, formData, timeoutMs = 60000) {
    try {
      const headers = this.getHeaders();
      delete headers['Content-Type'];

      const response = await this._fetchWithTimeout(`${this.baseURL}${endpoint}`, {
        method: 'POST',
        headers,
        body: formData
      }, timeoutMs, `UPLOAD_FORM ${endpoint}`);

      if (!response.ok) {
        throw response;
      }

      return await response.json();
    } catch (error) {
      await this.handleError(error, `UPLOAD_FORM ${endpoint}`);
    }
  }
}

// 싱글톤 인스턴스
const apiService = new ApiService();

// API 메서드 래퍼
export const api = {
  // 인증
  auth: {
    login: (credentials) => apiService.post('/auth/login', credentials),
    register: (userData) => apiService.post('/auth/register', userData),
    guestLogin: () => apiService.post('/auth/guest-login'),
    me: () => apiService.get('/auth/me'),
    findId: (email) => apiService.post('/auth/find-id', { email }),
    sendCode: (email) => apiService.post('/auth/send-code', { email }),
    forgotPassword: (email) => apiService.post('/auth/forgot-password', { email }),
    resetPassword: (payload) => apiService.post('/auth/reset-password', payload),
    logout: () => apiService.post('/auth/logout'),
    refresh: () => apiService.post('/auth/refresh')
  },

  // 문서
  documents: {
    list: (params) => apiService.get('/documents', params),
    get: async (id) => {
      const res = await apiService.get(`/documents/${id}`);
      // 서버가 { success, data } 형태로 줄 수도 있어 통합 처리
      return res?.data || res;
    },
    upload: (file, data) => apiService.uploadFile('/upload-document', file, data),
    update: (id, payload) => apiService.put(`/documents/${id}`, payload),
    delete: (id) => apiService.delete(`/documents/${id}`),
    getShares: (id) => apiService.get(`/documents/${id}/shares`),
    updateShares: (id, payload) => apiService.post(`/documents/${id}/share`, payload)
  },

  admin: {
    problemFeedback: {
      list: (params) => apiService.get('/admin/problem-feedback', params),
      update: (id, payload) => apiService.patch(`/admin/problem-feedback/${id}`, payload)
    },
    notifications: {
      list: (params) => apiService.get('/admin/notifications', params),
      update: (id, payload) => apiService.patch(`/admin/notifications/${id}`, payload)
    },
    problems: {
      deactivate: (id, payload) => apiService.post(`/admin/problems/${id}/deactivate`, payload),
      restore: (id, payload) => apiService.post(`/admin/problems/${id}/restore`, payload)
    },
    documents: {
      uploadExam: (documentId, formData) => apiService.uploadFormData(`/admin/documents/${documentId}/exam-upload`, formData, 300000),
      uploadExamText: (documentId, payload) => apiService.post(`/admin/documents/${documentId}/exam-text`, payload, 300000),
      deleteExam: (documentId) => apiService.delete(`/admin/documents/${documentId}/exam-problems`)
    },
    users: {
      list: (params) => apiService.get('/admin/users', params),
      suspend: (id) => apiService.post(`/admin/users/${id}/suspend`),
      restore: (id) => apiService.post(`/admin/users/${id}/restore`),
      remove: (id) => apiService.delete(`/admin/users/${id}`)
    },
    membership: {
      grant: (payload) => apiService.post('/membership/admin/grant', payload),
      requests: () => apiService.get('/membership/admin/requests'),
      resolve: (id, payload) => apiService.post(`/membership/admin/requests/${id}/resolve`, payload),
      coupons: {
        create: (payload) => apiService.post('/membership/admin/coupons', payload)
      }
    }
  },

  vocabulary: {
    list: () => apiService.get('/vocabulary/sets'),
    detail: (id) => apiService.get(`/vocabulary/sets/${id}`),
    generateQuiz: (id, payload) => apiService.post(`/vocabulary/sets/${id}/quiz`, payload),
    submitQuiz: (id, payload) => apiService.post(`/vocabulary/sets/${id}/quiz/submit`, payload)
  },

  study: {
    session: {
      get: () => apiService.get('/study/session'),
      save: (payload) => apiService.post('/study/session', payload),
      clear: (payload) => apiService.delete('/study/session', payload)
    }
  },

  // 문제
  problems: {
    getSmartProblems: (data) => apiService.post('/get-smart-problems', data),
    submit: (data) => apiService.post('/problems/submit', data),
    history: (params) => apiService.get('/problems/history', params),
    stats: () => apiService.get('/problems/stats'),
    exportPdf: (data) => apiService.postForBlob('/problems/export/pdf', data),
    library: (params) => apiService.get('/problems/library', params),
    reviewQueue: (params) => apiService.get('/problems/review-queue', params),
    startReviewSession: (data) => apiService.post('/problems/review-session', data),
    saveNote: (problemId, data) => apiService.put(`/problems/${problemId}/note`, data),
    exportHistory: (params) => apiService.get('/problems/export/history', params),
    feedback: {
      summary: (problemId) => apiService.get(`/problems/${problemId}/feedback/summary`),
      submit: (problemId, payload) => apiService.post(`/problems/${problemId}/feedback`, payload)
    }
  },

  // 사용자
  users: {
    profile: () => apiService.get('/users/profile'),
    updateProfile: (data) => apiService.put('/users/profile', data),
    changePassword: (data) => apiService.post('/users/change-password', data)
  },

  // 랭킹
  ranking: {
    leaderboard: (params) => apiService.get('/ranking/leaderboard', params),
    myRank: () => apiService.get('/ranking/my-rank'),
    tierDistribution: () => apiService.get('/ranking/tier-distribution')
  },

  // 선생님
  teacher: {
    codes: () => apiService.get('/teacher/codes'),
    generateCode: () => apiService.post('/teacher/codes'),
    deactivateCode: (code) => apiService.post('/teacher/codes/' + code + '/deactivate'),
    students: () => apiService.get('/teacher/students'),
    join: (code) => apiService.post('/teacher/join', { code }),
    analyticsOverview: (params) => apiService.get('/teacher/analytics/overview', params),
    analyticsStudent: (studentId, params) => apiService.get(`/teacher/analytics/students/${studentId}`, params),
    analyticsExport: (params) => apiService.getText('/teacher/analytics/export', params)
  },

  // 멤버십
  membership: {
    status: () => apiService.get('/membership/status'),
    redeem: (code) => apiService.post('/membership/redeem', { code }),
    request: (plan, message) => apiService.post('/membership/request', { plan, message })
  },

  mockExam: {
    list: () => apiService.get('/mock-exam'),
    getExam: (examId) => apiService.get(`/mock-exam/${examId}`),
    submit: (examId, payload) => apiService.post(`/mock-exam/${examId}/submit`, payload),
    explanation: (examId, payload) => apiService.post(`/mock-exam/${examId}/explanations`, payload),
    upload: (formData) => apiService.uploadFormData('/mock-exam/upload', formData, 60000),
    rename: (oldId, newId) => apiService.post('/mock-exam/rename', { oldId, newId }),
    delete: (examId) => apiService.delete(`/mock-exam/${examId}`)
  },

  video: {
    listPlaylists: () => apiService.get('/video/playlists'),
    createPlaylist: (payload) => apiService.post('/video/playlists', payload),
    updatePlaylist: (id, payload) => apiService.put(`/video/playlists/${id}`, payload),
    deletePlaylist: (id) => apiService.delete(`/video/playlists/${id}`)
  },

  // 문서 분석
  analysis: {
    list: () => apiService.get('/analysis/list'),
    get: (documentId) => apiService.get(`/analysis/${documentId}`),
    getPassage: (documentId, passageNumber) => apiService.get(`/analysis/${documentId}/passage/${passageNumber}`),
    // 지문 목록(원문 + 분석 여부 요약)
    listPassageSummaries: async (documentId) => {
      const res = await apiService.get(`/analysis/${documentId}/passage-list`);
      // 서버는 { success, total, data: [...] } 형태로 응답
      if (Array.isArray(res)) return res;
      if (Array.isArray(res?.data)) return res.data;
      return [];
    },
    generate: (documentId, passageNumber, count = 1) => apiService.post(`/analysis/${documentId}/analyze-passage`, { passageNumber, count }),
    generateBatch: (documentId, passageNumbers = []) => apiService.post(`/analysis/${documentId}/analyze-passages`, { passageNumbers }),
    updatePassageLabel: (documentId, passageNumber, label) =>
      apiService.put(`/analysis/${documentId}/passage/${passageNumber}/label`, { label }),
    deleteVariants: (documentId, passageNumber, variantIndexes = []) => apiService.post(
      `/analysis/${documentId}/passage/${passageNumber}/delete-variants`,
      { variantIndexes }
    ),
    status: (documentId) => apiService.get(`/analysis/status/${documentId}`),
    delete: (documentId) => apiService.delete(`/analysis/${documentId}`),
    feedback: {
      submit: (documentId, passageNumber, payload) => apiService.post(`/analysis/${documentId}/passage/${passageNumber}/feedback`, payload),
      pending: () => apiService.get('/analysis/feedback/pending'),
      resolve: (feedbackId, status) => apiService.put(`/analysis/feedback/${feedbackId}`, { status })
    }
  },

  workbooks: {
    list: (params) => apiService.get('/workbooks', params),
    detail: (id) => apiService.get(`/workbooks/${id}`),
    generate: (payload) => apiService.post('/workbooks/generate', payload),
    generateAll: (payload) => apiService.post('/workbooks/generate-all', payload),
    delete: (id) => apiService.delete(`/workbooks/${id}`),
    test: (id) => apiService.get(`/workbooks/${id}/test`),
    submitTest: (id, payload) => apiService.post(`/workbooks/${id}/test/submit`, payload)
  }
};

// Legacy compatibility for older bundles that call api.post(...) directly
['get', 'post', 'postForBlob', 'put', 'patch', 'delete', 'uploadFile'].forEach((method) => {
  if (typeof apiService[method] === 'function') {
    api[method] = (...args) => apiService[method](...args);
  }
});

export default apiService;
