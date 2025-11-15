import React from 'react';
import { api } from '../../services/api.service';

const formatRange = (startIso, endIso) => {
  try {
    const start = new Date(startIso || Date.now());
    const end = new Date(endIso);
    const f = (d) => `${d.getMonth() + 1}월 ${d.getDate()}일`;
    return `${f(start)}에서 ${f(end)}까지`;
  } catch (e) {
    return '';
  }
};

const MembershipPromotion = () => {
  const [visible, setVisible] = React.useState(false);
  const [message, setMessage] = React.useState('');

  React.useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await api.membership.status();
        if (!mounted || !res?.success) return;
        const t = String(res.data?.type || '').toLowerCase();
        const end = res.data?.expiresAt;
        const start = res.data?.startedAt || res.user?.membership_started_at || res.user?.membershipStartedAt;
        if ((t === 'premium' || t === 'pro') && end) {
          const key = `promo_shown_until_${end}`;
          const already = sessionStorage.getItem(key);
          if (!already) {
            const range = formatRange(start, end);
            const tierLabel = t === 'pro' ? '프로' : '프리미엄';
            setMessage(`${range} ${tierLabel} 등급으로 상향되었습니다!`);
            setVisible(true);
            sessionStorage.setItem(key, '1');
          }
        }
      } catch (e) {
        // ignore
      }
    })();
    return () => { mounted = false; };
  }, []);

  if (!visible || !message) return null;

  return (
    <div style={styles.overlay} onClick={() => setVisible(false)}>
      <div style={styles.card} className="challenger-login-burst" onClick={(e) => e.stopPropagation()}>
        <div style={styles.badge}>🎉 멤버십 안내</div>
        <h3 style={styles.title}>{message}</h3>
        <p style={styles.note}>즐거운 학습 되세요! (클릭하면 닫혀요)</p>
      </div>
    </div>
  );
};

const styles = {
  overlay: {
    position: 'fixed',
    inset: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'rgba(3,7,18,0.45)',
    zIndex: 2000,
    backdropFilter: 'blur(2px)'
  },
  card: {
    maxWidth: 520,
    width: '90%',
    borderRadius: 20,
    padding: '22px 20px',
    background: 'linear-gradient(135deg, rgba(15,23,42,0.95) 0%, rgba(30,64,175,0.75) 100%)',
    color: '#f8fafc',
    boxShadow: '0 28px 60px rgba(15,23,42,0.45)',
    textAlign: 'center'
  },
  badge: {
    display: 'inline-block',
    padding: '6px 12px',
    borderRadius: 999,
    background: 'rgba(255,255,255,0.16)',
    color: '#dbeafe',
    fontWeight: 800,
    fontSize: 12,
    letterSpacing: '0.06em',
    marginBottom: 8
  },
  title: {
    margin: '8px 0 6px',
    fontSize: 18,
    fontWeight: 900
  },
  note: {
    margin: 0,
    color: 'rgba(248,250,252,0.85)'
  }
};

export default MembershipPromotion;

