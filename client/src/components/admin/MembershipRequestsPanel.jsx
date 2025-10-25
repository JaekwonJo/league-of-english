import React, { useCallback, useEffect, useState } from 'react';
import { adminStyles } from '../../styles/adminStyles';
import { api } from '../../services/api.service';

const MembershipRequestsPanel = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [couponMessage, setCouponMessage] = useState('');

  const [newCoupon, setNewCoupon] = useState({ type: 'premium', days: 30, max: 1, code: '' });

  const fetchRequests = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const res = await api.admin.membership.requests();
      setRequests(Array.isArray(res?.data) ? res.data : []);
    } catch (e) {
      setError(e?.message || '요청 목록을 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const resolve = async (id, action, type, days) => {
    await api.admin.membership.resolve(id, { action, type, durationDays: days });
    fetchRequests();
  };

  const createCoupon = async () => {
    try {
      setCouponMessage('');
      const res = await api.admin.membership.coupons.create({
        code: newCoupon.code || undefined,
        membership_type: newCoupon.type,
        duration_days: parseInt(newCoupon.days, 10) || 30,
        max_redemptions: parseInt(newCoupon.max, 10) || 1
      });
      setCouponMessage(`쿠폰 생성 완료: ${res.code} (${res.membership_type}, ${res.duration_days}일)`);
      setNewCoupon({ type: 'premium', days: 30, max: 1, code: '' });
    } catch (e) {
      setCouponMessage(e?.message || '쿠폰 생성에 실패했습니다.');
    }
  };

  return (
    <div style={{ ...adminStyles.feedbackSection, marginTop: 30 }}>
      <div style={adminStyles.feedbackHeader}>
        <h2 style={adminStyles.cardTitle}>💳 멤버십 요청 관리</h2>
        <button style={adminStyles.secondaryButton} onClick={fetchRequests}>새로고침</button>
      </div>

      {/* 빠른 쿠폰 생성 */}
      <div style={{ ...adminStyles.card, marginBottom: 16 }}>
        <h3 style={{ ...adminStyles.cardTitle, marginBottom: 12 }}>🎟️ 쿠폰 빠르게 만들기</h3>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <input value={newCoupon.code} onChange={(e) => setNewCoupon({ ...newCoupon, code: e.target.value.toUpperCase() })} placeholder="쿠폰 코드(선택)" style={{ ...adminStyles.input, width: 180 }} />
          <select value={newCoupon.type} onChange={(e) => setNewCoupon({ ...newCoupon, type: e.target.value })} style={adminStyles.input}>
            <option value="premium">프리미엄</option>
            <option value="pro">프로</option>
          </select>
          <input type="number" min="1" value={newCoupon.days} onChange={(e) => setNewCoupon({ ...newCoupon, days: e.target.value })} placeholder="기간(일)" style={{ ...adminStyles.input, width: 120 }} />
          <input type="number" min="1" value={newCoupon.max} onChange={(e) => setNewCoupon({ ...newCoupon, max: e.target.value })} placeholder="최대 사용" style={{ ...adminStyles.input, width: 120 }} />
          <button style={adminStyles.primaryButton} onClick={createCoupon}>쿠폰 생성</button>
        </div>
        {couponMessage && <div style={{ marginTop: 10, color: 'var(--text-secondary)' }}>{couponMessage}</div>}
      </div>

      {error && <div style={{ background: 'var(--danger-surface)', border: '1px solid var(--danger-border)', color: 'var(--danger-strong)', padding: 12, borderRadius: 12, marginBottom: 12 }}>{error}</div>}
      {loading ? (
        <div style={adminStyles.loading}>요청을 불러오는 중이에요…</div>
      ) : requests.length === 0 ? (
        <div style={adminStyles.emptyState}>대기 중인 멤버십 요청이 없습니다.</div>
      ) : (
        <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {requests.map((r) => (
            <li key={r.id} style={{ background: 'var(--surface-card)', border: '1px solid var(--border-subtle)', borderRadius: 16, padding: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <div style={{ color: 'var(--text-primary)', fontWeight: 700 }}>{r.name} ({r.username})</div>
                <div style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{new Date(r.created_at).toLocaleString()}</div>
              </div>
              <div style={{ color: 'var(--text-secondary)', marginBottom: 8 }}>요청 플랜: <strong>{String(r.plan || '').toUpperCase()}</strong></div>
              <div style={{ color: 'var(--text-secondary)', marginBottom: 12 }}>{r.message || '요청 메시지 없음'}</div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <select defaultValue={(r.plan || 'premium')} id={`type-${r.id}`} style={adminStyles.input}>
                  <option value="premium">프리미엄</option>
                  <option value="pro">프로</option>
                </select>
                <input id={`days-${r.id}`} type="number" min="1" defaultValue={30} style={{ ...adminStyles.input, width: 120 }} />
                <button style={adminStyles.primaryButton} onClick={() => {
                  const type = document.getElementById(`type-${r.id}`).value;
                  const days = parseInt(document.getElementById(`days-${r.id}`).value, 10) || 30;
                  resolve(r.id, 'approve', type, days);
                }}>승인</button>
                <button style={adminStyles.notificationButton} onClick={() => resolve(r.id, 'reject')}>반려</button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default MembershipRequestsPanel;

