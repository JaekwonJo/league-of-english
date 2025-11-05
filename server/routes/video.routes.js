const express = require('express');
const router = express.Router();

const { verifyToken, requireAdmin } = require('../middleware/auth');
const database = require('../models/database');
const videoPlaylistService = require('../services/videoPlaylistService');

const ensureProAccess = async (userId) => {
  const user = await database.get('SELECT role, membership FROM users WHERE id = ?', [userId]);
  if (!user) {
    const error = new Error('사용자 정보를 찾을 수 없습니다.');
    error.status = 404;
    throw error;
  }

  const role = String(user.role || '').toLowerCase();
  const membership = String(user.membership || '').toLowerCase();
  const hasAccess = role === 'admin' || role === 'teacher' || membership === 'pro' || membership === 'vip';

  if (!hasAccess) {
    const error = new Error('프로 멤버 전용 기능입니다.');
    error.status = 403;
    throw error;
  }

  return { role, membership };
};

router.get('/playlists', verifyToken, async (req, res) => {
  try {
    await ensureProAccess(req.user.id);
    const playlists = await videoPlaylistService.listPlaylists();
    res.json({ playlists });
  } catch (error) {
    console.error('[video] list error:', error?.message || error);
    res.status(error.status || 500).json({ message: error.message || '재생목록을 불러오지 못했습니다.' });
  }
});

router.post('/playlists', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { name, url } = req.body || {};
    const playlist = await videoPlaylistService.createPlaylist({
      name,
      url,
      userId: req.user.id
    });
    res.status(201).json({ playlist });
  } catch (error) {
    console.error('[video] create error:', error?.message || error);
    res.status(400).json({ message: error.message || '재생목록을 추가하지 못했습니다.' });
  }
});

router.put('/playlists/:id', verifyToken, requireAdmin, async (req, res) => {
  try {
    const playlistId = Number(req.params.id);
    const { name, url } = req.body || {};
    const playlist = await videoPlaylistService.updatePlaylist(playlistId, {
      name,
      url,
      userId: req.user.id
    });
    res.json({ playlist });
  } catch (error) {
    console.error('[video] update error:', error?.message || error);
    res.status(error.status || 400).json({ message: error.message || '재생목록을 수정하지 못했습니다.' });
  }
});

router.delete('/playlists/:id', verifyToken, requireAdmin, async (req, res) => {
  try {
    const playlistId = Number(req.params.id);
    await videoPlaylistService.deletePlaylist(playlistId);
    res.json({ success: true });
  } catch (error) {
    console.error('[video] delete error:', error?.message || error);
    res.status(error.status || 400).json({ message: error.message || '재생목록을 삭제하지 못했습니다.' });
  }
});

module.exports = router;
