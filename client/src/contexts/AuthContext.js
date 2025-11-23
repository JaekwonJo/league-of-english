import React, { createContext, useState, useContext, useEffect } from 'react';
import apiService, { api } from '../services/api.service';

// Auth Context 생성
const AuthContext = createContext();

// Custom Hook
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

// Auth Provider Component
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // 초기 로드시 토큰 검증
  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('token');
      
      if (!token) {
        setLoading(false);
        return;
      }

      // 1. 낙관적 UI 업데이트 (localStorage 데이터 우선 사용)
      const cachedUser = localStorage.getItem('user');
      if (cachedUser) {
        try {
          setUser(JSON.parse(cachedUser));
        } catch (e) { /* ignore */ }
      }

      // 2. 서버 검증
      try {
        const response = await api.auth.me();
        if (response && response.user) {
          setUser(response.user);
          localStorage.setItem('user', JSON.stringify(response.user));
        } else {
          throw new Error('Invalid session');
        }
      } catch (error) {
        console.warn('[Auth] Session expired or invalid:', error);
        apiService.clearToken();
        localStorage.removeItem('user');
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, []);

  // 로그인 함수
  const login = (userData, token) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
  };

  // 로그아웃 함수
  const logout = () => {
    void api.auth.logout().catch((error) => {
      console.warn('[auth] logout request failed:', error?.message || error);
    });
    apiService.clearToken();
    localStorage.removeItem('user');
    setUser(null);
  };

  // 유저 정보 업데이트
  const updateUser = (userData) => {
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
  };

  const value = {
    user,
    loading,
    login,
    logout,
    updateUser,
    isAuthenticated: !!user,
    isAdmin: user?.role === 'admin',
    isTeacher: user?.role === 'teacher',
    isStudent: user?.role === 'student'
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
