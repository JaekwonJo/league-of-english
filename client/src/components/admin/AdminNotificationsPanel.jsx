import React from 'react';
import { adminStyles } from '../../styles/adminStyles';

export function AdminNotificationsPanel({
  notifications,
  loading,
  error,
  onRefresh,
  onAcknowledge,
  onResolve
}) {
  return (
    <div style={adminStyles.notificationsSection}>
      <div style={adminStyles.notificationsHeader}>
        <h2 style={adminStyles.cardTitle}>🔔 관리자 알림</h2>
        <button
          type="button"
          style={adminStyles.secondaryButton}
          onClick={onRefresh}
          disabled={loading}
        >
          🔃 새로 고침
        </button>
      </div>
      {error && <div style={adminStyles.feedbackError}>{error}</div>}
      {loading ? (
        <div style={adminStyles.loading}>알림을 불러오는 중이에요...</div>
      ) : notifications.length === 0 ? (
        <div style={adminStyles.feedbackEmpty}>읽지 않은 알림이 없어요. 👍</div>
      ) : (
        <ul style={adminStyles.notificationList}>
          {notifications.map((item) => (
            <li key={item.id} style={adminStyles.notificationItem}>
              <div style={adminStyles.notificationMeta}>
                <span style={adminStyles.notificationType}>{item.type}</span>
                <span style={adminStyles.notificationTimestamp}>{new Date(item.createdAt).toLocaleString()}</span>
              </div>
              <div style={adminStyles.notificationPayload}>
                {item.payload?.reason && <p>사유: {item.payload.reason}</p>}
                {item.payload?.problemId && <p>문항 ID: {item.payload.problemId}</p>}
              </div>
              <div style={adminStyles.notificationActions}>
                <button
                  type="button"
                  style={adminStyles.notificationButton}
                  onClick={() => onAcknowledge(item.id)}
                >
                  👀 확인
                </button>
                <button
                  type="button"
                  style={{ ...adminStyles.notificationButton, background: '#e8f5e9', color: '#2e7d32' }}
                  onClick={() => onResolve(item.id)}
                >
                  ✅ 완료
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default AdminNotificationsPanel;
