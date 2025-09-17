const express = require('express');
const router = express.Router();
const database = require('../models/database');
const { verifyToken, checkDailyLimit, updateUsage } = require('../middleware/auth');
const OrderGen = require('../utils/orderProblemGenerator');
const InsertionGen = require('../utils/insertionProblemGenerator2');
const { generateGrammarSpanProblem } = require('../utils/grammarSpanGenerator');
let aiService = null; try { aiService = require('../services/aiProblemService2'); } catch {}
if (!aiService) { try { aiService = require('../services/aiProblemService'); } catch {} }
const { normalizeAll } = require('../utils/csatProblemNormalizer');
const { generateIrrelevantProblems } = require('../utils/irrelevantSentenceGenerator');

async function loadPassages(documentId) {
  const doc = await database.get('SELECT * FROM documents WHERE id = ?', [documentId]);
  if (!doc) throw new Error('Document not found');
  try {
    const parsed = JSON.parse(doc.content);
    if (Array.isArray(parsed.passages) && parsed.passages.length > 0) return { passages: parsed.passages, parsedContent: parsed, document: doc };
  } catch {}
  const parts = String(doc.content || '').split(/\n{2,}/).map(s=>s.trim()).filter(s=>s.length>40);
  return { passages: parts.length?parts:[String(doc.content||'')], parsedContent: null, document: doc };
}

function sleep(ms){ return new Promise(r=>setTimeout(r, ms)); }

async function fetchCachedExcludingRecent(documentId, typeKey, userId, limit) {
  try {
    const recent = await database.all(
      `SELECT problem_id FROM study_records WHERE user_id = ? ORDER BY created_at DESC LIMIT 50`,
      [userId]
    );
    const excludeIds = recent.map(r => r.problem_id).filter(Boolean);
    const clause = excludeIds.length ? `AND id NOT IN (${excludeIds.join(',')})` : '';
    const rows = await database.all(
      `SELECT * FROM problems WHERE document_id = ? AND type = ? ${clause} ORDER BY RANDOM() LIMIT ?`,
      [documentId, typeKey, parseInt(limit)]
    );
    return rows.map(r => ({
      id: r.id,
      type: r.type,
      question: r.question,
      options: JSON.parse(r.options || '[]'),
      answer: String(r.answer),
      explanation: r.explanation,
      difficulty: r.difficulty || 'basic',
      mainText: r.main_text || undefined,
      sentences: r.sentences ? JSON.parse(r.sentences) : undefined,
      metadata: r.metadata ? JSON.parse(r.metadata) : undefined
    }));
  } catch (e) {
    console.warn('[cache] fetchCachedExcludingRecent failed:', e?.message || e);
    return [];
  }
}

async function generateWithRetry(methodName, documentId, count, maxRetries = 2, delayMs = 700) {
  const out = [];
  let attempts = 0;
  while (out.length < count && attempts <= maxRetries) {
    attempts++;
    const t0 = Date.now();
    const raw = await aiService[methodName](parseInt(documentId), parseInt(count));
    const ms = Date.now() - t0;
    if (ms > 3000) console.warn(`[AI:${methodName}] slow call ${ms}ms (attempt ${attempts})`);
    const { normalizeAll } = require('../utils/csatProblemNormalizer');
    const { isValid } = require('../utils/problemValidator');
    const { repairMCQ } = require('../utils/distractorRepair');
    const normalized = normalizeAll(raw || []);
    const fixed = [];
    for (const p of normalized) {
      if (isValid(p)) { fixed.push(p); continue; }
      const rp = repairMCQ(p);
      if (isValid(rp)) fixed.push(rp);
    }
    for (const p of fixed) {
      out.push(p);
      if (out.length >= count) break;
    }
    if (out.length >= count) break;
    if (attempts <= maxRetries) await sleep(delayMs * attempts);
  }
  return out.slice(0, count);
}

router.post('/get-smart-problems', verifyToken, checkDailyLimit, async (req, res) => {
  try {
    const { documentId, types, count = 10, orderDifficulty='basic', insertionDifficulty='basic', grammarDifficulty='basic' } = req.body || {};
    if (!documentId || !types) return res.status(400).json({ message: 'Required fields: documentId and types.' });

    const { passages, parsedContent, document } = await loadPassages(documentId);

    const countsByType = {};
    if (Array.isArray(types)) {
      const k = types.length || 1; const base = Math.floor(count / k); let rem = count % k; types.forEach(t=>{ countsByType[t]=base+(rem>0?1:0); rem=Math.max(0,rem-1); });
    } else if (typeof types === 'object') { for (const [t,c] of Object.entries(types)) countsByType[t] = Math.max(0, parseInt(c)||0); }
    else if (typeof types === 'string') countsByType[types] = Math.max(0, parseInt(count)||0);

    // Enforce API-only for certain types
    const apiOnly = new Set(['blank','vocabulary','vocab','title','theme','topic','summary','irrelevant','irrelevant_sentence','implicit']);
    const methodMap = {
      blank: 'generateBlank',
      vocabulary: 'generateVocab',
      vocab: 'generateVocab',
      title: 'generateTitle',
      theme: 'generateTopic',
      topic: 'generateTopic',
      summary: 'generateSummary',
      irrelevant: 'generateIrrelevant',
      irrelevant_sentence: 'generateIrrelevant',
      implicit: 'generateImplicit'
    };
    for (const [t,c] of Object.entries(countsByType)) {
      if (!c) continue; const key = String(t).toLowerCase();
      if (apiOnly.has(key)) {
        const method = methodMap[key];
        if (!method || !(aiService && typeof aiService[method] === 'function')) {
          return res.status(503).json({ message: `AI generator unavailable for type: ${t}` });
        }
      }
    }

    const out = [];
    for (const [t,c] of Object.entries(countsByType)) {
      if (!c) continue;
      if (t === 'order') out.push(...OrderGen.generateOrderProblems(passages, c, { orderDifficulty }, document, parsedContent));
      else if (t === 'insertion') out.push(...InsertionGen.generateInsertionProblems(passages, c, { insertionDifficulty }, document, parsedContent));
      else if (t === 'irrelevant' || t === 'irrelevant_sentence') {
        if (aiService?.generateIrrelevant) out.push(...await aiService.generateIrrelevant(parseInt(documentId), c));
        else out.push(...generateIrrelevantProblems(passages, c, document, parsedContent));
      }
      else if (t === 'implicit') {
        if (aiService?.generateImplicit) out.push(...await aiService.generateImplicit(parseInt(documentId), c));
      }
      else if (t === 'grammar') {
        // Always generate span-based 5-choice grammar (choose incorrect underlined part)
        let n=0, i=0;
        while (n<c && i<passages.length*3) {
          const p = passages[n%passages.length];
          const g = generateGrammarSpanProblem(p);
          if (g && g.text) {
            out.push({
              id:`grammar_${Date.now()}_${n}`,
              type:'grammar_span',
              question: g.question,
              text: g.text,
              correctAnswer: String(g.correctAnswer || g.answer),
              explanation: g.explanation || '',
              difficulty:'basic',
              documentTitle: document.title||'',
              passageNumber: (n%passages.length)+1,
              metadata:{ originalTitle: document.title||'', problemNumber: `p${(n%passages.length)+1}-no.${n+1}` }
            });
            n++;
          }
          i++;
        }
      } else if (t === 'blank') {
        if (aiService?.generateBlank) out.push(...await aiService.generateBlank(parseInt(documentId), c));
        else {
          for (let i=0;i<c;i++){ const p=passages[i%passages.length]; const words=(p.match(/\b[A-Za-z]{6,}\b/g)||[]).slice(0,200); if(words.length<4) continue; const target=words[Math.floor(Math.random()*words.length)]; const pool=words.filter(w=>w!==target); const opts=[target,...pool.sort(()=>Math.random()-0.5).slice(0,3)]; const options=opts.sort(()=>Math.random()-0.5); const correct=options.findIndex(o=>o===target)+1; out.push({ type:'blank', question:'鍮덉뭏???ㅼ뼱媛?留먮줈 媛???곸젅??寃껋??', text:p.replace(target,'_____'), options, answer:String(correct), explanation:'臾몃㎘/?댄쐶', difficulty:'basic' }); }
        }
      } else if (t === 'vocabulary' || t === 'vocab') {
        if (aiService?.generateVocab) out.push(...await aiService.generateVocab(parseInt(documentId), c));
        else {
          for (let i=0;i<c;i++){ const p=passages[i%passages.length]; const words=(p.match(/\b[A-Za-z]{6,}\b/g)||[]).slice(0,200); if(words.length<4) continue; const target=words[Math.floor(Math.random()*words.length)]; const pool=words.filter(w=>w!==target); const opts=[target,...pool.sort(()=>Math.random()-0.5).slice(0,3)]; const options=opts.sort(()=>Math.random()-0.5); const correct=options.findIndex(o=>o===target)+1; out.push({ type:'vocabulary', question:`臾몃㎘??'${target}'??媛??媛源뚯슫 ?섎???`, options, answer:String(correct), explanation:'臾몃㎘/?댄쐶', difficulty:'basic' }); }
        }
      } else if (t === 'title') {
        if (aiService?.generateTitle) out.push(...await aiService.generateTitle(parseInt(documentId), c));
        else {
          for (let i=0;i<c;i++){ const p=passages[i%passages.length]; const first=(p.split(/(?<=[.!?])\s+/)[0]||'').trim().slice(0,60); const base=first.replace(/[^A-Za-z ]/g,'').split(' ').filter(Boolean).slice(0,5).join(' '); const candidates=[`${base}`||'Main Idea','A Letter to the Principal','Preparing for Exams','Library Hours Extension']; const options=candidates.sort(()=>Math.random()-0.5).slice(0,4); out.push({ type:'title', mainText:p, question:'?ㅼ쓬 湲???쒕ぉ?쇰줈 媛???곸젅??寃껋??', options, answer:'1', explanation:'臾몃㎘/?붿?', difficulty:'basic' }); }
        }
      } else if (t === 'theme' || t === 'topic') {
        if (aiService?.generateTopic) out.push(...await aiService.generateTopic(parseInt(documentId), c));
        else {
          for (let i=0;i<c;i++){ const p=passages[i%passages.length]; const candidates=['Environment protection','School policy','Exam preparation','Library use']; const options=candidates.sort(()=>Math.random()-0.5).slice(0,4); out.push({ type:'theme', mainText:p, question:'湲??二쇱젣濡?媛???곸젅??寃껋??', options, answer:'1', explanation:'臾몃㎘/?붿?', difficulty:'basic' }); }
        }
      } else if (t === 'summary') {
        if (aiService?.generateSummary) out.push(...await aiService.generateSummary(parseInt(documentId), c));
        else {
          for (let i=0;i<c;i++){ const p=passages[i%passages.length]; const options=['?붿?瑜?媛?????붿빟','遺遺??뺣낫 怨쇱옣','臾몃㎘ 踰쀬뼱??二쇱옣','?몃? ?ъ떎 ?섏뿴']; const shuffled=options.sort(()=>Math.random()-0.5); out.push({ type:'summary', mainText:p, question:'?ㅼ쓬 湲???댁슜?쇰줈 媛???곸젅??寃껋??', options:shuffled, answer:'1', explanation:'臾몃㎘/?붿?', difficulty:'basic' }); }
        }
      }
    }

    const { isValid } = require('../utils/problemValidator');
    const normalized = normalizeAll(out).filter(isValid);
    await updateUsage(req.user.id, normalized.length);
    // Ensure API-only requests are fully satisfied
    const requestedApiCount = Object.entries(countsByType).reduce((acc,[k,v])=> acc + (['blank','vocabulary','vocab','title','theme','topic','summary','irrelevant','irrelevant_sentence','implicit'].includes(String(k).toLowerCase()) ? (parseInt(v)||0) : 0), 0);
    const producedApiCount = normalized.filter(p=> ['blank','vocabulary','vocab','title','theme','topic','summary','irrelevant','irrelevant_sentence','implicit'].includes(String(p.type||'').toLowerCase())).length;
    if (requestedApiCount > 0 && producedApiCount < requestedApiCount) {
      return res.status(503).json({ message: 'AI generation incomplete. Please retry later.' });
    }
    res.json({ problems: normalized, count: normalized.length, dailyLimit: req.dailyLimit });
  } catch (e) {
    console.error('[problems] route error:', e);
    res.status(500).json({ message: 'Problem generation failed.' });
  }
});

// AI problem generation endpoints (title/topic/summary/vocab/blank)
router.post('/generate/blank', verifyToken, checkDailyLimit, async (req, res) => {
  try {
    const { documentId, count = 5 } = req.body || {};
    if (!documentId) return res.status(400).json({ message: 'documentId is required' });
    const typeKey = 'blank';
    try {
      const cached = await require('../services/aiProblemService').countCached(documentId, typeKey);
      if (cached >= 100) {
        const recent = await database.all(`SELECT problem_id FROM study_records WHERE user_id = ? ORDER BY created_at DESC LIMIT 50`, [req.user.id]);
        const exclude = recent.map(r=>r.problem_id).filter(Boolean);
        const clause = exclude.length ? `AND id NOT IN (${exclude.join(',')})` : '';
        const rows = await database.all(`SELECT * FROM problems WHERE document_id = ? AND type = ? ${clause} ORDER BY RANDOM() LIMIT ?`, [documentId, typeKey, parseInt(count)]);
        if (rows.length) {
          const mapped = rows.map(r=>({ id:r.id, type:r.type, question:r.question, options: JSON.parse(r.options||'[]'), answer: String(r.answer), explanation: r.explanation, difficulty: r.difficulty||'basic', mainText: r.main_text || undefined }));
          await updateUsage(req.user.id, mapped.length);
          return res.json({ problems: mapped, count: mapped.length });
        }
      }
    } catch {}
    if (!aiService?.generateBlank) {
      return res.status(503).json({ message: 'AI generator unavailable for blank. Try again later.' });
    }
    let problems = await generateWithRetry('generateBlank', documentId, count, 2);
    if (!Array.isArray(problems) || problems.length < count) {
      return res.status(503).json({ message: 'AI failed to generate blank items. Please retry later.' });
    }
    const { isValid } = require('../utils/problemValidator');
    const normalized = problems.filter(isValid);
    try { await require('../services/aiProblemService').saveProblems(documentId, typeKey, normalized); } catch {}
    await updateUsage(req.user.id, normalized.length);
    res.json({ problems: normalized, count: normalized.length });
  } catch (e) {
    console.error('[generate/blank] error:', e);
    res.status(500).json({ message: 'Blank generation failed.' });
  }
});

router.post('/generate/vocab', verifyToken, checkDailyLimit, async (req, res) => {
  try {
    const { documentId, count = 5 } = req.body || {};
    if (!documentId) return res.status(400).json({ message: 'documentId is required' });
    const typeKey = 'vocabulary';
    try {
      const cached = await require('../services/aiProblemService').countCached(documentId, typeKey);
      if (cached >= 100) {
        const recent = await database.all(`SELECT problem_id FROM study_records WHERE user_id = ? ORDER BY created_at DESC LIMIT 50`, [req.user.id]);
        const exclude = recent.map(r=>r.problem_id).filter(Boolean);
        const clause = exclude.length ? `AND id NOT IN (${exclude.join(',')})` : '';
        const rows = await database.all(`SELECT * FROM problems WHERE document_id = ? AND type = ? ${clause} ORDER BY RANDOM() LIMIT ?`, [documentId, typeKey, parseInt(count)]);
        if (rows.length) {
          const mapped = rows.map(r=>({ id:r.id, type:r.type, question:r.question, options: JSON.parse(r.options||'[]'), answer: String(r.answer), explanation: r.explanation, difficulty: r.difficulty||'basic', mainText: r.main_text || undefined }));
          await updateUsage(req.user.id, mapped.length);
          return res.json({ problems: mapped, count: mapped.length });
        }
      }
    } catch {}
    if (!aiService?.generateVocab) {
      return res.status(503).json({ message: 'AI generator unavailable for vocabulary. Try again later.' });
    }
    let problems = await generateWithRetry('generateVocab', documentId, count, 2);
    if (!Array.isArray(problems) || problems.length < count) {
      return res.status(503).json({ message: 'AI failed to generate vocabulary items. Please retry later.' });
    }
    const { isValid } = require('../utils/problemValidator');
    const normalized = problems.filter(isValid);
    try { await require('../services/aiProblemService').saveProblems(documentId, typeKey, normalized); } catch {}
    await updateUsage(req.user.id, normalized.length);
    res.json({ problems: normalized, count: normalized.length });
  } catch (e) {
    console.error('[generate/vocab] error:', e);
    res.status(500).json({ message: 'Vocab generation failed.' });
  }
});

router.post('/generate/title', verifyToken, checkDailyLimit, async (req, res) => {
  try {
    const { documentId, count = 5 } = req.body || {};
    if (!documentId) return res.status(400).json({ message: 'documentId is required' });
    const typeKey = 'title';
    try {
      const cached = await require('../services/aiProblemService').countCached(documentId, typeKey);
      if (cached >= 100) {
        const recent = await database.all(`SELECT problem_id FROM study_records WHERE user_id = ? ORDER BY created_at DESC LIMIT 50`, [req.user.id]);
        const exclude = recent.map(r=>r.problem_id).filter(Boolean);
        const clause = exclude.length ? `AND id NOT IN (${exclude.join(',')})` : '';
        const rows = await database.all(`SELECT * FROM problems WHERE document_id = ? AND type = ? ${clause} ORDER BY RANDOM() LIMIT ?`, [documentId, typeKey, parseInt(count)]);
        if (rows.length) {
          const mapped = rows.map(r=>({ id:r.id, type:r.type, question:r.question, options: JSON.parse(r.options||'[]'), answer: String(r.answer), explanation: r.explanation, difficulty: r.difficulty||'basic', mainText: r.main_text || undefined }));
          await updateUsage(req.user.id, mapped.length);
          return res.json({ problems: mapped, count: mapped.length });
        }
      }
    } catch {}
    if (!aiService?.generateTitle) {
      return res.status(503).json({ message: 'AI generator unavailable for title. Try again later.' });
    }
    let problems = await generateWithRetry('generateTitle', documentId, count, 2);
    if (!Array.isArray(problems) || problems.length < count) {
      return res.status(503).json({ message: 'AI failed to generate title items. Please retry later.' });
    }
    const { isValid } = require('../utils/problemValidator');
    const normalized = problems.filter(isValid);
    try { await require('../services/aiProblemService').saveProblems(documentId, typeKey, normalized); } catch {}
    await updateUsage(req.user.id, normalized.length);
    res.json({ problems: normalized, count: normalized.length });
  } catch (e) {
    console.error('[generate/title] error:', e);
    res.status(500).json({ message: 'Title generation failed.' });
  }
});

router.post('/generate/topic', verifyToken, checkDailyLimit, async (req, res) => {
  try {
    const { documentId, count = 5 } = req.body || {};
    if (!documentId) return res.status(400).json({ message: 'documentId is required' });
    const typeKey = 'theme';
    try {
      const cached = await require('../services/aiProblemService').countCached(documentId, typeKey);
      if (cached >= 100) {
        const recent = await database.all(`SELECT problem_id FROM study_records WHERE user_id = ? ORDER BY created_at DESC LIMIT 50`, [req.user.id]);
        const exclude = recent.map(r=>r.problem_id).filter(Boolean);
        const clause = exclude.length ? `AND id NOT IN (${exclude.join(',')})` : '';
        const rows = await database.all(`SELECT * FROM problems WHERE document_id = ? AND type = ? ${clause} ORDER BY RANDOM() LIMIT ?`, [documentId, typeKey, parseInt(count)]);
        if (rows.length) {
          const mapped = rows.map(r=>({ id:r.id, type:r.type, question:r.question, options: JSON.parse(r.options||'[]'), answer: String(r.answer), explanation: r.explanation, difficulty: r.difficulty||'basic', mainText: r.main_text || undefined }));
          await updateUsage(req.user.id, mapped.length);
          return res.json({ problems: mapped, count: mapped.length });
        }
      }
    } catch {}
    if (!aiService?.generateTopic) {
      return res.status(503).json({ message: 'AI generator unavailable for topic(theme). Try again later.' });
    }
    let problems = await generateWithRetry('generateTopic', documentId, count, 2);
    if (!Array.isArray(problems) || problems.length < count) {
      return res.status(503).json({ message: 'AI failed to generate topic items. Please retry later.' });
    }
    const { isValid } = require('../utils/problemValidator');
    const normalized = problems.filter(isValid);
    try { await require('../services/aiProblemService').saveProblems(documentId, typeKey, normalized); } catch {}
    await updateUsage(req.user.id, normalized.length);
    res.json({ problems: normalized, count: normalized.length });
  } catch (e) {
    console.error('[generate/topic] error:', e);
    res.status(500).json({ message: 'Topic generation failed.' });
  }
});

router.post('/generate/summary', verifyToken, checkDailyLimit, async (req, res) => {
  try {
    const { documentId, count = 5 } = req.body || {};
    if (!documentId) return res.status(400).json({ message: 'documentId is required' });
    const typeKey = 'summary';
    try {
      const cached = await require('../services/aiProblemService').countCached(documentId, typeKey);
      if (cached >= 100) {
        const recent = await database.all(`SELECT problem_id FROM study_records WHERE user_id = ? ORDER BY created_at DESC LIMIT 50`, [req.user.id]);
        const exclude = recent.map(r=>r.problem_id).filter(Boolean);
        const clause = exclude.length ? `AND id NOT IN (${exclude.join(',')})` : '';
        const rows = await database.all(`SELECT * FROM problems WHERE document_id = ? AND type = ? ${clause} ORDER BY RANDOM() LIMIT ?`, [documentId, typeKey, parseInt(count)]);
        if (rows.length) {
          const mapped = rows.map(r=>({ id:r.id, type:r.type, question:r.question, options: JSON.parse(r.options||'[]'), answer: String(r.answer), explanation: r.explanation, difficulty: r.difficulty||'basic', mainText: r.main_text || undefined }));
          await updateUsage(req.user.id, mapped.length);
          return res.json({ problems: mapped, count: mapped.length });
        }
      }
    } catch {}
    if (!aiService?.generateSummary) {
      return res.status(503).json({ message: 'AI generator unavailable for summary. Try again later.' });
    }
    let problems = await generateWithRetry('generateSummary', documentId, count, 2);
    if (!Array.isArray(problems) || problems.length < count) {
      return res.status(503).json({ message: 'AI failed to generate summary items. Please retry later.' });
    }
    const { isValid } = require('../utils/problemValidator');
    const normalized = problems.filter(isValid);
    try { await require('../services/aiProblemService').saveProblems(documentId, typeKey, normalized); } catch {}
    await updateUsage(req.user.id, normalized.length);
    res.json({ problems: normalized, count: normalized.length });
  } catch (e) {
    console.error('[generate/summary] error:', e);
    res.status(500).json({ message: 'Summary generation failed.' });
  }
});

/**
 * Record answer submission (graceful for ephemeral problems)
 * POST /api/problems/submit
 * Body: { problemId, userAnswer, timeSpent }
 */
router.post('/problems/submit', verifyToken, async (req, res) => {
  try {
    const { problemId, userAnswer, timeSpent } = req.body || {};
    const uid = req.user.id;
    let correct = null;
    let correctAnswer = null;
    let explanation = '';

    // If numeric problemId, try to lookup and persist
    if (problemId && /^\d+$/.test(String(problemId))) {
      const row = await database.get('SELECT id, answer, explanation FROM problems WHERE id = ?', [parseInt(problemId)]);
      if (row) {
        correctAnswer = String(row.answer ?? '');
        correct = String(userAnswer ?? '') === correctAnswer;
        try {
          await database.run(
            `INSERT INTO study_records (user_id, problem_id, is_correct, user_answer, time_spent)
             VALUES (?, ?, ?, ?, ?)`,
            [uid, row.id, correct ? 1 : 0, String(userAnswer ?? ''), parseInt(timeSpent) || 0]
          );
        } catch (e) {
          console.warn('[submit] insert study_record failed:', e?.message || e);
        }
        try {
          const delta = correct ? 10 : -5;
          await database.run('UPDATE users SET points = COALESCE(points,0) + ? WHERE id = ?', [delta, uid]);
        } catch (e) {
          console.warn('[submit] points update failed:', e?.message || e);
        }
        explanation = row.explanation || '';
      }
    }

    // Always respond 200 to avoid blocking UX on ephemeral items
    return res.json({ correct, correctAnswer, explanation, pointChange: correct == null ? 0 : (correct ? 10 : -5) });
  } catch (e) {
    console.error('[problems] submit error:', e);
    // Be lenient for client flow
    return res.json({ correct: null });
  }
});

/**
 * Report problem (no-op accept)
 * POST /api/problems/report
 */
router.post('/problems/report', verifyToken, async (req, res) => {
  try {
    // Optionally persist later; accept for now
    return res.json({ success: true });
  } catch (e) {
    return res.json({ success: true });
  }
});

// export moved to end of file to ensure all routes are registered

/**
 * CSAT set generation
 * POST /api/generate/csat-set
 * body: { documentId, counts?: { order,insertion,grammar,blank,vocabulary,title,theme,summary } }
 */
router.post('/generate/csat-set', verifyToken, checkDailyLimit, async (req, res) => {
  try {
    const { documentId, counts } = req.body || {};
    if (!documentId) return res.status(400).json({ message: 'documentId is required' });
    const fallback = { order: 1, insertion: 1, grammar: 1, blank: 1, vocabulary: 1, title: 1, theme: 1, summary: 1 };
    const wanted = { ...fallback, ...(counts || {}) };
    const typesObj = Object.fromEntries(Object.entries(wanted).filter(([,v]) => (parseInt(v)||0) > 0));
    // Enforce API-only policy for specific types
    const apiOnly = new Set(['blank','vocabulary','vocab','title','theme','topic','summary','irrelevant','irrelevant_sentence','implicit']);
    const methodMap = {
      blank: 'generateBlank',
      vocabulary: 'generateVocab',
      vocab: 'generateVocab',
      title: 'generateTitle',
      theme: 'generateTopic',
      topic: 'generateTopic',
      summary: 'generateSummary',
      irrelevant: 'generateIrrelevant',
      irrelevant_sentence: 'generateIrrelevant',
      implicit: 'generateImplicit'
    };
    for (const [t,cRaw] of Object.entries(typesObj)) {
      if (!apiOnly.has(String(t).toLowerCase())) continue;
      const method = methodMap[String(t).toLowerCase()];
      if (!method || !(aiService && typeof aiService[method] === 'function')) {
        return res.status(503).json({ message: `AI generator unavailable for type: ${t}` });
      }
    }
    // Reuse smart-problems pipeline
    req.body = { documentId, types: typesObj, count: Object.values(typesObj).reduce((a,b)=>a+parseInt(b),0) };
    // Delegate to existing handler logic by calling load/generate inline
    const { passages, parsedContent, document } = await loadPassages(documentId);
    const out = [];
    for (const [t,cRaw] of Object.entries(typesObj)) {
      const c = parseInt(cRaw)||0; if (!c) continue;
      if (t === 'order') out.push(...OrderGen.generateOrderProblems(passages, c, { orderDifficulty: 'basic' }, document, parsedContent));
      else if (t === 'insertion') out.push(...InsertionGen.generateInsertionProblems(passages, c, { insertionDifficulty: 'basic' }, document, parsedContent));
      else if (t === 'irrelevant' || t === 'irrelevant_sentence') {
        if (aiService?.generateIrrelevant) out.push(...await aiService.generateIrrelevant(parseInt(documentId), c));
        else out.push(...generateIrrelevantProblems(passages, c, document, parsedContent));
      }
      else if (t === 'implicit') {
        if (aiService?.generateImplicit) out.push(...await aiService.generateImplicit(parseInt(documentId), c));
      }
      else if (t === 'grammar') {
        let n=0,i=0;
        while(n<c && i<passages.length*3){
          const p = passages[n%passages.length];
          const g = generateGrammarSpanProblem(p);
          if(g && g.text){
            out.push({ id:`grammar_${Date.now()}_${n}`, type:'grammar_span', question:g.question, text:g.text, choices: g.choices || [''①'',''②'',''③'',''④'',''⑤''], correctAnswer:String(g.correctAnswer||g.answer), explanation:g.explanation||'', difficulty:'basic', documentTitle: document.title||'', passageNumber:(n%passages.length)+1, metadata:{ originalTitle: document.title||'', problemNumber: `p${(n%passages.length)+1}-no.${n+1}` } });
            n++;
          }
          i++;
        }
      } else if (t === 'blank') {
        if (aiService?.generateBlank) out.push(...await aiService.generateBlank(parseInt(documentId), c));
        else {
          for (let i=0;i<c;i++){ const p=passages[i%passages.length]; const words=(p.match(/\b[A-Za-z]{6,}\b/g)||[]).slice(0,200); if(words.length<4) continue; const target=words[Math.floor(Math.random()*words.length)]; const pool=words.filter(w=>w!==target); const opts=[target,...pool.sort(()=>Math.random()-0.5).slice(0,3)]; const options=opts.sort(()=>Math.random()-0.5); const correct=options.findIndex(o=>o===target)+1; out.push({ type:'blank', question:'?ㅼ쓬 湲??諛묒쨪???ㅼ뼱媛?留먮줈 媛???곸젅??寃껋??', text:p.replace(target,'_____'), options, answer:String(correct), explanation:'臾몃㎘/?댄쐶', difficulty:'basic' }); }
        }
      } else if (t === 'vocabulary') {
        if (aiService?.generateVocab) out.push(...await aiService.generateVocab(parseInt(documentId), c));
        else {
          for (let i=0;i<c;i++){ const p=passages[i%passages.length]; const words=(p.match(/\b[A-Za-z]{6,}\b/g)||[]).slice(0,200); if(words.length<4) continue; const target=words[Math.floor(Math.random()*words.length)]; const pool=words.filter(w=>w!==target); const opts=[target,...pool.sort(()=>Math.random()-0.5).slice(0,3)]; const options=opts.sort(()=>Math.random()-0.5); const correct=options.findIndex(o=>o===target)+1; out.push({ type:'vocabulary', question:`臾몃㎘??'${target}'??媛??媛源뚯슫 ?섎???`, options, answer:String(correct), explanation:'臾몃㎘/?댄쐶', difficulty:'basic' }); }
        }
      } else if (t === 'title') {
        if (aiService?.generateTitle) out.push(...await aiService.generateTitle(parseInt(documentId), c));
        else {
          for (let i=0;i<c;i++){ const p=passages[i%passages.length]; const first=(p.split(/(?<=[.!?])\s+/)[0]||'').trim().slice(0,60); const base=first.replace(/[^A-Za-z ]/g,'').split(' ').filter(Boolean).slice(0,5).join(' '); const candidates=[`${base}`||'Main Idea','A Letter to the Principal','Preparing for Exams','Library Hours Extension']; const options=candidates.sort(()=>Math.random()-0.5).slice(0,4); out.push({ type:'title', mainText:p, question:'?ㅼ쓬 湲???쒕ぉ?쇰줈 媛???곸젅??寃껋??', options, answer:'1', explanation:'臾몃㎘/?붿?', difficulty:'basic' }); }
        }
      } else if (t === 'theme') {
        if (aiService?.generateTopic) out.push(...await aiService.generateTopic(parseInt(documentId), c));
        else {
          for (let i=0;i<c;i++){ const p=passages[i%passages.length]; const candidates=['Environment protection','School policy','Exam preparation','Library use']; const options=candidates.sort(()=>Math.random()-0.5).slice(0,4); out.push({ type:'theme', mainText:p, question:'?ㅼ쓬 湲??二쇱젣濡?媛???곸젅??寃껋??', options, answer:'1', explanation:'臾몃㎘/?붿?', difficulty:'basic' }); }
        }
      } else if (t === 'summary') {
        if (aiService?.generateSummary) out.push(...await aiService.generateSummary(parseInt(documentId), c));
        else {
          for (let i=0;i<c;i++){ const p=passages[i%passages.length]; const options=['?붿?瑜?媛?????붿빟','遺遺??뺣낫 怨쇱옣','臾몃㎘ 踰쀬뼱??二쇱옣','?몃? ?ъ떎 ?섏뿴']; const shuffled=options.sort(()=>Math.random()-0.5); out.push({ type:'summary', mainText:p, question:'?ㅼ쓬 湲???댁슜?쇰줈 媛???곸젅??寃껋??', options:shuffled, answer:'1', explanation:'臾몃㎘/?붿?', difficulty:'basic' }); }
        }
      }
    }
    const { isValid } = require('../utils/problemValidator');
    const normalized = normalizeAll(out).filter(isValid);
    await updateUsage(req.user.id, normalized.length);
    res.json({ problems: normalized, count: normalized.length });
  } catch (e) {
    console.error('[generate/csat-set] error:', e);
    res.status(500).json({ message: 'CSAT set generation failed.' });
  }
});

module.exports = router;
