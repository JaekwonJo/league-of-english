import React, { useState, useEffect, createContext, useContext } from 'react';
import './App.css';
import { 
  User, Lock, Mail, School, Award, BarChart3, BookOpen, 
  Upload, FileText, Trophy, Home, LogOut, ChevronRight, 
  Check, X, Clock, Target, Zap, Shield, Star, Menu,
  Brain, Sparkles, TrendingUp, Users, Settings, Plus, Minus
} from 'lucide-react';

// API 기본 URL
const API_URL = 'http://localhost:5002/api';

// 인증 컨텍스트
const AuthContext = createContext(null);

// Fetch API 헬퍼 함수
async function apiCall(endpoint, options = {}) {
  const token = localStorage.getItem('token');
  
  const defaultOptions = {
    headers: {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` })
    }
  };
  
  const response = await fetch(`${API_URL}${endpoint}`, {
    ...defaultOptions,
    ...options,
    headers: {
      ...defaultOptions.headers,
      ...options.headers
    }
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || '요청 실패');
  }
  
  return response.json();
}

// 메인 App 컴포넌트
export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');
    if (token && savedUser) {
      setUser(JSON.parse(savedUser));
    }
    setLoading(false);
  }, []);

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <AuthContext.Provider value={{ user, setUser }}>
      <div className="app">
        {!user ? <AuthScreen /> : <MainLayout />}
      </div>
    </AuthContext.Provider>
  );
}

// 로딩 화면
function LoadingScreen() {
  return (
    <div className="loading-screen">
      <div className="loading-content">
        <Sparkles className="loading-icon" />
        <h1>League of English</h1>
        <div className="loading-bar">
          <div className="loading-progress"></div>
        </div>
      </div>
    </div>
  );
}

// 인증 화면 (로그인/회원가입)
function AuthScreen() {
  const { setUser } = useContext(AuthContext);
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    email: '',
    name: '',
    school: '수호학원',
    grade: 1
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const endpoint = isLogin ? '/login' : '/register';
      const data = await apiCall(endpoint, {
        method: 'POST',
        body: JSON.stringify(formData)
      });

      if (data.success) {
        if (isLogin) {
          localStorage.setItem('token', data.token);
          localStorage.setItem('user', JSON.stringify(data.user));
          setUser(data.user);
        } else {
          alert('회원가입 성공! 로그인해주세요.');
          setIsLogin(true);
          setFormData({ ...formData, password: '' });
        }
      }
    } catch (err) {
      setError(err.message || '오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-screen">
      <div className="auth-container">
        <div className="auth-header">
          <div className="logo-section">
            <Sparkles className="logo-icon" />
            <h1>League of English</h1>
            <p>AI가 만드는 무한 영어 문제</p>
          </div>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <h2>{isLogin ? '로그인' : '회원가입'}</h2>
          
          {error && (
            <div className="error-message">
              <X size={16} />
              {error}
            </div>
          )}

          <div className="form-group">
            <div className="input-wrapper">
              <User size={20} />
              <input
                type="text"
                placeholder="아이디"
                value={formData.username}
                onChange={(e) => setFormData({...formData, username: e.target.value})}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <div className="input-wrapper">
              <Lock size={20} />
              <input
                type="password"
                placeholder="비밀번호"
                value={formData.password}
                onChange={(e) => setFormData({...formData, password: e.target.value})}
                required
              />
            </div>
          </div>

          {!isLogin && (
            <>
              <div className="form-group">
                <div className="input-wrapper">
                  <Mail size={20} />
                  <input
                    type="email"
                    placeholder="이메일"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <div className="input-wrapper">
                  <User size={20} />
                  <input
                    type="text"
                    placeholder="이름"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <div className="input-wrapper">
                  <School size={20} />
                  <input
                    type="text"
                    placeholder="학교/학원"
                    value={formData.school}
                    onChange={(e) => setFormData({...formData, school: e.target.value})}
                  />
                </div>
              </div>

              <div className="form-group">
                <div className="input-wrapper">
                  <Award size={20} />
                  <select
                    value={formData.grade}
                    onChange={(e) => setFormData({...formData, grade: parseInt(e.target.value)})}
                  >
                    <option value={1}>고1</option>
                    <option value={2}>고2</option>
                    <option value={3}>고3</option>
                  </select>
                </div>
              </div>
            </>
          )}

          <button type="submit" className="submit-btn" disabled={loading}>
            {loading ? (
              <div className="btn-loading">처리중...</div>
            ) : (
              <>
                {isLogin ? '로그인' : '회원가입'}
                <ChevronRight size={20} />
              </>
            )}
          </button>

          <div className="auth-switch">
            <span>
              {isLogin ? '계정이 없으신가요?' : '이미 계정이 있으신가요?'}
            </span>
            <button
              type="button"
              onClick={() => {
                setIsLogin(!isLogin);
                setError('');
              }}
            >
              {isLogin ? '회원가입' : '로그인'}
            </button>
          </div>
        </form>

        <div className="auth-footer">
          <div className="features">
            <div className="feature">
              <Brain size={24} />
              <span>AI 문제 생성</span>
            </div>
            <div className="feature">
              <Trophy size={24} />
              <span>랭킹 시스템</span>
            </div>
            <div className="feature">
              <TrendingUp size={24} />
              <span>성장 분석</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// 메인 레이아웃
function MainLayout() {
  const { user, setUser } = useContext(AuthContext);
  const [currentPage, setCurrentPage] = useState('home');
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  const menuItems = [
    { id: 'home', label: '홈', icon: Home },
    { id: 'study', label: '문제 풀기', icon: BookOpen },
    { id: 'vocabulary', label: '단어 시험', icon: FileText },
    { id: 'stats', label: '통계', icon: BarChart3 },
    { id: 'ranking', label: '랭킹', icon: Trophy },
    ...(user.role === 'admin' ? [{ id: 'admin', label: '관리자', icon: Settings }] : [])
  ];

  return (
    <div className="main-layout">
      <aside className={`sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <Sparkles size={28} />
            {sidebarOpen && <span>League of English</span>}
          </div>
          <button 
            className="sidebar-toggle"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            <Menu size={20} />
          </button>
        </div>

        <nav className="sidebar-nav">
          {menuItems.map(item => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                className={`nav-item ${currentPage === item.id ? 'active' : ''}`}
                onClick={() => setCurrentPage(item.id)}
              >
                <Icon size={20} />
                {sidebarOpen && <span>{item.label}</span>}
              </button>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <div className="user-info">
            <div className="user-avatar">
              {user.name[0]}
            </div>
            {sidebarOpen && (
              <div className="user-details">
                <div className="user-name">{user.name}</div>
                <div className="user-tier">
                  <Shield size={14} />
                  {user.tier} · {user.points}LP
                </div>
              </div>
            )}
          </div>
          <button className="logout-btn" onClick={handleLogout}>
            <LogOut size={20} />
            {sidebarOpen && <span>로그아웃</span>}
          </button>
        </div>
      </aside>

      <main className="main-content">
        {currentPage === 'home' && <HomePage />}
        {currentPage === 'study' && <StudyPage />}
        {currentPage === 'vocabulary' && <VocabularyPage />}
        {currentPage === 'stats' && <StatsPage />}
        {currentPage === 'ranking' && <RankingPage />}
        {currentPage === 'admin' && <AdminPage />}
      </main>
    </div>
  );
}

// 홈 페이지
function HomePage() {
  const { user } = useContext(AuthContext);
  
  return (
    <div className="home-page">
      <div className="welcome-section">
        <h1>안녕하세요, {user.name}님! 👋</h1>
        <p>오늘도 함께 영어 실력을 키워볼까요?</p>
      </div>

      <div className="quick-stats">
        <div className="stat-card">
          <Trophy className="stat-icon gold" />
          <div className="stat-info">
            <div className="stat-label">현재 티어</div>
            <div className="stat-value">{user.tier}</div>
          </div>
        </div>
        <div className="stat-card">
          <Zap className="stat-icon purple" />
          <div className="stat-info">
            <div className="stat-label">보유 포인트</div>
            <div className="stat-value">{user.points} LP</div>
          </div>
        </div>
        <div className="stat-card">
          <Target className="stat-icon blue" />
          <div className="stat-info">
            <div className="stat-label">오늘의 목표</div>
            <div className="stat-value">20문제</div>
          </div>
        </div>
      </div>

      <div className="action-cards">
        <div className="action-card gradient-1">
          <BookOpen size={32} />
          <h3>문제 풀기</h3>
          <p>AI가 생성하는 수능형 문제</p>
          <button className="action-btn">시작하기</button>
        </div>
        <div className="action-card gradient-2">
          <FileText size={32} />
          <h3>단어 시험</h3>
          <p>매일 30개 단어 암기</p>
          <button className="action-btn">시작하기</button>
        </div>
        <div className="action-card gradient-3">
          <BarChart3 size={32} />
          <h3>학습 분석</h3>
          <p>나의 성장 그래프 확인</p>
          <button className="action-btn">보러가기</button>
        </div>
      </div>
    </div>
  );
}

// 학습 페이지
function StudyPage() {
  const [mode, setMode] = useState('setup'); // setup, studying, result
  const [config, setConfig] = useState({
    documentId: null,
    difficulty: 'medium',
    problemCount: 20,
    types: {
      order: 0,
      insertion: 0,
      blank: 0,
      grammar: 0,
      vocabulary: 0,
      title: 0,
      theme: 0,
      content: 0
    }
  });
  const [documents, setDocuments] = useState([]);
  const [problems, setProblems] = useState([]);
  const [currentProblemIndex, setCurrentProblemIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [timeLeft, setTimeLeft] = useState(120);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [startTime, setStartTime] = useState(null);

  useEffect(() => {
    loadDocuments();
  }, []);

  useEffect(() => {
    if (mode === 'studying' && timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    } else if (mode === 'studying' && timeLeft <= 0) {
      // 시간 종료시 자동 제출
      alert('⏰ 시간이 종료되었습니다! 자동으로 제출합니다.');
      finishStudy();
    }
  }, [mode, timeLeft]);

  const loadDocuments = async () => {
    try {
      const data = await apiCall('/documents');
      setDocuments(data.documents || data || []);
    } catch (error) {
      console.error('문서 로드 실패:', error);
      setDocuments([]);
    }
  };

  const startStudy = async () => {
    if (!config.documentId) {
      alert('문서를 선택해주세요!');
      return;
    }

    setLoading(true);
    try {
      const data = await apiCall('/get-smart-problems', {
        method: 'POST',
        body: JSON.stringify({
          documentId: config.documentId,
          problemCount: config.problemCount,
          problemTypes: config.types,
          difficulty: config.difficulty
        })
      });
      
      setProblems(data.problems);
      setMode('studying');
      setCurrentProblemIndex(0);
      setAnswers({});
      setStartTime(Date.now());
      setTimeLeft(config.difficulty === 'advanced' ? 60 : 120);
    } catch (error) {
      alert('문제를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleAnswer = (answer) => {
    setAnswers({
      ...answers,
      [currentProblemIndex]: answer
    });
  };

  const nextProblem = () => {
    // 답안을 선택했는지 확인
    if (!answers[currentProblemIndex]) {
      alert('⚠️ 답을 선택하고 다음 문제로 넘어가주세요!');
      return;
    }

    if (currentProblemIndex < problems.length - 1) {
      setCurrentProblemIndex(currentProblemIndex + 1);
      setTimeLeft(config.difficulty === 'advanced' ? 60 : 120);
    } else {
      finishStudy();
    }
  };

  const prevProblem = () => {
    if (currentProblemIndex > 0) {
      setCurrentProblemIndex(currentProblemIndex - 1);
    }
  };

  const finishStudy = () => {
    // 채점 계산
    const totalProblems = problems.length;
    const correctAnswers = Object.entries(answers).filter(([index, userAnswer]) => {
      const problem = problems[parseInt(index)];
      return problem && userAnswer === problem.answer;
    }).length;
    const score = Math.round((correctAnswers / totalProblems) * 100);
    
    // 등급 계산
    const grade = 
      score >= 90 ? 'A+' : 
      score >= 80 ? 'A' : 
      score >= 70 ? 'B+' : 
      score >= 60 ? 'B' : 
      score >= 50 ? 'C+' : 'C';
    
    // 소요 시간 계산 (실제 시간)
    const timeSpent = startTime ? Math.floor((Date.now() - startTime) / 1000) : 0;
    
    // 획득 XP 계산
    const baseXP = correctAnswers * 10;
    const timeBonus = timeLeft > 0 ? Math.floor(timeLeft / 10) : 0;
    const gradeBonus = 
      grade === 'A+' ? 50 : 
      grade === 'A' ? 30 : 
      grade === 'B+' ? 20 : 
      grade === 'B' ? 10 : 0;
    const totalXP = baseXP + timeBonus + gradeBonus;
    
    // 결과 데이터 설정
    setResults({
      totalProblems,
      correctAnswers,
      score,
      grade,
      timeSpent,
      totalXP,
      details: Object.entries(answers).map(([index, userAnswer]) => {
        const problem = problems[parseInt(index)];
        return {
          problemIndex: parseInt(index),
          question: problem?.question || '',
          userAnswer,
          correctAnswer: problem?.answer || '',
          isCorrect: userAnswer === problem?.answer,
          explanation: problem?.explanation || ''
        };
      })
    });
    
    setMode('result');
  };

  const updateTypeCount = (type, delta) => {
    const newCount = Math.max(0, config.types[type] + delta);
    setConfig({
      ...config,
      types: {
        ...config.types,
        [type]: newCount
      }
    });
  };

  // 🔄 문제 유형 초기화 함수 (모두 0으로)
  const resetProblemTypes = () => {
    setConfig({
      ...config,
      types: {
        order: 0,
        insertion: 0,
        blank: 0,
        grammar: 0,
        vocabulary: 0,
        title: 0,
        theme: 0,
        content: 0
      }
    });
  };

  // 🎯 종합 문제 풀이 시작 함수
  const startComprehensiveTest = () => {
    if (!config.documentId) {
      alert('문서를 선택해주세요!');
      return;
    }

    // 종합 모드용 랜덤 문제 유형 설정 (총 20문제)
    const comprehensiveTypes = {
      order: Math.floor(Math.random() * 3) + 2,    // 2-4개
      insertion: Math.floor(Math.random() * 3) + 2, // 2-4개  
      blank: Math.floor(Math.random() * 4) + 3,     // 3-6개
      grammar: Math.floor(Math.random() * 3) + 2,   // 2-4개
      vocabulary: Math.floor(Math.random() * 3) + 2, // 2-4개
      title: Math.floor(Math.random() * 2) + 1,     // 1-2개
      theme: Math.floor(Math.random() * 2) + 1,     // 1-2개
      content: Math.floor(Math.random() * 2) + 1    // 1-2개
    };

    // 총합이 20개가 되도록 조정
    const total = Object.values(comprehensiveTypes).reduce((a, b) => a + b, 0);
    if (total !== 20) {
      const diff = 20 - total;
      comprehensiveTypes.blank += diff; // 부족하면 빈칸에 추가
    }

    // 임시로 config 변경하고 학습 시작
    const comprehensiveConfig = {
      ...config,
      problemCount: 20,
      types: comprehensiveTypes,
      difficulty: 'medium' // 중급 난이도 고정
    };

    startStudyWithConfig(comprehensiveConfig, 1800); // 30분 = 1800초
  };

  // 📚 설정을 받아서 학습 시작하는 함수
  const startStudyWithConfig = async (studyConfig, timeLimit = null) => {
    setLoading(true);
    try {
      const data = await apiCall('/get-smart-problems', {
        method: 'POST',
        body: JSON.stringify({
          documentId: studyConfig.documentId,
          problemCount: studyConfig.problemCount,
          problemTypes: studyConfig.types,
          difficulty: studyConfig.difficulty
        })
      });
      
      setProblems(data.problems);
      setMode('studying');
      setCurrentProblemIndex(0);
      setAnswers({});
      
      // 종합 모드면 30분, 아니면 기본 시간
      if (timeLimit) {
        setTimeLeft(timeLimit);
      } else {
        setTimeLeft(studyConfig.difficulty === 'advanced' ? 60 : 120);
      }
    } catch (error) {
      alert('문제를 불러오는데 실패했습니다: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  if (mode === 'setup') {
    return (
      <div className="study-setup">
        <h1>학습 설정</h1>
        
        <div className="setup-section">
          <h3>📚 문서 선택</h3>
          <div className="document-list">
            {documents.length === 0 ? (
              <p className="no-documents">업로드된 문서가 없습니다.</p>
            ) : (
              documents.map(doc => (
                <label key={doc.id} className="document-item">
                  <input
                    type="radio"
                    name="document"
                    value={doc.id}
                    onChange={() => setConfig({...config, documentId: doc.id})}
                  />
                  <div className="document-info">
                    <div className="document-title">{doc.title}</div>
                    <div className="document-meta">
                      {doc.source} · {doc.category}
                    </div>
                  </div>
                </label>
              ))
            )}
          </div>
        </div>

        <div className="setup-section">
          <h3>⚡ 난이도</h3>
          <div className="difficulty-options">
            <label className={`difficulty-option ${config.difficulty === 'basic' ? 'selected' : ''}`}>
              <input
                type="radio"
                value="basic"
                checked={config.difficulty === 'basic'}
                onChange={(e) => setConfig({...config, difficulty: e.target.value})}
              />
              <div className="difficulty-info">
                <div className="difficulty-name">기본</div>
                <div className="difficulty-desc">문제당 2분</div>
              </div>
            </label>
            <label className={`difficulty-option ${config.difficulty === 'medium' ? 'selected' : ''}`}>
              <input
                type="radio"
                value="medium"
                checked={config.difficulty === 'medium'}
                onChange={(e) => setConfig({...config, difficulty: e.target.value})}
              />
              <div className="difficulty-info">
                <div className="difficulty-name">중급</div>
                <div className="difficulty-desc">문제당 1분 30초</div>
              </div>
            </label>
            <label className={`difficulty-option ${config.difficulty === 'advanced' ? 'selected' : ''}`}>
              <input
                type="radio"
                value="advanced"
                checked={config.difficulty === 'advanced'}
                onChange={(e) => setConfig({...config, difficulty: e.target.value})}
              />
              <div className="difficulty-info">
                <div className="difficulty-name">고급</div>
                <div className="difficulty-desc">문제당 1분</div>
              </div>
            </label>
          </div>
          
          {/* 🎯 종합 문제 풀이 버튼 */}
          <div className="comprehensive-mode">
            <button 
              className="comprehensive-btn"
              onClick={() => startComprehensiveTest()}
              disabled={loading || !config.documentId}
            >
              <Target size={20} />
              🎯 종합 문제 풀이 (20문제 / 30분)
            </button>
            <p className="comprehensive-desc">모든 유형 랜덤 출제</p>
          </div>
        </div>

        <div className="setup-section">
          <h3>📝 문제 유형 및 개수</h3>
          <div className="problem-types">
            {Object.entries({
              order: '순서 배열',
              insertion: '문장 삽입',
              blank: '빈칸 채우기',
              grammar: '어법',
              vocabulary: '어휘',
              title: '제목',
              theme: '주제',
              content: '내용 일치'
            }).map(([type, label]) => (
              <div key={type} className="type-control">
                <span className="type-label">{label}</span>
                <div className="count-controls">
                  <button 
                    className="count-btn"
                    onClick={() => updateTypeCount(type, -1)}
                  >
                    <Minus size={16} />
                  </button>
                  <input
                    type="number"
                    value={config.types[type]}
                    onChange={(e) => setConfig({
                      ...config,
                      types: {
                        ...config.types,
                        [type]: parseInt(e.target.value) || 0
                      }
                    })}
                    min="0"
                    max="10"
                  />
                  <button 
                    className="count-btn"
                    onClick={() => updateTypeCount(type, 1)}
                  >
                    <Plus size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
          <div className="problem-count-section">
            <div className="total-count">
              총 {Object.values(config.types).reduce((a, b) => a + b, 0)}문제
            </div>
            
            {/* 🔄 초기화 버튼을 오른쪽 위로 이동 */}
            <button 
              className="reset-btn-small"
              onClick={resetProblemTypes}
              title="문제 유형 초기화"
            >
              🔄
            </button>
          </div>
        </div>

        <div className="study-buttons">
          <button 
            className="start-study-btn-large"
            onClick={startStudy}
            disabled={loading || !config.documentId || Object.values(config.types).reduce((a, b) => a + b, 0) === 0}
          >
            {loading ? (
              <>
                <div className="spinner"></div>
                준비중...
              </>
            ) : (
              <>
                🚀 학습 시작 ({Object.values(config.types).reduce((a, b) => a + b, 0)}문제)
              </>
            )}
          </button>
          
          {Object.values(config.types).reduce((a, b) => a + b, 0) === 0 && (
            <p className="no-problems-warning">
              ⚠️ 문제 유형을 선택해주세요
            </p>
          )}
        </div>
      </div>
    );
  }

  if (mode === 'studying' && problems.length > 0) {
    const problem = problems[currentProblemIndex];
    
    return (
      <div className="study-container">
        <div className="study-header">
          <div className="problem-progress">
            문제 {currentProblemIndex + 1} / {problems.length}
          </div>
          <div className="timer">
            <Clock size={20} />
            {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
          </div>
        </div>

        <div className="problem-content">
          <div className="problem-source-section">
            <div className="problem-source">
              📚 출처: {problem.sourceInfo || problem.source || '출처 미상'}
            </div>
            {problem.unit && (
              <div className="problem-unit">Unit: {problem.unit}</div>
            )}
            {problem.problemNumber && (
              <div className="problem-number">{problem.problemNumber}</div>
            )}
          </div>
          {problem.type && (
            <div className="problem-type">
              🎯 문제 유형: {
                problem.type === 'order' ? '순서배열' :
                problem.type === 'insertion' ? '문장삽입' :
                problem.type === 'blank' ? '빈칸채우기' :
                problem.type === 'grammar' ? '어법' :
                problem.type === 'vocabulary' ? '어휘' :
                problem.type === 'title' ? '제목' :
                problem.type === 'theme' ? '주제' :
                problem.type === 'content' ? '내용일치' : problem.type
              } 
              {problem.difficulty && (
                <span className={`difficulty-badge ${problem.difficulty}`}>
                  {problem.difficulty === 'basic' ? '기본' : 
                   problem.difficulty === 'medium' ? '중급' : '고급'}
                </span>
              )}
            </div>
          )}
          <h2 className="problem-question">{problem.question}</h2>
          
          {/* 전체 지문은 표시하지 않음 - 문제 해결을 위해 주석 처리 */}
          
          {/* 순서배열 문제의 주어진 글 */}
          {problem.type === 'order' && problem.givenSentence && (
            <div className="given-sentence">
              <div className="given-sentence-header">
                <strong>📄 주어진 글</strong>
              </div>
              <div className="given-sentence-content">
                {problem.givenSentence}
              </div>
            </div>
          )}

          {/* 문장삽입 문제의 주어진 문장 */}
          {problem.type === 'insertion' && problem.targetSentence && (
            <div className="target-sentence">
              <div className="target-sentence-header">
                <strong>✏️ 주어진 문장</strong>
              </div>
              <div className="target-sentence-content">
                {problem.targetSentence}
              </div>
            </div>
          )}
          
          <div className="problem-passage">
            {problem.passage}
          </div>

          <div className="problem-options">
            {problem.options.map((option, index) => (
              <button
                key={index}
                className={`option-btn ${answers[currentProblemIndex] === option ? 'selected' : ''}`}
                onClick={() => handleAnswer(option)}
              >
                {option}
              </button>
            ))}
          </div>
        </div>

        <div className="study-navigation">
          <button 
            className="nav-btn"
            onClick={prevProblem}
            disabled={currentProblemIndex === 0}
          >
            📄 이전 문제
          </button>
          
          {/* 답안 선택 상태 표시 */}
          <div className="answer-status">
            {answers[currentProblemIndex] ? (
              <span className="answer-selected">
                ✅ 답안 선택됨: {answers[currentProblemIndex]}
              </span>
            ) : (
              <span className="answer-not-selected">
                ❌ 답안을 선택해주세요
              </span>
            )}
          </div>
          
          <button 
            className={`nav-btn ${answers[currentProblemIndex] ? 'primary' : 'disabled'}`}
            onClick={nextProblem}
            style={{
              opacity: answers[currentProblemIndex] ? 1 : 0.5,
              cursor: answers[currentProblemIndex] ? 'pointer' : 'not-allowed'
            }}
          >
            {currentProblemIndex === problems.length - 1 ? '📝 제출하기' : '➡️ 다음 문제'}
          </button>
        </div>
      </div>
    );
  }

  if (mode === 'result' && results) {
    const formatTime = (seconds) => {
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = seconds % 60;
      return `${minutes}분 ${remainingSeconds}초`;
    };

    // 등급별 스타일 및 이펙트
    const getGradeStyle = (grade) => {
      const styles = {
        'A': { 
          color: '#10B981', 
          gradient: 'from-emerald-500 to-teal-600',
          glow: 'drop-shadow-[0_0_20px_rgba(16,185,129,0.5)]',
          icon: '🏆',
          particles: '✨💎🌟'
        },
        'B': { 
          color: '#3B82F6', 
          gradient: 'from-blue-500 to-indigo-600',
          glow: 'drop-shadow-[0_0_20px_rgba(59,130,246,0.5)]',
          icon: '🥈',
          particles: '⭐💫🎯'
        },
        'C': { 
          color: '#F59E0B', 
          gradient: 'from-amber-500 to-orange-600',
          glow: 'drop-shadow-[0_0_20px_rgba(245,158,11,0.5)]',
          icon: '🥉',
          particles: '🔥⚡💪'
        },
        'D': { 
          color: '#EF4444', 
          gradient: 'from-red-500 to-rose-600',
          glow: 'drop-shadow-[0_0_20px_rgba(239,68,68,0.3)]',
          icon: '📚',
          particles: '🌱💡🚀'
        },
        'F': { 
          color: '#6B7280', 
          gradient: 'from-gray-500 to-slate-600',
          glow: 'drop-shadow-[0_0_10px_rgba(107,114,128,0.3)]',
          icon: '🎯',
          particles: '💪🔥📈'
        }
      };
      return styles[grade] || styles['F'];
    };

    const gradeStyle = getGradeStyle(results.grade);
    
    return (
      <div className="apple-result-container">
        {/* 🎊 파티클 배경 */}
        <div className="particles-bg">
          {[...Array(20)].map((_, i) => (
            <div 
              key={i} 
              className={`particle particle-${i % 3}`}
              style={{
                '--delay': `${i * 0.2}s`,
                '--duration': `${3 + i * 0.1}s`
              }}
            >
              {gradeStyle.particles.split('')[i % gradeStyle.particles.length]}
            </div>
          ))}
        </div>

        {/* 🏆 메인 결과 카드 */}
        <div className="main-result-card">
          <div className="celebration-header">
            <div className="grade-icon-large">
              {gradeStyle.icon}
            </div>
            <h1 className="result-title">시험 완료!</h1>
            <div className="result-subtitle">정말 수고하셨습니다! ✨</div>
          </div>

          {/* 점수 원형 차트 */}
          <div className="score-chart-container">
            <div className="score-chart">
              <svg width="200" height="200" viewBox="0 0 200 200">
                <defs>
                  <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor={gradeStyle.color} stopOpacity="0.8" />
                    <stop offset="100%" stopColor={gradeStyle.color} stopOpacity="1" />
                  </linearGradient>
                </defs>
                <circle
                  cx="100" cy="100" r="80"
                  fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="12"
                />
                <circle
                  cx="100" cy="100" r="80"
                  fill="none" stroke="url(#scoreGradient)" strokeWidth="12"
                  strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 80}`}
                  strokeDashoffset={`${2 * Math.PI * 80 * (1 - results.score / 100)}`}
                  style={{
                    transform: 'rotate(-90deg)',
                    transformOrigin: '100px 100px',
                    filter: gradeStyle.glow
                  }}
                  className="score-progress"
                />
              </svg>
              <div className="score-content">
                <div className="score-number">{results.score}</div>
                <div className="score-label">점</div>
                <div className="grade-badge" style={{ color: gradeStyle.color }}>
                  등급 {results.grade}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 📊 통계 카드들 */}
        <div className="stats-grid">
          <div className="stat-card correct">
            <div className="stat-icon-bg">
              <Check className="stat-icon" />
            </div>
            <div className="stat-content">
              <div className="stat-value">{results.correctAnswers}</div>
              <div className="stat-total">/ {results.totalProblems}</div>
              <div className="stat-label">정답 개수</div>
            </div>
          </div>

          <div className="stat-card time">
            <div className="stat-icon-bg">
              <Clock className="stat-icon" />
            </div>
            <div className="stat-content">
              <div className="stat-value">{Math.floor(results.timeSpent / 60)}</div>
              <div className="stat-total">분 {results.timeSpent % 60}초</div>
              <div className="stat-label">소요 시간</div>
            </div>
          </div>

          <div className="stat-card xp">
            <div className="stat-icon-bg">
              <Zap className="stat-icon" />
            </div>
            <div className="stat-content">
              <div className="stat-value">+{results.totalXP}</div>
              <div className="stat-total">XP</div>
              <div className="stat-label">획득 경험치</div>
            </div>
          </div>

          <div className="stat-card accuracy">
            <div className="stat-icon-bg">
              <Target className="stat-icon" />
            </div>
            <div className="stat-content">
              <div className="stat-value">{Math.round((results.correctAnswers / results.totalProblems) * 100)}</div>
              <div className="stat-total">%</div>
              <div className="stat-label">정답률</div>
            </div>
          </div>
        </div>

        {/* 📝 문제별 상세 결과 */}
        <div className="problems-section">
          <h3 className="section-title">📝 문제별 상세 결과</h3>
          <div className="problems-grid">
            {results.details.map((detail, index) => (
              <div 
                key={index} 
                className={`problem-card ${detail.isCorrect ? 'correct' : 'incorrect'}`}
                style={{
                  '--delay': `${index * 0.1}s`
                }}
              >
                <div className="problem-header">
                  <div className={`problem-status ${detail.isCorrect ? 'correct' : 'incorrect'}`}>
                    {detail.isCorrect ? <Check size={20} /> : <X size={20} />}
                  </div>
                  <div className="problem-number">문제 {detail.problemIndex + 1}</div>
                </div>
                <div className="problem-answers">
                  <div className="answer-row user">
                    <span className="answer-label">내 답안</span>
                    <span className="answer-value">{detail.userAnswer || '❌ 미응답'}</span>
                  </div>
                  <div className="answer-row correct">
                    <span className="answer-label">정답</span>
                    <span className="answer-value">{detail.correctAnswer}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 🚀 액션 버튼들 */}
        <div className="action-buttons">
          <button 
            className="apple-btn primary"
            onClick={() => {
              setMode('setup');
              setResults(null);
              setStartTime(null);
            }}
          >
            <div className="btn-content">
              <div className="btn-icon">🚀</div>
              <div className="btn-text">
                <div className="btn-title">다시 학습하기</div>
                <div className="btn-subtitle">새로운 문제에 도전해보세요</div>
              </div>
            </div>
          </button>
          
          <button 
            className="apple-btn secondary"
            onClick={() => {
              setMode('setup');
              setResults(null);
              setStartTime(null);
              // 오답 문제만 다시 풀기 기능은 추후 구현
            }}
          >
            <div className="btn-content">
              <div className="btn-icon">📝</div>
              <div className="btn-text">
                <div className="btn-title">오답노트 보기</div>
                <div className="btn-subtitle">틀린 문제를 다시 한번</div>
              </div>
            </div>
          </button>
          
          <button 
            className="apple-btn tertiary"
            onClick={() => {
              // 결과 공유 기능 (추후 구현)
              alert(`🎯 나의 점수: ${results.score}점 (${results.grade}등급)!
📚 League of English에서 영어 실력을 키워보세요! 🚀

✨ 정답률: ${Math.round((results.correctAnswers / results.totalProblems) * 100)}%
⏱️ 소요시간: ${Math.floor(results.timeSpent / 60)}분 ${results.timeSpent % 60}초`);
            }}
          >
            <div className="btn-content">
              <div className="btn-icon">📤</div>
              <div className="btn-text">
                <div className="btn-title">결과 공유하기</div>
                <div className="btn-subtitle">친구들과 성과를 자랑해보세요</div>
              </div>
            </div>
          </button>
        </div>
      </div>
    );
  }

  return null;
}

// 단어 시험 페이지
function VocabularyPage() {
  return (
    <div className="vocabulary-page">
      <h1>단어 시험</h1>
      <div className="coming-soon">
        <FileText size={64} />
        <p>준비 중입니다</p>
      </div>
    </div>
  );
}

// 통계 페이지
function StatsPage() {
  return (
    <div className="stats-page">
      <h1>학습 통계</h1>
      <div className="coming-soon">
        <BarChart3 size={64} />
        <p>준비 중입니다</p>
      </div>
    </div>
  );
}

// 랭킹 페이지
function RankingPage() {
  return (
    <div className="ranking-page">
      <h1>랭킹</h1>
      <div className="coming-soon">
        <Trophy size={64} />
        <p>준비 중입니다</p>
      </div>
    </div>
  );
}

// 관리자 페이지
function AdminPage() {
  const [file, setFile] = useState(null);
  const [documentForm, setDocumentForm] = useState({
    title: '',
    category: '',
    source: ''
  });
  const [uploading, setUploading] = useState(false);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('upload');

  // 문서 목록 가져오기
  useEffect(() => {
    if (activeTab === 'manage') {
      fetchDocuments();
    }
  }, [activeTab]);

  const fetchDocuments = async () => {
    setLoading(true);
    try {
      const result = await apiCall('/documents');
      setDocuments(result.documents || []);
    } catch (error) {
      console.error('문서 목록 가져오기 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (docId) => {
    if (!window.confirm('정말로 이 문서를 삭제하시겠습니까?')) {
      return;
    }

    try {
      await apiCall(`/documents/${docId}`, { method: 'DELETE' });
      alert('문서가 삭제되었습니다.');
      fetchDocuments();
    } catch (error) {
      alert('삭제 실패: ' + error.message);
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    
    if (!file) {
      alert('파일을 선택해주세요!');
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('title', documentForm.title);
    formData.append('category', documentForm.category);
    formData.append('source', documentForm.source);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/upload-document`, {
        method: 'POST',
        headers: {
          ...(token && { 'Authorization': `Bearer ${token}` })
        },
        body: formData
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || '업로드 실패');
      }
      
      if (data.success) {
        alert('문서 업로드 성공!');
        setFile(null);
        setDocumentForm({ title: '', category: '', source: '' });
      }
    } catch (error) {
      alert('업로드 실패: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="admin-page">
      <h1>🛠️ 관리자 페이지</h1>
      
      <div className="admin-tabs">
        <button 
          className={activeTab === 'upload' ? 'active' : ''}
          onClick={() => setActiveTab('upload')}
        >
          <Upload /> 문서 업로드
        </button>
        <button 
          className={activeTab === 'manage' ? 'active' : ''}
          onClick={() => setActiveTab('manage')}
        >
          <FileText /> 문서 관리
        </button>
      </div>

      {activeTab === 'upload' && (
        <div className="upload-section">
          <h2>📄 문서 업로드</h2>
        <form className="upload-form" onSubmit={handleUpload}>
          <div className="form-group">
            <label>문서 제목</label>
            <input
              type="text"
              value={documentForm.title}
              onChange={(e) => setDocumentForm({...documentForm, title: e.target.value})}
              placeholder="예: 2025년 인제고 1학년 2학기 중간고사"
              required
            />
          </div>
          
          <div className="form-group">
            <label>카테고리</label>
            <input
              type="text"
              value={documentForm.category}
              onChange={(e) => setDocumentForm({...documentForm, category: e.target.value})}
              placeholder="예: 모의고사, 내신, 수능특강"
              required
            />
          </div>
          
          <div className="form-group">
            <label>출처</label>
            <input
              type="text"
              value={documentForm.source}
              onChange={(e) => setDocumentForm({...documentForm, source: e.target.value})}
              placeholder="예: 올림포스2 p32"
              required
            />
          </div>

          <div className="form-group">
            <label>파일 선택 (PDF/TXT)</label>
            <div className="file-upload">
              <input
                type="file"
                accept=".pdf,.txt"
                onChange={(e) => setFile(e.target.files[0])}
                required
              />
              {file && (
                <div className="file-info">
                  <FileText size={20} />
                  {file.name}
                </div>
              )}
            </div>
          </div>

          <button type="submit" className="upload-btn" disabled={uploading}>
            <Upload size={20} />
            {uploading ? '업로드 중...' : '문서 업로드'}
          </button>
        </form>
        </div>
      )}

      {activeTab === 'manage' && (
        <div className="manage-section">
          <h2>📚 업로드된 문서 관리</h2>
          
          {loading ? (
            <div className="loading">문서 목록을 불러오는 중...</div>
          ) : documents.length === 0 ? (
            <div className="empty-state">
              <p>업로드된 문서가 없습니다.</p>
            </div>
          ) : (
            <div className="documents-grid">
              {documents.map((doc) => (
                <div key={doc.id} className="document-card">
                  <div className="document-header">
                    <h3>{doc.title || '제목 없음'}</h3>
                    <span className="document-category">{doc.category || '미분류'}</span>
                  </div>
                  <div className="document-info">
                    <p>📖 출처: {doc.source || '출처 미상'}</p>
                    <p>📅 업로드: {new Date(doc.created_at).toLocaleDateString()}</p>
                    <p>📝 학년: {doc.grade || '전체'}</p>
                    <p>🏫 학교: {doc.school || '전체'}</p>
                  </div>
                  <div className="document-actions">
                    <button 
                      className="delete-btn"
                      onClick={() => handleDelete(doc.id)}
                    >
                      <X /> 삭제
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}