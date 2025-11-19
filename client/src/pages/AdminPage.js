import React, { useState, useEffect, useCallback } from 'react';
import * as LucideIcons from 'lucide-react';
import { adminStyles } from '../styles/adminStyles';
import DocumentList from '../components/admin/DocumentList';
import UploadModal from '../components/admin/UploadModal';
import EditModal from '../components/admin/EditModal';
import CategoryModal from '../components/admin/CategoryModal';
import DocumentAnalysis from '../components/admin/DocumentAnalysis';
import PassageAnalysis from '../components/admin/PassageAnalysisRefactored';
import ProblemLibrary from '../components/admin/ProblemLibrary';
import DocumentShareModal from '../components/admin/DocumentShareModal';
import ProblemFeedbackBoard from '../components/admin/ProblemFeedbackBoard';
import AdminNotificationsPanel from '../components/admin/AdminNotificationsPanel';
import AdminUsersPanel from '../components/admin/AdminUsersPanel';
import MembershipRequestsPanel from '../components/admin/MembershipRequestsPanel';
import EagleGuideChip from '../components/common/EagleGuideChip';
import { useAdminDocuments } from '../hooks/useAdminDocuments';
import { useDocumentShare } from '../hooks/useDocumentShare';
import { useFeedbackReports } from '../hooks/useFeedbackReports';
import { useProblemFeedbackReports } from '../hooks/useProblemFeedbackReports';
import { useAdminNotifications } from '../hooks/useAdminNotifications';
import { api } from '../services/api.service';
import { useAuth } from '../contexts/AuthContext';

const initialUploadForm = {
  title: '',
  category: '교과서',
  school: '',
  grade: 1,
  type: 'worksheet',
  file: null
};

  const DEFAULT_EXAM_ID = process.env.REACT_APP_MOCK_EXAM_ID || '2025-10';

const toastStyles = {
  container: {
    position: 'fixed',
    top: 16,
    right: 16,
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    zIndex: 1200
  },
  toast: {
    minWidth: '220px',
    maxWidth: '320px',
    padding: '12px 18px',
    borderRadius: '14px',
    background: 'var(--surface-card)',
    color: 'var(--text-primary)',
    boxShadow: '0 18px 40px rgba(15, 23, 42, 0.22)',
    borderLeft: '4px solid var(--accent-primary)',
    fontSize: '0.95rem'
  },
  info: {
    borderLeftColor: 'var(--accent-primary)'
  },
  success: {
    borderLeftColor: 'var(--success)',
    background: 'var(--success-surface)'
  },
  warning: {
    borderLeftColor: 'var(--warning)',
    background: 'var(--warning-surface)'
  },
  error: {
    borderLeftColor: 'var(--danger)',
    background: 'var(--danger-surface)'
  }
};

const AdminPage = () => {
  const {
    documents,
    loading: documentsLoading,
    fetchDocuments,
    uploadDocument,
    updateDocument,
    deleteDocument,
    fetchShares,
    updateShares
  } = useAdminDocuments();
  const {
    feedbackReports,
    feedbackLoading,
    feedbackError,
    fetchFeedbackReports,
    resolveFeedback
  } = useFeedbackReports();
  const {
    reports: problemReports,
    summary: problemFeedbackSummary,
    loading: problemFeedbackLoading,
    error: problemFeedbackError,
    filters: problemFeedbackFilters,
    fetchReports: fetchProblemReports,
    updateStatus: updateProblemFeedbackStatus
  } = useProblemFeedbackReports();
  const {
    notifications,
    loading: notificationsLoading,
    error: notificationsError,
    fetchNotifications,
    updateNotification
  } = useAdminNotifications();
  const {
    shareState,
    openShareModal,
    closeShareModal,
    changeShareForm,
    saveShare
  } = useDocumentShare(fetchShares, updateShares);
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const isTeacherOnly = user?.role === 'teacher';
  const [isMobile, setIsMobile] = useState(() => (typeof window !== 'undefined' ? window.innerWidth < 880 : false));

  const [categories, setCategories] = useState(['교과서', '모의고사', '부교재', '단어', '기타']);
  const [loading, setLoading] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showAnalysisModal, setShowAnalysisModal] = useState(false);
  const [showPassageAnalysisModal, setShowPassageAnalysisModal] = useState(false);
  const [editingDocument, setEditingDocument] = useState(null);
  const [analyzingDocument, setAnalyzingDocument] = useState(null);
  const [passageAnalyzingDocument, setPassageAnalyzingDocument] = useState(null);
  const [newCategory, setNewCategory] = useState('');
  const [uploadForm, setUploadForm] = useState(initialUploadForm);
  const [toasts, setToasts] = useState([]);
  const [mockExamForm, setMockExamForm] = useState({
    examId: DEFAULT_EXAM_ID,
    questionFile: null,
    answerFile: null
  });
  const [mockExamUploading, setMockExamUploading] = useState(false);
  const [examList, setExamList] = useState([]);
  const [examListLoading, setExamListLoading] = useState(false);
  const [examListError, setExamListError] = useState('');
  const [renameDrafts, setRenameDrafts] = useState({});
  
  // Exam Upload Modal State
  const [examUploadModal, setExamUploadModal] = useState({
    open: false,
    document: null,
    file: null,
    loading: false,
    mode: 'file', // 'file' | 'text'
    textInput: '',
    examTitle: ''
  });

  const pushToast = useCallback((message, tone = 'info') => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, tone }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, 3200);
  }, []);

  // ... (existing useEffects) ...

  const handleOpenExamUpload = (doc) => {
    setExamUploadModal({
      open: true,
      document: doc,
      file: null,
      loading: false,
      mode: 'file',
      textInput: '',
      examTitle: ''
    });
  };

  const handleExamFileChange = (e) => {
    const file = e.target.files[0];
    setExamUploadModal(prev => ({ ...prev, file }));
  };

  const handleExamUploadSubmit = async () => {
    if (examUploadModal.mode === 'file' && !examUploadModal.file) {
      pushToast('기출문제 PDF 파일을 선택해 주세요.', 'warning');
      return;
    }
    if (examUploadModal.mode === 'text' && !examUploadModal.textInput.trim()) {
      pushToast('문제 텍스트를 입력해 주세요.', 'warning');
      return;
    }

    setExamUploadModal(prev => ({ ...prev, loading: true }));
    
    try {
      let response;
      if (examUploadModal.mode === 'file') {
        const formData = new FormData();
        formData.append('file', examUploadModal.file);
        response = await api.admin.documents.uploadExam(examUploadModal.document.id, formData);
      } else {
        response = await api.admin.documents.uploadExamText(examUploadModal.document.id, {
          text: examUploadModal.textInput,
          title: examUploadModal.examTitle || '직접 입력 기출'
        });
      }
      
      pushToast(response.message || '기출문제가 성공적으로 등록되었습니다!', 'success');
      setExamUploadModal({ open: false, document: null, file: null, loading: false, mode: 'file', textInput: '', examTitle: '' });
    } catch (error) {
      console.error('Exam upload error:', error);
      pushToast(error?.message || '기출문제 등록에 실패했습니다.', 'error');
      setExamUploadModal(prev => ({ ...prev, loading: false }));
    }
  };

  const handleExamProblemsDelete = async (doc) => {
    if (!window.confirm(`"${doc.title}"에 등록된 기출문제를 모두 삭제할까요? (복구 불가)`)) return;
    
    try {
      const response = await api.admin.documents.deleteExam(doc.id);
      pushToast(response.message || '기출문제를 모두 삭제했습니다.', 'success');
    } catch (error) {
      console.error('Exam delete error:', error);
      pushToast(error?.message || '기출문제 삭제에 실패했습니다.', 'error');
    }
  };

  const renderExamUploadModal = () => {
    if (!examUploadModal.open) return null;
    const isFile = examUploadModal.mode === 'file';
    
    return (
      <div style={adminStyles.modalOverlay}>
        <div style={adminStyles.modalContent}>
          <h2 style={adminStyles.modalTitle}>🎓 기출문제 등록</h2>
          <p style={{ marginBottom: '16px', color: 'var(--tone-strong)' }}>
            선택한 문서: <strong>{examUploadModal.document?.title}</strong>
          </p>

          {/* Tabs */}
          <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
            <button
              type="button"
              style={{
                padding: '10px 16px',
                borderRadius: '10px',
                border: 'none',
                fontWeight: 700,
                cursor: 'pointer',
                background: isFile ? 'var(--indigo)' : 'var(--surface-soft)',
                color: isFile ? '#fff' : 'var(--text-secondary)'
              }}
              onClick={() => setExamUploadModal(prev => ({ ...prev, mode: 'file' }))}
            >
              📂 PDF 파일
            </button>
            <button
              type="button"
              style={{
                padding: '10px 16px',
                borderRadius: '10px',
                border: 'none',
                fontWeight: 700,
                cursor: 'pointer',
                background: !isFile ? 'var(--indigo)' : 'var(--surface-soft)',
                color: !isFile ? '#fff' : 'var(--text-secondary)'
              }}
              onClick={() => setExamUploadModal(prev => ({ ...prev, mode: 'text' }))}
            >
              📝 텍스트 직접 입력
            </button>
          </div>

          {isFile ? (
            <div style={adminStyles.formGroup}>
              <label style={adminStyles.label}>기출문제 PDF 파일 (문제+정답)</label>
              <input 
                type="file" 
                accept="application/pdf" 
                onChange={handleExamFileChange} 
                style={adminStyles.input}
              />
              <p style={adminStyles.hint}>
                * 텍스트 복사가 가능한 PDF여야 파싱이 가능합니다.<br/>
                * 문제 번호([18])와 정답/해설(18번 - ①) 패턴이 있어야 합니다.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={adminStyles.formGroup}>
                <label style={adminStyles.label}>시험 제목 (선택)</label>
                <input 
                  type="text"
                  value={examUploadModal.examTitle}
                  onChange={(e) => setExamUploadModal(prev => ({ ...prev, examTitle: e.target.value }))}
                  placeholder="예: 2024년 10월 고2 영어"
                  style={adminStyles.input}
                />
              </div>
              <div style={adminStyles.formGroup}>
                <label style={adminStyles.label}>문제 텍스트 붙여넣기</label>
                <textarea
                  value={examUploadModal.textInput}
                  onChange={(e) => setExamUploadModal(prev => ({ ...prev, textInput: e.target.value }))}
                  placeholder={`다음 글의 목적으로... [18]\nDear Mr. Jones...\n① ...\n② ...\n\n[정답 및 해설]\n18번 - ① 해설...`}
                  style={{ 
                    ...adminStyles.input, 
                    minHeight: '300px', 
                    fontFamily: 'monospace', 
                    lineHeight: 1.5,
                    resize: 'vertical'
                  }}
                />
                <p style={adminStyles.hint}>
                  * PDF 뷰어에서 전체 선택(Ctrl+A) -> 복사(Ctrl+C) 후 여기에 붙여넣으세요.<br/>
                  * 텍스트가 깨지지 않고 정확하게 입력됩니다.
                </p>
              </div>
            </div>
          )}

          <div style={adminStyles.modalActions}>
            <button 
              style={adminStyles.secondaryButton} 
              onClick={() => setExamUploadModal({ open: false, document: null, file: null, loading: false, mode: 'file', textInput: '', examTitle: '' })}
              disabled={examUploadModal.loading}
            >
              취소
            </button>
            <button 
              style={adminStyles.primaryButton} 
              onClick={handleExamUploadSubmit}
              disabled={examUploadModal.loading}
            >
              {examUploadModal.loading ? '등록 중... ⏳' : '등록하기'}
            </button>
          </div>
        </div>
      </div>
    );
  };

  // ... (existing render logic) ...

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const handleResize = () => setIsMobile(window.innerWidth < 880);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const responsive = useCallback((base, mobileOverrides = {}) => (
    isMobile ? { ...base, ...(mobileOverrides || {}) } : base
  ), [isMobile]);

  const worksheetDocuments = documents.filter((doc) => String(doc.type || '').toLowerCase() !== 'vocabulary');
  const vocabularyDocuments = documents.filter((doc) => String(doc.type || '').toLowerCase() === 'vocabulary');

  useEffect(() => {
    fetchDocuments();
    fetchFeedbackReports();
    fetchProblemReports();
    fetchNotifications();
    // 모의고사 회차 목록
    (async () => {
      try {
        setExamListLoading(true);
        setExamListError('');
        const resp = await api.mockExam.list();
        setExamList(Array.isArray(resp?.data) ? resp.data : []);
      } catch (error) {
        setExamListError(error?.message || '모의고사 목록을 불러오지 못했습니다.');
      } finally {
        setExamListLoading(false);
      }
    })();
  }, [fetchDocuments, fetchFeedbackReports, fetchProblemReports, fetchNotifications]);

  const handleUploadFormChange = (field, value) => {
    setUploadForm({ ...uploadForm, [field]: value });
  };

  const handleFileChange = (file) => {
    setUploadForm({ ...uploadForm, file });
  };

  const handleUpload = async () => {
    if (!uploadForm.file) {
      pushToast('업로드할 파일을 먼저 선택해 주세요.', 'warning');
      return;
    }
    try {
      setLoading(true);
      await uploadDocument(uploadForm.file, {
        title: uploadForm.title,
        category: uploadForm.category,
        school: uploadForm.school,
        grade: uploadForm.grade,
        type: uploadForm.type
      });

      pushToast('문서가 성공적으로 업로드되었습니다.', 'success');
      setShowUploadModal(false);
      setUploadForm(initialUploadForm);
      await fetchDocuments();
    } catch (error) {
      console.error('업로드 실패:', error);
      pushToast('업로드에 실패했습니다: ' + (error.message || '알 수 없는 오류'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleMockExamFieldChange = (field, value) => {
    setMockExamForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleMockExamFileChange = (field, fileList) => {
    const file = Array.isArray(fileList) ? fileList[0] : fileList?.[0];
    setMockExamForm((prev) => ({ ...prev, [field]: file || null }));
  };

  const handleMockExamUpload = async () => {
    if (!mockExamForm.questionFile || !mockExamForm.answerFile) {
      pushToast('문제지 PDF와 정답/해설 PDF를 모두 선택해 주세요.', 'warning');
      return;
    }

    try {
      setMockExamUploading(true);
      const formData = new FormData();
      const normalizedExamId = (mockExamForm.examId || DEFAULT_EXAM_ID).trim() || DEFAULT_EXAM_ID;
      formData.append('examId', normalizedExamId);
      formData.append('questionPdf', mockExamForm.questionFile);
      formData.append('answerPdf', mockExamForm.answerFile);

      const response = await api.mockExam.upload(formData);
      pushToast(response?.message || '모의고사 PDF가 업데이트되었습니다.', 'success');
      setMockExamForm({
        examId: normalizedExamId,
        questionFile: null,
        answerFile: null
      });
      try {
        const listResp = await api.mockExam.list();
        setExamList(Array.isArray(listResp?.data) ? listResp.data : []);
      } catch {}
    } catch (error) {
      console.error('Mock exam upload failed:', error);
      pushToast(error?.message || '모의고사 PDF를 업로드하지 못했습니다.', 'error');
    } finally {
      setMockExamUploading(false);
    }
  };

  const handleExamRename = async (oldId) => {
    const nextName = String(renameDrafts[oldId] || '').trim();
    if (!nextName) {
      pushToast('새 시험 이름을 입력해 주세요.', 'warning');
      return;
    }
    if (nextName === oldId) {
      pushToast('같은 이름으로는 변경할 수 없어요.', 'warning');
      return;
    }
    try {
      const resp = await api.mockExam.rename(oldId, nextName);
      if (!resp?.success) throw new Error(resp?.message || '이름을 변경하지 못했습니다.');
      pushToast('시험 이름을 변경했어요.', 'success');
      const listResp = await api.mockExam.list();
      setExamList(Array.isArray(listResp?.data) ? listResp.data : []);
      setRenameDrafts((prev) => ({ ...prev, [oldId]: '' }));
    } catch (error) {
      pushToast(error?.message || '시험 이름을 변경하지 못했습니다.', 'error');
    }
  };

  const handleExamDelete = async (examId) => {
    if (!window.confirm('해당 시험을 정말 삭제할까요? (폴더 전체가 지워집니다)')) return;
    try {
      const resp = await api.mockExam.delete(examId);
      if (!resp?.success) throw new Error(resp?.message || '삭제하지 못했습니다.');
      pushToast('시험을 삭제했어요.', 'success');
      const listResp = await api.mockExam.list();
      setExamList(Array.isArray(listResp?.data) ? listResp.data : []);
    } catch (error) {
      pushToast(error?.message || '시험을 삭제하지 못했습니다.', 'error');
    }
  };

  const renderFileName = (file) => (file ? file.name : '선택된 파일이 없습니다.');

  const handleEdit = async () => {
    try {
      setLoading(true);
      const payload = {
        title: (editingDocument.title || '').trim(),
        category: editingDocument.category || null,
        school: (editingDocument.school || '').trim() || null,
        grade: Number.isInteger(editingDocument.grade) ? editingDocument.grade : null
      };

      await updateDocument(editingDocument.id, payload);

      pushToast('문서 정보가 수정되었습니다.', 'success');
      setShowEditModal(false);
      setEditingDocument(null);
      await fetchDocuments();
    } catch (error) {
      console.error('수정 실패:', error);
      pushToast(error?.message || '문서 정보를 수정하지 못했습니다.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDocumentEdit = (doc) => {
    setEditingDocument({...doc});
    setShowEditModal(true);
  };

  const handleDocumentAnalyze = (doc) => {
    setAnalyzingDocument(doc);
    setShowAnalysisModal(true);
  };

  const handleDocumentShare = async (doc) => {
    try {
      await openShareModal(doc);
    } catch (error) {
      console.error('문서 공개 범위 조회 실패:', error);
      pushToast(error?.message || '문서 공개 범위를 불러오지 못했습니다.', 'error');
    }
  };

  const handleShareFormChange = (form) => {
    changeShareForm({
      public: Boolean(form.public),
      schools: form.schools || '',
      grades: form.grades || '',
      students: form.students || ''
    });
  };

  const handleShareSave = async ({ public: isPublic, schools, grades, students }) => {
    try {
      await saveShare({
        public: Boolean(isPublic),
        schools,
        grades,
        students
      });
      pushToast('문서 공개 설정이 저장되었습니다.', 'success');
    } catch (error) {
      console.error('문서 공개 설정 저장 실패:', error);
      pushToast(error?.message || '문서를 공개하는 중 문제가 발생했습니다.', 'error');
    }
  };

  const handleEditingDocumentChange = (field, value) => {
    setEditingDocument({ ...editingDocument, [field]: value });
  };

  const handleDelete = async (documentId) => {
    if (!window.confirm('정말로 이 문서를 삭제하시겠습니까?')) {
      return;
    }

    try {
      setLoading(true);
      await deleteDocument(documentId);
      pushToast('문서가 삭제되었습니다.', 'success');
      await fetchDocuments();
    } catch (error) {
      console.error('삭제 실패:', error);
      pushToast('문서를 삭제하지 못했습니다.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleAddCategory = (categoryName) => {
    setCategories([...categories, categoryName]);
    setNewCategory('');
    setShowCategoryModal(false);
    pushToast('카테고리가 추가되었습니다.', 'success');
  };

  const handlePassageAnalyze = (document) => {
    setPassageAnalyzingDocument(document);
    setShowPassageAnalysisModal(true);
  };

  const handleVocabularyPreview = (document) => {
    window.alert(
      `🧠 "${document.title}" 단어장은 홈 화면 상단의 "어휘 훈련"에서 바로 시험을 볼 수 있어요!\n` +
      `워드마스터는 Day 단위, 모의고사는 번호(noXX) 단위, 교과서는 과 단위로 선택해 시작해 보세요.`
    );
  };

  const handleResolveFeedback = async (feedbackId, status) => {
    try {
      await resolveFeedback(feedbackId, status);
      pushToast(status === 'resolved' ? '신고를 검수 완료로 표시했어요. ✅' : '신고를 허위 신고로 정리했습니다. 🙅‍♀️', 'success');
    } catch (error) {
      console.error('신고 상태 변경 실패:', error);
      pushToast(error?.message || '신고 상태를 변경하는 중 문제가 발생했습니다.', 'error');
    }
  };

  const handleResolveProblemFeedback = async (reportId) => {
    try {
      await updateProblemFeedbackStatus(reportId, 'resolved');
      pushToast('문항 신고를 검수 완료로 표시했어요. 👍', 'success');
    } catch (error) {
      console.error('문항 신고 처리 실패:', error);
      pushToast(error?.message || '문항 신고를 처리하는 중 문제가 발생했습니다.', 'error');
    }
  };

  const handleDismissProblemFeedback = async (reportId) => {
    try {
      await updateProblemFeedbackStatus(reportId, 'dismissed');
      pushToast('문항 신고를 보류 처리했어요.', 'info');
    } catch (error) {
      console.error('문항 신고 보류 실패:', error);
      pushToast(error?.message || '문항 신고를 보류 처리하는 중 오류가 발생했습니다.', 'error');
    }
  };

  const handleDeactivateProblem = async (report) => {
    if (!report || !report.problem || !report.problem.id) {
      pushToast('문항 정보를 찾지 못했어요. 페이지를 새로고침해 주세요.', 'warning');
      return;
    }
    if (report.problem.isActive === false) {
      pushToast('이미 숨긴 문항이에요. ✅', 'info');
      return;
    }

    const confirmHide = window.confirm('이 문항을 학생들에게서 숨길까요? 숨기면 새로운 세트에서도 나오지 않아요.');
    if (!confirmHide) return;

    const defaultReason = report.reason ? report.reason.slice(0, 80) : '';
    const reasonInput = window.prompt('숨기는 이유를 간단히 적어주세요. (예: 정답 오류, 지문 불일치)', defaultReason);
    if (reasonInput === null) return;

    try {
      await api.admin.problems.deactivate(report.problem.id, {
        reason: reasonInput?.trim() || undefined,
        feedbackId: report.id
      });
      pushToast('문항을 잠시 쉬게 했어요. 🚫', 'success');
      fetchProblemReports();
    } catch (error) {
      console.error('문항 숨김 처리 실패:', error);
      pushToast(error?.message || '문항을 숨기지 못했어요. 잠시 후 다시 시도해 주세요.', 'error');
    }
  };

  const handleNotificationAcknowledge = async (notificationId) => {
    try {
      await updateNotification(notificationId, 'acknowledged');
    } catch (error) {
      console.error('알림 확인 실패:', error);
      pushToast(error?.message || '알림을 확인 상태로 바꾸지 못했어요.', 'error');
    }
  };

  const handleNotificationResolve = async (notificationId) => {
    try {
      await updateNotification(notificationId, 'resolved');
    } catch (error) {
      console.error('알림 완료 처리 실패:', error);
      pushToast(error?.message || '알림을 완료 상태로 바꾸지 못했어요.', 'error');
    }
  };

  return (
    <div style={responsive(adminStyles.container, adminStyles.containerMobile)}>
      {toasts.length > 0 && (
        <div style={toastStyles.container}>
          {toasts.map((toast) => (
            <div
              key={toast.id}
              style={{
                ...toastStyles.toast,
                ...(toast.tone === 'error'
                  ? toastStyles.error
                  : toast.tone === 'success'
                    ? toastStyles.success
                    : toast.tone === 'warning'
                      ? toastStyles.warning
                      : toastStyles.info)
              }}
            >
              {toast.message}
            </div>
          ))}
        </div>
      )}
      <div style={{
        ...responsive(adminStyles.header, adminStyles.headerMobile),
        ...(isTeacherOnly ? { alignItems: 'flex-start', gap: '12px' } : {})
      }}>
        <div>
          <h1 style={responsive(adminStyles.title, adminStyles.titleMobile)}>{isAdmin ? '⚙️ 관리자 페이지' : '🍎 선생님 모드'}</h1>
          {isTeacherOnly && (
            <p style={{ margin: '6px 0 0', color: 'var(--tone-strong)', fontSize: '0.95rem' }}>
              자기 반 학생들의 학습 기록을 편하게 확인할 수 있도록 통계 보드도 준비 중이에요. 😊
            </p>
          )}
          <EagleGuideChip text="업로드부터 분석·신고까지 한 화면에서 처리할 수 있어요" variant="accent" />
        </div>
        <div style={{
          ...responsive(adminStyles.headerButtons, adminStyles.headerButtonsMobile),
          ...(isTeacherOnly ? { marginTop: '8px' } : {})
        }}>
          <button 
            style={adminStyles.primaryButton}
            onClick={() => setShowUploadModal(true)}
          >
            📄 문서 추가
          </button>
          <button 
            style={adminStyles.secondaryButton}
            onClick={() => setShowCategoryModal(true)}
          >
            🏷️ 카테고리 관리
          </button>
        </div>
      </div>

      {isAdmin && (
        <section style={responsive(adminStyles.mockExamCard, adminStyles.mockExamCardMobile)}>
          <div style={adminStyles.mockExamGlow} />
          <div style={adminStyles.mockExamContent}>
            <div style={adminStyles.mockExamHeader}>
              <h2 style={adminStyles.mockExamTitle}>🎯 모의고사 원문 업로드</h2>
              <p style={adminStyles.mockExamDescription}>
                문제지와 정답/해설 PDF를 한 번에 업로드해 주세요. 업로드가 끝나면 학생용 모의고사 메뉴에서 즉시 최신 회차로 반영됩니다.
              </p>
              <EagleGuideChip text="문제지와 해설을 반드시 동시에 올려 주세요" variant="warning" />
            </div>

              <div style={responsive(adminStyles.mockExamForm, adminStyles.mockExamFormMobile)}>
              <div style={adminStyles.mockExamField}>
                <label style={adminStyles.mockExamLabel}>시험 이름</label>
                <input
                  type="text"
                  value={mockExamForm.examId}
                  onChange={(event) => handleMockExamFieldChange('examId', event.target.value)}
                  style={adminStyles.mockExamInput}
                  placeholder="예: 2-25-10"
                />
                <span style={adminStyles.mockExamHint}>원하는 이름을 자유롭게 입력해 주세요 (예: 1-25-10, 2-25-10).</span>
              </div>

              <div style={adminStyles.mockExamField}>
                <label style={adminStyles.mockExamLabel}>문제지 PDF <span style={adminStyles.mockExamRequired}>*</span></label>
                <input
                  id="mockExamQuestionFile"
                  type="file"
                  accept="application/pdf"
                  onChange={(event) => handleMockExamFileChange('questionFile', event.target.files)}
                  style={adminStyles.mockExamFileInput}
                />
                <span style={adminStyles.mockExamFileName}>{renderFileName(mockExamForm.questionFile)}</span>
              </div>

              <div style={adminStyles.mockExamField}>
                <label style={adminStyles.mockExamLabel}>정답/해설 PDF <span style={adminStyles.mockExamRequired}>*</span></label>
                <input
                  id="mockExamAnswerFile"
                  type="file"
                  accept="application/pdf"
                  onChange={(event) => handleMockExamFileChange('answerFile', event.target.files)}
                  style={adminStyles.mockExamFileInput}
                />
                <span style={adminStyles.mockExamFileName}>{renderFileName(mockExamForm.answerFile)}</span>
              </div>
            </div>

            <div style={responsive(adminStyles.mockExamActions, adminStyles.mockExamActionsMobile)}>
              <button
                type="button"
                style={{
                  ...adminStyles.mockExamUploadButton,
                  ...(mockExamUploading ? adminStyles.mockExamUploadButtonDisabled : {})
                }}
                onClick={handleMockExamUpload}
                disabled={mockExamUploading}
              >
                <LucideIcons.UploadCloud size={18} /> {mockExamUploading ? '업로드 중...' : '모의고사 업데이트'}
              </button>
              <p style={adminStyles.mockExamTip}>※ PDF는 10MB 이하가 권장되며, 업로드 직후 학생 화면에서 새로운 시험이 제공됩니다.</p>
            </div>
          </div>
        </section>
      )}

      {isAdmin && (
        <section style={responsive(adminStyles.mockExamCard, adminStyles.mockExamCardMobile)}>
          <div style={adminStyles.mockExamGlow} />
          <div style={adminStyles.mockExamContent}>
            <div style={adminStyles.mockExamHeader}>
              <h2 style={adminStyles.mockExamTitle}>🗂️ 업로드된 회차 관리</h2>
              <p style={adminStyles.mockExamDescription}>등록된 시험 이름을 바꾸거나 삭제할 수 있어요.</p>
              <EagleGuideChip text="이름 변경 후 학생 화면 목록에도 즉시 반영됩니다" variant="accent" />
            </div>

            {examListLoading ? (
              <div style={adminStyles.notice}>목록을 불러오는 중입니다…</div>
            ) : examListError ? (
              <div style={{ ...adminStyles.notice, color: 'var(--danger-strong)' }}>{examListError}</div>
            ) : examList.length === 0 ? (
              <div style={adminStyles.notice}>아직 업로드된 회차가 없어요. 위에서 먼저 올려 보세요.</div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '10px' }}>
                {examList.map((exam) => (
                  <div key={exam.id} style={{
                    display: 'grid',
                    gridTemplateColumns: 'minmax(140px, 1fr) minmax(220px, 2fr) auto auto',
                    gap: '10px',
                    alignItems: 'center',
                    background: 'var(--surface-card)',
                    border: '1px solid var(--surface-border)',
                    borderRadius: '12px',
                    padding: '12px 14px'
                  }}>
                    <div style={{ fontWeight: 700 }}>{exam.id}</div>
                    <div style={{ color: 'var(--tone-strong)' }}>{exam.title || '제목 없음'}</div>
                    <input
                      type="text"
                      placeholder="새 시험 이름"
                      value={renameDrafts[exam.id] || ''}
                      onChange={(e) => setRenameDrafts((prev) => ({ ...prev, [exam.id]: e.target.value }))}
                      style={{
                        border: '1px solid var(--surface-border)',
                        borderRadius: '8px',
                        padding: '8px 10px'
                      }}
                    />
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        type="button"
                        style={adminStyles.secondaryButton}
                        onClick={() => handleExamRename(exam.id)}
                      >
                        이름 변경
                      </button>
                      <button
                        type="button"
                        style={adminStyles.dangerButton || adminStyles.secondaryButton}
                        onClick={() => handleExamDelete(exam.id)}
                      >
                        삭제
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      <AdminNotificationsPanel
        notifications={notifications}
        loading={notificationsLoading}
        error={notificationsError}
        onRefresh={fetchNotifications}
        onAcknowledge={handleNotificationAcknowledge}
        onResolve={handleNotificationResolve}
      />

      {/* 멤버십 요청 처리/사용자 관리는 관리자만 접근 */}
      {isAdmin && (
        <>
          <MembershipRequestsPanel />
          <AdminUsersPanel />
        </>
      )}

      <ProblemFeedbackBoard
        reports={problemReports}
        summary={problemFeedbackSummary}
        loading={problemFeedbackLoading}
        error={problemFeedbackError}
        filters={problemFeedbackFilters}
        documents={documents}
        onRefresh={fetchProblemReports}
        onFilterChange={fetchProblemReports}
        onResolve={handleResolveProblemFeedback}
        onDismiss={handleDismissProblemFeedback}
        onToast={pushToast}
        onDeactivate={handleDeactivateProblem}
      />

      <DocumentList
        title="📘 문제 학습 자료"
        emptyMessage="아직 문제 학습용 지문이 없어요. PDF를 업로드하고 분석/문제 생성을 시작해볼까요?"
        documents={worksheetDocuments}
        loading={documentsLoading || loading}
        onEdit={handleDocumentEdit}
        onDelete={handleDelete}
        onAnalyze={handleDocumentAnalyze}
        onPassageAnalyze={handlePassageAnalyze}
        onShare={handleDocumentShare}
        onExamUpload={handleOpenExamUpload}
        onExamDelete={handleExamProblemsDelete}
        isMobile={isMobile}
      />

      <DocumentList
        title="🧠 단어장 자료"
        emptyMessage="업로드된 단어장이 아직 없어요. 단어장을 올리면 어휘 훈련 메뉴에서 바로 시험을 볼 수 있어요."
        documents={vocabularyDocuments}
        loading={documentsLoading || loading}
        onEdit={handleDocumentEdit}
        onDelete={handleDelete}
        onShare={handleDocumentShare}
        onVocabularyPreview={handleVocabularyPreview}
        isMobile={isMobile}
      />

      <ProblemLibrary documents={documents} />

      {/* ... feedback section ... */}

      {renderExamUploadModal()}

      <div style={responsive(adminStyles.feedbackSection, adminStyles.feedbackSectionMobile)}>
        <div style={responsive(adminStyles.feedbackHeader, adminStyles.feedbackHeaderMobile)}>
          <h2 style={responsive(adminStyles.cardTitle, adminStyles.cardTitleMobile)}>🚨 신고된 분석본</h2>
          <span style={adminStyles.feedbackBadge}>{feedbackReports.length}건 대기</span>
        </div>
        {feedbackError && <div style={adminStyles.feedbackError}>{feedbackError}</div>}
        {feedbackLoading ? (
          <div style={adminStyles.loading}>신고 목록을 불러오는 중이에요...</div>
        ) : feedbackReports.length === 0 ? (
          <div style={adminStyles.feedbackEmpty}>현재 확인해야 할 신고가 없어요. 학생들이 도움이 되는 분석본을 잘 활용하고 있군요! 😊</div>
        ) : (
          <div style={adminStyles.feedbackList}>
            {feedbackReports.map((report) => (
              <div key={report.id} style={responsive(adminStyles.feedbackItem, adminStyles.feedbackItemMobile)}>
                <div style={responsive(adminStyles.feedbackMeta, adminStyles.feedbackMetaMobile)}>
                  <span>📄 {report.documentTitle || `문서 ${report.document_id}`}</span>
                  <span>지문 {report.passage_number}</span>
                  <span>분석본 {report.variant_index}</span>
                  <span>{new Date(report.created_at).toLocaleString()} 신고</span>
                </div>
                <div style={adminStyles.feedbackReason}>{report.reason || '신고 사유가 작성되지 않았습니다.'}</div>
                <div style={responsive(adminStyles.feedbackActions, adminStyles.feedbackActionsMobile)}>
                  <button
                    type="button"
                    style={adminStyles.feedbackActionResolve}
                    onClick={() => handleResolveFeedback(report.id, 'resolved')}
                  >
                    ✅ 검수 완료
                  </button>
                  <button
                    type="button"
                    style={adminStyles.feedbackActionDismiss}
                    onClick={() => handleResolveFeedback(report.id, 'dismissed')}
                  >
                    🙅 허위 신고
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <UploadModal
        show={showUploadModal}
        loading={loading}
        categories={categories}
        uploadForm={uploadForm}
        onClose={() => setShowUploadModal(false)}
        onSubmit={handleUpload}
        onFormChange={handleUploadFormChange}
        onFileChange={handleFileChange}
        onOpenCategoryManager={() => setShowCategoryModal(true)}
      />

      <EditModal
        show={showEditModal}
        loading={loading}
        categories={categories}
        editingDocument={editingDocument}
        onClose={() => {
          setShowEditModal(false);
          setEditingDocument(null);
        }}
        onSubmit={handleEdit}
        onDocumentChange={handleEditingDocumentChange}
      />

      <CategoryModal
        show={showCategoryModal}
        categories={categories}
        newCategory={newCategory}
        onClose={() => setShowCategoryModal(false)}
        onAddCategory={handleAddCategory}
        onNewCategoryChange={setNewCategory}
      />

      {showAnalysisModal && analyzingDocument && (
        <DocumentAnalysis
          document={analyzingDocument}
          onClose={() => {
            setShowAnalysisModal(false);
            setAnalyzingDocument(null);
          }}
        />
      )}

      {showPassageAnalysisModal && passageAnalyzingDocument && (
        <PassageAnalysis
          document={passageAnalyzingDocument}
          onClose={() => {
            setShowPassageAnalysisModal(false);
            setPassageAnalyzingDocument(null);
          }}
        />
      )}

      <DocumentShareModal
        show={shareState.visible}
        loading={shareState.loading}
        documentTitle={shareState.document?.title || ''}
        shareForm={shareState.form}
        onChange={handleShareFormChange}
        onClose={closeShareModal}
        onSave={handleShareSave}
      />
    </div>
  );
};


export default AdminPage;
