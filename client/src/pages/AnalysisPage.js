import React, { useState, useEffect } from 'react';
import { api } from '../services/api.service';
import { analysisStyles } from '../styles/analysisStyles';

const AnalysisPage = () => {
  const [documents, setDocuments] = useState([]);
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [passageAnalyses, setPassageAnalyses] = useState([]);
  const [selectedPassage, setSelectedPassage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [step, setStep] = useState(1); // 1: 문서 선택, 2: 지문 선택, 3: 지문 분석 보기

  useEffect(() => {
    fetchDocumentsList();
  }, []);

  const fetchDocumentsList = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('📋 문서 목록 요청 시작...');
      const response = await api.analysis.list();
      console.log('📋 API 응답 받음:', response);
      
      if (response.success) {
        console.log('📋 성공 - 문서 수:', response.data.length);
        setDocuments(response.data);
      } else {
        console.log('📋 API 성공했지만 success=false:', response);
        setError('분석 가능한 문서를 불러오는데 실패했습니다.');
      }
    } catch (err) {
      console.error('📋 문서 목록 조회 실패:', err);
      console.error('📋 에러 상태:', err.status);
      console.error('📋 에러 메시지:', err.message);
      setError('문서 목록을 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleDocumentClick = async (document) => {
    try {
      setLoading(true);
      setError(null);
      setSelectedDocument(document);
      
      // 해당 문서의 지문별 분석 조회
      const response = await api.analysis.get(document.id);
      if (response.success) {
        setPassageAnalyses(response.data || []);
        setStep(2); // 지문 선택 단계로
      } else {
        setError('지문 분석 결과를 불러오는데 실패했습니다.');
      }
    } catch (err) {
      console.error('지문 분석 조회 실패:', err);
      setError('지문 분석을 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handlePassageClick = (passageAnalysis) => {
    setSelectedPassage(passageAnalysis);
    setStep(3); // 분석 보기 단계로
  };

  const handleBackToDocuments = () => {
    setStep(1);
    setSelectedDocument(null);
    setPassageAnalyses([]);
    setSelectedPassage(null);
  };

  const handleBackToPassages = () => {
    setStep(2);
    setSelectedPassage(null);
  };

  const renderDocumentList = () => (
    <div style={analysisStyles.container}>
      <div style={analysisStyles.header}>
        <h1 style={analysisStyles.title}>📖 문서 분석 자료</h1>
        <p style={analysisStyles.subtitle}>분석할 문서를 선택해주세요</p>
      </div>

      {loading && (
        <div style={analysisStyles.loadingContainer}>
          <div style={analysisStyles.spinner}></div>
          <p>문서 목록을 불러오는 중...</p>
        </div>
      )}

      {error && (
        <div style={analysisStyles.errorContainer}>
          <p>❌ {error}</p>
          <button onClick={fetchDocumentsList} style={analysisStyles.retryButton}>
            다시 시도
          </button>
        </div>
      )}

      {!loading && !error && (
        <div style={analysisStyles.grid}>
          {documents.map((doc) => (
            <div
              key={doc.id}
              style={analysisStyles.card}
              onClick={() => handleDocumentClick(doc)}
            >
              <div style={analysisStyles.cardHeader}>
                <h3 style={analysisStyles.cardTitle}>{doc.title}</h3>
                <span style={analysisStyles.badge}>{doc.category}</span>
              </div>
              <div style={analysisStyles.cardContent}>
                <p><strong>학교:</strong> {doc.school}</p>
                <p><strong>학년:</strong> {doc.grade}학년</p>
                <p><strong>업로드일:</strong> {new Date(doc.created_at).toLocaleDateString()}</p>
              </div>
              <div style={analysisStyles.cardFooter}>
                <span style={analysisStyles.clickHint}>클릭하여 지문 분석 보기 →</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderPassageList = () => (
    <div style={analysisStyles.container}>
      <div style={analysisStyles.header}>
        <button onClick={handleBackToDocuments} style={analysisStyles.backButton}>
          ← 문서 목록으로
        </button>
        <h1 style={analysisStyles.title}>📄 {selectedDocument?.title}</h1>
        <p style={analysisStyles.subtitle}>분석할 지문을 선택해주세요</p>
      </div>

      {loading && (
        <div style={analysisStyles.loadingContainer}>
          <div style={analysisStyles.spinner}></div>
          <p>지문 분석을 불러오는 중...</p>
        </div>
      )}

      {!loading && passageAnalyses.length === 0 && (
        <div style={analysisStyles.emptyState}>
          <h3>📝 분석이 필요합니다</h3>
          <p>이 문서는 아직 분석되지 않았습니다.</p>
          <button 
            onClick={() => handleDocumentClick(selectedDocument)} 
            style={analysisStyles.analyzeButton}
          >
            지문 분석 시작
          </button>
        </div>
      )}

      {!loading && passageAnalyses.length > 0 && (
        <div style={analysisStyles.passageGrid}>
          {passageAnalyses.map((passage) => (
            <div
              key={passage.id}
              style={analysisStyles.passageCard}
              onClick={() => handlePassageClick(passage)}
            >
              <div style={analysisStyles.passageHeader}>
                <h3>지문 {passage.passageNumber}</h3>
                <span style={analysisStyles.passageBadge}>분석 완료</span>
              </div>
              <div style={analysisStyles.passagePreview}>
                <p>{passage.originalPassage?.substring(0, 150)}...</p>
              </div>
              <div style={analysisStyles.passageFooter}>
                <span>📊 상세 분석 보기 →</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderPassageAnalysis = () => (
    <div style={analysisStyles.container}>
      <div style={analysisStyles.header}>
        <button onClick={handleBackToPassages} style={analysisStyles.backButton}>
          ← 지문 목록으로
        </button>
        <h1 style={analysisStyles.title}>
          📖 {selectedDocument?.title} - 지문 {selectedPassage?.passageNumber}
        </h1>
      </div>

      <div style={analysisStyles.analysisContent}>
        {/* 원문 */}
        <div style={analysisStyles.section}>
          <h2 style={analysisStyles.sectionTitle}>📄 원문</h2>
          <div style={analysisStyles.originalText}>
            {selectedPassage?.originalPassage}
          </div>
        </div>

        {/* 핵심 요약 */}
        <div style={analysisStyles.section}>
          <h2 style={analysisStyles.sectionTitle}>📄 핵심 요약</h2>
          <div style={analysisStyles.summary}>
            {selectedPassage?.summary}
          </div>
        </div>

        {/* 주요 포인트 */}
        <div style={analysisStyles.section}>
          <h2 style={analysisStyles.sectionTitle}>🔑 주요 포인트</h2>
          <ul style={analysisStyles.bulletList}>
            {selectedPassage?.keyPoints?.map((point, index) => (
              <li key={index} style={analysisStyles.bulletItem}>{point}</li>
            ))}
          </ul>
        </div>

        {/* 중요 어휘 */}
        <div style={analysisStyles.section}>
          <h2 style={analysisStyles.sectionTitle}>📚 중요 어휘</h2>
          <div style={analysisStyles.vocabularyGrid}>
            {selectedPassage?.vocabulary?.map((vocab, index) => (
              <div key={index} style={analysisStyles.vocabularyItem}>
                <span style={analysisStyles.word}>{vocab.word}</span>
                <span style={analysisStyles.meaning}>{vocab.meaning}</span>
              </div>
            ))}
          </div>
        </div>

        {/* 문법 포인트 */}
        <div style={analysisStyles.section}>
          <h2 style={analysisStyles.sectionTitle}>✏️ 문법 포인트</h2>
          <ul style={analysisStyles.bulletList}>
            {selectedPassage?.grammarPoints?.map((point, index) => (
              <li key={index} style={analysisStyles.bulletItem}>{point}</li>
            ))}
          </ul>
        </div>

        {/* 학습 가이드 */}
        <div style={analysisStyles.section}>
          <h2 style={analysisStyles.sectionTitle}>📖 학습 가이드</h2>
          <div style={analysisStyles.studyGuide}>
            {selectedPassage?.studyGuide}
          </div>
        </div>

        {/* 이해도 확인 문제 */}
        <div style={analysisStyles.section}>
          <h2 style={analysisStyles.sectionTitle}>❓ 이해도 확인 문제</h2>
          <ol style={analysisStyles.questionList}>
            {selectedPassage?.comprehensionQuestions?.map((question, index) => (
              <li key={index} style={analysisStyles.questionItem}>{question}</li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  );

  // 단계별 렌더링
  if (step === 1) return renderDocumentList();
  if (step === 2) return renderPassageList();
  if (step === 3) return renderPassageAnalysis();

  return null;
};

export default AnalysisPage;