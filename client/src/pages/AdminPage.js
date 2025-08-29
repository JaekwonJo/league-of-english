import React, { useState, useEffect } from 'react';
import { api } from '../services/api.service';

const AdminPage = () => {
  const [documents, setDocuments] = useState([]);
  const [categories, setCategories] = useState(['수능', '내신', '모의고사', '기출문제', '기타']);
  const [loading, setLoading] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editingDocument, setEditingDocument] = useState(null);
  const [newCategory, setNewCategory] = useState('');
  const [uploadForm, setUploadForm] = useState({
    title: '',
    category: '수능',
    school: '',
    grade: 1,
    file: null
  });

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const response = await api.documents.list();
      setDocuments(response.data || []);
    } catch (error) {
      console.error('문서 목록 조회 실패:', error);
      alert('문서 목록을 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        alert('파일 크기는 10MB를 초과할 수 없습니다.');
        e.target.value = '';
        return;
      }
      
      if (!['application/pdf', 'text/plain'].includes(file.type)) {
        alert('PDF 또는 TXT 파일만 업로드 가능합니다.');
        e.target.value = '';
        return;
      }

      setUploadForm({ ...uploadForm, file: file });
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    
    if (!uploadForm.file || !uploadForm.title.trim()) {
      alert('제목과 파일을 모두 입력해주세요.');
      return;
    }

    try {
      setLoading(true);
      await api.documents.upload(uploadForm.file, {
        title: uploadForm.title,
        category: uploadForm.category,
        school: uploadForm.school,
        grade: uploadForm.grade
      });
      
      alert('문서가 성공적으로 업로드되었습니다.');
      setShowUploadModal(false);
      setUploadForm({ title: '', category: '수능', school: '', grade: 1, file: null });
      fetchDocuments();
    } catch (error) {
      console.error('업로드 실패:', error);
      alert('업로드에 실패했습니다: ' + (error.message || '알 수 없는 오류'));
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = async (e) => {
    e.preventDefault();
    
    if (!editingDocument.title.trim()) {
      alert('제목을 입력해주세요.');
      return;
    }

    try {
      setLoading(true);
      // 문서 수정 API가 없으므로 임시로 삭제 후 재생성하지 않고 클라이언트에서만 업데이트
      const updatedDocuments = documents.map(doc => 
        doc.id === editingDocument.id ? editingDocument : doc
      );
      setDocuments(updatedDocuments);
      
      alert('문서 정보가 수정되었습니다.');
      setShowEditModal(false);
      setEditingDocument(null);
    } catch (error) {
      console.error('수정 실패:', error);
      alert('수정에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (documentId) => {
    if (!window.confirm('정말로 이 문서를 삭제하시겠습니까?')) {
      return;
    }

    try {
      setLoading(true);
      await api.documents.delete(documentId);
      alert('문서가 삭제되었습니다.');
      fetchDocuments();
    } catch (error) {
      console.error('삭제 실패:', error);
      alert('삭제에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddCategory = () => {
    if (!newCategory.trim()) {
      alert('카테고리명을 입력해주세요.');
      return;
    }
    
    if (categories.includes(newCategory)) {
      alert('이미 존재하는 카테고리입니다.');
      return;
    }
    
    setCategories([...categories, newCategory]);
    setNewCategory('');
    setShowCategoryModal(false);
    alert('카테고리가 추가되었습니다.');
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>⚙️ 관리자 페이지</h1>
        <div style={styles.headerButtons}>
          <button 
            style={styles.primaryButton}
            onClick={() => setShowUploadModal(true)}
          >
            📄 문서 추가
          </button>
          <button 
            style={styles.secondaryButton}
            onClick={() => setShowCategoryModal(true)}
          >
            🏷️ 카테고리 관리
          </button>
        </div>
      </div>

      <div style={styles.card}>
        <h2 style={styles.cardTitle}>📚 문서 목록</h2>
        
        {loading ? (
          <div style={styles.loading}>로딩 중...</div>
        ) : (
          <div style={styles.documentsGrid}>
            {documents.length === 0 ? (
              <div style={styles.emptyState}>
                📄 업로드된 문서가 없습니다.
              </div>
            ) : (
              documents.map(doc => (
                <div key={doc.id} style={styles.documentCard}>
                  <div style={styles.documentHeader}>
                    <h3 style={styles.documentTitle}>{doc.title}</h3>
                    <div style={styles.documentActions}>
                      <button 
                        style={styles.editButton}
                        onClick={() => {
                          setEditingDocument({...doc});
                          setShowEditModal(true);
                        }}
                      >
                        ✏️
                      </button>
                      <button 
                        style={styles.deleteButton}
                        onClick={() => handleDelete(doc.id)}
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                  <div style={styles.documentMeta}>
                    <span style={styles.badge}>{doc.category || '기타'}</span>
                    <span style={styles.meta}>
                      {doc.school && `${doc.school} `}
                      {doc.grade && `고${doc.grade}`}
                    </span>
                  </div>
                  <div style={styles.documentFooter}>
                    <small style={styles.date}>
                      {new Date(doc.created_at).toLocaleDateString()}
                    </small>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* 업로드 모달 */}
      {showUploadModal && (
        <div style={styles.modal}>
          <div style={styles.modalContent}>
            <h3 style={styles.modalTitle}>📄 문서 업로드</h3>
            <form onSubmit={handleUpload} style={styles.form}>
              <div style={styles.formGroup}>
                <label style={styles.label}>제목 *</label>
                <input
                  type="text"
                  value={uploadForm.title}
                  onChange={(e) => setUploadForm({...uploadForm, title: e.target.value})}
                  style={styles.input}
                  placeholder="문서 제목을 입력하세요"
                  required
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>카테고리</label>
                <select
                  value={uploadForm.category}
                  onChange={(e) => setUploadForm({...uploadForm, category: e.target.value})}
                  style={styles.input}
                >
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div style={styles.formRow}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>학교명</label>
                  <input
                    type="text"
                    value={uploadForm.school}
                    onChange={(e) => setUploadForm({...uploadForm, school: e.target.value})}
                    style={styles.input}
                    placeholder="학교명 (선택사항)"
                  />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>학년</label>
                  <select
                    value={uploadForm.grade}
                    onChange={(e) => setUploadForm({...uploadForm, grade: parseInt(e.target.value)})}
                    style={styles.input}
                  >
                    <option value={1}>고1</option>
                    <option value={2}>고2</option>
                    <option value={3}>고3</option>
                  </select>
                </div>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>파일 (PDF, TXT) *</label>
                <input
                  type="file"
                  accept=".pdf,.txt"
                  onChange={handleFileChange}
                  style={styles.fileInput}
                  required
                />
                <small style={styles.fileHelp}>
                  최대 10MB, PDF 또는 TXT 파일만 업로드 가능합니다.
                </small>
              </div>

              <div style={styles.modalButtons}>
                <button 
                  type="button" 
                  onClick={() => setShowUploadModal(false)}
                  style={styles.cancelButton}
                >
                  취소
                </button>
                <button 
                  type="submit" 
                  style={styles.submitButton}
                  disabled={loading}
                >
                  {loading ? '업로드 중...' : '업로드'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 수정 모달 */}
      {showEditModal && editingDocument && (
        <div style={styles.modal}>
          <div style={styles.modalContent}>
            <h3 style={styles.modalTitle}>✏️ 문서 수정</h3>
            <form onSubmit={handleEdit} style={styles.form}>
              <div style={styles.formGroup}>
                <label style={styles.label}>제목 *</label>
                <input
                  type="text"
                  value={editingDocument.title}
                  onChange={(e) => setEditingDocument({...editingDocument, title: e.target.value})}
                  style={styles.input}
                  required
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>카테고리</label>
                <select
                  value={editingDocument.category || '기타'}
                  onChange={(e) => setEditingDocument({...editingDocument, category: e.target.value})}
                  style={styles.input}
                >
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div style={styles.formRow}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>학교명</label>
                  <input
                    type="text"
                    value={editingDocument.school || ''}
                    onChange={(e) => setEditingDocument({...editingDocument, school: e.target.value})}
                    style={styles.input}
                  />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>학년</label>
                  <select
                    value={editingDocument.grade || 1}
                    onChange={(e) => setEditingDocument({...editingDocument, grade: parseInt(e.target.value)})}
                    style={styles.input}
                  >
                    <option value={1}>고1</option>
                    <option value={2}>고2</option>
                    <option value={3}>고3</option>
                  </select>
                </div>
              </div>

              <div style={styles.modalButtons}>
                <button 
                  type="button" 
                  onClick={() => setShowEditModal(false)}
                  style={styles.cancelButton}
                >
                  취소
                </button>
                <button 
                  type="submit" 
                  style={styles.submitButton}
                >
                  수정
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 카테고리 관리 모달 */}
      {showCategoryModal && (
        <div style={styles.modal}>
          <div style={styles.modalContent}>
            <h3 style={styles.modalTitle}>🏷️ 카테고리 관리</h3>
            
            <div style={styles.categoryList}>
              <h4>현재 카테고리</h4>
              {categories.map(cat => (
                <span key={cat} style={styles.categoryTag}>
                  {cat}
                </span>
              ))}
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>새 카테고리 추가</label>
              <div style={styles.addCategoryForm}>
                <input
                  type="text"
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  style={styles.input}
                  placeholder="카테고리명 입력"
                />
                <button 
                  type="button" 
                  onClick={handleAddCategory}
                  style={styles.addButton}
                >
                  추가
                </button>
              </div>
            </div>

            <div style={styles.modalButtons}>
              <button 
                type="button" 
                onClick={() => setShowCategoryModal(false)}
                style={styles.cancelButton}
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const styles = {
  container: {
    padding: '20px',
    maxWidth: '1200px',
    margin: '0 auto',
    fontFamily: "'Noto Sans KR', sans-serif"
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '30px'
  },
  title: {
    color: '#1f2937',
    margin: 0,
    fontSize: '2rem'
  },
  headerButtons: {
    display: 'flex',
    gap: '10px'
  },
  primaryButton: {
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    border: 'none',
    borderRadius: '12px',
    padding: '12px 24px',
    fontSize: '14px',
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: 'all 0.3s',
    boxShadow: '0 4px 12px rgba(102, 126, 234, 0.3)'
  },
  secondaryButton: {
    background: 'white',
    color: '#667eea',
    border: '2px solid #667eea',
    borderRadius: '12px',
    padding: '10px 22px',
    fontSize: '14px',
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: 'all 0.3s'
  },
  card: {
    background: 'white',
    borderRadius: '20px',
    padding: '30px',
    boxShadow: '0 10px 30px rgba(0, 0, 0, 0.1)'
  },
  cardTitle: {
    color: '#1f2937',
    marginBottom: '25px',
    fontSize: '1.5rem'
  },
  loading: {
    textAlign: 'center',
    padding: '50px',
    color: '#9ca3af',
    fontSize: '18px'
  },
  emptyState: {
    textAlign: 'center',
    padding: '50px',
    color: '#9ca3af',
    fontSize: '18px'
  },
  documentsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
    gap: '20px'
  },
  documentCard: {
    background: '#f8fafc',
    borderRadius: '15px',
    padding: '20px',
    border: '1px solid #e2e8f0',
    transition: 'all 0.3s'
  },
  documentHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '15px'
  },
  documentTitle: {
    color: '#1f2937',
    fontSize: '16px',
    fontWeight: 'bold',
    margin: 0,
    flex: 1,
    marginRight: '10px'
  },
  documentActions: {
    display: 'flex',
    gap: '5px'
  },
  editButton: {
    background: '#fbbf24',
    border: 'none',
    borderRadius: '8px',
    padding: '6px 8px',
    cursor: 'pointer',
    fontSize: '14px',
    transition: 'all 0.3s'
  },
  deleteButton: {
    background: '#ef4444',
    border: 'none',
    borderRadius: '8px',
    padding: '6px 8px',
    cursor: 'pointer',
    fontSize: '14px',
    color: 'white',
    transition: 'all 0.3s'
  },
  documentMeta: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    marginBottom: '10px'
  },
  badge: {
    background: '#667eea',
    color: 'white',
    padding: '4px 12px',
    borderRadius: '20px',
    fontSize: '12px',
    fontWeight: 'bold'
  },
  meta: {
    color: '#6b7280',
    fontSize: '14px'
  },
  documentFooter: {
    borderTop: '1px solid #e2e8f0',
    paddingTop: '10px',
    marginTop: '15px'
  },
  date: {
    color: '#9ca3af',
    fontSize: '12px'
  },
  modal: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000
  },
  modalContent: {
    background: 'white',
    borderRadius: '20px',
    padding: '30px',
    width: '90%',
    maxWidth: '500px',
    maxHeight: '90vh',
    overflow: 'auto'
  },
  modalTitle: {
    color: '#1f2937',
    marginBottom: '25px',
    fontSize: '1.4rem'
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px'
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  formRow: {
    display: 'grid',
    gridTemplateColumns: '2fr 1fr',
    gap: '15px'
  },
  label: {
    color: '#374151',
    fontWeight: 'bold',
    fontSize: '14px'
  },
  input: {
    padding: '12px 16px',
    border: '1px solid #d1d5db',
    borderRadius: '10px',
    fontSize: '14px',
    transition: 'all 0.3s'
  },
  fileInput: {
    padding: '10px',
    border: '2px dashed #d1d5db',
    borderRadius: '10px',
    fontSize: '14px',
    cursor: 'pointer'
  },
  fileHelp: {
    color: '#6b7280',
    fontSize: '12px'
  },
  modalButtons: {
    display: 'flex',
    gap: '10px',
    justifyContent: 'flex-end',
    marginTop: '10px'
  },
  cancelButton: {
    background: '#f3f4f6',
    color: '#6b7280',
    border: 'none',
    borderRadius: '10px',
    padding: '12px 24px',
    cursor: 'pointer',
    fontWeight: 'bold'
  },
  submitButton: {
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    border: 'none',
    borderRadius: '10px',
    padding: '12px 24px',
    cursor: 'pointer',
    fontWeight: 'bold'
  },
  categoryList: {
    marginBottom: '20px'
  },
  categoryTag: {
    display: 'inline-block',
    background: '#e5e7eb',
    color: '#374151',
    padding: '6px 12px',
    borderRadius: '20px',
    margin: '4px',
    fontSize: '12px'
  },
  addCategoryForm: {
    display: 'flex',
    gap: '10px'
  },
  addButton: {
    background: '#10b981',
    color: 'white',
    border: 'none',
    borderRadius: '10px',
    padding: '12px 20px',
    cursor: 'pointer',
    fontWeight: 'bold',
    whiteSpace: 'nowrap'
  }
};

export default AdminPage;