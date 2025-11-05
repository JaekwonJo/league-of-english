const database = require('../models/database');

const DEFAULT_PLAYLIST_URL = process.env.LOE_DEFAULT_PLAYLIST_URL
  || 'https://www.youtube.com/playlist?list=PLQu64YmMxERTi0K-K8QAihxfUkS4nYfHr';
const DEFAULT_PLAYLIST_NAME = process.env.LOE_DEFAULT_PLAYLIST_NAME
  || 'League of English · 공식 정리 재생목록';

const sanitizePlaylistId = (value = '') => {
  const trimmed = String(value || '').trim();
  if (!trimmed) return '';

  if (/^[A-Za-z0-9_-]{10,}$/.test(trimmed) && !trimmed.includes('://')) {
    return trimmed;
  }

  try {
    const url = new URL(trimmed);
    if (url.searchParams.has('list')) {
      return url.searchParams.get('list') || '';
    }
    const parts = url.pathname.split('/').filter(Boolean);
    const playlistIndex = parts.findIndex((part) => part === 'playlist');
    if (playlistIndex >= 0 && parts[playlistIndex + 1]) {
      return parts[playlistIndex + 1];
    }
  } catch (error) {
    // ignore parsing failure
  }

  return '';
};

const normalizePlaylistUrl = (value = '') => {
  const playlistId = sanitizePlaylistId(value);
  if (!playlistId) return '';
  return `https://www.youtube.com/playlist?list=${playlistId}`;
};

const mapRowToPlaylist = (row) => ({
  id: row.id,
  name: row.name,
  url: row.url,
  createdBy: row.created_by,
  updatedBy: row.updated_by,
  createdAt: row.created_at,
  updatedAt: row.updated_at
});

async function ensureSeedPlaylist() {
  const row = await database.get('SELECT COUNT(*) as count FROM video_playlists WHERE is_archived = 0');
  if (row && Number(row.count) > 0) {
    return;
  }

  const normalizedUrl = normalizePlaylistUrl(DEFAULT_PLAYLIST_URL);
  if (!normalizedUrl) {
    console.warn('[video-playlists] default playlist URL is invalid, skipping seed.');
    return;
  }

  await database.run(
    `INSERT INTO video_playlists (name, url, created_by, updated_by)
     VALUES (?, ?, NULL, NULL)`,
    [DEFAULT_PLAYLIST_NAME, normalizedUrl]
  );
}

async function listPlaylists() {
  await ensureSeedPlaylist();
  const rows = await database.all(
    `SELECT id, name, url, created_by, updated_by, created_at, updated_at
       FROM video_playlists
      WHERE is_archived = 0
      ORDER BY created_at ASC, id ASC`
  );
  return rows.map(mapRowToPlaylist);
}

async function createPlaylist({ name, url, userId }) {
  const normalizedUrl = normalizePlaylistUrl(url);
  if (!normalizedUrl) {
    throw new Error('유효한 유튜브 재생목록 URL을 입력해 주세요.');
  }
  const trimmedName = String(name || '').trim();
  if (!trimmedName) {
    throw new Error('재생목록 이름을 입력해 주세요.');
  }

  const result = await database.run(
    `INSERT INTO video_playlists (name, url, created_by, updated_by)
     VALUES (?, ?, ?, ?)`,
    [trimmedName, normalizedUrl, userId || null, userId || null]
  );

  const playlistId = result?.id;
  return await getPlaylistById(playlistId);
}

async function getPlaylistById(id) {
  if (!id) return null;
  const row = await database.get(
    `SELECT id, name, url, created_by, updated_by, created_at, updated_at
       FROM video_playlists
      WHERE id = ? AND is_archived = 0`,
    [id]
  );
  return row ? mapRowToPlaylist(row) : null;
}

async function updatePlaylist(id, { name, url, userId }) {
  if (!id) {
    throw new Error('재생목록을 찾을 수 없습니다.');
  }

  const normalizedUrl = normalizePlaylistUrl(url);
  if (!normalizedUrl) {
    throw new Error('유효한 유튜브 재생목록 URL을 입력해 주세요.');
  }

  const trimmedName = String(name || '').trim();
  if (!trimmedName) {
    throw new Error('재생목록 이름을 입력해 주세요.');
  }

  const { changes } = await database.run(
    `UPDATE video_playlists
        SET name = ?,
            url = ?,
            updated_by = ?,
            updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND is_archived = 0`,
    [trimmedName, normalizedUrl, userId || null, id]
  );

  if (!changes) {
    throw new Error('재생목록을 찾을 수 없습니다.');
  }

  return await getPlaylistById(id);
}

async function deletePlaylist(id) {
  if (!id) {
    throw new Error('재생목록을 찾을 수 없습니다.');
  }

  const countRow = await database.get('SELECT COUNT(*) as count FROM video_playlists WHERE is_archived = 0');
  if (!countRow || Number(countRow.count) <= 1) {
    throw new Error('최소 한 개의 재생목록은 유지해야 합니다.');
  }

  const { changes } = await database.run(
    'DELETE FROM video_playlists WHERE id = ? AND is_archived = 0',
    [id]
  );

  if (!changes) {
    throw new Error('재생목록을 찾을 수 없습니다.');
  }

  return true;
}

module.exports = {
  listPlaylists,
  createPlaylist,
  updatePlaylist,
  deletePlaylist,
  normalizePlaylistUrl,
  sanitizePlaylistId
};
