import React, { useState, useEffect } from 'react';
import { api } from '../services/api.service';
import { adminStyles } from '../styles/adminStyles';
import DocumentList from '../components/admin/DocumentList';
import UploadModal from '../components/admin/UploadModal';
import EditModal from '../components/admin/EditModal';
import CategoryModal from '../components/admin/CategoryModal';

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
      console.log('📋 문서 목록 요청 시작...');
      console.log('🔐 저장된 토큰:', localStorage.getItem('token') ? 'EXISTS' : 'MISSING');
      
      const response = await api.documents.list();
      console.log('✅ 문서 목록 응답:', response);
      
      // API가 배열을 직접 반환함
      setDocuments(Array.isArray(response) ? response : []);
    } catch (error) {
      console.error('❌ 문서 목록 조회 실패:', error);
      alert('문서 목록을 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleUploadFormChange = (field, value) => {
    setUploadForm({ ...uploadForm, [field]: value });
  };

  const handleFileChange = (file) => {
    setUploadForm({ ...uploadForm, file });
  };

  const handleUpload = async () => {
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

  const handleEdit = async () => {
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

  const handleDocumentEdit = (doc) => {
    setEditingDocument({...doc});
    setShowEditModal(true);
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

  const handleAddCategory = (categoryName) => {
    setCategories([...categories, categoryName]);
    setNewCategory('');
    setShowCategoryModal(false);
    alert('카테고리가 추가되었습니다.');
  };

  return (
    <div style={adminStyles.container}>
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

      <DocumentList
        documents={documents}
        loading={loading}
        onEdit={handleDocumentEdit}
        onDelete={handleDelete}
      />

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
    </div>
  );
};


export default AdminPage;