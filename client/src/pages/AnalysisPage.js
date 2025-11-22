import React, { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api.service';
import CommonHero from '../components/common/CommonHero';
import FriendlyError from '../components/common/FriendlyError';
import PassageAnalysis from '../components/admin/PassageAnalysis';
import { analysisStyles as styles } from '../styles/analysisStyles';

const AnalysisPage = () => {
  // URL 파싱 (Custom Router 호환)
  const parts = window.location.pathname.split('/');
  const documentId = parts.length > 2 && parts[1] === 'analysis' ? parts[2] : null;

  const navigate = (path) => {
    window.location.href = path;
  };

  const { user } = useAuth();
  const isProMember = ['pro', 'vip', 'admin', 'teacher'].includes(user?.role) || ['pro', 'vip'].includes(user?.membership);

  const [document, setDocument] = useState(null);
  const [passages, setPassages] = useState([]);
  const [passageAnalyses, setPassageAnalyses] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activePassageIndex, setActivePassageIndex] = useState(null);
  const [generating, setGenerating] = useState(false);

  const fetchDocumentData = useCallback(async () => {
    if (!documentId) return;
    try {
      setLoading(true);
      const [docData, analysisList] = await Promise.all([
        api.documents.get(documentId),
        api.analysis.listPassageSummaries(documentId)
      ]);
      
      setDocument(docData);
      
      // Parse passages from document content
      let parsedPassages = [];
      try {
        const content = JSON.parse(docData.content);
        if (Array.isArray(content.passages)) {
          parsedPassages = content.passages;
        }
      } catch (e) {
        // Fallback split
        parsedPassages = docData.content.split(/\n{2,}/).filter(p => p.trim().length > 0);
      }
      setPassages(parsedPassages);

      // Map analyses
      const analysisMap = {};
      analysisList.forEach(item => {
        analysisMap[item.passage_number] = item;
      });
      setPassageAnalyses(analysisMap);

    } catch (err) {
      console.error('Failed to load analysis data:', err);
      setError('문서 정보를 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, [documentId]);

  useEffect(() => {
    fetchDocumentData();
  }, [fetchDocumentData]);

  const handleGenerateAnalysis = async (passageIndex) => {
    if (generating) return;
    const passageNumber = passageIndex + 1;
    
    // Optimistic update or loading state
    setGenerating(true);
    
    try {
      const result = await api.analysis.generate(documentId, passageNumber);
      // Refresh analyses
      const newAnalysisList = await api.analysis.listPassageSummaries(documentId);
      const analysisMap = {};
      newAnalysisList.forEach(item => {
        analysisMap[item.passage_number] = item;
      });
      setPassageAnalyses(analysisMap);
      
      // Automatically open the newly generated analysis
      setActivePassageIndex(passageIndex);
      alert('분석이 완료되었습니다! 📝');
    } catch (err) {
      alert(err.message || '분석 생성에 실패했습니다.');
    } finally {
      setGenerating(false);
    }
  };

  const handleDeleteVariant = async (passageNumber, variantIndex) => {
    if (!window.confirm('정말 이 분석본을 삭제하시겠습니까?')) return;
    try {
      await api.analysis.deleteVariants(documentId, passageNumber, [variantIndex]);
      // Refresh
      const newAnalysisList = await api.analysis.listPassageSummaries(documentId);
      const analysisMap = {};
      newAnalysisList.forEach(item => {
        analysisMap[item.passage_number] = item;
      });
      setPassageAnalyses(analysisMap);
    } catch (err) {
      alert(err.message || '삭제 실패');
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '100px' }}>
        <div className="spinner"></div>
      </div>
    );
  }

  if (error) {
    return <FriendlyError error={error} onHome={() => navigate('/')} />; 
  }

  // Active Passage View
  if (activePassageIndex !== null) {
    const passageNumber = activePassageIndex + 1;
    const analysisData = passageAnalyses[passageNumber];
    const originalText = passages[activePassageIndex];

    return (
      <div style={styles.container}>
        <button 
          style={styles.backButton} 
          onClick={() => setActivePassageIndex(null)}
        >
          ← 목록으로 돌아가기
        </button>
        
        <PassageAnalysis 
          document={document}
          passage={{ original_passage: originalText, passage_number: passageNumber }}
          analysisData={analysisData}
          onGenerate={() => handleGenerateAnalysis(activePassageIndex)}
          onDeleteVariant={(vIdx) => handleDeleteVariant(passageNumber, vIdx)}
          isGenerating={generating}
          isProMember={isProMember}
        />
      </div>
    );
  }

  // List View
  return (
    <div style={styles.container}>
      <CommonHero
        badge="Analysis Center"
        title={document?.title || '문서 분석'}
        subtitle="AI가 분석한 지문의 핵심 내용과 어휘, 문법 포인트를 확인하세요."
      />

      <div style={styles.gridContainer}>
        {passages.map((passage, idx) => {
          const analysis = passageAnalyses[idx + 1];
          const hasAnalysis = !!analysis;
          const variantsCount = analysis?.variants ? JSON.parse(analysis.variants).length : 0;

          return (
            <div key={idx} style={styles.passageCard} className="tilt-hover">
              <div style={styles.cardHeader}>
                <span style={styles.passageNumber}>Passage {idx + 1}</span>
                {hasAnalysis && <span style={styles.badgeSuccess}>{variantsCount}개 분석본</span>}
              </div>
              
              <div style={styles.previewText}>
                {passage.slice(0, 120)}...
              </div>

              <div style={styles.cardActions}>
                <button
                  style={hasAnalysis ? styles.viewButton : styles.generateButton}
                  onClick={() => hasAnalysis ? setActivePassageIndex(idx) : handleGenerateAnalysis(idx)}
                  disabled={generating}
                >
                  {generating ? '생성 중...' : (hasAnalysis ? '분석 보기' : '✨ AI 분석 생성')}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default AnalysisPage;