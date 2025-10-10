import { useCallback, useState } from 'react';
import { api } from '../services/api.service';

export function useProblemFeedbackReports(defaultStatus = 'pending') {
  const [reports, setReports] = useState([]);
  const [summary, setSummary] = useState({});
  const [status, setStatus] = useState(defaultStatus);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    status: defaultStatus,
    type: 'all',
    documentId: 'all',
    reporter: '',
    search: '',
    sort: 'recent',
    limit: 50
  });

  const fetchReports = useCallback(async (overrides = {}) => {
    setLoading(true);
    setError(null);
    const nextFilters = {
      ...filters,
      ...overrides
    };
    try {
      const response = await api.admin.problemFeedback.list(nextFilters);
      setReports(response?.reports || []);
      setSummary(response?.summary || {});
      setStatus(nextFilters.status || 'pending');
      setFilters(nextFilters);
    } catch (err) {
      setError(err?.message || '문항 신고 목록을 불러오지 못했어요.');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  const updateStatus = useCallback(async (reportId, nextStatus, resolutionNote) => {
    const target = reports.find((item) => item.id === reportId);
    await api.admin.problemFeedback.update(reportId, {
      status: nextStatus,
      resolutionNote
    });

    setReports((prev) => prev.filter((item) => item.id !== reportId));
    setSummary((prev) => {
      const updated = { ...prev };
      if (target?.status) {
        updated[target.status] = Math.max((updated[target.status] || 1) - 1, 0);
      }
      updated[nextStatus] = (updated[nextStatus] || 0) + 1;
      return updated;
    });
  }, [reports]);

  return {
    reports,
    summary,
    status,
    loading,
    error,
    filters,
    fetchReports,
    changeStatus: fetchReports,
    updateStatus
  };
}
