const express = require('express');
const router = express.Router();

const workbookService = require('../services/workbookService');
const { verifyToken, requireTeacherOrAdmin, requirePaidMembership, requireProMembership } = require('../middleware/auth');

router.get('/workbooks', verifyToken, requireProMembership, async (req, res) => {
  try {
    const { documentId } = req.query || {};
    const list = await workbookService.listWorkbooks({ documentId });
    res.json({ success: true, data: list });
  } catch (error) {
    console.error('[workbooks] list error:', error);
    res.status(500).json({ message: error.message || '워크북 목록을 불러오지 못했습니다.' });
  }
});

router.get('/workbooks/:id', verifyToken, requireProMembership, async (req, res) => {
  try {
    const workbook = await workbookService.getWorkbook(req.params.id);
    res.json({ success: true, data: workbook });
  } catch (error) {
    const status = /찾을 수 없습니다/.test(String(error?.message || '')) ? 404 : 500;
    console.error('[workbooks] detail error:', error);
    res.status(status).json({ message: error.message || '워크북을 불러오지 못했습니다.' });
  }
});

router.post('/workbooks/generate', verifyToken, requireTeacherOrAdmin, requirePaidMembership, async (req, res) => {
  try {
    const { documentId, passageNumber, regenerate } = req.body || {};
    const workbook = await workbookService.generateWorkbook({
      documentId,
      passageNumber,
      regenerate,
      userId: req.user?.id || null
    });
    res.json({ success: true, data: workbook });
  } catch (error) {
    console.error('[workbooks] generate error:', error);
    const message = error?.message || '워크북을 생성하지 못했습니다.';
    res.status(400).json({ message });
  }
});

router.post('/workbooks/generate-all', verifyToken, requireTeacherOrAdmin, requirePaidMembership, async (req, res) => {
  try {
    const { documentId, regenerate } = req.body || {};
    const result = await workbookService.generateAllWorkbooks({
      documentId,
      regenerate,
      userId: req.user?.id || null
    });
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('[workbooks] generate-all error:', error);
    res.status(400).json({ message: error.message || '워크북을 생성하지 못했습니다.' });
  }
});

router.delete('/workbooks/:id', verifyToken, requireTeacherOrAdmin, async (req, res) => {
  try {
    const result = await workbookService.deleteWorkbook(req.params.id);
    res.json({ success: true, data: result });
  } catch (error) {
    const status = /찾을 수 없습니다/.test(String(error?.message || '')) ? 404 : 400;
    console.error('[workbooks] delete error:', error);
    res.status(status).json({ message: error.message || '워크북을 삭제하지 못했습니다.' });
  }
});

router.get('/workbooks/:id/test', verifyToken, requireProMembership, async (req, res) => {
  try {
    const data = await workbookService.getWorkbookTest(req.params.id);
    res.json({ success: true, data });
  } catch (error) {
    console.error('[workbooks] test fetch error:', error);
    res.status(400).json({ message: error.message || '워크북 테스트를 준비하지 못했습니다.' });
  }
});

router.post('/workbooks/:id/test/submit', verifyToken, requireProMembership, async (req, res) => {
  try {
    const { answers } = req.body || {};
    if (!Array.isArray(answers) || answers.length === 0) {
      return res.status(400).json({ message: '답안을 제출해 주세요.' });
    }
    const result = await workbookService.submitWorkbookTest(req.params.id, req.user.id, answers);
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('[workbooks] test submit error:', error);
    res.status(400).json({ message: error.message || '워크북 테스트를 채점하지 못했습니다.' });
  }
});

module.exports = router;
