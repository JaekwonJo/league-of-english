import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import appConfig from '../config/appConfig.json';

const LoginPage = () => {
  const { login } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    email: '',
    name: '',
    school: '',
    grade: '1',
    role: 'student'
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const endpoint = isLogin ? '/login' : '/register';
    const payload = isLogin 
      ? { username: formData.username, password: formData.password }
      : formData;

    try {
      const response = await fetch(`${appConfig.app.apiUrl}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (response.ok) {
        if (isLogin) {
          login(data.user, data.token);
        } else {
          setIsLogin(true);
          setFormData({ ...formData, username: '', password: '' });
          alert('회원가입이 완료되었습니다. 로그인해주세요.');
        }
      } else {
        setError(data.message || '오류가 발생했습니다.');
      }
    } catch (err) {
      setError('서버 연결에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  return (
    <div style={styles.container}>
      <div style={styles.loginBox}>
        <div style={styles.logo}>
          <span style={styles.logoIcon}>🎮</span>
          <h1 style={styles.title}>{appConfig.app.name}</h1>
          <p style={styles.subtitle}>{appConfig.app.slogan}</p>
        </div>

        <form onSubmit={handleSubmit} style={styles.form}>
          <input
            type="text"
            name="username"
            placeholder="아이디"
            value={formData.username}
            onChange={handleChange}
            style={styles.input}
            required
          />
          
          <input
            type="password"
            name="password"
            placeholder="비밀번호"
            value={formData.password}
            onChange={handleChange}
            style={styles.input}
            required
          />

          {!isLogin && (
            <>
              <input
                type="email"
                name="email"
                placeholder="이메일"
                value={formData.email}
                onChange={handleChange}
                style={styles.input}
                required
              />
              
              <input
                type="text"
                name="name"
                placeholder="이름"
                value={formData.name}
                onChange={handleChange}
                style={styles.input}
                required
              />
              
              <input
                type="text"
                name="school"
                placeholder="학교명"
                value={formData.school}
                onChange={handleChange}
                style={styles.input}
                required
              />
              
              <select
                name="grade"
                value={formData.grade}
                onChange={handleChange}
                style={styles.input}
                required
              >
                <option value="1">고1</option>
                <option value="2">고2</option>
                <option value="3">고3</option>
              </select>

              <select
                name="role"
                value={formData.role}
                onChange={handleChange}
                style={styles.input}
                required
              >
                <option value="student">학생</option>
                <option value="teacher">교사</option>
              </select>
            </>
          )}

          {error && <div style={styles.error}>{error}</div>}

          <button 
            type="submit" 
            style={styles.submitButton}
            disabled={loading}
          >
            {loading ? '처리중...' : (isLogin ? '로그인' : '회원가입')}
          </button>
        </form>

        <div style={styles.toggleContainer}>
          <span style={styles.toggleText}>
            {isLogin ? '계정이 없으신가요?' : '이미 계정이 있으신가요?'}
          </span>
          <button
            onClick={() => {
              setIsLogin(!isLogin);
              setError('');
            }}
            style={styles.toggleButton}
          >
            {isLogin ? '회원가입' : '로그인'}
          </button>
        </div>
      </div>
    </div>
  );
};

const styles = {
  container: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    padding: '20px'
  },
  loginBox: {
    background: 'rgba(17, 24, 39, 0.95)',
    borderRadius: '20px',
    padding: '40px',
    width: '100%',
    maxWidth: '400px',
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
    backdropFilter: 'blur(10px)',
    border: '1px solid rgba(255, 255, 255, 0.1)'
  },
  logo: {
    textAlign: 'center',
    marginBottom: '30px'
  },
  logoIcon: {
    fontSize: '48px',
    marginBottom: '10px',
    display: 'block'
  },
  title: {
    color: '#fff',
    fontSize: '28px',
    margin: '10px 0',
    fontWeight: 'bold'
  },
  subtitle: {
    color: '#9CA3AF',
    fontSize: '14px',
    margin: 0
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '15px'
  },
  input: {
    padding: '12px 16px',
    borderRadius: '10px',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    background: 'rgba(255, 255, 255, 0.05)',
    color: '#fff',
    fontSize: '14px',
    outline: 'none',
    transition: 'all 0.3s'
  },
  submitButton: {
    padding: '14px',
    borderRadius: '10px',
    border: 'none',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: '#fff',
    fontSize: '16px',
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: 'all 0.3s',
    marginTop: '10px'
  },
  error: {
    background: 'rgba(239, 68, 68, 0.1)',
    border: '1px solid rgba(239, 68, 68, 0.3)',
    color: '#EF4444',
    padding: '10px',
    borderRadius: '8px',
    fontSize: '14px',
    textAlign: 'center'
  },
  toggleContainer: {
    textAlign: 'center',
    marginTop: '20px',
    paddingTop: '20px',
    borderTop: '1px solid rgba(255, 255, 255, 0.1)'
  },
  toggleText: {
    color: '#9CA3AF',
    fontSize: '14px',
    marginRight: '8px'
  },
  toggleButton: {
    background: 'none',
    border: 'none',
    color: '#667eea',
    fontSize: '14px',
    fontWeight: 'bold',
    cursor: 'pointer',
    textDecoration: 'underline'
  }
};

export default LoginPage;