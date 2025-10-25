import React, { useState, useEffect, useCallback } from 'react';
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
import { useAdminDocuments } from '../hooks/useAdminDocuments';
import { useDocumentShare } from '../hooks/useDocumentShare';
import { useFeedbackReports } from '../hooks/useFeedbackReports';
import { useProblemFeedbackReports } from '../hooks/useProblemFeedbackReports';
import { useAdminNotifications } from '../hooks/useAdminNotifications';
import { api } from '../services/api.service';

const initialUploadForm = {
  title: '',
  category: '수능',
  school: '',
  grade: 1,
  type: 'worksheet',
  file: null
};

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
    setDocuments,
    loading: documentsLoading,
    fetchDocuments,
    uploadDocument,
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

  const [categories, setCategories] = useState(['수능', '내신', '모의고사', '기출문제', '기타']);
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

  const pushToast = useCallback((message, tone = 'info') => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, tone }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, 3200);
  }, []);

  const worksheetDocuments = documents.filter((doc) => String(doc.type || '').toLowerCase() !== 'vocabulary');
  const vocabularyDocuments = documents.filter((doc) => String(doc.type || '').toLowerCase() === 'vocabulary');

  useEffect(() => {
    fetchDocuments();
    fetchFeedbackReports();
    fetchProblemReports();
    fetchNotifications();
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

  const handleEdit = async () => {
    try {
      setLoading(true);
      // 문서 수정 API가 없으므로 임시로 삭제 후 재생성하지 않고 클라이언트에서만 업데이트
      const updatedDocuments = documents.map(doc => 
        doc.id === editingDocument.id ? editingDocument : doc
      );
      setDocuments(updatedDocuments);
      
      pushToast('문서 정보가 수정되었습니다.', 'success');
      setShowEditModal(false);
      setEditingDocument(null);
    } catch (error) {
      console.error('수정 실패:', error);
      pushToast('문서 정보를 수정하지 못했습니다.', 'error');
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
    window.alert(`🧠 "${document.title}" 단어장은 홈 화면 상단의 "어휘 훈련" 메뉴에서 Day별 시험을 바로 진행할 수 있어요!\n필요한 Day를 골라 30문항 테스트로 연습해 보세요.`);
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
    <div style={adminStyles.container}>
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
      <div style={adminStyles.header}>
        <h1 style={adminStyles.title}>⚙️ 관리자 페이지</h1>
        <div style={adminStyles.headerButtons}>
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

      <AdminNotificationsPanel
        notifications={notifications}
        loading={notificationsLoading}
        error={notificationsError}
        onRefresh={fetchNotifications}
        onAcknowledge={handleNotificationAcknowledge}
        onResolve={handleNotificationResolve}
      />

      {/* 멤버십 요청 처리/사용자 관리 */}
      <MembershipRequestsPanel />
      <AdminUsersPanel />

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
      />

      <ProblemLibrary documents={documents} />

      <div style={adminStyles.feedbackSection}>
        <div style={adminStyles.feedbackHeader}>
          <h2 style={adminStyles.cardTitle}>🚨 신고된 분석본</h2>
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
              <div key={report.id} style={adminStyles.feedbackItem}>
                <div style={adminStyles.feedbackMeta}>
                  <span>📄 {report.documentTitle || `문서 ${report.document_id}`}</span>
                  <span>지문 {report.passage_number}</span>
                  <span>분석본 {report.variant_index}</span>
                  <span>{new Date(report.created_at).toLocaleString()} 신고</span>
                </div>
                <div style={adminStyles.feedbackReason}>{report.reason || '신고 사유가 작성되지 않았습니다.'}</div>
                <div style={adminStyles.feedbackActions}>
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
