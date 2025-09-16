                                                                                     
                                                                                           
  import React, { useState, useEffect } from 'react';                                      
  import { useAuth } from '../contexts/AuthContext';                                       
  import { api } from '../services/api.service';                                           
  import problemRegistry from '../services/problemRegistry';                               
  import StudyConfig from '../components/study/StudyConfig';                               
  import ProblemDisplay from '../components/study/ProblemDisplay';                         
  import ScoreHUD from '../components/study/ScoreHUD';                                     
  import StudyResult from '../components/study/StudyResult';                               
  import logger from '../utils/logger';                                                    
                                                                                           
  const StudyPage = () => {                                                                
    const { user } = useAuth();                                                            
                                                                                           
    const [mode, setMode] = useState('config'); // config | study | result                 
    const [config, setConfig] = useState(null);                                            
    const [problems, setProblems] = useState([]);                                          
    const [currentIndex, setCurrentIndex] = useState(0);                                   
    const [answers, setAnswers] = useState({});                                            
    const [timeSpent, setTimeSpent] = useState({});                                        
    const [results, setResults] = useState(null);                                          
    const [loading, setLoading] = useState(false);                                         
    const [error, setError] = useState(null);                                              
                                                                                           
    const [startTime, setStartTime] = useState(null);                                      
    const [currentTime, setCurrentTime] = useState(null);                                  
    const [timeLeft, setTimeLeft] = useState(120);                                         
                                                                                           
    useEffect(() => {                                                                      
      if (mode === 'study' && !startTime) {                                                
        setStartTime(Date.now());                                                          
        const timer = setInterval(() => setCurrentTime(Date.now()), 1000);                 
        return () => clearInterval(timer);                                                 
      }                                                                                    
    }, [mode, startTime]);                                                                 
                                                                                           
    const getTierStep = () => {                                                            
      const order = ['Iron', 'Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond', 'Master',  
  'Challenger'];                                                                           
      const tierName = String(user?.tier?.name || user?.tier || '').toLowerCase();         
      const idx = order.findIndex((label) => label.toLowerCase() === tierName);            
      return Math.max(0, idx);                                                             
    };                                                                                     
                                                                                           
    const getBaseTimePerProblem = () => {                                                  
      const reduction = getTierStep() * 5;                                                 
      return Math.max(60, 120 - reduction);                                                
    };                                                                                     
                                                                                           
    useEffect(() => {                                                                      
      if (mode === 'study') setTimeLeft(getBaseTimePerProblem());                          
      // eslint-disable-next-line react-hooks/exhaustive-deps                              
    }, [mode, currentIndex]);                                                              
                                                                                           
    useEffect(() => {                                                                      
      if (mode !== 'study') return undefined;                                              
      if (timeLeft <= 0) {                                                                 
        if (currentIndex < problems.length - 1) setCurrentIndex((idx) => idx + 1);         
        else finishStudy();                                                                
        return undefined;                                                                  
      }                                                                                    
      const timer = setTimeout(() => setTimeLeft((prev) => prev - 1), 1000);               
      return () => clearTimeout(timer);                                                    
    }, [mode, timeLeft, currentIndex, problems.length]);                                   
                                                                                           
    const startStudy = async (studyConfig) => {                                            
      try {                                                                                
        setLoading(true);                                                                  
        setError(null);                                                                    
        logger.info('Starting study with config:', studyConfig);                           
                                                                                           
        const totalCount = Object.values(studyConfig.types || {}).reduce((sum, count) =>   
  sum + count, 0);                                                                         
        const payload = {                                                                  
          documentId: studyConfig.documentId,                                              
          counts: studyConfig.types,                                                       
          orderDifficulty: studyConfig.orderDifficulty || 'basic',                         
          insertionDifficulty: studyConfig.insertionDifficulty || 'basic',                 
          grammarDifficulty: studyConfig.grammarDifficulty || 'basic',                     
          totalCount: Math.max(1, totalCount || 1)                                         
        };                                                                                 
                                                                                           
        const response = await api.post('/generate/csat-set', payload);                    
        const processed = (response.problems || []).map((problem) =>                       
  problemRegistry.executeHandler(problem.type, problem));                                  
                                                                                           
        if (!processed.length) throw new Error('문제를 불러오지 못했습니다.');             
                                                                                           
        setProblems(processed);                                                            
        setConfig(studyConfig);                                                            
        setMode('study');                                                                  
        setStartTime(Date.now());                                                          
        logger.info(`Loaded ${processed.length} problems`);                                
      } catch (err) {                                                                      
        logger.error('Failed to start study:', err);                                       
        const msg = err?.message || '';                                                    
        let clean;                                                                         
        if (/404/.test(msg)) clean = '문서를 찾을 수 없습니다. 다시 선택해 주세요.';       
        else if (/503/.test(msg)) clean = '서버 준비 중입니다. 잠시 후 다시 시도해 주      
  세요.';                                                                                  
        else if (/401|토큰|인증/.test(msg)) clean = '로그인이 필요합니다. 다시 로그인해 주 
  세요.';                                                                                  
        else clean = '요청 처리 중 오류가 발생했습니다. 다시 시도해 주세요.';              
        setError(clean);                                                                   
      } finally {                                                                          
        setLoading(false);                                                                 
      }                                                                                    
    };                                                                                     
                                                                                           
    const handleAnswer = (answer) => {                                                     
      const elapsedForProblem = Date.now() - (startTime + (timeSpent[currentIndex] || 0)); 
      setAnswers((prev) => ({ ...prev, [currentIndex]: answer }));                         
      setTimeSpent((prev) => ({ ...prev, [currentIndex]: (prev[currentIndex] || 0) +       
  elapsedForProblem }));                                                                   
      logger.debug(`Answer submitted for problem ${currentIndex}:`, answer);               
    };                                                                                     
                                                                                           
    const nextProblem = () => {                                                            
      if (currentIndex < problems.length - 1) setCurrentIndex((idx) => idx + 1);           
      else finishStudy();                                                                  
    };                                                                                     
                                                                                           
    const prevProblem = () => {                                                            
      if (currentIndex > 0) setCurrentIndex((idx) => idx - 1);                             
    };                                                                                     
                                                                                           
    const finishStudy = async () => {                                                      
      try {                                                                                
        setLoading(true);                                                                  
        const studyResults = [];                                                           
        let totalCorrect = 0;                                                              
        let totalTime = 0;                                                                 
                                                                                           
        for (let i = 0; i < problems.length; i++) {                                        
          const problem = problems[i];                                                     
          const userAnswer = answers[i];                                                   
          const spent = timeSpent[i] || 0;                                                 
          const isCorrect = String(problem.answer) === String(userAnswer);                 
          if (isCorrect) totalCorrect += 1;                                                
          totalTime += spent;                                                              
          studyResults.push({                                                              
            problem,                                                                       
            userAnswer,                                                                    
            correct: isCorrect,                                                            
            timeSpent: Math.round(spent / 1000)                                            
          });                                                                              
        }                                                                                  
                                                                                           
        const accuracy = problems.length ? Math.round((totalCorrect / problems.length) *   
  100) : 0;                                                                                
                                                                                           
        setResults({                                                                       
          studyResults,                                                                    
          totalProblems: problems.length,                                                  
          totalCorrect,                                                                    
          accuracy,                                                                        
          totalTime: Math.round(totalTime / 1000),                                         
          earnedPoints: totalCorrect * 10 - (studyResults.length - totalCorrect) * 5       
        });                                                                                
                                                                                           
        setMode('result');                                                                 
        logger.info('Study completed:', { totalCorrect, accuracy });                       
      } catch (err) {                                                                      
        logger.error('Failed to finish study:', err);                                      
        setError(err.message);                                                             
      } finally {                                                                          
        setLoading(false);                                                                 
      }                                                                                    
    };                                                                                     
                                                                                           
    const restart = () => {                                                                
      setMode('config');                                                                   
      setProblems([]);                                                                     
      setCurrentIndex(0);                                                                  
      setAnswers({});                                                                      
      setTimeSpent({});                                                                    
      setResults(null);                                                                    
      setStartTime(null);                                                                  
      setCurrentTime(null);                                                                
    };                                                                                     
                                                                                           
    if (loading) {                                                                         
      return (                                                                             
        <div style={styles.loading}>                                                       
          <div style={styles.spinner}></div>                                               
          <p>처리 중...</p>                                                                
        </div>                                                                             
      );                                                                                   
    }                                                                                      
                                                                                           
    if (error) {                                                                           
      return (                                                                             
        <div style={styles.error}>                                                         
          <h2>오류 발생</h2>                                                               
          <p>{error}</p>                                                                   
          <button onClick={restart} style={styles.button}>                                 
            다시 시도                                                                      
          </button>                                                                        
        </div>                                                                             
      );                                                                                   
    }                                                                                      
                                                                                           
    switch (mode) {                                                                        
      case 'config':                                                                       
        return <StudyConfig onStart={startStudy} />;                                       
                                                                                           
      case 'study':                                                                        
        return (                                                                           
          <div style={{ maxWidth: 900, margin: '0 auto', padding: '16px' }}>               
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems:    
  'center', marginBottom: 8 }}>                                                            
              <button                                                                      
                className="no-print"                                                       
                onClick={() => {                                                           
                  if (window.confirm('이 화면을 종료하고 설정 단계로 돌아가시겠습니까?'))  
  setMode('config');                                                                       
                }}                                                                         
                style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid #e5e7eb',
  background: '#fff', cursor: 'pointer' }}                                                 
              >                                                                            
                돌아가기                                                                   
              </button>                                                                    
              <ScoreHUD timeElapsed={currentTime ? Math.round((currentTime - startTime) /  
  1000) : 0} />                                                                            
            </div>                                                                         
            <ProblemDisplay                                                                
              problem={problems[currentIndex]}                                             
              currentIndex={currentIndex}                                                  
              totalProblems={problems.length}                                              
              userAnswer={answers[currentIndex]}                                           
              onAnswer={handleAnswer}                                                      
              onNext={nextProblem}                                                         
              onPrev={prevProblem}                                                         
              onFinish={finishStudy}                                                       
              timeElapsed={currentTime ? Math.round((currentTime - startTime) / 1000) : 0} 
              timeLeft={timeLeft}                                                          
            />                                                                             
          </div>                                                                           
        );                                                                                 
                                                                                           
      case 'result':                                                                       
        return <StudyResult results={results} onRestart={restart} onHome={() =>            
  (window.location.href = '/')} />;                                                        
                                                                                           
      default:                                                                             
        return null;                                                                       
    }                                                                                      
  };                                                                                       
                                                                                           
  const styles = {                                                                         
    loading: {                                                                             
      display: 'flex',                                                                     
      flexDirection: 'column',                                                             
      alignItems: 'center',                                                                
      justifyContent: 'center',                                                            
      minHeight: '400px'                                                                   
    },                                                                                     
    spinner: {                                                                             
      width: '40px',                                                                       
      height: '40px',                                                                      
      border: '4px solid #f3f4f6',                                                         
      borderTop: '4px solid #667eea',                                                      
      borderRadius: '50%',                                                                 
      animation: 'spin 1s linear infinite'                                                 
    },                                                                                     
    error: {                                                                               
      textAlign: 'center',                                                                 
      padding: '40px',                                                                     
      background: 'white',                                                                 
      borderRadius: '20px',                                                                
      maxWidth: '500px',                                                                   
      margin: '50px auto',                                                                 
      boxShadow: '0 10px 30px rgba(0, 0, 0, 0.1)'                                          
    },                                                                                     
    button: {                                                                              
      padding: '12px 24px',                                                                
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',                     
      color: 'white',                                                                      
      border: 'none',                                                                      
      borderRadius: '10px',                                                                
      fontSize: '16px',                                                                    
      fontWeight: 'bold',                                                                  
      cursor: 'pointer',                                                                   
      marginTop: '20px'                                                                    
    }                                                                                      
  };                                                                                       
                                                                                           
  export default StudyPage;
