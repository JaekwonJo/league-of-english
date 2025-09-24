const express = require('express');
const router = express.Router();
const database = require('../models/database');
const { verifyToken } = require('../middleware/auth');

const DEFAULT_RANGE_DAYS = 7;
const MAX_RANGE_DAYS = 180;

function clampRangeDays(value) {
  const parsed = parseInt(value, 10);
  if (Number.isNaN(parsed) || parsed <= 0) return DEFAULT_RANGE_DAYS;
  return Math.min(parsed, MAX_RANGE_DAYS);
}

function normalizeMembership(value) {
  if (!value) return null;
  return String(value).trim().toLowerCase();
}

function buildStudentFilters({ grade, membership }) {
  const clauses = [];
  const params = [];

  if (grade) {
    const gradeValue = parseInt(grade, 10);
    if (!Number.isNaN(gradeValue)) {
      clauses.push('u.grade = ?');
      params.push(gradeValue);
    }
  }

  if (membership) {
    const membershipValue = normalizeMembership(membership);
    if (membershipValue) {
      clauses.push('LOWER(COALESCE(u.membership, "free")) = ?');
      params.push(membershipValue);
    }
  }

  return {
    clause: clauses.length ? ` AND ${clauses.join(' AND ')}` : '',
    params
  };
}

function csvEscape(value) {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

async function loadClassAnalytics(teacherId, options = {}) {
  const rangeDays = clampRangeDays(options.rangeDays || options.range || DEFAULT_RANGE_DAYS);
  const sinceParam = `-${rangeDays} days`;
  const { clause, params: filterParams } = buildStudentFilters(options);

  const studentRows = await database.all(
    `SELECT u.id AS studentId,
            u.name,
            u.username,
            u.school,
            u.grade,
            COALESCE(u.membership, 'free') AS membership,
            MIN(tsl.created_at) AS linkedAt,
            COUNT(sr.id) AS attempts,
            SUM(CASE WHEN sr.is_correct = 1 THEN 1 ELSE 0 END) AS correct,
            AVG(sr.time_spent) AS avgTime,
            SUM(sr.time_spent) AS totalTime,
            MAX(sr.created_at) AS lastActivity
       FROM teacher_student_links tsl
       JOIN users u ON u.id = tsl.student_id
  LEFT JOIN study_records sr
         ON sr.user_id = u.id
        AND sr.created_at >= datetime('now', ?)
      WHERE tsl.teacher_id = ?${clause}
   GROUP BY u.id
   ORDER BY attempts DESC, LOWER(COALESCE(u.name, u.username)) ASC
      LIMIT 200`,
    [sinceParam, teacherId, ...filterParams]
  );

  const typeRows = await database.all(
    `SELECT p.type AS type,
            COUNT(*) AS total,
            SUM(CASE WHEN sr.is_correct = 1 THEN 1 ELSE 0 END) AS correct
       FROM teacher_student_links tsl
       JOIN study_records sr ON sr.user_id = tsl.student_id
       JOIN problems p ON p.id = sr.problem_id
       JOIN users u ON u.id = tsl.student_id
      WHERE tsl.teacher_id = ?
        AND sr.created_at >= datetime('now', ?)
        ${clause}
   GROUP BY p.type
   ORDER BY total DESC`,
    [teacherId, sinceParam, ...filterParams]
  );

  const dailyRows = await database.all(
    `SELECT DATE(sr.created_at) AS day,
            COUNT(*) AS total,
            SUM(CASE WHEN sr.is_correct = 1 THEN 1 ELSE 0 END) AS correct
       FROM teacher_student_links tsl
       JOIN study_records sr ON sr.user_id = tsl.student_id
       JOIN users u ON u.id = tsl.student_id
      WHERE tsl.teacher_id = ?
        AND sr.created_at >= datetime('now', ?)
        ${clause}
   GROUP BY day
   ORDER BY day ASC`,
    [teacherId, sinceParam, ...filterParams]
  );

  const students = studentRows.map((row) => {
    const attempts = Number(row.attempts) || 0;
    const correct = Number(row.correct) || 0;
    const totalTimeSeconds = Number(row.totalTime) || 0;
    const avgTimeSeconds = attempts ? totalTimeSeconds / attempts : 0;
    const accuracy = attempts ? Math.round((correct / attempts) * 1000) / 10 : 0;
    return {
      id: row.studentId,
      name: row.name || row.username,
      username: row.username,
      school: row.school || '',
      grade: row.grade,
      membership: String(row.membership || 'free'),
      linkedAt: row.linkedAt || null,
      lastActivity: row.lastActivity || null,
      attempts,
      correct,
      accuracy,
      totalTimeSeconds,
      avgTimeSeconds: Math.round(avgTimeSeconds * 10) / 10
    };
  });

  const totalAttempts = students.reduce((sum, student) => sum + student.attempts, 0);
  const totalCorrect = students.reduce((sum, student) => sum + student.correct, 0);
  const totalTimeSeconds = students.reduce((sum, student) => sum + student.totalTimeSeconds, 0);
  const activeStudents = students.filter((student) => student.attempts > 0).length;

  const summary = {
    totalStudents: students.length,
    activeStudents,
    totalAttempts,
    totalCorrect,
    accuracy: totalAttempts ? Math.round((totalCorrect / totalAttempts) * 1000) / 10 : 0,
    avgTimeSeconds: totalAttempts ? Math.round((totalTimeSeconds / totalAttempts) * 10) / 10 : 0,
    avgAttemptsPerStudent: students.length ? Math.round((totalAttempts / students.length) * 10) / 10 : 0
  };

  const byType = typeRows.map((row) => {
    const total = Number(row.total) || 0;
    const correct = Number(row.correct) || 0;
    const accuracy = total ? Math.round((correct / total) * 1000) / 10 : 0;
    return {
      type: row.type || '기타',
      total,
      correct,
      accuracy
    };
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const byDay = new Map(dailyRows.map((row) => [row.day, row]));
  const daily = [];
  for (let offset = rangeDays - 1; offset >= 0; offset -= 1) {
    const day = new Date(today);
    day.setDate(today.getDate() - offset);
    const key = day.toISOString().slice(0, 10);
    const row = byDay.get(key);
    const total = row ? Number(row.total) || 0 : 0;
    const correct = row ? Number(row.correct) || 0 : 0;
    daily.push({
      date: key,
      total,
      correct,
      accuracy: total ? Math.round((correct / total) * 1000) / 10 : 0
    });
  }

  return {
    rangeDays,
    summary,
    students,
    byType,
    daily
  };
}

async function loadStudentDetail(teacherId, studentId, options = {}) {
  const rangeDays = clampRangeDays(options.rangeDays || options.range || DEFAULT_RANGE_DAYS);
  const sinceParam = `-${rangeDays} days`;

  const student = await database.get(
    `SELECT u.id AS studentId,
            u.name,
            u.username,
            u.school,
            u.grade,
            COALESCE(u.membership, 'free') AS membership,
            MIN(tsl.created_at) AS linkedAt
       FROM teacher_student_links tsl
       JOIN users u ON u.id = tsl.student_id
      WHERE tsl.teacher_id = ?
        AND tsl.student_id = ?
   GROUP BY u.id`,
    [teacherId, studentId]
  );

  if (!student) {
    return null;
  }

  const aggregate = await database.get(
    `SELECT COUNT(*) AS attempts,
            SUM(CASE WHEN is_correct = 1 THEN 1 ELSE 0 END) AS correct,
            AVG(time_spent) AS avgTime,
            SUM(time_spent) AS totalTime,
            MAX(created_at) AS lastActivity
       FROM study_records
      WHERE user_id = ?
        AND created_at >= datetime('now', ?)`,
    [studentId, sinceParam]
  );

  const typeRows = await database.all(
    `SELECT p.type AS type,
            COUNT(*) AS total,
            SUM(CASE WHEN sr.is_correct = 1 THEN 1 ELSE 0 END) AS correct
       FROM study_records sr
       JOIN problems p ON p.id = sr.problem_id
      WHERE sr.user_id = ?
        AND sr.created_at >= datetime('now', ?)
   GROUP BY p.type
   ORDER BY total DESC`,
    [studentId, sinceParam]
  );

  const dailyRows = await database.all(
    `SELECT DATE(created_at) AS day,
            COUNT(*) AS total,
            SUM(CASE WHEN is_correct = 1 THEN 1 ELSE 0 END) AS correct
       FROM study_records
      WHERE user_id = ?
        AND created_at >= datetime('now', ?)
   GROUP BY day
   ORDER BY day ASC`,
    [studentId, sinceParam]
  );

  const recentAttempts = await database.all(
    `SELECT sr.id,
            sr.created_at AS createdAt,
            sr.is_correct AS isCorrect,
            sr.time_spent AS timeSpent,
            p.type AS problemType
       FROM study_records sr
       JOIN problems p ON p.id = sr.problem_id
      WHERE sr.user_id = ?
        AND sr.created_at >= datetime('now', ?)
   ORDER BY sr.created_at DESC
      LIMIT 20`,
    [studentId, sinceParam]
  );

  const attempts = Number(aggregate?.attempts) || 0;
  const correct = Number(aggregate?.correct) || 0;
  const totalTimeSeconds = Number(aggregate?.totalTime) || 0;
  const summary = {
    attempts,
    correct,
    accuracy: attempts ? Math.round((correct / attempts) * 1000) / 10 : 0,
    avgTimeSeconds: attempts ? Math.round((Number(aggregate?.avgTime) || 0) * 10) / 10 : 0,
    totalTimeSeconds,
    lastActivity: aggregate?.lastActivity || null
  };

  const byType = typeRows.map((row) => {
    const total = Number(row.total) || 0;
    const correctCount = Number(row.correct) || 0;
    const accuracy = total ? Math.round((correctCount / total) * 1000) / 10 : 0;
    return {
      type: row.type || '기타',
      total,
      correct: correctCount,
      accuracy
    };
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const byDay = new Map(dailyRows.map((row) => [row.day, row]));
  const daily = [];
  for (let offset = rangeDays - 1; offset >= 0; offset -= 1) {
    const day = new Date(today);
    day.setDate(today.getDate() - offset);
    const key = day.toISOString().slice(0, 10);
    const row = byDay.get(key);
    const total = row ? Number(row.total) || 0 : 0;
    const correctCount = row ? Number(row.correct) || 0 : 0;
    daily.push({
      date: key,
      total,
      correct: correctCount,
      accuracy: total ? Math.round((correctCount / total) * 1000) / 10 : 0
    });
  }

  return {
    student: {
      id: student.studentId,
      name: student.name || student.username,
      username: student.username,
      school: student.school || '',
      grade: student.grade,
      membership: String(student.membership || 'free'),
      linkedAt: student.linkedAt || null
    },
    rangeDays,
    summary,
    byType,
    daily,
    recentAttempts: recentAttempts.map((row) => ({
      id: row.id,
      date: row.createdAt,
      type: row.problemType || '기타',
      isCorrect: Number(row.isCorrect) === 1,
      timeSpent: Number(row.timeSpent) || 0
    }))
  };
}

function requireTeacher(req, res, next) {
  if (req.user.role !== 'teacher' && req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: '선생님 전용 기능이에요.' });
  }
  next();
}

function requireStudent(req, res, next) {
  if (req.user.role !== 'student') {
    return res.status(403).json({ success: false, message: '학생 계정만 사용할 수 있어요.' });
  }
  next();
}

function normalizeCode(code) {
  return String(code || '').trim().toUpperCase();
}

async function generateUniqueCode() {
  let attempt = 0;
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  while (attempt < 5) {
    attempt += 1;
    let code = 'CL-';
    for (let i = 0; i < 6; i += 1) {
      code += alphabet[Math.floor(Math.random() * alphabet.length)];
    }
    const existing = await database.get('SELECT code FROM teacher_codes WHERE code = ?', [code]);
    if (!existing) return code;
  }
  throw new Error('새 반 코드를 만드는 데 실패했어요. 잠시 후 다시 시도해 주세요.');
}

router.get('/codes', verifyToken, requireTeacher, async (req, res) => {
  try {
    const rows = await database.all(
      `SELECT code, active, used_by AS usedBy, used_at AS usedAt, expires_at AS expiresAt, created_at AS createdAt
         FROM teacher_codes
        WHERE issued_by = ?
        ORDER BY created_at DESC
        LIMIT 50`,
      [req.user.id]
    );
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('[teacher] list codes error:', error);
    res.status(500).json({ success: false, message: '반 코드를 불러오지 못했어요.' });
  }
});

router.post('/codes', verifyToken, requireTeacher, async (req, res) => {
  try {
    const code = await generateUniqueCode();
    await database.run(
      `INSERT INTO teacher_codes (code, issued_by, active) VALUES (?, ?, 1)`,
      [code, req.user.id]
    );
    res.json({ success: true, data: { code } });
  } catch (error) {
    console.error('[teacher] create code error:', error);
    res.status(500).json({ success: false, message: '새 반 코드를 만들지 못했어요.' });
  }
});

router.post('/codes/:code/deactivate', verifyToken, requireTeacher, async (req, res) => {
  try {
    const code = normalizeCode(req.params.code);
    const row = await database.get(
      `SELECT code, issued_by AS issuedBy FROM teacher_codes WHERE code = ?`,
      [code]
    );
    if (!row || row.issuedBy !== req.user.id) {
      return res.status(404).json({ success: false, message: '해당 코드를 찾을 수 없어요.' });
    }
    await database.run(
      `UPDATE teacher_codes SET active = 0 WHERE code = ?`,
      [code]
    );
    res.json({ success: true });
  } catch (error) {
    console.error('[teacher] deactivate code error:', error);
    res.status(500).json({ success: false, message: '반 코드를 비활성화하지 못했어요.' });
  }
});

router.get('/students', verifyToken, requireTeacher, async (req, res) => {
  try {
    const students = await database.all(
      `SELECT u.id, u.username, u.name, u.school, u.grade, u.created_at AS joinedAt, tsl.created_at AS linkedAt
         FROM teacher_student_links tsl
         JOIN users u ON u.id = tsl.student_id
        WHERE tsl.teacher_id = ?
        ORDER BY tsl.created_at DESC`,
      [req.user.id]
    );
    res.json({ success: true, data: students });
  } catch (error) {
    console.error('[teacher] list students error:', error);
    res.status(500).json({ success: false, message: '학생 정보를 불러오지 못했어요.' });
  }
});

router.post('/join', verifyToken, requireStudent, async (req, res) => {
  try {
    const code = normalizeCode(req.body?.code);
    if (!code) {
      return res.status(400).json({ success: false, message: '반 코드를 입력해 주세요.' });
    }

    const teacherCode = await database.get(
      `SELECT code, issued_by AS issuedBy, active, expires_at AS expiresAt, used_by AS usedBy
         FROM teacher_codes
        WHERE code = ?`,
      [code]
    );

    if (!teacherCode) {
      return res.status(404).json({ success: false, message: '유효한 반 코드를 찾을 수 없어요.' });
    }
    if (Number(teacherCode.active) !== 1) {
      return res.status(400).json({ success: false, message: '이미 사용된 코드예요.' });
    }
    if (teacherCode.expiresAt) {
      const expires = new Date(teacherCode.expiresAt);
      if (!Number.isNaN(expires.getTime()) && expires.getTime() < Date.now()) {
        return res.status(400).json({ success: false, message: '만료된 코드예요.' });
      }
    }
    if (teacherCode.usedBy) {
      return res.status(400).json({ success: false, message: '이미 사용된 코드예요.' });
    }

    const teacher = await database.get('SELECT id, name, username FROM users WHERE id = ?', [teacherCode.issuedBy]);
    if (!teacher) {
      return res.status(400).json({ success: false, message: '코드에 연결된 선생님 정보를 찾을 수 없어요.' });
    }

    const existingLink = await database.get(
      `SELECT 1 FROM teacher_student_links WHERE teacher_id = ? AND student_id = ?`,
      [teacher.id, req.user.id]
    );
    if (existingLink) {
      return res.status(400).json({ success: false, message: '이미 해당 선생님 반에 등록돼 있어요.' });
    }

    await database.run(
      `INSERT INTO teacher_student_links (teacher_id, student_id) VALUES (?, ?)`,
      [teacher.id, req.user.id]
    );

    await database.run(
      `UPDATE teacher_codes SET used_by = ?, used_at = CURRENT_TIMESTAMP, active = 0 WHERE code = ?`,
      [req.user.id, code]
    );

    res.json({
      success: true,
      message: '선생님 반에 등록됐어요!',
      data: {
        teacher: {
          id: teacher.id,
          name: teacher.name,
          username: teacher.username
        }
      }
    });
  } catch (error) {
    console.error('[teacher] join code error:', error);
    res.status(500).json({ success: false, message: '반 코드 등록에 실패했어요. 잠시 후 다시 시도해 주세요.' });
  }
});

router.get('/analytics/overview', verifyToken, requireTeacher, async (req, res) => {
  try {
    const { range, grade, membership } = req.query || {};
    const analytics = await loadClassAnalytics(req.user.id, { range, grade, membership });
    res.json({ success: true, data: analytics });
  } catch (error) {
    console.error('[teacher] analytics overview error:', error);
    res.status(500).json({ success: false, message: '반 학습 통계를 불러오지 못했어요.' });
  }
});

router.get('/analytics/students/:studentId', verifyToken, requireTeacher, async (req, res) => {
  try {
    const studentId = parseInt(req.params.studentId, 10);
    if (Number.isNaN(studentId)) {
      return res.status(400).json({ success: false, message: '학생 ID가 올바르지 않아요.' });
    }
    const { range } = req.query || {};
    const detail = await loadStudentDetail(req.user.id, studentId, { range });
    if (!detail) {
      return res.status(404).json({ success: false, message: '해당 학생을 찾을 수 없어요.' });
    }
    res.json({ success: true, data: detail });
  } catch (error) {
    console.error('[teacher] analytics student detail error:', error);
    res.status(500).json({ success: false, message: '학생 상세 통계를 불러오지 못했어요.' });
  }
});

router.get('/analytics/export', verifyToken, requireTeacher, async (req, res) => {
  try {
    const { range, grade, membership } = req.query || {};
    const analytics = await loadClassAnalytics(req.user.id, { range, grade, membership });
    const header = [
      '학생 이름',
      '아이디',
      '학교',
      '학년',
      '멤버십',
      '등록일',
      '최근 학습',
      '시도 수',
      '정답 수',
      '정답률(%)',
      '평균 풀이 시간(초)',
      '총 풀이 시간(초)'
    ];

    const lines = [header.map(csvEscape).join(',')];

    analytics.students.forEach((student) => {
      lines.push([
        student.name || '',
        student.username || '',
        student.school || '',
        student.grade ?? '',
        student.membership || '',
        student.linkedAt || '',
        student.lastActivity || '',
        student.attempts,
        student.correct,
        student.accuracy,
        student.avgTimeSeconds,
        student.totalTimeSeconds
      ].map(csvEscape).join(','));
    });

    lines.push([
      '요약',
      '',
      '',
      '',
      '',
      '',
      '',
      analytics.summary.totalAttempts,
      analytics.summary.totalCorrect,
      analytics.summary.accuracy,
      analytics.summary.avgTimeSeconds,
      ''
    ].map(csvEscape).join(','));

    const csvContent = lines.join('\n');
    const prefix = 'loe-teacher-analytics';
    const parts = [prefix, `${analytics.rangeDays}d`];
    if (grade) parts.push(`g${grade}`);
    if (membership) parts.push(normalizeMembership(membership));
    const filename = `${parts.filter(Boolean).join('-')}.csv`;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(`\uFEFF${csvContent}`);
  } catch (error) {
    console.error('[teacher] analytics export error:', error);
    res.status(500).json({ success: false, message: 'CSV 내보내기에 실패했어요.' });
  }
});

module.exports = router;
