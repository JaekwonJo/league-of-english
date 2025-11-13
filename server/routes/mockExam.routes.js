const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const router = express.Router();

const { verifyToken, requireAdmin } = require('../middleware/auth');
const database = require('../models/database');
const mockExamService = require('../services/mockExamService');

const DEFAULT_EXAM_ID = process.env.MOCK_EXAM_ID || '2025-10';
const STORAGE_ROOT = path.resolve(__dirname, '..', '..', 'mock-exams');
const uploadTempDir = path.resolve(__dirname, '..', '..', 'tmp', 'mock-exam');

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      fs.mkdirSync(uploadTempDir, { recursive: true });
      cb(null, uploadTempDir);
    },
    filename: (req, file, cb) => {
      const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
      cb(null, `${unique}${path.extname(file.originalname || '.pdf')}`);
    }
  }),
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase();
    const mime = (file.mimetype || '').toLowerCase();
    if (mime === 'application/pdf' || ext === '.pdf') {
      cb(null, true);
    } else {
      const error = new multer.MulterError('LIMIT_UNEXPECTED_FILE');
      error.message = 'PDF 파일만 업로드할 수 있어요.';
      cb(error);
    }
  }
});

// Rename an existing examId folder (admin only)
router.post('/rename', verifyToken, requireAdmin, async (req, res) => {
  try {
    const oldId = String(req.body?.oldId || '').trim();
    const newId = String(req.body?.newId || '').trim();
    if (!oldId || !newId) {
      return res.status(400).json({ success: false, message: 'oldId와 newId를 모두 입력해 주세요.' });
    }
    if (oldId === newId) {
      return res.status(400).json({ success: false, message: '새 이름이 이전 이름과 동일합니다.' });
    }
    const oldDir = path.join(STORAGE_ROOT, oldId);
    const newDir = path.join(STORAGE_ROOT, newId);
    if (!fs.existsSync(oldDir)) {
      return res.status(404).json({ success: false, message: '지정한 시험을 찾을 수 없습니다.' });
    }
    if (fs.existsSync(newDir)) {
      return res.status(409).json({ success: false, message: '같은 이름의 시험이 이미 존재합니다.' });
    }
    fs.renameSync(oldDir, newDir);
    if (typeof mockExamService.resetCache === 'function') {
      try { mockExamService.resetCache(oldId); } catch {}
      try { mockExamService.resetCache(newId); } catch {}
    }
    return res.json({ success: true, message: '시험 이름을 변경했어요.', data: { oldId, newId } });
  } catch (error) {
    console.error('[mockExam] rename failed:', error);
    return res.status(500).json({ success: false, message: error.message || '시험 이름을 변경하지 못했습니다.' });
  }
});

// Delete an uploaded exam (admin only)
router.delete('/:examId', verifyToken, requireAdmin, async (req, res) => {
  try {
    const examId = String(req.params.examId || '').trim();
    if (!examId) return res.status(400).json({ success: false, message: 'examId가 필요합니다.' });
    const targetDir = path.join(STORAGE_ROOT, examId);
    if (!fs.existsSync(targetDir)) {
      return res.status(404).json({ success: false, message: '삭제할 시험을 찾을 수 없습니다.' });
    }
    fs.rmSync(targetDir, { recursive: true, force: true });
    if (typeof mockExamService.resetCache === 'function') {
      try { mockExamService.resetCache(examId); } catch {}
    }
    return res.json({ success: true, message: '시험을 삭제했어요.' });
  } catch (error) {
    console.error('[mockExam] delete failed:', error);
    return res.status(500).json({ success: false, message: error.message || '시험을 삭제하지 못했습니다.' });
  }
});

router.get('/', verifyToken, async (req, res) => {
  try {
    const list = await mockExamService.listAvailableExams();
    return res.json({ success: true, data: list });
  } catch (error) {
    console.error('[mockExam] list failed:', error);
    return res.status(500).json({ success: false, message: error.message || '모의고사 목록을 불러오지 못했습니다.' });
  }
});

router.get('/:examId', verifyToken, async (req, res) => {
  try {
    const examId = (req.params.examId || DEFAULT_EXAM_ID).trim();
    const exam = await mockExamService.getExam(examId);
    return res.json({ success: true, data: exam });
  } catch (error) {
    console.error('[mockExam] GET exam failed:', error);
    return res.status(500).json({ success: false, message: error.message || '시험 데이터를 불러오지 못했습니다.' });
  }
});

router.post('/:examId/submit', verifyToken, async (req, res) => {
  try {
    const { answers } = req.body || {};
    if (!answers || typeof answers !== 'object') {
      return res.status(400).json({ success: false, message: 'answers 필드가 필요합니다.' });
    }
    const examId = (req.params.examId || DEFAULT_EXAM_ID).trim();
    const result = await mockExamService.gradeExam(answers, req.user.id, examId);
    return res.json({ success: true, data: result });
  } catch (error) {
    console.error('[mockExam] submit failed:', error);
    return res.status(500).json({ success: false, message: error.message || '채점 중 오류가 발생했습니다.' });
  }
});

router.post('/:examId/explanations', verifyToken, async (req, res) => {
  try {
    const { questionNumber } = req.body || {};
    if (!questionNumber) {
      return res.status(400).json({ success: false, message: 'questionNumber 필드가 필요합니다.' });
    }

    const user = await database.get('SELECT membership, role FROM users WHERE id = ?', [req.user.id]);
    if (!user) {
      return res.status(404).json({ success: false, message: '사용자를 찾을 수 없습니다.' });
    }

    const membership = String(user.membership || '').toLowerCase();
    if (user.role !== 'admin' && membership !== 'pro') {
      return res.status(403).json({ success: false, message: '이 기능은 프로 회원 전용입니다.' });
    }

    const examId = (req.params.examId || DEFAULT_EXAM_ID).trim();
    const explanation = await mockExamService.getExplanation(questionNumber, examId);
    return res.json({ success: true, data: explanation });
  } catch (error) {
    console.error('[mockExam] explanation failed:', error);
    const status = error.message && error.message.includes('OpenAI') ? 503 : 500;
    return res.status(status).json({ success: false, message: error.message || '해설 생성 중 오류가 발생했습니다.' });
  }
});

router.post('/upload', verifyToken, requireAdmin, upload.fields([
  { name: 'questionPdf', maxCount: 1 },
  { name: 'answerPdf', maxCount: 1 }
]), async (req, res) => {
  const cleanupTemp = () => {
    Object.values(req.files || {}).flat().forEach((file) => {
      if (file?.path && fs.existsSync(file.path)) {
        try { fs.unlinkSync(file.path); } catch (err) { console.warn('[mockExam] temp cleanup failed:', err?.message || err); }
      }
    });
  };

  try {
    const examIdInput = String(req.body?.examId || DEFAULT_EXAM_ID).trim() || DEFAULT_EXAM_ID;
    const questionFile = req.files?.questionPdf?.[0];
    const answerFile = req.files?.answerPdf?.[0];

    if (!questionFile || !answerFile) {
      cleanupTemp();
      return res.status(400).json({ success: false, message: '문제지 PDF와 정답/해설 PDF를 모두 업로드해 주세요.' });
    }

    const targetDir = path.join(STORAGE_ROOT, examIdInput);
    fs.mkdirSync(targetDir, { recursive: true });

    const questionTarget = path.join(targetDir, 'questions.pdf');
    fs.renameSync(questionFile.path, questionTarget);

    const answerTarget = path.join(targetDir, 'answers.pdf');
    fs.renameSync(answerFile.path, answerTarget);

    cleanupTemp();

    if (typeof mockExamService.resetCache === 'function') {
      mockExamService.resetCache(examIdInput);
    }

    return res.status(201).json({ success: true, message: `${examIdInput} 모의고사 PDF가 업데이트되었습니다.` });
  } catch (error) {
    console.error('[mockExam] upload failed:', error);
    cleanupTemp();
    return res.status(500).json({ success: false, message: error.message || '모의고사 파일 업로드에 실패했습니다.' });
  }
});

module.exports = router;
