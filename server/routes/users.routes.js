'use strict';

const express = require('express');
const router = express.Router();
const database = require('../models/database');
const { verifyToken } = require('../middleware/auth');

// 내 프로필 조회
router.get('/users/profile', verifyToken, async (req, res) => {
  try {
    const user = await database.get('SELECT id, username, email, name, school, school_level, grade, role, membership, points, last_login_at, created_at, updated_at FROM users WHERE id = ?', [req.user.id]);
    if (!user) return res.status(404).json({ message: '사용자를 찾을 수 없습니다.' });
    res.json({ user });
  } catch (error) {
    res.status(500).json({ message: error?.message || '프로필을 불러오지 못했습니다.' });
  }
});

// 내 프로필 수정(학교/학년/이름만 허용)
router.put('/users/profile', verifyToken, async (req, res) => {
  try {
    const name = String(req.body?.name ?? '').trim();
    const school = String(req.body?.school ?? '').trim();
    const schoolLevel = String(req.body?.school_level || req.body?.schoolLevel || '').trim();
    const gradeRaw = req.body?.grade;
    const grade = Number(gradeRaw);

    if (!school && !name && gradeRaw === undefined && !schoolLevel) {
      return res.status(400).json({ message: '변경할 항목이 없습니다.' });
    }

    if (gradeRaw !== undefined && (!Number.isInteger(grade) || grade < 1 || grade > 3)) {
      return res.status(400).json({ message: '학년은 1~3 사이의 정수여야 합니다.' });
    }

    const sets = [];
    const params = [];
    if (name) { sets.push('name = ?'); params.push(name); }
    if (school) { sets.push('school = ?'); params.push(school); }
    if (schoolLevel) { sets.push('school_level = ?'); params.push(schoolLevel); }
    if (gradeRaw !== undefined) { sets.push('grade = ?'); params.push(grade); }
    sets.push('updated_at = CURRENT_TIMESTAMP');
    const sql = `UPDATE users SET ${sets.join(', ')} WHERE id = ?`;
    params.push(req.user.id);

    await database.run(sql, params);
    const updated = await database.get('SELECT id, username, email, name, school, school_level, grade, role, membership, points, last_login_at, created_at, updated_at FROM users WHERE id = ?', [req.user.id]);
    res.json({ message: '프로필을 업데이트했어요.', user: updated });
  } catch (error) {
    res.status(500).json({ message: error?.message || '프로필을 수정하지 못했습니다.' });
  }
});

module.exports = router;

