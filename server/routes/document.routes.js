const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const pdfParse = require('pdf-parse');
const database = require('../models/database');
const { verifyToken, requireTeacherOrAdmin } = require('../middleware/auth');
const config = require('../config/server.config.json');
const NewPDFParser = require('../utils/newPdfParser');

// Multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '..', config.server.uploadDir);
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: config.upload.maxFileSize },
  fileFilter: (req, file, cb) => {
    if (config.upload.allowedMimeTypes.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Only PDF and TXT files are allowed.'));
  }
});

// Upload a document
router.post(
  '/upload-document',
  verifyToken,
  requireTeacherOrAdmin,
  upload.single('file'),
  async (req, res) => {
    try {
      if (!req.file) return res.status(400).json({ message: '파일이 필요합니다.' });

      const { title = 'Untitled', type = 'worksheet', category = '기본', grade } = req.body;

      let rawText = '';
      let parsedData = null;
      let finalContent = '';
      let finalTitle = title || 'Untitled';
      let sources = [];
      let vocabularyData = null;

      if (req.file.mimetype === 'application/pdf') {
        const dataBuffer = fs.readFileSync(req.file.path);
        const pdfData = await pdfParse(dataBuffer);
        const pdfText = pdfData.text || '';

        if (type === 'vocabulary') {
          const VocabularyParser = require('../utils/vocabularyParser');
          const parser = new VocabularyParser();
          vocabularyData = parser.parse(pdfText);

          if (!vocabularyData.days || vocabularyData.days.length === 0) {
            try { fs.unlinkSync(req.file.path); } catch {}
            return res.status(400).json({ message: 'PDF에서 단어 목록을 찾지 못했습니다. 문서 형식을 확인해 주세요.' });
          }

          finalContent = JSON.stringify({
            vocabulary: {
              ...vocabularyData,
              sourceFilename: req.file.originalname
            }
          });
          rawText = pdfText;
        } else {
          rawText = cleanPDFText(pdfText);

          // Use NewPDFParser for auto passage extraction
          try {
            const parser = new NewPDFParser();
            parsedData = await parser.parse(rawText);
            finalContent = parsedData.totalContent || '';
            finalTitle = title === 'Auto Extract' ? (parsedData.title || title) : (title || parsedData.title || 'Untitled');
            sources = parsedData.sources || [];
          } catch (e) {
            console.warn('[documents] PDF parser failed, falling back:', e.message);
            finalContent = extractEnglishOnly(rawText);
          }
        }
      } else {
        rawText = fs.readFileSync(req.file.path, 'utf-8');
        finalContent = extractEnglishOnly(rawText);
      }

      if (type !== 'vocabulary' && (!finalContent || finalContent.length < 100)) {
        try { fs.unlinkSync(req.file.path); } catch {}
        return res.status(400).json({ message: '유효한 영어 본문을 찾지 못했습니다.' });
      }

      // Prepare content to store: JSON if parsedData exists
      let contentToStore;
      if (type === 'vocabulary' && vocabularyData) {
        contentToStore = finalContent;
      } else if (parsedData && Array.isArray(parsedData.passages) && parsedData.passages.length > 0) {
        contentToStore = JSON.stringify({
          content: finalContent,
          passages: parsedData.passages,
          sources,
          title: parsedData.title,
          metadata: parsedData.metadata
        });
      } else {
        contentToStore = finalContent;
      }

      // get user's school
      const user = await database.get('SELECT school FROM users WHERE id = ?', [req.user.id]);

      const result = await database.run(
        `INSERT INTO documents (title, content, type, category, school, grade, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [finalTitle, contentToStore, type, category, user?.school || '전체', grade || null, req.user.id]
      );

      const responsePayload = {
        id: result.id,
        message: '문서가 업로드되었습니다.',
        parsed: !!parsedData,
        passages: parsedData?.passages?.length || 0
      };

      if (type === 'vocabulary' && vocabularyData) {
        responsePayload.vocabularyDays = vocabularyData.totalDays;
        responsePayload.totalWords = vocabularyData.totalWords;
      }

      res.status(201).json(responsePayload);
    } catch (error) {
      console.error('[documents] upload error:', error);
      res.status(500).json({ message: '문서 업로드 중 오류가 발생했습니다.' });
    }
  }
);

// List documents
router.get('/documents', verifyToken, async (req, res) => {
  try {
    let query, params;
    if (req.user.role === 'admin') {
      query = `SELECT id, title, type, category, school, grade, created_at FROM documents ORDER BY created_at DESC`;
      params = [];
    } else {
      // for non-admins, show own docs and common ones
      const user = await database.get('SELECT school FROM users WHERE id = ?', [req.user.id]);
      query = `SELECT id, title, type, category, school, grade, created_at
                 FROM documents
                WHERE (
                        created_by = ?
                     OR COALESCE(school, '') IN ('', '전체', 'all')
                     OR school = ?
                     OR created_by IN (SELECT id FROM users WHERE role = 'admin')
                      )
                ORDER BY created_at DESC`;
      params = [req.user.id, user?.school || ''];
    }

    const docs = await database.all(query, params);
    res.json(docs);
  } catch (error) {
    console.error('[documents] list error:', error);
    res.status(500).json({ message: '문서 목록 조회 중 오류가 발생했습니다.' });
  }
});

// Get document detail
router.get('/documents/:id', verifyToken, async (req, res) => {
  try {
    const doc = await database.get('SELECT * FROM documents WHERE id = ?', [req.params.id]);
    if (!doc) return res.status(404).json({ message: '문서를 찾을 수 없습니다.' });

    // If JSON-wrapped content, unwrap for compatibility
    try {
      const parsed = JSON.parse(doc.content);
      if (parsed && parsed.content) {
        doc.parsedContent = parsed;
        doc.content = parsed.content;
      }
    } catch {}

    res.json({ success: true, data: doc });
  } catch (error) {
    console.error('[documents] detail error:', error);
    res.status(500).json({ message: '문서 조회 중 오류가 발생했습니다.' });
  }
});

// Update document metadata
router.put('/documents/:id', verifyToken, requireTeacherOrAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const document = await database.get('SELECT * FROM documents WHERE id = ?', [id]);
    if (!document) {
      return res.status(404).json({ message: '문서를 찾을 수 없습니다.' });
    }

    if (req.user.role !== 'admin' && document.created_by !== req.user.id) {
      return res.status(403).json({ message: '권한이 없습니다.' });
    }

    const payload = req.body || {};
    const allowedFields = ['title', 'category', 'school', 'grade', 'difficulty', 'worksheet_type'];
    const updates = [];
    const params = [];

    if (Object.prototype.hasOwnProperty.call(payload, 'title')) {
      const trimmedTitle = typeof payload.title === 'string' ? payload.title.trim() : '';
      if (!trimmedTitle) {
        return res.status(400).json({ message: '제목은 비워둘 수 없습니다.' });
      }
    }

    allowedFields.forEach((field) => {
      if (Object.prototype.hasOwnProperty.call(payload, field)) {
        if (field === 'grade') {
          const numericGrade = Number.isFinite(payload.grade) ? parseInt(payload.grade, 10) : parseInt(String(payload.grade || '').trim(), 10);
          params.push(Number.isInteger(numericGrade) ? numericGrade : null);
        } else {
          const value = payload[field];
          if (typeof value === 'string') {
            params.push(value.trim());
          } else {
            params.push(value);
          }
        }
        updates.push(`${field} = ?`);
      }
    });

    if (!updates.length) {
      return res.status(400).json({ message: '수정할 항목이 없습니다.' });
    }

    await database.run(`UPDATE documents SET ${updates.join(', ')} WHERE id = ?`, [...params, id]);
    const updated = await database.get(
      'SELECT id, title, type, category, school, grade, difficulty, worksheet_type, created_at FROM documents WHERE id = ?',
      [id]
    );

    res.json({ success: true, data: updated });
  } catch (error) {
    console.error('[documents] update error:', error);
    res.status(500).json({ message: '문서 정보를 수정하는 중 오류가 발생했습니다.' });
  }
});

// Delete document
router.delete('/documents/:id', verifyToken, requireTeacherOrAdmin, async (req, res) => {
  try {
    const doc = await database.get('SELECT * FROM documents WHERE id = ?', [req.params.id]);
    if (!doc) return res.status(404).json({ message: '문서를 찾을 수 없습니다.' });
    if (req.user.role !== 'admin' && doc.created_by !== req.user.id) {
      return res.status(403).json({ message: '권한이 없습니다.' });
    }
    await database.run('DELETE FROM documents WHERE id = ?', [req.params.id]);
    res.json({ message: '문서가 삭제되었습니다.' });
  } catch (error) {
    console.error('[documents] delete error:', error);
    res.status(500).json({ message: '문서 삭제 중 오류가 발생했습니다.' });
  }
});

// Helpers
function cleanPDFText(text) {
  return (text || '')
    .replace(/Page\s+\d+/gi, '')
    .replace(/[\r\t ]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/([.!?])\s+([A-Z])/g, '$1\n$2')
    .replace(/([.!?])\s+([\uAC00-\uD7A3])/g, '$1\n$2')
    .trim();
}

function extractEnglishOnly(text) {
  const lines = (text || '').split('\n');
  const englishLines = lines.filter(line => {
    const letters = (line.match(/[a-zA-Z]/g) || []).length;
    const ratio = line.length ? letters / line.length : 0;
    return ratio > 0.5 && line.trim().length > 20;
  });
  return englishLines.join('\n');
}

module.exports = router;
