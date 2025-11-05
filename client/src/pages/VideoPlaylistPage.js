import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

const DEFAULT_PLAYLIST_URL = 'https://www.youtube.com/playlist?list=PLQu64YmMxERTi0K-K8QAihxfUkS4nYfHr';
const STORAGE_KEY = 'loe:video-playlist-url';

const extractPlaylistId = (value = '') => {
  const trimmed = String(value).trim();
  if (!trimmed) return '';

  // Accept bare playlist ID
  if (/^[A-Za-z0-9_-]{10,}$/.test(trimmed) && !trimmed.includes('://')) {
    return trimmed;
  }

  try {
    const url = new URL(trimmed);
    if (url.searchParams.has('list')) {
      return url.searchParams.get('list') || '';
    }
    if (url.pathname.includes('/playlist/')) {
      return url.pathname.split('/').pop() || '';
    }
  } catch (error) {
    // Not a full URL; ignore and fall through
  }

  return '';
};

const VideoPlaylistPage = () => {
  const { user } = useAuth();
  const [inputUrl, setInputUrl] = useState(() => localStorage.getItem(STORAGE_KEY) || DEFAULT_PLAYLIST_URL);
  const [appliedUrl, setAppliedUrl] = useState(() => localStorage.getItem(STORAGE_KEY) || DEFAULT_PLAYLIST_URL);
  const [error, setError] = useState('');

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, appliedUrl);
  }, [appliedUrl]);

  const playlistId = useMemo(() => extractPlaylistId(appliedUrl), [appliedUrl]);
  const embedUrl = playlistId ? `https://www.youtube.com/embed/videoseries?list=${playlistId}` : '';

  const membership = (user?.membership || '').toLowerCase();
  const elevatedRole = user?.role === 'teacher' || user?.role === 'admin';
  const isPremiumMember = elevatedRole || ['premium', 'pro', 'vip'].includes(membership);

  const handleApply = (event) => {
    event.preventDefault();
    const nextId = extractPlaylistId(inputUrl);
    if (!nextId) {
      setError('유효한 유튜브 재생목록 URL을 입력해 주세요. 예: https://www.youtube.com/playlist?list=...');
      return;
    }
    setError('');
    setAppliedUrl(inputUrl.trim());
  };

  if (!isPremiumMember) {
    return (
      <div style={styles.gateContainer}>
        <h1 style={styles.title}>🎬 동영상 강의</h1>
        <div style={styles.gateCard}>
          <p style={styles.gateText}>이 콘텐츠는 프리미엄 멤버 전용입니다.</p>
          <p style={styles.gateText}>프로필 &gt; 멤버십에서 프리미엄으로 업그레이드하시면 전체 강의를 시청할 수 있어요.</p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h1 style={styles.title}>🎬 동영상 강의</h1>
        <p style={styles.subtitle}>유튜브 재생목록을 붙여넣으면 이곳에서 바로 강의를 시청할 수 있어요.</p>
      </header>

      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>1️⃣ 재생목록 선택</h2>
        <form style={styles.playlistForm} onSubmit={handleApply}>
          <input
            type="url"
            value={inputUrl}
            onChange={(event) => setInputUrl(event.target.value)}
            placeholder="https://www.youtube.com/playlist?list=..."
            style={styles.playlistInput}
          />
          <button type="submit" style={styles.applyButton}>재생목록 적용</button>
          <button
            type="button"
            style={styles.resetButton}
            onClick={() => {
              setInputUrl(DEFAULT_PLAYLIST_URL);
              setAppliedUrl(DEFAULT_PLAYLIST_URL);
              setError('');
            }}
          >
            기본 목록 불러오기
          </button>
        </form>
        {error && <p style={styles.errorText}>{error}</p>}
      </section>

      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>2️⃣ 강의 시청</h2>
        <div style={styles.playerCard}>
          {embedUrl ? (
            <div style={styles.playerWrapper}>
              <iframe
                key={embedUrl}
                title="YouTube playlist"
                src={embedUrl}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                style={styles.iframe}
              />
            </div>
          ) : (
            <div style={styles.playerPlaceholder}>
              <p style={styles.placeholderText}>재생목록 URL을 입력하면 이곳에서 바로 시청할 수 있어요.</p>
            </div>
          )}
          <div style={styles.playerActions}>
            <a
              href={playlistId ? `https://www.youtube.com/playlist?list=${playlistId}` : DEFAULT_PLAYLIST_URL}
              target="_blank"
              rel="noreferrer"
              style={styles.openButton}
            >
              ▶ 유튜브에서 열기
            </a>
            <p style={styles.tipText}>배속 조절, 자막 설정 등 유튜브 기본 기능은 플레이어 우측 하단에서 조정할 수 있어요.</p>
          </div>
        </div>
      </section>

      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>사용 꿀팁</h2>
        <ul style={styles.tipList}>
          <li style={styles.tipItem}>📌 시험 전에 듣고 싶은 단원만 따로 재생목록으로 만들어서 붙여넣으면 관리가 쉬워요.</li>
          <li style={styles.tipItem}>📝 강의 요약은 워크북 학습 메뉴의 STEP 1~3과 함께 병행하면 복습 효과가 올라가요.</li>
          <li style={styles.tipItem}>💾 적용된 재생목록은 자동으로 저장되니, 다음 방문 때 바로 이어서 들을 수 있어요.</li>
        </ul>
      </section>
    </div>
  );
};

const styles = {
  container: {
    maxWidth: '1100px',
    margin: '0 auto',
    padding: '24px'
  },
  header: {
    marginBottom: '24px'
  },
  title: {
    fontSize: '2.4rem',
    fontWeight: 800,
    color: 'var(--tone-hero)',
    marginBottom: '8px'
  },
  subtitle: {
    fontSize: '1rem',
    color: 'var(--tone-strong)'
  },
  section: {
    marginBottom: '32px',
    background: 'var(--surface-card)',
    borderRadius: '18px',
    padding: '24px',
    boxShadow: '0 18px 32px rgba(15, 23, 42, 0.08)'
  },
  sectionTitle: {
    fontSize: '1.3rem',
    fontWeight: 700,
    marginBottom: '16px',
    color: 'var(--text-primary)'
  },
  playlistForm: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '12px'
  },
  playlistInput: {
    flex: '1 1 360px',
    minWidth: '240px',
    padding: '12px 16px',
    borderRadius: '12px',
    border: '1px solid var(--surface-border)',
    background: 'var(--surface-soft)',
    fontSize: '0.95rem',
    color: 'var(--text-primary)'
  },
  applyButton: {
    padding: '12px 20px',
    borderRadius: '12px',
    border: 'none',
    background: 'var(--accent-gradient)',
    color: 'var(--text-on-accent)',
    fontWeight: 600,
    cursor: 'pointer'
  },
  resetButton: {
    padding: '12px 18px',
    borderRadius: '12px',
    border: '1px solid var(--surface-border)',
    background: 'var(--surface-soft)',
    color: 'var(--tone-strong)',
    fontWeight: 600,
    cursor: 'pointer'
  },
  errorText: {
    marginTop: '10px',
    color: 'var(--danger)',
    fontWeight: 600
  },
  playerCard: {
    display: 'grid',
    gap: '16px'
  },
  playerWrapper: {
    position: 'relative',
    paddingBottom: '56.25%',
    height: 0,
    overflow: 'hidden',
    borderRadius: '16px',
    boxShadow: '0 20px 36px rgba(15, 23, 42, 0.18)',
    background: '#000'
  },
  iframe: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    border: 'none'
  },
  playerPlaceholder: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '40px',
    borderRadius: '16px',
    background: 'var(--surface-soft)'
  },
  placeholderText: {
    color: 'var(--tone-strong)',
    fontSize: '1rem'
  },
  playerActions: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px'
  },
  openButton: {
    alignSelf: 'flex-start',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '10px 16px',
    borderRadius: '12px',
    background: 'var(--surface-soft)',
    border: '1px solid var(--surface-border)',
    color: 'var(--tone-strong)',
    fontWeight: 600,
    textDecoration: 'none'
  },
  tipText: {
    fontSize: '0.9rem',
    color: 'var(--tone-strong)'
  },
  tipList: {
    margin: 0,
    padding: 0,
    listStyle: 'none',
    display: 'grid',
    gap: '10px'
  },
  tipItem: {
    padding: '12px 14px',
    borderRadius: '12px',
    background: 'var(--surface-soft)',
    color: 'var(--tone-strong)',
    lineHeight: 1.6,
    border: '1px solid var(--surface-border)'
  },
  gateContainer: {
    maxWidth: '640px',
    margin: '0 auto',
    padding: '32px 24px'
  },
  gateCard: {
    marginTop: '18px',
    padding: '24px',
    borderRadius: '18px',
    background: 'var(--surface-card)',
    boxShadow: '0 16px 32px rgba(15, 23, 42, 0.12)'
  },
  gateText: {
    margin: '0 0 8px',
    color: 'var(--tone-strong)'
  }
};

export default VideoPlaylistPage;
