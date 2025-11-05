import React, { useCallback, useEffect, useState } from 'react';
import { adminStyles } from '../../styles/adminStyles';
import { api } from '../../services/api.service';

const UsersTable = ({ users, loading, onSuspend, onRestore, onRemove, onGrant }) => {
  const [grantPlan, setGrantPlan] = useState({});
  const [grantDays, setGrantDays] = useState({});

  const handleGrant = (userId) => {
    const type = grantPlan[userId] || 'premium';
    const days = parseInt(grantDays[userId], 10) || 30;
    onGrant(userId, type, days);
  };

  if (loading) return <div style={adminStyles.loading}>사용자 목록을 불러오는 중이에요…</div>;
  if (!users || users.length === 0) return <div style={adminStyles.emptyState}>사용자가 없습니다.</div>;

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={th}>ID</th>
            <th style={th}>아이디</th>
            <th style={th}>이름</th>
            <th style={th}>이메일</th>
            <th style={th}>역할</th>
            <th style={th}>멤버십</th>
            <th style={th}>포인트</th>
            <th style={th}>상태</th>
            <th style={th}>액션</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id} style={{ borderTop: '1px solid var(--border-subtle)' }}>
              <td style={td}>{u.id}</td>
              <td style={td}>{u.username}</td>
              <td style={td}>{u.name}</td>
              <td style={td}>{u.email}</td>
              <td style={td}>{u.role}</td>
              <td style={td}>{u.membership || 'free'}</td>
              <td style={td}>{u.points}</td>
              <td style={td}>{u.is_active ? '활성' : (u.status || '비활성')}</td>
              <td style={{ ...td, minWidth: 360 }}>
                {u.is_active ? (
                  <button style={btnWarn} onClick={() => onSuspend(u.id)}>정지</button>
                ) : (
                  <button style={btn} onClick={() => onRestore(u.id)}>복구</button>
                )}
                <button style={btnDanger} onClick={() => onRemove(u.id)}>삭제</button>
                <span style={{ marginLeft: 8 }}>
                  <select
                    value={grantPlan[u.id] || 'premium'}
                    onChange={(e) => setGrantPlan({ ...grantPlan, [u.id]: e.target.value })}
                    style={inputSm}
                  >
                    <option value="premium">프리미엄</option>
                    <option value="pro">프로</option>
                  </select>
                  <input
                    type="number"
                    min="1"
                    value={grantDays[u.id] || 30}
                    onChange={(e) => setGrantDays({ ...grantDays, [u.id]: e.target.value })}
                    style={{ ...inputSm, width: 70, marginLeft: 6 }}
                  />
                  <button style={btnPrimary} onClick={() => handleGrant(u.id)}>등급 부여</button>
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const AdminUsersPanel = () => {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('all');
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const res = await api.admin.users.list({ q: query, status, limit: 100, includeGuests: 0 });
      const list = Array.isArray(res?.users) ? res.users : [];
      setUsers(list.filter((user) => String(user?.membership || '').toLowerCase() !== 'guest'));
    } catch (e) {
      setError(e?.message || '사용자 목록을 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, [query, status]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const onSuspend = async (id) => { await api.admin.users.suspend(id); fetchUsers(); };
  const onRestore = async (id) => { await api.admin.users.restore(id); fetchUsers(); };
  const onRemove = async (id) => { await api.admin.users.remove(id); fetchUsers(); };
  const onGrant = async (userId, type, days) => {
    await api.admin.membership.grant({ userId, type, durationDays: days });
    fetchUsers();
  };

  return (
    <div style={{ ...adminStyles.feedbackSection, marginTop: 30 }}>
      <div style={adminStyles.feedbackHeader}>
        <h2 style={adminStyles.cardTitle}>👥 사용자 관리</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            placeholder="이름/아이디/이메일 검색"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{ ...adminStyles.input, width: 260 }}
          />
          <select value={status} onChange={(e) => setStatus(e.target.value)} style={adminStyles.input}>
            <option value="all">전체</option>
            <option value="active">활성</option>
            <option value="inactive">비활성</option>
          </select>
          <button style={adminStyles.primaryButton} onClick={fetchUsers}>검색</button>
        </div>
      </div>
      {error && <div style={errorBox}>{error}</div>}
      <UsersTable
        users={users}
        loading={loading}
        onSuspend={onSuspend}
        onRestore={onRestore}
        onRemove={onRemove}
        onGrant={onGrant}
      />
    </div>
  );
};

const th = { textAlign: 'left', padding: '10px 8px', color: 'var(--text-secondary)', fontSize: 13 };
const td = { padding: '10px 8px', color: 'var(--text-primary)', fontSize: 14 };
const btn = { padding: '8px 10px', borderRadius: 8, border: '1px solid var(--border-subtle)', background: 'var(--surface-card)', cursor: 'pointer', marginRight: 6 };
const btnWarn = { ...btn, background: 'var(--warning-surface)', border: '1px solid var(--warning-border)', color: 'var(--warning-strong)' };
const btnDanger = { ...btn, background: 'var(--danger-surface)', border: '1px solid var(--danger-border)', color: 'var(--danger-strong)' };
const btnPrimary = { ...btn, background: 'var(--accent-primary)', color: 'var(--text-on-accent)', border: 'none', marginLeft: 6 };
const inputSm = { padding: '8px 10px', border: '1px solid var(--border-subtle)', borderRadius: 8, fontSize: 13 };
const errorBox = { background: 'var(--danger-surface)', border: '1px solid var(--danger-border)', color: 'var(--danger-strong)', padding: 12, borderRadius: 12, marginBottom: 12 };

export default AdminUsersPanel;
