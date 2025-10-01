import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import appConfig from '../config/appConfig.json';
import apiService, { api } from '../services/api.service';

const LoginPage = () => {
  const { login } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    email: '',
    verificationCode: '',
    name: '',
    school: '',
    grade: '1',
    role: 'student'
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const [codeCountdown, setCodeCountdown] = useState(0);
  const [infoMessage, setInfoMessage] = useState('');

  React.useEffect(() => {
    if (!codeSent || codeCountdown <= 0) return;
    const timer = setInterval(() => {
      setCodeCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [codeSent, codeCountdown]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setInfoMessage('');
    setLoading(true);

    try {
      if (isLogin) {
        const data = await api.auth.login({
          username: formData.username,
          password: formData.password
        });

        if (data?.user && data?.token) {
          apiService.setToken(data.token);
          login(data.user, data.token);
        } else {
          setError('로그인 응답이 올바르지 않습니다.');
        }
      } else {
        await api.auth.register(formData);
        setIsLogin(true);
        setFormData((prev) => ({
          ...prev,
          username: prev.username,
          password: '',
          verificationCode: ''
        }));
        setCodeSent(false);
        setCodeCountdown(0);
        setInfoMessage('회원가입이 완료되었습니다. 로그인해주세요.');
        alert('회원가입이 완료되었습니다. 로그인해주세요.');
      }
    } catch (err) {
      setError(err.message || '서버 연결에 실패했습니다.');
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

  const handleSendCode = async () => {
    setError('');
    setInfoMessage('');
    if (!formData.email) {
      setError('이메일을 먼저 입력해 주세요.');
      return;
    }
    try {
      setSendingCode(true);
      await api.auth.sendCode(formData.email);
      setCodeSent(true);
      setCodeCountdown(60);
      setInfoMessage('인증 코드를 이메일로 전송했어요. 10분 안에 입력해 주세요!');
    } catch (err) {
      setError(err?.message || '인증 코드를 전송하지 못했어요.');
    } finally {
      setSendingCode(false);
    }
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
              <div style={styles.emailRow}>
                <input
                  type="email"
                  name="email"
                  placeholder="이메일"
                  value={formData.email}
                  onChange={handleChange}
                  style={{ ...styles.input, flex: 1 }}
                  required
                />
                <button
                  type="button"
                  onClick={handleSendCode}
                  disabled={sendingCode || codeCountdown > 0}
                  style={styles.codeButton}
                >
                  {sendingCode ? '전송 중…' : codeCountdown > 0 ? `${codeCountdown}초` : '인증코드'}
                </button>
              </div>

              <input
                type="text"
                name="verificationCode"
                placeholder="이메일로 받은 인증코드"
                value={formData.verificationCode}
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

          {infoMessage && <div style={styles.info}>{infoMessage}</div>}
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
              setInfoMessage('');
              setCodeSent(false);
              setCodeCountdown(0);
              setFormData((prev) => ({
                ...prev,
                verificationCode: ''
              }));
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
    background: 'linear-gradient(135deg, var(--indigo) 0%, var(--indigo-strong) 100%)',
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
    color: 'var(--text-on-accent)',
    fontSize: '28px',
    margin: '10px 0',
    fontWeight: 'bold'
  },
  subtitle: {
    color: 'var(--color-slate-400)',
    fontSize: '14px',
    margin: 0
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '15px'
  },
  emailRow: {
    display: 'flex',
    gap: '8px'
  },
  input: {
    padding: '12px 16px',
    borderRadius: '10px',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    background: 'rgba(255, 255, 255, 0.05)',
    color: 'var(--text-on-accent)',
    fontSize: '14px',
    outline: 'none',
    transition: 'all 0.3s'
  },
  submitButton: {
    padding: '14px',
    borderRadius: '10px',
    border: 'none',
    background: 'linear-gradient(135deg, var(--indigo) 0%, var(--indigo-strong) 100%)',
    color: 'var(--text-on-accent)',
    fontSize: '16px',
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: 'all 0.3s',
    marginTop: '10px'
  },
  codeButton: {
    background: 'var(--indigo)',
    color: 'var(--text-on-accent)',
    border: 'none',
    borderRadius: '10px',
    padding: '0 16px',
    fontWeight: 'bold',
    cursor: 'pointer',
    minWidth: '110px'
  },
  info: {
    background: 'rgba(99, 102, 241, 0.2)',
    color: '#cbd5f5',
    padding: '10px',
    borderRadius: '10px',
    fontSize: '14px'
  },
  error: {
    background: 'rgba(239, 68, 68, 0.1)',
    border: '1px solid rgba(239, 68, 68, 0.3)',
    color: 'var(--danger)',
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
    color: 'var(--color-slate-400)',
    fontSize: '14px',
    marginRight: '8px'
  },
  toggleButton: {
    background: 'none',
    border: 'none',
    color: 'var(--indigo)',
    fontSize: '14px',
    fontWeight: 'bold',
    cursor: 'pointer',
    textDecoration: 'underline'
  }
};

export default LoginPage;
