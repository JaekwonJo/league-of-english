import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

const DEFAULT_PLAYLIST_URL = 'https://www.youtube.com/playlist?list=PLQu64YmMxERTi0K-K8QAihxfUkS4nYfHr';
const PLAYLIST_COLLECTION_KEY = 'loe:video-playlists';
const SELECTED_PLAYLIST_KEY = 'loe:video-selected-playlist';
const DEFAULT_PLAYLISTS = [
  {
    id: 'default',
    name: 'League of English · 공식 정리 재생목록',
    url: DEFAULT_PLAYLIST_URL
  }
];

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

const loadInitialPlaylists = () => {
  if (typeof window === 'undefined') return DEFAULT_PLAYLISTS;
  try {
    const raw = window.localStorage.getItem(PLAYLIST_COLLECTION_KEY);
    if (!raw) return DEFAULT_PLAYLISTS;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length) {
      return parsed;
    }
    return DEFAULT_PLAYLISTS;
  } catch (error) {
    return DEFAULT_PLAYLISTS;
  }
};

const loadInitialSelectedId = (playlists = DEFAULT_PLAYLISTS) => {
  if (typeof window === 'undefined') {
    return playlists[0]?.id || null;
  }
  const stored = window.localStorage.getItem(SELECTED_PLAYLIST_KEY);
  if (stored && playlists.some((playlist) => playlist.id === stored)) {
    return stored;
  }
  return playlists[0]?.id || null;
};

const VideoPlaylistPage = () => {
  const { user } = useAuth();
  const initialPlaylistsRef = useRef(loadInitialPlaylists());
  const [playlists, setPlaylists] = useState(initialPlaylistsRef.current);
  const [selectedId, setSelectedId] = useState(() => loadInitialSelectedId(initialPlaylistsRef.current));
  const [playerUnlocked, setPlayerUnlocked] = useState(() => Boolean(loadInitialSelectedId(initialPlaylistsRef.current)));
  const [searchTerm, setSearchTerm] = useState('');
  const [showManager, setShowManager] = useState(false);
  const [editName, setEditName] = useState('');
  const [editUrl, setEditUrl] = useState('');
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');

  const membership = (user?.membership || '').toLowerCase();
  const elevatedRole = user?.role === 'teacher' || user?.role === 'admin';
  const isProMember = elevatedRole || ['pro', 'vip'].includes(membership);
  const canManage = user?.role === 'admin';

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(PLAYLIST_COLLECTION_KEY, JSON.stringify(playlists));
    }
  }, [playlists]);

  useEffect(() => {
    if (typeof window !== 'undefined' && selectedId) {
      window.localStorage.setItem(SELECTED_PLAYLIST_KEY, selectedId);
    }
  }, [selectedId]);

  const activePlaylist = useMemo(() => (
    playlists.find((playlist) => playlist.id === selectedId) || playlists[0] || null
  ), [playlists, selectedId]);

  useEffect(() => {
    if (activePlaylist) {
      setEditName(activePlaylist.name);
      setEditUrl(activePlaylist.url);
    }
  }, [activePlaylist]);

  const playlistId = useMemo(() => extractPlaylistId(activePlaylist?.url || ''), [activePlaylist]);
  const embedUrl = playlistId ? `https://www.youtube.com/embed/videoseries?list=${playlistId}` : '';

  const filteredPlaylists = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase();
    if (!keyword) return playlists;
    return playlists.filter((playlist) => playlist.name.toLowerCase().includes(keyword));
  }, [playlists, searchTerm]);

  const handleSelectPlaylist = (id) => {
    if (id === selectedId) return;
    setSelectedId(id);
    setPlayerUnlocked(true);
    setError('');
    setFeedback('선택한 재생목록으로 준비했어요!');
  };

  const handleUpdatePlaylist = (event) => {
    event.preventDefault();
    if (!canManage || !activePlaylist) return;
    const trimmedName = editName.trim();
    const trimmedUrl = editUrl.trim();
    const playlistKey = extractPlaylistId(trimmedUrl);
    if (!trimmedName) {
      setError('재생목록 이름을 입력해 주세요.');
      return;
    }
    if (!playlistKey) {
      setError('유효한 유튜브 재생목록 URL을 입력해 주세요.');
      return;
    }
    setError('');
    setPlaylists((prev) => prev.map((item) => (
      item.id === activePlaylist.id ? { ...item, name: trimmedName, url: trimmedUrl } : item
    )));
    setFeedback('선택한 재생목록이 업데이트되었어요.');
  };

  const handleAddPlaylist = (event) => {
    event.preventDefault();
    if (!canManage) return;
    const trimmedName = editName.trim();
    const trimmedUrl = editUrl.trim();
    const playlistKey = extractPlaylistId(trimmedUrl);
    if (!trimmedName || !playlistKey) {
      setError('새 재생목록 이름과 URL을 모두 입력해 주세요.');
      return;
    }
    const newId = `pl-${Date.now().toString(36)}`;
    const nextPlaylist = { id: newId, name: trimmedName, url: trimmedUrl };
    setPlaylists((prev) => [...prev, nextPlaylist]);
    setSelectedId(newId);
    setPlayerUnlocked(true);
    setError('');
    setFeedback('새 재생목록이 추가되었어요.');
  };

  const handleDeletePlaylist = () => {
    if (!canManage || !activePlaylist) return;
    if (playlists.length <= 1) {
      setError('최소 한 개의 재생목록은 유지해야 해요.');
      return;
    }
    const filtered = playlists.filter((item) => item.id !== activePlaylist.id);
    const next = filtered[0] || null;
    setPlaylists(filtered);
    setSelectedId(next?.id || null);
    setPlayerUnlocked(Boolean(next));
    setError('');
    setFeedback('재생목록이 삭제되었어요.');
  };

  useEffect(() => {
    if (feedback) {
      const timer = setTimeout(() => setFeedback(''), 3000);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [feedback]);

  if (!isProMember) {
    return (
      <div style={styles.gateContainer}>
        <h1 style={styles.title}>🎬 동영상 강의</h1>
        <div style={styles.gateCard}>
          <p style={styles.gateText}>이 콘텐츠는 프로 멤버 전용입니다.</p>
          <p style={styles.gateText}>프로필 &gt; 멤버십에서 프로로 업그레이드하시면 전체 강의를 시청할 수 있어요.</p>
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
        <div style={styles.sectionHeaderRow}>
          <h2 style={styles.sectionTitle}>1️⃣ 재생목록 선택</h2>
          {canManage && (
            <button
              type="button"
              style={{
                ...styles.adminToggle,
                ...(showManager ? styles.adminToggleActive : {})
              }}
              onClick={() => setShowManager((prev) => !prev)}
            >
              {showManager ? '관리 영역 닫기' : '재생목록 관리 (관리자)'}
            </button>
          )}
        </div>
        <p style={styles.selectorIntro}>프로 멤버는 원하는 재생목록을 골라 바로 강의를 들을 수 있어요. 마음에 드는 목록을 탭 한 번으로 선택해 보세요. 😊</p>

        <div style={styles.selectorSearchRow}>
          <input
            type="search"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="재생목록 이름을 검색해 보세요"
            style={styles.selectorSearchInput}
          />
          {searchTerm && (
            <button type="button" style={styles.selectorClearButton} onClick={() => setSearchTerm('')}>
              지우기
            </button>
          )}
        </div>

        {error && <p style={styles.errorText}>{error}</p>}
        {feedback && <div style={styles.feedbackBanner}>{feedback}</div>}

        {filteredPlaylists.length > 0 ? (
          <div style={styles.playlistGrid}>
            {filteredPlaylists.map((playlist) => {
              const active = playlist.id === selectedId;
              const playlistKey = extractPlaylistId(playlist.url);
              return (
                <div
                  key={playlist.id}
                  style={{
                    ...styles.playlistCard,
                    ...(active ? styles.playlistCardActive : {})
                  }}
                >
                  <div style={styles.playlistCardHeader}>
                    <div style={styles.playlistNameRow}>
                      <span style={styles.playlistIcon}>🎧</span>
                      <span style={styles.playlistName}>{playlist.name}</span>
                    </div>
                    {active && <span style={styles.selectedBadge}>현재 시청 중</span>}
                  </div>
                  <div style={styles.playlistActions}>
                    <button
                      type="button"
                      style={{
                        ...styles.selectButton,
                        ...(active ? styles.selectButtonActive : {})
                      }}
                      onClick={() => handleSelectPlaylist(playlist.id)}
                    >
                      {active ? '선택 완료' : '이 재생목록 들을래요'}
                    </button>
                    <a
                      href={playlistKey ? `https://www.youtube.com/playlist?list=${playlistKey}` : playlist.url}
                      target="_blank"
                      rel="noreferrer"
                      style={styles.watchOnYoutube}
                    >
                      ▶ 유튜브 열기
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div style={styles.playlistEmpty}>검색 결과가 없어요. 다른 키워드를 시도해 보거나 관리자에게 새로운 재생목록을 요청해 주세요.</div>
        )}

        {canManage && showManager && activePlaylist && (
          <div style={styles.managerCard}>
            <h3 style={styles.managerTitle}>관리자 전용 · 재생목록 편집</h3>
            <form style={styles.managerForm} onSubmit={handleUpdatePlaylist}>
              <label style={styles.managerLabel}>재생목록 이름</label>
              <input
                type="text"
                value={editName}
                onChange={(event) => setEditName(event.target.value)}
                style={styles.managerInput}
                placeholder="예: 수능 어법 특강"
              />
              <label style={styles.managerLabel}>유튜브 재생목록 URL</label>
              <input
                type="url"
                value={editUrl}
                onChange={(event) => setEditUrl(event.target.value)}
                style={styles.managerInput}
                placeholder="https://www.youtube.com/playlist?list=..."
              />
              <div style={styles.managerButtonRow}>
                <button type="submit" style={styles.managerPrimary}>선택한 재생목록 업데이트</button>
                <button type="button" style={styles.managerSecondary} onClick={handleAddPlaylist}>새 재생목록 추가</button>
                <button type="button" style={styles.managerDanger} onClick={handleDeletePlaylist}>재생목록 삭제</button>
              </div>
            </form>
          </div>
        )}
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
              <p style={styles.placeholderText}>위에서 재생목록을 선택하면 이곳에서 바로 시청할 수 있어요.</p>
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
  sectionHeaderRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '12px',
    flexWrap: 'wrap'
  },
  sectionTitle: {
    fontSize: '1.3rem',
    fontWeight: 700,
    marginBottom: '16px',
    color: 'var(--text-primary)'
  },
  adminToggle: {
    padding: '10px 16px',
    borderRadius: '12px',
    border: '1px solid rgba(59,130,246,0.45)',
    background: 'rgba(59,130,246,0.12)',
    color: 'var(--tone-hero)',
    fontWeight: 700,
    cursor: 'pointer'
  },
  adminToggleActive: {
    background: 'linear-gradient(135deg, rgba(59,130,246,0.22), rgba(99,102,241,0.20))',
    color: '#0B1220',
    boxShadow: '0 0 20px rgba(59,130,246,0.25)'
  },
  selectorIntro: {
    fontSize: '0.95rem',
    color: 'var(--tone-strong)',
    marginBottom: '16px'
  },
  selectorSearchRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '10px',
    marginBottom: '14px'
  },
  selectorSearchInput: {
    flex: '1 1 260px',
    minWidth: '220px',
    padding: '12px 14px',
    borderRadius: '12px',
    border: '1px solid var(--surface-border)',
    background: 'var(--surface-soft)',
    color: 'var(--text-primary)'
  },
  selectorClearButton: {
    padding: '10px 16px',
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
  feedbackBanner: {
    marginBottom: '14px',
    padding: '12px 16px',
    borderRadius: '12px',
    background: 'linear-gradient(135deg, rgba(34,197,94,0.18), rgba(16,185,129,0.12))',
    color: 'var(--success-deep)',
    fontWeight: 600
  },
  playlistGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
    gap: '16px'
  },
  playlistCard: {
    borderRadius: '16px',
    padding: '18px',
    border: '1px solid var(--surface-border)',
    background: 'var(--surface-soft)',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    boxShadow: '0 12px 28px rgba(15, 23, 42, 0.08)'
  },
  playlistCardActive: {
    borderColor: 'rgba(59,130,246,0.55)',
    boxShadow: '0 16px 38px rgba(59,130,246,0.22)',
    background: 'linear-gradient(135deg, rgba(59,130,246,0.15), rgba(125,211,252,0.12))'
  },
  playlistCardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '8px'
  },
  playlistNameRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  playlistIcon: {
    fontSize: '1.4rem'
  },
  playlistName: {
    fontWeight: 700,
    fontSize: '1rem',
    color: 'var(--text-primary)',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis'
  },
  selectedBadge: {
    padding: '4px 10px',
    borderRadius: '999px',
    background: 'linear-gradient(135deg, rgba(34,197,94,0.32), rgba(16,185,129,0.24))',
    color: 'var(--text-on-accent)',
    fontSize: '12px',
    fontWeight: 700
  },
  playlistActions: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px'
  },
  selectButton: {
    padding: '12px 0',
    borderRadius: '12px',
    border: '1px solid rgba(59,130,246,0.45)',
    background: 'rgba(59,130,246,0.12)',
    color: 'var(--tone-hero)',
    fontWeight: 700,
    cursor: 'pointer'
  },
  selectButtonActive: {
    border: 'none',
    background: 'linear-gradient(135deg, var(--accent) 0%, var(--indigo) 100%)',
    color: 'var(--text-on-accent)',
    boxShadow: '0 12px 24px rgba(59,130,246,0.28)'
  },
  watchOnYoutube: {
    alignSelf: 'flex-start',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '8px 14px',
    borderRadius: '10px',
    border: '1px solid var(--surface-border)',
    background: 'var(--reset-bg)',
    color: 'var(--tone-strong)',
    fontWeight: 600,
    textDecoration: 'none'
  },
  playlistEmpty: {
    marginTop: '16px',
    padding: '16px',
    borderRadius: '12px',
    border: '1px dashed var(--surface-border)',
    background: 'var(--surface-soft)',
    color: 'var(--tone-strong)'
  },
  managerCard: {
    marginTop: '20px',
    padding: '20px',
    borderRadius: '16px',
    background: 'rgba(15,23,42,0.65)',
    border: '1px solid rgba(148,163,184,0.35)',
    boxShadow: '0 16px 32px rgba(15, 23, 42, 0.18)',
    color: '#E2E8F0'
  },
  managerTitle: {
    fontSize: '1.1rem',
    fontWeight: 800,
    marginBottom: '16px'
  },
  managerForm: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px'
  },
  managerLabel: {
    fontSize: '0.9rem',
    fontWeight: 600
  },
  managerInput: {
    padding: '10px 12px',
    borderRadius: '10px',
    border: '1px solid rgba(148,163,184,0.5)',
    background: 'rgba(15,23,42,0.85)',
    color: '#F8FAFC'
  },
  managerButtonRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '10px',
    marginTop: '6px'
  },
  managerPrimary: {
    flex: '1 1 180px',
    padding: '10px 14px',
    borderRadius: '12px',
    border: 'none',
    background: 'linear-gradient(135deg, rgba(59,130,246,0.38), rgba(96,165,250,0.22))',
    color: '#0B1220',
    fontWeight: 700,
    cursor: 'pointer'
  },
  managerSecondary: {
    flex: '1 1 160px',
    padding: '10px 14px',
    borderRadius: '12px',
    border: '1px solid rgba(148,163,184,0.45)',
    background: 'rgba(148,163,184,0.12)',
    color: '#E2E8F0',
    fontWeight: 600,
    cursor: 'pointer'
  },
  managerDanger: {
    flex: '1 1 140px',
    padding: '10px 14px',
    borderRadius: '12px',
    border: '1px solid rgba(248,113,113,0.6)',
    background: 'rgba(248,113,113,0.18)',
    color: '#FCA5A5',
    fontWeight: 600,
    cursor: 'pointer'
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
