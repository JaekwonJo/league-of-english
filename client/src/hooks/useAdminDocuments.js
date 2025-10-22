import { useCallback, useState } from 'react';
import { api } from '../services/api.service';

const emptyShareForm = {
  public: false,
  schools: '',
  grades: '',
  students: ''
};

export function useAdminDocuments() {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchDocuments = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.documents.list();
      setDocuments(Array.isArray(response) ? response : []);
    } finally {
      setLoading(false);
    }
  }, []);

  const uploadDocument = useCallback(async (file, payload) => {
    if (!file) {
      throw new Error('파일을 선택해 주세요.');
    }
    return api.documents.upload(file, payload);
  }, []);

  const deleteDocument = useCallback(async (documentId) => {
    await api.documents.delete(documentId);
  }, []);

  const fetchShares = useCallback(async (documentId) => {
    const response = await api.documents.getShares(documentId);
    return {
      public: Boolean(response?.public),
      schools: Array.isArray(response?.schools) ? response.schools.join(', ') : emptyShareForm.schools,
      grades: Array.isArray(response?.grades) ? response.grades.join(', ') : emptyShareForm.grades,
      students: Array.isArray(response?.students) ? response.students.join(', ') : emptyShareForm.students
    };
  }, []);

  const updateShares = useCallback(async (documentId, payload) => {
    await api.documents.updateShares(documentId, payload);
  }, []);

  return {
    documents,
    setDocuments,
    loading,
    fetchDocuments,
    uploadDocument,
    deleteDocument,
    fetchShares,
    updateShares
  };
}

export const defaultShareForm = emptyShareForm;
