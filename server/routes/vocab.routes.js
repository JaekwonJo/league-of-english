const express = require('express');
const router = express.Router();
const database = require('../models/database');
const { verifyToken, checkDailyLimit, updateUsage } = require('../middleware/auth');

function extractPassages(content) {
  if (!content) return [];
  try {
    const parsed = JSON.parse(content);
    if (Array.isArray(parsed.passages) && parsed.passages.length > 0) return parsed.passages;
    if (Array.isArray(parsed)) return parsed;
  } catch (error) {
    // ignore JSON parse errors and fall back to plain text
  }
  const text = String(content);
  return text
    .split(/\n{2,}/)
    .map((chunk) => chunk.trim())
    .filter((chunk) => chunk.length > 30);
}

function sampleWords(passage, limit = 200) {
  const matches = String(passage)
    .match(/\b[A-Za-z]{5,}\b/g);
  if (!matches) return [];
  return Array.from(new Set(matches.map((word) => word.toLowerCase()))).slice(0, limit);
}

function buildProblemFromPassage(passage) {
  const words = sampleWords(passage);
  if (words.length < 4) return null;
  const targetIndex = Math.floor(Math.random() * words.length);
  const target = words[targetIndex];
  const pool = words.filter((word) => word !== target);
  while (pool.length < 3) pool.push(`choice-${Math.random().toString(36).slice(2, 7)}`);
  const distractors = shuffle(pool).slice(0, 3);
  const options = shuffle([target, ...distractors]);
  const answer = String(options.findIndex((option) => option === target) + 1);
  return {
    type: 'vocabulary',
    question: `Which option is closest in meaning to "${target}" within the passage context?`,
    options,
    answer,
    explanation: 'Select the synonym that best matches the underlined word in context.',
    difficulty: 'basic',
    mainText: passage
  };
}

function shuffle(array) {
  const copy = [...array];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

router.post('/vocab-exam/generate', verifyToken, checkDailyLimit, async (req, res) => {
  const { docId, count = 5 } = req.body || {};
  if (!docId) return res.status(400).json({ message: 'docId is required.' });

  try {
    const document = await database.get('SELECT * FROM documents WHERE id = ?', [docId]);
    if (!document) return res.status(404).json({ message: 'Document not found.' });

    const passages = extractPassages(document.content);
    if (!passages.length) return res.status(400).json({ message: 'Document does not contain enough content for vocabulary problems.' });

    const desired = Math.max(1, parseInt(count, 10) || 1);
    const problems = [];

    for (let i = 0; i < passages.length && problems.length < desired; i += 1) {
      const passage = passages[i];
      const problem = buildProblemFromPassage(passage);
      if (problem) problems.push(problem);
    }

    // If still short, keep sampling randomly
    while (problems.length < desired) {
      const passage = passages[Math.floor(Math.random() * passages.length)];
      const problem = buildProblemFromPassage(passage);
      if (!problem) break;
      problems.push(problem);
    }

    await updateUsage(req.user.id, problems.length);

    res.json({
      documentId: docId,
      count: problems.length,
      problems
    });
  } catch (error) {
    console.error('[vocab-exam] generate error:', error);
    res.status(500).json({ message: 'Failed to generate vocabulary exam.' });
  }
});

module.exports = router;