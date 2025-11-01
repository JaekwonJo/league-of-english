import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import appConfig from '../config/appConfig.json';
import apiService, { api } from '../services/api.service';

const MODE_LOGIN = 'login';
const MODE_REGISTER = 'register';
const MODE_RESET = 'reset';

const LoginPage = () => {
  const { login } = useAuth();

  const [mode, setMode] = useState(MODE_LOGIN);
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    email: '',
    verificationCode: '',
    name: '',
    school: '',
    grade: '1',
    role: 'student',
    newPassword: '',
    confirmPassword: ''
  });
  const [error, setError] = useState('');
  const [infoMessage, setInfoMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const [codeCountdown, setCodeCountdown] = useState(0);
  const [isCompact, setIsCompact] = useState(() => (typeof window === 'undefined' ? false : window.innerWidth <= 480));

  useEffect(() => {
    const handleResize = () => {
      if (typeof window === 'undefined') return;
      setIsCompact(window.innerWidth <= 480);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
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

  const resetFeedback = () => {
    setError('');
    setInfoMessage('');
  };

  const switchMode = useCallback((nextMode) => {
    setMode(nextMode);
    resetFeedback();
    setCodeSent(false);
    setCodeCountdown(0);
    setSendingCode(false);
    setFormData((prev) => ({
      ...prev,
      verificationCode: '',
      newPassword: '',
      confirmPassword: ''
    }));
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSendCode = async () => {
    resetFeedback();
    if (!formData.email) {
      setError('이메일을 먼저 입력해 주세요.');
      return;
    }

    try {
      setSendingCode(true);
      if (mode === MODE_REGISTER) {
        await api.auth.sendCode(formData.email);
      } else if (mode === MODE_RESET) {
        await api.auth.forgotPassword(formData.email);
      } else {
        return;
      }
      setCodeSent(true);
      setCodeCountdown(60);
      setInfoMessage('이메일로 인증 코드를 전송했어요. 10분 안에 입력해 주세요!');
    } catch (err) {
      setError(err?.message || '인증 코드를 전송하지 못했어요.');
    } finally {
      setSendingCode(false);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    resetFeedback();
    setLoading(true);

    try {
      if (mode === MODE_LOGIN) {
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
      }

      if (mode === MODE_REGISTER) {
        await api.auth.register(formData);
        alert('회원가입이 완료되었습니다. 로그인해주세요.');
        setInfoMessage('회원가입이 완료되었습니다. 로그인해주세요.');
        switchMode(MODE_LOGIN);
      }

      if (mode === MODE_RESET) {
        if (!formData.email || !formData.verificationCode) {
          setError('이메일과 인증코드를 입력해 주세요.');
          return;
        }
        if (!formData.newPassword || formData.newPassword.length < 8) {
          setError('새 비밀번호를 8자 이상 입력해 주세요.');
          return;
        }
        if (!/[0-9]/.test(formData.newPassword) || !/[A-Za-z]/.test(formData.newPassword)) {
          setError('새 비밀번호는 숫자와 영문을 모두 포함해야 합니다.');
          return;
        }
        if (formData.newPassword !== formData.confirmPassword) {
          setError('새 비밀번호와 확인 비밀번호가 일치하지 않습니다.');
          return;
        }

        await api.auth.resetPassword({
          email: formData.email,
          code: formData.verificationCode,
          newPassword: formData.newPassword
        });

        alert('비밀번호가 재설정되었습니다. 새 비밀번호로 로그인해 주세요.');
        setInfoMessage('비밀번호가 재설정되었어요! 새 비밀번호로 로그인해 주세요.');
        switchMode(MODE_LOGIN);
      }
    } catch (err) {
      setError(err?.message || '요청을 처리하지 못했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const isLogin = mode === MODE_LOGIN;
  const isRegister = mode === MODE_REGISTER;
  const isReset = mode === MODE_RESET;

  const submitLabel = useMemo(() => {
    if (loading) return '처리 중...';
    if (isLogin) return '로그인';
    if (isRegister) return '회원가입';
    return '비밀번호 재설정';
  }, [loading, isLogin, isRegister]);

  return (
    <div style={styles.container}>
      <div style={styles.loginBox}>
        <div style={styles.logo}>
          <span style={styles.logoIcon}>🎮</span>
          <h1 style={styles.title}>{appConfig.app.name}</h1>
          <p style={styles.subtitle}>{appConfig.app.slogan}</p>
        </div>

        <form onSubmit={handleSubmit} style={styles.form}>
          {isLogin && (
            <>
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
            </>
          )}

          {isRegister && (
            <>
              <input
                type="text"
                name="username"
                placeholder="아이디 (로그인 시 사용)"
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
              <div style={styles.emailRow}>
                <input
                  type="email"
                  name="email"
                  placeholder="이메일"
                  value={formData.email}
                  onChange={handleChange}
                  style={{ ...styles.input, flex: '1 1 200px', minWidth: 0 }}
                  required
                />
                <button
                  type="button"
                  onClick={handleSendCode}
                  disabled={sendingCode || codeCountdown > 0}
                  style={{
                    ...styles.codeButton,
                    width: isCompact ? '100%' : 'auto',
                    marginTop: isCompact ? 8 : 0
                  }}
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

          {isReset && (
            <>
              <input
                type="email"
                name="email"
                placeholder="가입한 이메일"
                value={formData.email}
                onChange={handleChange}
                style={styles.input}
                required
              />
              <div style={styles.emailRow}>
                <input
                  type="text"
                  name="verificationCode"
                  placeholder="이메일로 받은 인증코드"
                  value={formData.verificationCode}
                  onChange={handleChange}
                  style={{ ...styles.input, flex: '1 1 200px', minWidth: 0 }}
                  required
                />
                <button
                  type="button"
                  onClick={handleSendCode}
                  disabled={sendingCode || codeCountdown > 0}
                  style={{
                    ...styles.codeButton,
                    width: isCompact ? '100%' : 'auto',
                    marginTop: isCompact ? 8 : 0
                  }}
                >
                  {sendingCode ? '전송 중…' : codeCountdown > 0 ? `${codeCountdown}초` : '코드 전송'}
                </button>
              </div>
              <input
                type="password"
                name="newPassword"
                placeholder="새 비밀번호 (8자 이상, 영문·숫자 포함)"
                value={formData.newPassword}
                onChange={handleChange}
                style={styles.input}
                required
              />
              <input
                type="password"
                name="confirmPassword"
                placeholder="새 비밀번호 확인"
                value={formData.confirmPassword}
                onChange={handleChange}
                style={styles.input}
                required
              />
              <div style={styles.helperBox}>
                <div style={styles.helperTitle}>아이디가 기억나지 않으세요?</div>
                <p style={styles.helperText}>
                  아이디는 회원가입할 때 직접 정한 로그인용 이름이에요. 가입 완료 안내 메일(제목에 “League of English”가 포함돼요)에서 다시 확인할 수 있습니다.
                </p>
                <p style={styles.helperText}>
                  메일을 찾기 어렵다면 담당 선생님이나 운영팀(<strong>jaekwonim@gmail.com</strong>)에게 알려 주세요. 바로 아이디를 안내해 드릴게요.
                </p>
              </div>
            </>
          )}

          {infoMessage && <div style={styles.info}>{infoMessage}</div>}
          {error && <div style={styles.error}>{error}</div>}

          <button type="submit" style={styles.submitButton} disabled={loading}>
            {submitLabel}
          </button>
        </form>

        <div style={styles.toggleContainer}>
          {isLogin && (
            <>
              <div style={styles.toggleRow}>
                <span style={styles.toggleText}>처음 오셨나요?</span>
                <button type="button" onClick={() => switchMode(MODE_REGISTER)} style={styles.toggleButton}>
                  회원가입
                </button>
              </div>
              <div style={styles.toggleRow}>
                <span style={styles.toggleText}>비밀번호를 잊으셨나요?</span>
                <button type="button" onClick={() => switchMode(MODE_RESET)} style={styles.toggleButton}>
                  비밀번호 재설정
                </button>
              </div>
            </>
          )}

          {isRegister && (
            <div style={styles.toggleRow}>
              <span style={styles.toggleText}>이미 계정이 있으신가요?</span>
              <button type="button" onClick={() => switchMode(MODE_LOGIN)} style={styles.toggleButton}>
                로그인
              </button>
            </div>
          )}

          {isReset && (
            <div style={styles.toggleRow}>
              <span style={styles.toggleText}>비밀번호가 기억나셨나요?</span>
              <button type="button" onClick={() => switchMode(MODE_LOGIN)} style={styles.toggleButton}>
                로그인으로 돌아가기
              </button>
            </div>
          )}
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
    maxWidth: '420px',
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
    color: 'var(--text-muted)',
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
    borderRadius: '12px',
    border: '1px solid rgba(148, 163, 184, 0.4)',
    background: 'rgba(15, 23, 42, 0.8)',
    color: '#fff',
    fontSize: '15px',
    outline: 'none'
  },
  emailRow: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap',
    alignItems: 'center'
  },
  codeButton: {
    padding: '12px 16px',
    borderRadius: '12px',
    border: '1px solid rgba(99, 102, 241, 0.6)',
    background: 'rgba(99, 102, 241, 0.12)',
    color: '#c7d2fe',
    fontWeight: 600,
    cursor: 'pointer'
  },
  info: {
    background: 'rgba(34, 197, 94, 0.15)',
    borderRadius: '10px',
    padding: '10px 14px',
    color: '#bbf7d0',
    fontSize: '13px'
  },
  error: {
    background: 'rgba(248, 113, 113, 0.15)',
    borderRadius: '10px',
    padding: '10px 14px',
    color: '#fecaca',
    fontSize: '13px'
  },
  submitButton: {
    padding: '14px',
    borderRadius: '14px',
    background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
    color: '#fff',
    border: 'none',
    fontSize: '16px',
    fontWeight: 700,
    cursor: 'pointer',
    marginTop: '6px'
  },
  toggleContainer: {
    marginTop: '24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  toggleRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '10px',
    justifyContent: 'center'
  },
  toggleText: {
    color: 'var(--text-muted)',
    fontSize: '13px'
  },
  toggleButton: {
    background: 'transparent',
    color: '#c7d2fe',
    border: 'none',
    cursor: 'pointer',
    fontWeight: 600,
    textDecoration: 'underline'
  },
  helperBox: {
    marginTop: '16px',
    padding: '16px',
    borderRadius: '14px',
    background: 'rgba(148,163,184,0.12)',
    color: 'var(--text-on-accent)',
    lineHeight: 1.6,
    textAlign: 'left'
  },
  helperTitle: {
    fontWeight: 700,
    fontSize: '14px',
    marginBottom: '6px',
    color: '#e2e8f0'
  },
  helperText: {
    fontSize: '13px',
    margin: '4px 0',
    color: '#cbd5f5'
  }
};

export default LoginPage;
