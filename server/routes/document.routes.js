const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const pdfParse = require('pdf-parse');
const database = require('../models/database');
const { verifyToken, requireTeacherOrAdmin } = require('../middleware/auth');
const config = require('../config/server.config.json');

// Multer 설정
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '..', config.server.uploadDir);
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: config.upload.maxFileSize },
  fileFilter: (req, file, cb) => {
    if (config.upload.allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('PDF 또는 TXT 파일만 업로드 가능합니다.'));
    }
  }
});

/**
 * POST /api/upload-document
 * 문서 업로드
 */
router.post('/upload-document', 
  verifyToken, 
  requireTeacherOrAdmin,
  upload.single('file'), 
  async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ message: '파일이 없습니다.' });
    }

    const { title, type = 'worksheet', category = '기타', school = '전체', grade, worksheetType } = req.body;

    try {
      let content = '';

      // 파일 읽기
      if (req.file.mimetype === 'application/pdf') {
        const dataBuffer = fs.readFileSync(req.file.path);
        const pdfData = await pdfParse(dataBuffer);
        content = cleanPDFText(pdfData.text);
      } else {
        content = fs.readFileSync(req.file.path, 'utf-8');
      }

      // 영어만 추출
      content = extractEnglishOnly(content);

      if (content.length < 100) {
        fs.unlinkSync(req.file.path);
        return res.status(400).json({ message: '유효한 영어 텍스트를 찾을 수 없습니다.' });
      }

      // DB에 저장
      const result = await database.run(
        `INSERT INTO documents (title, content, type, category, school, grade, worksheet_type, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [title, content, type, category, school, grade, worksheetType, req.user.id]
      );

      // 임시 파일 삭제
      fs.unlinkSync(req.file.path);

      res.json({
        message: '문서가 성공적으로 업로드되었습니다.',
        documentId: result.id,
        textLength: content.length
      });
    } catch (error) {
      console.error('문서 업로드 오류:', error);
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      res.status(500).json({ message: '파일 처리 중 오류가 발생했습니다.' });
    }
  }
);

/**
 * GET /api/documents
 * 문서 목록 조회
 */
router.get('/documents', verifyToken, async (req, res) => {
  try {
    let query = 'SELECT id, title, type, category, school, grade, created_at FROM documents WHERE is_active = 1';
    const params = [];

    // 학생은 자신의 학교 문서만 조회
    if (req.user.role === 'student') {
      const user = await database.get('SELECT school FROM users WHERE id = ?', [req.user.id]);
      query += ' AND (school = ? OR school = "전체")';
      params.push(user.school);
    }

    query += ' ORDER BY created_at DESC';

    const documents = await database.all(query, params);
    res.json(documents);
  } catch (error) {
    console.error('문서 목록 조회 오류:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

/**
 * GET /api/documents/:id
 * 문서 상세 조회
 */
router.get('/documents/:id', verifyToken, async (req, res) => {
  try {
    const document = await database.get(
      'SELECT * FROM documents WHERE id = ? AND is_active = 1',
      [req.params.id]
    );

    if (!document) {
      return res.status(404).json({ message: '문서를 찾을 수 없습니다.' });
    }

    res.json(document);
  } catch (error) {
    console.error('문서 조회 오류:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

/**
 * DELETE /api/documents/:id
 * 문서 삭제
 */
router.delete('/documents/:id', verifyToken, requireTeacherOrAdmin, async (req, res) => {
  try {
    const document = await database.get(
      'SELECT * FROM documents WHERE id = ?',
      [req.params.id]
    );

    if (!document) {
      return res.status(404).json({ message: '문서를 찾을 수 없습니다.' });
    }

    // 관리자가 아닌 경우 본인이 업로드한 문서만 삭제 가능
    if (req.user.role !== 'admin' && document.created_by !== req.user.id) {
      return res.status(403).json({ message: '권한이 없습니다.' });
    }

    // is_active를 false로 변경 (soft delete)
    await database.run(
      'UPDATE documents SET is_active = 0 WHERE id = ?',
      [req.params.id]
    );

    res.json({ message: '문서가 삭제되었습니다.' });
  } catch (error) {
    console.error('문서 삭제 오류:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

/**
 * PDF 텍스트 정리
 */
function cleanPDFText(text) {
  return text
    .replace(/Page \d+/g, '')
    .replace(/워크시트메이커/g, '')
    .replace(/Day \d+/g, (match) => '\n' + match + '\n')
    .replace(/(\d+)\.\s*p/g, '\n$1. p')
    .replace(/\s+/g, ' ')
    .replace(/\n{3,}/g, '\n\n');
}

/**
 * 영어만 추출
 */
function extractEnglishOnly(text) {
  const lines = text.split('\n');
  const englishLines = lines.filter(line => {
    const englishRatio = (line.match(/[a-zA-Z]/g) || []).length / line.length;
    return englishRatio > 0.5 && line.length > 20;
  });
  return englishLines.join('\n');
}

module.exports = router;