const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const pdfParse = require('pdf-parse');
const database = require('../models/database');
const { verifyToken, requireTeacherOrAdmin } = require('../middleware/auth');
const config = require('../config/server.config.json');
const MiniPdfParser = require('../utils/miniPdfParser');

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
      let rawText = '';
      let parsedData = null;

      // 파일 읽기
      if (req.file.mimetype === 'application/pdf') {
        const dataBuffer = fs.readFileSync(req.file.path);
        const pdfData = await pdfParse(dataBuffer);
        rawText = cleanPDFText(pdfData.text);
        
        // Mini PDF 파싱
        const parser = new MiniPdfParser();
        parsedData = parser.parse(rawText);
        console.log('📄 PDF 파싱 결과:', {
          title: parsedData.title,
          sources: parsedData.sources,
          passageCount: parsedData.passages.length
        });
      } else {
        rawText = fs.readFileSync(req.file.path, 'utf-8');
        // 일반 텍스트 파일은 기존 방식으로 처리
        rawText = extractEnglishOnly(rawText);
      }

      // 최종 콘텐츠 결정
      let finalTitle = title;
      let finalContent = '';
      let sources = [];

      if (parsedData && parsedData.passages.length > 0) {
        // PDF에서 파싱된 데이터 사용
        finalTitle = title === 'Auto Extract' ? parsedData.title : title;
        finalContent = parsedData.passages.map(p => p.passage).join('\n\n---\n\n');
        sources = parsedData.sources;
        
        console.log('🎯 추출된 영어 지문:', {
          title: finalTitle,
          sources: sources,
          contentLength: finalContent.length,
          passageCount: parsedData.passages.length
        });
      } else {
        // 기존 방식 폴백
        finalContent = extractEnglishOnly(rawText);
      }

      if (finalContent.length < 100) {
        fs.unlinkSync(req.file.path);
        return res.status(400).json({ 
          message: '유효한 영어 텍스트를 찾을 수 없습니다.',
          debug: {
            rawLength: rawText.length,
            finalLength: finalContent.length,
            parsedPassages: parsedData ? parsedData.passages.length : 0
          }
        });
      }

      // DB에 저장 (JSON 구조로 저장)
      const documentData = {
        content: finalContent,
        sources: sources,
        metadata: parsedData ? parsedData.metadata : null,
        originalTitle: parsedData ? parsedData.title : null
      };

      const result = await database.run(
        `INSERT INTO documents (title, content, type, category, school, grade, worksheet_type, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [finalTitle, finalContent, type, category, school, grade, worksheetType, req.user.id]
      );

      // JSON 메타데이터를 별도 컬럼이나 파일로 저장할 수도 있지만, 
      // 지금은 일단 기본 텍스트로 저장해서 호환성 확보

      // 임시 파일 삭제
      fs.unlinkSync(req.file.path);

      res.json({
        message: '문서가 성공적으로 업로드되었습니다.',
        documentId: result.id,
        title: finalTitle,
        sources: sources,
        passageCount: parsedData ? parsedData.passages.length : 1,
        textLength: finalContent.length
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
      query += ' AND (school = ? OR school = "전체" OR school = "all")';
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

    // JSON 구조로 저장된 content 파싱
    try {
      const parsedContent = JSON.parse(document.content);
      if (parsedContent.content) {
        document.parsedContent = parsedContent;
        document.content = parsedContent.content; // 호환성을 위해 기존 필드도 유지
        // 추가 메타데이터도 포함
        if (parsedContent.sources) {
          document.sources = parsedContent.sources;
        }
        if (parsedContent.metadata) {
          document.metadata = parsedContent.metadata;
        }
      }
    } catch (parseError) {
      // JSON이 아닌 경우 기존 방식으로 처리
      console.log('기존 텍스트 형식 문서:', document.id);
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
    // 문제 번호 앞에 줄바꿈 추가
    .replace(/(\d+)\.\s*p/g, '\n\n$1. p')
    // 영어 문장 끝에 줄바꿈 추가 
    .replace(/([.!?])\s+([A-Z])/g, '$1\n$2')
    // 한국어 문장 끝에 줄바꿈 추가
    .replace(/([.!?])\s+([가-힣])/g, '$1\n$2')
    // 연속 공백을 하나로
    .replace(/[ \t]+/g, ' ')
    // 연속 줄바꿈 정리
    .replace(/\n{3,}/g, '\n\n')
    .trim();
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