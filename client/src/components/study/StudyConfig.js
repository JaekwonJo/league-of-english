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
    difficulty: 'basic',
    documentId: null,
    types: problemTypes.defaultCounts.basic
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadDocuments();
  }, []);

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
    setConfig(prev => ({
      ...prev,
      types: {
        ...prev.types,
        [type]: newValue
      }
    }));
  };

  const getTotalProblems = () => {
    return Object.values(config.types).reduce((sum, count) => sum + count, 0);
  };

  const resetTypes = () => {
    setConfig(prev => ({
      ...prev,
      types: problemTypes.defaultCounts[config.difficulty]
    }));
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

      {/* 난이도 선택 */}
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>🎯 난이도</h3>
        <div style={styles.difficultyGrid}>
          {['basic', 'medium', 'advanced'].map(level => (
            <label key={level} style={styles.radioLabel}>
              <input
                type="radio"
                name="difficulty"
                value={level}
                checked={config.difficulty === level}
                onChange={(e) => {
                  setConfig(prev => ({
                    ...prev,
                    difficulty: e.target.value,
                    types: problemTypes.defaultCounts[e.target.value]
                  }));
                }}
              />
              <span>{level === 'basic' ? '기본' : level === 'medium' ? '중급' : '고급'}</span>
            </label>
          ))}
        </div>
      </div>

      {/* 문제 유형 설정 */}
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>
          📝 문제 유형 (총 {getTotalProblems()}문제)
        </h3>
        <button onClick={resetTypes} style={styles.resetButton}>
          초기화
        </button>

        <div style={styles.typeGrid}>
          {Object.entries(problemTypes.problemTypes).map(([type, info]) => (
            <div key={type} style={styles.typeCard}>
              <div style={styles.typeHeader}>
                <span style={styles.typeIcon}>{info.icon}</span>
                <span style={styles.typeName}>{info.name}</span>
              </div>
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
        <button
          style={styles.startButton}
          onClick={handleStart}
          disabled={!config.documentId || getTotalProblems() === 0}
        >
          학습 시작 ({getTotalProblems()}문제)
        </button>
      </div>
    </div>
  );
};

const styles = {
  container: {
    maxWidth: '800px',
    margin: '0 auto',
    padding: '20px'
  },
  title: {
    fontSize: '28px',
    marginBottom: '30px',
    textAlign: 'center'
  },
  section: {
    background: 'white',
    borderRadius: '15px',
    padding: '20px',
    marginBottom: '20px',
    boxShadow: '0 5px 15px rgba(0, 0, 0, 0.08)'
  },
  sectionTitle: {
    fontSize: '18px',
    marginBottom: '15px',
    color: '#111827'
  },
  select: {
    width: '100%',
    padding: '12px',
    borderRadius: '10px',
    border: '1px solid #E5E7EB',
    fontSize: '16px'
  },
  difficultyGrid: {
    display: 'flex',
    gap: '15px'
  },
  radioLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 20px',
    background: '#F3F4F6',
    borderRadius: '10px',
    cursor: 'pointer'
  },
  resetButton: {
    float: 'right',
    padding: '8px 16px',
    background: '#F3F4F6',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px'
  },
  typeGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
    gap: '15px',
    marginTop: '20px'
  },
  typeCard: {
    padding: '15px',
    background: '#F9FAFB',
    borderRadius: '10px'
  },
  typeHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    marginBottom: '10px'
  },
  typeIcon: {
    fontSize: '20px'
  },
  typeName: {
    fontSize: '14px',
    fontWeight: 'bold'
  },
  typeControls: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px'
  },
  controlButton: {
    width: '30px',
    height: '30px',
    border: '1px solid #E5E7EB',
    background: 'white',
    borderRadius: '5px',
    cursor: 'pointer',
    fontSize: '18px'
  },
  numberInput: {
    width: '50px',
    padding: '5px',
    textAlign: 'center',
    border: '1px solid #E5E7EB',
    borderRadius: '5px'
  },
  actions: {
    textAlign: 'center',
    marginTop: '30px'
  },
  startButton: {
    padding: '15px 40px',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    border: 'none',
    borderRadius: '10px',
    fontSize: '18px',
    fontWeight: 'bold',
    cursor: 'pointer'
  }
};

export default StudyConfig;