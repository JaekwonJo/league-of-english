import { useCallback, useState } from 'react';
import { api } from '../services/api.service';

export function useAdminNotifications(defaultStatus = 'pending') {
  const [notifications, setNotifications] = useState([]);
  const [status, setStatus] = useState(defaultStatus);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchNotifications = useCallback(async (nextStatus = status) => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.admin.notifications.list({ status: nextStatus });
      setNotifications(response?.notifications || []);
      setStatus(nextStatus);
    } catch (err) {
      setError(err?.message || '알림을 불러오지 못했어요.');
    } finally {
      setLoading(false);
    }
  }, [status]);

  const updateNotification = useCallback(async (id, nextStatus) => {
    await api.admin.notifications.update(id, { status: nextStatus });
    setNotifications((prev) => prev.filter((item) => item.id !== id));
  }, []);

  return {
    notifications,
    status,
    loading,
    error,
    fetchNotifications,
    changeStatus: fetchNotifications,
    updateNotification
  };
}
