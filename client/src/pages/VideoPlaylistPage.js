import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api.service';
import CommonHero from '../components/common/CommonHero';

const DEFAULT_PLAYLIST_URL = 'https://www.youtube.com/playlist?list=PLQu64YmMxERTi0K-K8QAihxfUkS4nYfHr';
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
    // ignore parsing failures
  }

  return '';
};

const VideoPlaylistPage = () => {
  const { user } = useAuth();
  const initialSelectedId = typeof window !== 'undefined' ? window.localStorage.getItem(SELECTED_PLAYLIST_KEY) : null;
  const storedSelectedRef = useRef(initialSelectedId ? String(initialSelectedId) : null);

  const [playlists, setPlaylists] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState('');
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

  const refreshPlaylists = useCallback(async (preferredId) => {
    if (!isProMember) return;

    setLoading(true);
    setLoadError('');
    try {
      const response = await api.video.listPlaylists();
      const fetched = Array.isArray(response?.playlists) && response.playlists.length
        ? response.playlists
        : DEFAULT_PLAYLISTS;

      setPlaylists(fetched);

      const desiredId = preferredId !== undefined
        ? (preferredId ? String(preferredId) : null)
        : storedSelectedRef.current;

      const matchedId = desiredId && fetched.some((item) => String(item.id) === String(desiredId))
        ? String(desiredId)
        : null;

      if (matchedId) {
        storedSelectedRef.current = matchedId;
      }
      setSelectedId(matchedId);
    } catch (fetchError) {
      console.error('[video] fetch playlists failed:', fetchError);
      setLoadError(fetchError.message || '재생목록을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.');
      setPlaylists(DEFAULT_PLAYLISTS);
      setSelectedId(null);
    } finally {
      setLoading(false);
    }
  }, [isProMember]);

  useEffect(() => {
    if (!isProMember) {
      setPlaylists([]);
      setSelectedId(null);
      setLoadError('');
      return;
    }
    refreshPlaylists();
  }, [isProMember, refreshPlaylists]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (selectedId) {
      window.localStorage.setItem(SELECTED_PLAYLIST_KEY, String(selectedId));
      storedSelectedRef.current = String(selectedId);
    } else {
      window.localStorage.removeItem(SELECTED_PLAYLIST_KEY);
      storedSelectedRef.current = null;
    }
  }, [selectedId]);

  const activePlaylist = useMemo(() => {
    if (!selectedId) return null;
    return playlists.find((playlist) => String(playlist.id) === String(selectedId)) || null;
  }, [playlists, selectedId]);

  const playlistId = useMemo(() => extractPlaylistId(activePlaylist?.url || ''), [activePlaylist]);
  const embedUrl = useMemo(() => (playlistId ? `https://www.youtube.com/embed/videoseries?list=${playlistId}` : ''), [playlistId]);

  const filteredPlaylists = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase();
    if (!keyword) return playlists;
    return playlists.filter((playlist) => playlist.name?.toLowerCase().includes(keyword));
  }, [playlists, searchTerm]);

  useEffect(() => {
    if (activePlaylist) {
      setEditName(activePlaylist.name || '');
      setEditUrl(activePlaylist.url || '');
    } else {
      setEditName('');
      setEditUrl('');
    }
  }, [activePlaylist]);

  useEffect(() => {
    if (!feedback) return undefined;
    const timer = setTimeout(() => setFeedback(''), 3000);
    return () => clearTimeout(timer);
  }, [feedback]);

  const handleSelectPlaylist = useCallback((id) => {
    if (!id) return;
    const idString = String(id);
    if (!playlists.some((playlist) => String(playlist.id) === idString)) {
      setError('재생목록 정보를 찾지 못했어요. 새로고침 후 다시 시도해 주세요.');
      return;
    }
    setSelectedId(idString);
    setError('');
    setFeedback('선택한 재생목록으로 준비했어요!');
  }, [playlists]);

  const handleUpdatePlaylist = useCallback(async (event) => {
    event.preventDefault();
    if (!canManage) return;
    if (!activePlaylist) {
      setError('먼저 재생목록을 선택해 주세요.');
      return;
    }

    const trimmedName = editName.trim();
    const trimmedUrl = editUrl.trim();

    if (!trimmedName) {
      setError('재생목록 이름을 입력해 주세요.');
      return;
    }
    if (!extractPlaylistId(trimmedUrl)) {
      setError('유효한 유튜브 재생목록 URL을 입력해 주세요.');
      return;
    }

    try {
      setError('');
      const response = await api.video.updatePlaylist(activePlaylist.id, { name: trimmedName, url: trimmedUrl });
      const updated = response?.playlist;
      if (!updated) {
        throw new Error('재생목록 정보를 받지 못했습니다. 다시 시도해 주세요.');
      }
      setFeedback('선택한 재생목록이 업데이트되었어요.');
      await refreshPlaylists(String(updated.id));
    } catch (updateError) {
      console.error('[video] update failed:', updateError);
      setError(updateError.message || '재생목록을 수정하지 못했습니다.');
    }
  }, [activePlaylist, canManage, editName, editUrl, refreshPlaylists]);

  const handleAddPlaylist = useCallback(async (event) => {
    event.preventDefault();
    if (!canManage) return;

    const trimmedName = editName.trim();
    const trimmedUrl = editUrl.trim();

    if (!trimmedName || !extractPlaylistId(trimmedUrl)) {
      setError('새 재생목록 이름과 URL을 모두 입력해 주세요.');
      return;
    }

    try {
      setError('');
      const response = await api.video.createPlaylist({ name: trimmedName, url: trimmedUrl });
      const created = response?.playlist;
      if (!created) {
        throw new Error('재생목록 정보를 받지 못했습니다.');
      }
      setFeedback('새 재생목록이 추가되었어요.');
      await refreshPlaylists(String(created.id));
      setShowManager(true);
    } catch (createError) {
      console.error('[video] create failed:', createError);
      setError(createError.message || '재생목록을 추가하지 못했습니다.');
    }
  }, [canManage, editName, editUrl, refreshPlaylists]);

  const handleDeletePlaylist = useCallback(async () => {
    if (!canManage || !activePlaylist) return;
    try {
      setError('');
      await api.video.deletePlaylist(activePlaylist.id);
      setFeedback('재생목록이 삭제되었어요.');
      if (storedSelectedRef.current && String(storedSelectedRef.current) === String(activePlaylist.id)) {
        storedSelectedRef.current = null;
      }
      await refreshPlaylists(null);
    } catch (deleteError) {
      console.error('[video] delete failed:', deleteError);
      setError(deleteError.message || '재생목록을 삭제하지 못했습니다.');
    }
  }, [activePlaylist, canManage, refreshPlaylists]);

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
      <CommonHero
        badge="Video Lessons"
        title="집중해서 듣는, 한눈에 정리되는 강의"
        subtitle="즐겨찾는 재생목록을 선택해 바로 이어서 보세요. 필요하면 관리자에서 재생목록을 관리할 수 있어요."
      />

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

        {loadError && <div style={styles.errorText}>{loadError}</div>}
        {error && <p style={styles.errorText}>{error}</p>}
        {feedback && <div style={styles.feedbackBanner}>{feedback}</div>}

        {loading ? (
          <div style={styles.playlistEmpty}>재생목록을 불러오는 중이에요... ⏳</div>
        ) : filteredPlaylists.length > 0 ? (
          <div style={styles.playlistGrid}>
            {filteredPlaylists.map((playlist) => {
              const active = selectedId && String(playlist.id) === String(selectedId);
              const playlistKey = extractPlaylistId(playlist.url);
              return (
                <div
                  key={playlist.id}
                  style={{
                    ...styles.playlistCard,
                    ...(active ? styles.playlistCardActive : {})
                  }}
                >
                  <div className="shimmer" aria-hidden />
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

        {canManage && showManager && (
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
                <button type="submit" style={styles.managerPrimary} disabled={!activePlaylist}>선택한 재생목록 업데이트</button>
                <button type="button" style={styles.managerSecondary} onClick={handleAddPlaylist}>새 재생목록 추가</button>
                <button type="button" style={styles.managerDanger} onClick={handleDeletePlaylist} disabled={!activePlaylist}>재생목록 삭제</button>
              </div>
              {!activePlaylist && (
                <p style={styles.managerHelper}>재생목록을 먼저 선택하면 위 내용으로 수정하거나 삭제할 수 있어요.</p>
              )}
            </form>
          </div>
        )}
      </section>

      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>2️⃣ 강의 시청</h2>
        <div style={styles.playerCard}>
          {activePlaylist && embedUrl ? (
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
              <p style={styles.placeholderText}>먼저 보고 싶은 재생목록을 선택해 주세요. 선택하면 이곳에서 바로 시청할 수 있어요.</p>
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
  selectorIntro: {
    margin: '0 0 16px',
    fontSize: '0.95rem',
    color: 'var(--tone-strong)'
  },
  selectorSearchRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '18px'
  },
  selectorSearchInput: {
    flex: 1,
    padding: '12px',
    borderRadius: '12px',
    border: '1px solid var(--border-subtle)',
    background: 'var(--surface-soft)',
    color: 'var(--text-primary)'
  },
  selectorClearButton: {
    padding: '10px 16px',
    borderRadius: '12px',
    border: '1px solid var(--border-subtle)',
    background: 'var(--surface-soft)',
    color: 'var(--text-primary)',
    cursor: 'pointer'
  },
  playlistGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
    gap: '16px'
  },
  playlistCard: {
    position: 'relative',
    overflow: 'hidden',
    borderRadius: '22px',
    border: '1px solid rgba(148,163,184,0.28)',
    background: 'linear-gradient(145deg, rgba(15,23,42,0.92), rgba(30,64,175,0.65))',
    padding: '18px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    transition: 'border 0.2s ease, box-shadow 0.2s ease',
    boxShadow: '0 22px 42px rgba(15, 23, 42, 0.28)',
    color: '#e2e8f0',
    backgroundSize: '200% 200%',
    animation: 'slowGradient 24s ease-in-out infinite'
  },
  playlistCardActive: {
    border: '1px solid var(--indigo)',
    boxShadow: '0 14px 28px rgba(79,70,229,0.28)'
  },
  playlistCardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '8px'
  },
  playlistNameRow: {
    display: 'flex',
    gap: '8px',
    alignItems: 'center'
  },
  playlistIcon: {
    fontSize: '1.2rem'
  },
  playlistName: {
    fontWeight: 800,
    color: '#f8fafc'
  },
  playlistActions: {
    display: 'flex',
    gap: '10px',
    alignItems: 'center',
    flexWrap: 'wrap'
  },
  selectButton: {
    flex: '0 0 auto',
    padding: '10px 16px',
    borderRadius: '999px',
    border: '1px solid rgba(255,255,255,0.18)',
    background: 'linear-gradient(135deg, rgba(99,102,241,1), rgba(14,165,233,1))',
    color: '#f8fafc',
    cursor: 'pointer',
    fontWeight: 800,
    boxShadow: '0 14px 26px rgba(15,23,42,0.28)'
  },
  selectButtonActive: {
    background: 'linear-gradient(135deg, rgba(16,185,129,1), rgba(99,102,241,1))'
  },
  watchOnYoutube: {
    flex: '0 0 auto',
    padding: '10px 16px',
    borderRadius: '999px',
    border: '1px solid rgba(255,255,255,0.25)',
    background: 'linear-gradient(135deg, rgba(255,255,255,0.14), rgba(255,255,255,0.06))',
    color: '#e0e7ff',
    fontWeight: 700,
    textDecoration: 'none',
    boxShadow: '0 14px 26px rgba(15,23,42,0.28)'
  },
  playlistEmpty: {
    padding: '20px',
    borderRadius: '14px',
    border: '1px dashed var(--border-subtle)',
    textAlign: 'center',
    color: 'var(--tone-strong)'
  },
  managerCard: {
    marginTop: '24px',
    padding: '20px',
    borderRadius: '16px',
    border: '1px solid rgba(148,163,184,0.35)',
    background: 'var(--surface-soft)'
  },
  managerTitle: {
    margin: '0 0 16px',
    fontWeight: 700,
    color: 'var(--text-primary)'
  },
  managerForm: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  managerLabel: {
    fontSize: '0.85rem',
    color: 'var(--tone-muted)'
  },
  managerInput: {
    padding: '12px',
    borderRadius: '12px',
    border: '1px solid var(--border-subtle)',
    background: 'var(--surface-card)',
    color: 'var(--text-primary)'
  },
  managerButtonRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '10px',
    marginTop: '8px'
  },
  managerPrimary: {
    padding: '10px 18px',
    borderRadius: '12px',
    border: 'none',
    background: 'linear-gradient(135deg, var(--indigo) 0%, var(--indigo-strong) 100%)',
    color: 'var(--text-on-accent)',
    fontWeight: 700,
    cursor: 'pointer'
  },
  managerSecondary: {
    padding: '10px 18px',
    borderRadius: '12px',
    border: '1px solid var(--border-subtle)',
    background: 'var(--surface-card)',
    color: 'var(--text-primary)',
    fontWeight: 600,
    cursor: 'pointer'
  },
  managerDanger: {
    padding: '10px 18px',
    borderRadius: '12px',
    border: '1px solid rgba(248,113,113,0.45)',
    background: 'rgba(248,113,113,0.15)',
    color: 'rgb(220,38,38)',
    fontWeight: 600,
    cursor: 'pointer'
  },
  managerHelper: {
    marginTop: '8px',
    fontSize: '0.85rem',
    color: 'var(--tone-muted)'
  },
  playerCard: {
    display: 'flex',
    flexDirection: 'column',
    gap: '18px'
  },
  playerWrapper: {
    position: 'relative',
    paddingBottom: '56.25%',
    height: 0,
    borderRadius: '18px',
    overflow: 'hidden',
    boxShadow: '0 20px 40px rgba(15, 23, 42, 0.18)'
  },
  iframe: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    border: 0
  },
  playerPlaceholder: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '240px',
    borderRadius: '16px',
    border: '1px dashed var(--border-subtle)',
    background: 'var(--surface-soft)',
    textAlign: 'center',
    padding: '24px'
  },
  placeholderText: {
    color: 'var(--tone-strong)',
    fontSize: '1rem'
  },
  playerActions: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  openButton: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '12px 20px',
    borderRadius: '999px',
    background: 'linear-gradient(135deg, #6366f1 0%, #0ea5e9 100%)',
    color: 'var(--text-on-accent)',
    fontWeight: 600,
    textDecoration: 'none',
    border: 'none'
  },
  tipText: {
    color: 'var(--tone-muted)',
    fontSize: '0.9rem'
  },
  tipList: {
    listStyle: 'none',
    padding: 0,
    margin: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: '10px'
  },
  tipItem: {
    padding: '12px 14px',
    borderRadius: '12px',
    background: 'var(--surface-soft)',
    color: 'var(--tone-strong)',
    border: '1px solid var(--border-subtle)'
  },
  feedbackBanner: {
    padding: '12px',
    borderRadius: '12px',
    background: 'rgba(34,197,94,0.15)',
    color: 'var(--success-strong)',
    fontWeight: 600
  },
  errorText: {
    margin: '0 0 12px',
    color: 'rgb(220,38,38)',
    fontWeight: 600
  },
  adminToggle: {
    padding: '10px 16px',
    borderRadius: '12px',
    border: '1px solid var(--border-subtle)',
    background: 'var(--surface-card)',
    color: 'var(--text-primary)',
    fontWeight: 600,
    cursor: 'pointer'
  },
  adminToggleActive: {
    border: '1px solid var(--indigo)',
    color: 'var(--indigo-strong)'
  },
  selectedBadge: {
    padding: '4px 8px',
    borderRadius: '999px',
    background: 'rgba(59,130,246,0.16)',
    color: 'var(--indigo-strong)',
    fontSize: '0.75rem',
    fontWeight: 700
  },
  gateContainer: {
    maxWidth: '560px',
    margin: '0 auto',
    padding: '48px 24px',
    textAlign: 'center'
  },
  gateCard: {
    marginTop: '24px',
    padding: '24px',
    borderRadius: '16px',
    border: '1px solid rgba(148,163,184,0.35)',
    background: 'var(--surface-card)'
  },
  gateText: {
    margin: '0 0 12px',
    color: 'var(--tone-strong)'
  }
};

export default VideoPlaylistPage;
