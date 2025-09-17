const express = require('express');
const router = express.Router();
const database = require('../models/database');
const { verifyToken, requireAdmin } = require('../middleware/auth');

async function singleValue(query, params = []) {
  const row = await database.get(query, params);
  return row ? Object.values(row)[0] : 0;
}

router.get('/summary', verifyToken, requireAdmin, async (req, res) => {
  try {
    const [userCount, documentCount, problemCount] = await Promise.all([
      singleValue('SELECT COUNT(*) AS value FROM users'),
      singleValue('SELECT COUNT(*) AS value FROM documents'),
      singleValue('SELECT COUNT(*) AS value FROM problems')
    ]);

    res.json({
      users: userCount,
      documents: documentCount,
      problems: problemCount
    });
  } catch (error) {
    console.error('[admin] summary error:', error);
    res.status(500).json({ message: 'Failed to fetch summary' });
  }
});

router.get('/documents/categories', verifyToken, requireAdmin, async (req, res) => {
  try {
    const rows = await database.all('SELECT DISTINCT category FROM documents WHERE category IS NOT NULL ORDER BY category ASC');
    const categories = rows.map((row) => row.category).filter(Boolean);
    res.json({ categories });
  } catch (error) {
    console.error('[admin] categories error:', error);
    res.status(500).json({ message: 'Failed to fetch categories' });
  }
});

router.get('/health', verifyToken, requireAdmin, (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

module.exports = router;