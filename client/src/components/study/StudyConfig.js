/**
 * StudyConfig 컴포넌트
 * 학습 설정 화면
 */

import React, { useState, useEffect } from 'react';
import { api } from '../../services/api.service';
import problemTypes from '../../config/problemTypes.json';
import logger from '../../utils/logger';

const StudyConfig = ({ onStart }) => {
  const [documents, setDocuments] = useState([]);
  const [config, setConfig] = useState({
    mode: 'curriculum',
    documentId: null,
    types: {},
    orderDifficulty: 'basic',
    insertionDifficulty: 'basic'
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadDocuments();
    loadSavedConfig();
  }, []);

  // 저장된 설정 불러오기
  const loadSavedConfig = () => {
    try {
      const saved = localStorage.getItem('studyConfig');
      if (saved) {
        const parsedConfig = JSON.parse(saved);
        console.log('💾 저장된 설정 불러오기:', parsedConfig);
        setConfig(prev => ({
          ...prev,
          types: parsedConfig.types || {},
          orderDifficulty: parsedConfig.orderDifficulty || 'basic',
          insertionDifficulty: parsedConfig.insertionDifficulty || 'basic'
        }));
      } else {
        // 처음 사용자는 모든 타입을 0으로 초기화
        setConfig(prev => ({
          ...prev,
          types: Object.keys(problemTypes.problemTypes).reduce((acc, type) => {
            acc[type] = 0;
            return acc;
          }, {})
        }));
      }
    } catch (error) {
      console.error('설정 불러오기 오류:', error);
      // 오류 시 0으로 초기화
      setConfig(prev => ({
        ...prev,
        types: Object.keys(problemTypes.problemTypes).reduce((acc, type) => {
          acc[type] = 0;
          return acc;
        }, {})
      }));
    }
  };

  // 설정 저장
  const saveConfig = (newConfig) => {
    try {
      localStorage.setItem('studyConfig', JSON.stringify({
        types: newConfig.types,
        orderDifficulty: newConfig.orderDifficulty,
        insertionDifficulty: newConfig.insertionDifficulty
      }));
      console.log('💾 설정 저장 완료:', newConfig.types);
    } catch (error) {
      console.error('설정 저장 오류:', error);
    }
  };

  const loadDocuments = async () => {
    try {
      setLoading(true);
      const docs = await api.documents.list();
      setDocuments(docs);
      if (docs.length > 0) {
        setConfig(prev => ({ ...prev, documentId: docs[0].id }));
      }
    } catch (error) {
      logger.error('Failed to load documents:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTypeChange = (type, value) => {
    const newValue = Math.max(0, Math.min(10, parseInt(value) || 0));
    const newConfig = {
      ...config,
      types: {
        ...config.types,
        [type]: newValue
      }
    };
    setConfig(newConfig);
    saveConfig(newConfig); // 변경사항 즉시 저장
  };

  const getTotalProblems = () => {
    return Object.values(config.types).reduce((sum, count) => sum + count, 0);
  };

  const resetTypes = () => {
    const newConfig = {
      ...config,
      types: Object.keys(problemTypes.problemTypes).reduce((acc, type) => {
        acc[type] = 0;
        return acc;
      }, {})
    };
    setConfig(newConfig);
    saveConfig(newConfig);
    console.log('🔄 모든 문제 개수 초기화 완룼');
  };

  const handleStart = () => {
    if (!config.documentId) {
      alert('문서를 선택해주세요.');
      return;
    }

    if (getTotalProblems() === 0) {
      alert('최소 1개 이상의 문제를 선택해주세요.');
      return;
    }

    logger.info('Study config:', config);
    onStart(config);
  };

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>학습 설정</h1>

      {/* 문서 선택 */}
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>📚 문서 선택</h3>
        <select
          style={styles.select}
          value={config.documentId || ''}
          onChange={(e) => setConfig(prev => ({ ...prev, documentId: e.target.value }))}
          disabled={loading}
        >
          {documents.length === 0 ? (
            <option value="">문서가 없습니다</option>
          ) : (
            documents.map(doc => (
              <option key={doc.id} value={doc.id}>
                {doc.title} ({doc.type})
              </option>
            ))
          )}
        </select>
      </div>



      {/* 문제 유형 설정 */}
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>
          📝 문제 유형 (총 {getTotalProblems()}문제)
        </h3>

        <div style={styles.typeGrid}>
          {Object.entries(problemTypes.problemTypes).map(([type, info]) => (
            <div key={type} style={styles.typeCard}>
              <div style={styles.typeHeader}>
                <span style={styles.typeIcon}>{info.icon}</span>
                <span style={styles.typeName}>{info.name}</span>
              </div>
              
              {/* 순서배열 타입에만 난이도 선택기 추가 */}
              {type === 'order' && (
                <div style={styles.compactDifficultySelector}>
                  <div
                    style={{
                      ...styles.compactDifficultyOption,
                      ...(config.orderDifficulty === 'basic' ? styles.compactDifficultyOptionActive : {})
                    }}
                    onClick={() => {
                      const newConfig = { ...config, orderDifficulty: 'basic' };
                      setConfig(newConfig);
                      saveConfig(newConfig);
                    }}
                  >
                    <div style={styles.compactDifficultyIcon}>🥉</div>
                    <div style={styles.compactDifficultyText}>기본 (A~C)</div>
                  </div>
                  <div
                    style={{
                      ...styles.compactDifficultyOption,
                      ...(config.orderDifficulty === 'advanced' ? styles.compactDifficultyOptionActive : {})
                    }}
                    onClick={() => {
                      const newConfig = { ...config, orderDifficulty: 'advanced' };
                      setConfig(newConfig);
                      saveConfig(newConfig);
                    }}
                  >
                    <div style={styles.compactDifficultyIcon}>🏆</div>
                    <div style={styles.compactDifficultyText}>고급 (A~E)</div>
                  </div>
                </div>
              )}

              {/* 문장삽입은 기본 레벨로 고정 (난이도 선택기 제거) */}
              
              <div style={styles.typeControls}>
                <button
                  style={styles.controlButton}
                  onClick={() => handleTypeChange(type, config.types[type] - 1)}
                >
                  -
                </button>
                <input
                  type="number"
                  style={styles.numberInput}
                  value={config.types[type] || 0}
                  onChange={(e) => handleTypeChange(type, e.target.value)}
                  min="0"
                  max="10"
                />
                <button
                  style={styles.controlButton}
                  onClick={() => handleTypeChange(type, config.types[type] + 1)}
                >
                  +
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 시작 버튼 */}
      <div style={styles.actions}>
        {/* 초기화 버튼 - 시작 버튼 오른쪽에 배치 */}
        <button
          style={styles.resetMainButton}
          onClick={resetTypes}
          title="모든 문제 개수를 0으로 초기화"
        >
          🔄 초기화
        </button>
        
        <button
          style={{
            ...styles.startButton,
            ...((!config.documentId || getTotalProblems() === 0) ? styles.startButtonDisabled : {})
          }}
          onClick={handleStart}
          disabled={!config.documentId || getTotalProblems() === 0}
          onMouseEnter={(e) => {
            if (!e.target.disabled) {
              e.target.style.transform = 'translateY(-3px) scale(1.05)';
              e.target.style.boxShadow = '0 15px 35px rgba(5, 150, 105, 0.6)';
            }
          }}
          onMouseLeave={(e) => {
            if (!e.target.disabled) {
              e.target.style.transform = 'translateY(0) scale(1)';
              e.target.style.boxShadow = '0 10px 25px rgba(5, 150, 105, 0.4)';
            }
          }}
          onMouseDown={(e) => {
            if (!e.target.disabled) {
              e.target.style.transform = 'translateY(-1px) scale(1.02)';
            }
          }}
          onMouseUp={(e) => {
            if (!e.target.disabled) {
              e.target.style.transform = 'translateY(-3px) scale(1.05)';
            }
          }}
        >
          🚀 학습 시작 ({getTotalProblems()}문제)
        </button>
      </div>
    </div>
  );
};

const styles = {
  container: {
    maxWidth: '900px',
    margin: '0 auto',
    padding: '30px',
    background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)',
    minHeight: '100vh',
    color: '#F8FAFC'
  },
  title: {
    fontSize: '36px',
    marginBottom: '40px',
    textAlign: 'center',
    background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    fontWeight: 'bold',
    letterSpacing: '1px'
  },
  section: {
    background: 'rgba(30, 41, 59, 0.8)',
    borderRadius: '20px',
    padding: '30px',
    marginBottom: '30px',
    boxShadow: '0 20px 40px rgba(0, 0, 0, 0.3)',
    border: '1px solid rgba(248, 250, 252, 0.1)',
    backdropFilter: 'blur(10px)'
  },
  sectionTitle: {
    fontSize: '22px',
    marginBottom: '20px',
    color: '#F8FAFC',
    fontWeight: 'bold',
    position: 'relative'
  },
  select: {
    width: '100%',
    padding: '16px',
    borderRadius: '12px',
    border: '2px solid rgba(248, 250, 252, 0.2)',
    fontSize: '16px',
    background: 'rgba(30, 41, 59, 0.9)',
    color: '#F8FAFC',
    outline: 'none',
    transition: 'all 0.3s ease'
  },
  resetButton: {
    position: 'absolute',
    right: '30px',
    top: '50%',
    transform: 'translateY(-50%)',
    width: '35px',
    height: '35px',
    padding: '0',
    background: 'linear-gradient(135deg, #DC2626 0%, #B91C1C 100%)',
    color: 'white',
    border: 'none',
    borderRadius: '50%',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 'bold',
    transition: 'all 0.3s ease',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    ':hover': {
      transform: 'translateY(-50%) scale(1.1)',
      boxShadow: '0 10px 20px rgba(220, 38, 38, 0.3)'
    }
  },
  typeGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
    gap: '20px',
    marginTop: '25px'
  },
  typeCard: {
    padding: '20px',
    background: 'rgba(51, 65, 85, 0.8)',
    borderRadius: '15px',
    border: '1px solid rgba(248, 250, 252, 0.1)',
    transition: 'all 0.3s ease',
    transform: 'translateY(0)'
  },
  typeHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '15px'
  },
  typeIcon: {
    fontSize: '24px'
  },
  typeName: {
    fontSize: '16px',
    fontWeight: 'bold',
    color: '#F8FAFC'
  },
  typeControls: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    justifyContent: 'center'
  },
  controlButton: {
    width: '40px',
    height: '40px',
    border: '2px solid rgba(248, 250, 252, 0.3)',
    background: 'rgba(30, 41, 59, 0.9)',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '20px',
    fontWeight: 'bold',
    color: '#F8FAFC',
    transition: 'all 0.3s ease',
    ':hover': {
      background: 'rgba(59, 130, 246, 0.8)',
      borderColor: '#3B82F6',
      transform: 'scale(1.1)'
    }
  },
  numberInput: {
    width: '60px',
    padding: '8px',
    textAlign: 'center',
    border: '2px solid rgba(248, 250, 252, 0.3)',
    borderRadius: '8px',
    background: 'rgba(30, 41, 59, 0.9)',
    color: '#F8FAFC',
    fontSize: '16px',
    fontWeight: 'bold',
    outline: 'none'
  },
  actions: {
    position: 'relative',
    textAlign: 'center',
    marginTop: '50px'
  },
  resetMainButton: {
    position: 'absolute',
    right: '0',
    top: '50%',
    transform: 'translateY(-50%)',
    padding: '15px 25px',
    background: 'linear-gradient(135deg, #DC2626 0%, #B91C1C 100%)',
    color: 'white',
    border: 'none',
    borderRadius: '12px',
    fontSize: '16px',
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    boxShadow: '0 8px 20px rgba(220, 38, 38, 0.3)',
    ':hover': {
      transform: 'translateY(-50%) scale(1.05)',
      boxShadow: '0 12px 25px rgba(220, 38, 38, 0.4)'
    }
  },
  startButton: {
    padding: '20px 60px',
    background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
    color: 'white',
    border: 'none',
    borderRadius: '15px',
    fontSize: '22px',
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    transform: 'translateY(0)',
    boxShadow: '0 10px 25px rgba(5, 150, 105, 0.4)',
    position: 'relative',
    overflow: 'hidden'
  },
  startButtonDisabled: {
    background: 'linear-gradient(135deg, #64748B 0%, #475569 100%)',
    cursor: 'not-allowed',
    boxShadow: 'none'
  },
  // 컴팩트 난이도 선택기 스타일 (카드 내부용)
  compactDifficultySelector: {
    display: 'flex',
    gap: '8px',
    marginBottom: '12px',
    justifyContent: 'center'
  },
  compactDifficultyOption: {
    display: 'flex',
    alignItems: 'center',
    padding: '8px 12px',
    background: 'rgba(30, 41, 59, 0.6)',
    borderRadius: '8px',
    border: '1px solid rgba(248, 250, 252, 0.1)',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    flex: 1
  },
  compactDifficultyOptionActive: {
    background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.4) 0%, rgba(124, 58, 237, 0.4) 100%)',
    borderColor: '#8B5CF6',
    boxShadow: '0 4px 12px rgba(139, 92, 246, 0.3)'
  },
  compactDifficultyIcon: {
    fontSize: '16px',
    marginRight: '6px'
  },
  compactDifficultyText: {
    fontSize: '11px',
    fontWeight: '600',
    color: '#F8FAFC'
  },
};

export default StudyConfig;