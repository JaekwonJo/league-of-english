import { useCallback, useState } from 'react';
import { defaultShareForm } from './useAdminDocuments';

export function useDocumentShare(fetchShares, updateShares) {
  const [shareState, setShareState] = useState({
    visible: false,
    loading: false,
    document: null,
    form: { ...defaultShareForm }
  });

  const resetForm = useCallback(() => ({ ...defaultShareForm }), []);

  const openShareModal = useCallback(async (document) => {
    if (!document) return;
    setShareState((prev) => ({ ...prev, loading: true, document, visible: true }));
    try {
      const form = await fetchShares(document.id);
      setShareState({
        visible: true,
        loading: false,
        document,
        form
      });
    } catch (error) {
      setShareState({
        visible: false,
        loading: false,
        document: null,
        form: resetForm()
      });
      throw error;
    }
  }, [fetchShares, resetForm]);

  const closeShareModal = useCallback(() => {
    setShareState({
      visible: false,
      loading: false,
      document: null,
      form: resetForm()
    });
  }, [resetForm]);

  const changeShareForm = useCallback((form) => {
    setShareState((prev) => ({ ...prev, form }));
  }, []);

  const saveShare = useCallback(async (payload) => {
    if (!shareState.document) return;
    setShareState((prev) => ({ ...prev, loading: true }));
    try {
      await updateShares(shareState.document.id, payload);
      closeShareModal();
    } finally {
      setShareState((prev) => ({ ...prev, loading: false }));
    }
  }, [shareState.document, updateShares, closeShareModal]);

  return {
    shareState,
    openShareModal,
    closeShareModal,
    changeShareForm,
    saveShare
  };
}
