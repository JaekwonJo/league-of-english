import { useCallback, useState } from 'react';
import { api } from '../services/api.service';

export function useFeedbackReports() {
  const [feedbackReports, setFeedbackReports] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchFeedbackReports = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.analysis.feedback.pending();
      if (response?.success) {
        setFeedbackReports(response.data || []);
      } else {
        setError('신고 목록을 불러오지 못했습니다.');
      }
    } catch (err) {
      setError(err?.message || '신고 목록을 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, []);

  const resolveFeedback = useCallback(async (feedbackId, status) => {
    await api.analysis.feedback.resolve(feedbackId, status);
    setFeedbackReports((prev) => prev.filter((item) => item.id !== feedbackId));
  }, []);

  return {
    feedbackReports,
    feedbackLoading: loading,
    feedbackError: error,
    fetchFeedbackReports,
    resolveFeedback
  };
}
