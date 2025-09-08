/**
 * Analysis routes index
 * Aggregates analysis-related subroutes
 */

const express = require('express');
const router = express.Router();
const documentRoutes = require('./documentRoutes');
const passageRoutes = require('./passageRoutes');

// Load marker for analysis routes
console.log('[analysis] routes loaded');

// Document-level analysis routes
router.use('/', documentRoutes);

// Passage-level analysis routes (requires :documentId)
router.use('/:documentId', passageRoutes);

module.exports = router;

