const express = require('express');
const router = express.Router();

const workbookService = require('../services/workbookService');
const { verifyToken, requireTeacherOrAdmin } = require('../middleware/auth');

router.get('/workbooks', verifyToken, async (req, res) => {
  try {
    const { documentId } = req.query || {};
    const list = await workbookService.listWorkbooks({ documentId });
    res.json({ success: true, data: list });
  } catch (error) {
    console.error('[workbooks] list error:', error);
    res.status(500).json({ message: error.message || '워크북 목록을 불러오지 못했습니다.' });
  }
});

router.get('/workbooks/:id', verifyToken, async (req, res) => {
  try {
    const workbook = await workbookService.getWorkbook(req.params.id);
    res.json({ success: true, data: workbook });
  } catch (error) {
    const status = /찾을 수 없습니다/.test(String(error?.message || '')) ? 404 : 500;
    console.error('[workbooks] detail error:', error);
    res.status(status).json({ message: error.message || '워크북을 불러오지 못했습니다.' });
  }
});

router.post('/workbooks/generate', verifyToken, requireTeacherOrAdmin, async (req, res) => {
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

module.exports = router;
