const express = require('express');
const router = express.Router();
const tierConfig = require('../config/tierConfig.json');
const { verifyToken } = require('../middleware/auth');

router.get('/', verifyToken, (req, res) => {
  const tiers = tierConfig?.tiers || [];
  res.json({ tiers });
});

router.get('/:id', verifyToken, (req, res) => {
  const tiers = tierConfig?.tiers || [];
  const tier = tiers.find((item) => String(item.id).toLowerCase() === String(req.params.id || '').toLowerCase());
  if (!tier) return res.status(404).json({ message: 'Badge not found' });
  res.json(tier);
});

module.exports = router;