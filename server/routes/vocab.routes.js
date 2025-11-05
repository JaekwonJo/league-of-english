'use strict';

const express = require('express');
const router = express.Router();

const database = require('../models/database');
const { verifyToken, checkDailyLimit, updateUsage } = require('../middleware/auth');
const { getUsageToday, addUsage } = require('../services/usageService');
const { CIRCLED_DIGITS } = require('../services/ai-problem/shared');
const { buildFallbackProblems } = require('../utils/fallbackProblemFactory');
const studyService = require('../services/studyService');

function cleanupSpacing(text = '') {
  return String(text)
    .replace(/\s+/g, ' ')
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .trim();
}

const EMBEDDED_ENTRY_REGEX = /(\d{1,3})\s*Day\s*(\d{2})\s+([^\d]+?)(?=(\d{1,3})\s*Day\s*\d{2}\s+|$)/g;

function splitTermAndMeaning(chunk = '') {
  const cleaned = cleanupSpacing(chunk);
  if (!cleaned) {
    return { term: '', meaning: '' };
  }

  const hangulIndex = cleaned.search(/[가-힣]/);
  if (hangulIndex === -1) {
    // fallback: treat everything as term
    return { term: cleaned.trim(), meaning: '' };
  }

  const term = cleanupSpacing(cleaned.slice(0, hangulIndex));
  const meaning = cleanupSpacing(cleaned.slice(hangulIndex));
  return {
    term,
    meaning
  };
}

function expandCombinedEntry(entry, dayLabel) {
  if (!entry || !entry.term) return [];

  const meaningText = cleanupSpacing(entry.meaning || '');
  if (!meaningText) {
    return [{
      term: cleanupSpacing(entry.term),
      meaning: ''
    }];
  }

  const matches = [...meaningText.matchAll(EMBEDDED_ENTRY_REGEX)];
  if (!matches.length) {
    return [{
      term: cleanupSpacing(entry.term),
      meaning: meaningText
    }];
  }

  const normalizedEntries = [];
  const firstMatch = matches[0];
  const leadingMeaning = cleanupSpacing(meaningText.slice(0, firstMatch.index));

  if (leadingMeaning) {
    normalizedEntries.push({
      term: cleanupSpacing(entry.term),
      meaning: leadingMeaning
    });
  }

  matches.forEach((match) => {
    const [, , , chunk] = match;
    const { term, meaning } = splitTermAndMeaning(chunk);
    if (!term || !meaning) return;
    normalizedEntries.push({ term, meaning, sourceDay: dayLabel });
  });

  if (!normalizedEntries.length) {
    normalizedEntries.push({
      term: cleanupSpacing(entry.term),
      meaning: meaningText
    });
  }

  return normalizedEntries;
}

function normalizeVocabularyDays(days = []) {
  return days.map((day) => {
    const normalized = [];
    day.entries.forEach((entry) => {
      const expanded = expandCombinedEntry(entry, day.label || day.key);
      expanded.forEach((item) => {
        const term = cleanupSpacing(item.term);
        const meaning = cleanupSpacing(item.meaning);
        if (!term || !meaning) return;
        normalized.push({ term, meaning });
      });
    });

    return {
      ...day,
      entries: normalized.map((item, idx) => ({
        order: idx + 1,
        term: item.term,
        meaning: item.meaning
      }))
    };
  });
}

function recomputeVocabularyMeta(vocabulary) {
  const days = normalizeVocabularyDays(vocabulary.days || []);
  const totalWords = Array.isArray(days)
    ? days.reduce((sum, day) => sum + (day.entries?.length || 0), 0)
    : 0;

  return {
    ...vocabulary,
    days,
    totalDays: Array.isArray(days) ? days.length : vocabulary.totalDays,
    totalWords
  };
}

function parseVocabularyContent(rawContent) {
  if (!rawContent) return null;
  try {
    const parsed = JSON.parse(rawContent);
    if (parsed && parsed.vocabulary && Array.isArray(parsed.vocabulary.days)) {
      const vocab = recomputeVocabularyMeta(parsed.vocabulary);
      const totalWords = vocab.totalWords;
      return {
        days: vocab.days.map((day, index) => ({
          key: day.key || `Day ${index + 1}`,
          label: day.label || day.key || `Day ${index + 1}`,
          order: day.order || index + 1,
          entries: Array.isArray(day.entries) ? day.entries : []
        })),
        totalDays: vocab.totalDays || (vocab.days?.length || 0),
        totalWords: vocab.totalWords || totalWords,
        sourceFilename: vocab.sourceFilename || null
      };
    }
  } catch (error) {
    console.warn('[vocabulary] failed to parse vocabulary content:', error?.message || error);
  }
  return null;
}

function shuffle(array = []) {
  const copy = [...array];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function selectDistractors(pool, target, count, selector) {
  const selected = [];
  const used = new Set([selector(target)]);
  for (const candidate of pool) {
    const value = selector(candidate);
    if (candidate === target) continue;
    if (used.has(value)) continue;
    selected.push(value);
    used.add(value);
    if (selected.length >= count) break;
  }
  return selected;
}

function buildQuizQuestions(day, allDays, count) {
  // ordering: random(default) or sequential
  const orderPolicy = (this && this.__orderPolicy) || 'random';
  const poolEntries = Array.isArray(day.entries) ? [...day.entries] : [];
  if (orderPolicy !== 'sequential') {
    shuffle(poolEntries);
  }
  const targetEntries = poolEntries.slice(0, Math.min(count, poolEntries.length));
  const pool = allDays.flatMap((item) => item.entries);

  const questions = targetEntries.map((entry, idx) => {
    // Allow client to prefer a mode via req.body.mode
    const preferred = (this && this.__modePreference) || null;
    let mode = 'term_to_meaning';
    if (preferred === 'term_to_meaning' || preferred === 'meaning_to_term') {
      mode = preferred;
    } else {
      // balanced mixed: alternate by index
      mode = (idx % 2 === 0) ? 'term_to_meaning' : 'meaning_to_term';
    }
    const cleanTerm = cleanupSpacing(entry.term);
    const cleanMeaning = cleanupSpacing(entry.meaning);

    if (mode === 'meaning_to_term') {
      const distractors = selectDistractors(shuffle(pool), entry, 3, (candidate) => cleanupSpacing(candidate.term));
      while (distractors.length < 3) {
        const fallback = `단어 후보 ${distractors.length + 1}`;
        if (!distractors.includes(fallback) && fallback !== cleanTerm) {
          distractors.push(fallback);
        } else {
          break;
        }
      }

      const options = shuffle([cleanTerm, ...distractors]);
      const answer = options.findIndex((option) => option === cleanTerm) + 1;

      return {
        prompt: `뜻 "${cleanMeaning}"에 가장 알맞은 영어 단어는 무엇인가요?`,
        term: cleanTerm,
        meaning: cleanMeaning,
        options,
        mode,
        answer: String(answer),
        explanation: `"${cleanMeaning}"에 해당하는 단어는 "${cleanTerm}"이에요.`,
        metadata: {
          dayKey: day.key,
          dayLabel: day.label || day.key,
          order: idx + 1,
          meaning: cleanMeaning,
          term: cleanTerm,
          mode
        }
      };
    }

    const distractors = selectDistractors(shuffle(pool), entry, 3, (candidate) => cleanupSpacing(candidate.meaning));
    while (distractors.length < 3) {
      const fallback = `뜻 후보 ${distractors.length + 1}`;
      if (!distractors.includes(fallback) && fallback !== cleanMeaning) {
        distractors.push(fallback);
      } else {
        break;
      }
    }

    const options = shuffle([cleanMeaning, ...distractors]);
    const answer = options.findIndex((option) => option === cleanMeaning) + 1;

    return {
      prompt: `단어 "${cleanTerm}"에 가장 알맞은 뜻은 무엇인가요?`,
      term: cleanTerm,
      meaning: cleanMeaning,
      options,
      mode,
      answer: String(answer),
      explanation: `"${cleanTerm}" 는 "${cleanMeaning}"라는 의미로 쓰여요.`,
      metadata: {
        dayKey: day.key,
        dayLabel: day.label || day.key,
        order: idx + 1,
        meaning: cleanMeaning,
        term: cleanTerm,
        mode
      }
    };
  });
  return orderPolicy !== 'sequential' ? shuffle(questions) : questions;
}

router.get('/vocabulary/sets', verifyToken, async (req, res) => {
  try {
    const rows = await database.all(
      'SELECT id, title, category, school, grade, created_at, content FROM documents WHERE type = ? ORDER BY created_at DESC',
      ['vocabulary']
    );

    const sets = rows
      .map((row) => {
        const vocabulary = parseVocabularyContent(row.content);
        if (!vocabulary) return null;
        return {
          id: row.id,
          title: row.title,
          category: row.category,
          school: row.school,
          grade: row.grade,
          createdAt: row.created_at,
          totalDays: vocabulary.totalDays,
          totalWords: vocabulary.totalWords,
          preview: vocabulary.days.slice(0, 2).map((day) => ({
            key: day.key,
            count: day.entries.length,
            sample: day.entries.slice(0, 3).map((entry) => entry.term)
          }))
        };
      })
      .filter(Boolean);

    res.json({ success: true, data: sets });
  } catch (error) {
    console.error('[vocabulary] list error:', error);
    res.status(500).json({ success: false, message: '단어 세트를 불러오는 중 오류가 발생했습니다.' });
  }
});

router.get('/vocabulary/sets/:documentId', verifyToken, async (req, res) => {
  try {
    const documentId = Number(req.params.documentId);
    if (!Number.isInteger(documentId)) {
      return res.status(400).json({ success: false, message: '잘못된 문서 ID 입니다.' });
    }

    const doc = await database.get(
      'SELECT id, title, category, school, grade, created_at, content FROM documents WHERE id = ? AND type = ?',
      [documentId, 'vocabulary']
    );

    if (!doc) {
      return res.status(404).json({ success: false, message: '단어 세트를 찾을 수 없습니다.' });
    }

    const vocabulary = parseVocabularyContent(doc.content);
    if (!vocabulary) {
      return res.status(400).json({ success: false, message: '단어 데이터가 손상되었습니다. 다시 업로드해 주세요.' });
    }

    const payload = {
      id: doc.id,
      title: doc.title,
      category: doc.category,
      school: doc.school,
      grade: doc.grade,
      createdAt: doc.created_at,
      totalDays: vocabulary.totalDays,
      totalWords: vocabulary.totalWords,
      sourceFilename: vocabulary.sourceFilename,
      days: vocabulary.days.map((day) => ({
        key: day.key,
        label: day.label,
        order: day.order,
        count: day.entries.length,
        entries: day.entries
      }))
    };

    res.json({ success: true, data: payload });
  } catch (error) {
    console.error('[vocabulary] detail error:', error);
    res.status(500).json({ success: false, message: '단어 세부 정보를 불러오지 못했습니다.' });
  }
});

router.post('/vocabulary/sets/:documentId/quiz', verifyToken, checkDailyLimit, async (req, res) => {
  try {
    const documentId = Number(req.params.documentId);
    if (!Number.isInteger(documentId)) {
      return res.status(400).json({ success: false, message: '잘못된 문서 ID 입니다.' });
    }

    const { dayKey, dayKeys, count = 30, mode: modePreference, order = 'random' } = req.body || {};
    const normalizedKeys = (() => {
      if (Array.isArray(dayKeys) && dayKeys.length) {
        return dayKeys.map((k) => String(k).trim()).filter(Boolean);
      }
      if (typeof dayKey === 'string' && dayKey.includes(',')) {
        return dayKey.split(',').map((k) => k.trim()).filter(Boolean);
      }
      if (typeof dayKey === 'string' && dayKey.trim()) return [dayKey.trim()];
      return [];
    })();
    if (!normalizedKeys.length) {
      return res.status(400).json({ success: false, message: 'dayKey 또는 dayKeys 값이 필요합니다.' });
    }

    const doc = await database.get(
      'SELECT id, title, content FROM documents WHERE id = ? AND type = ?',
      [documentId, 'vocabulary']
    );

    if (!doc) {
      return res.status(404).json({ success: false, message: '단어 세트를 찾을 수 없습니다.' });
    }

    const vocabulary = parseVocabularyContent(doc.content);
    if (!vocabulary) {
      return res.status(400).json({ success: false, message: '단어 데이터가 손상되었습니다. 다시 업로드해 주세요.' });
    }
    const selectedDays = normalizedKeys
      .map((key) => vocabulary.days.find((day) => day.key === key || day.label === key))
      .filter(Boolean);
    if (!selectedDays.length) {
      return res.status(404).json({ success: false, message: `선택한 Day 정보를 찾을 수 없습니다.` });
    }

    const mergedEntries = selectedDays.flatMap((d) => d.entries || []);
    if (!mergedEntries.length) {
      return res.status(400).json({ success: false, message: '선택된 Day에 등록된 단어가 없습니다.' });
    }

    const desiredCount = Math.max(1, Math.min(parseInt(count, 10) || 30, mergedEntries.length));

    // Per-type(단어) 일일 제한: 무료/게스트는 구간별 제한, 프리미엄 이상은 무제한
    const me = await database.get('SELECT membership, role FROM users WHERE id = ?', [req.user.id]);
    const membership = String(me?.membership || '').toLowerCase();
    const isGuest = membership === 'guest';
    const perDayLimit = isGuest ? 300 : 30;
    const isUnlimited = me && (me.role === 'admin' || membership === 'premium' || membership === 'pro');
    if (!isUnlimited) {
      const usedVocabToday = await getUsageToday(req.user.id, 'vocab');
      if ((usedVocabToday + desiredCount) > perDayLimit) {
        const remaining = Math.max(0, perDayLimit - usedVocabToday);
        return res.status(429).json({
          success: false,
          message: `오늘 단어시험 제한(${perDayLimit}개)을 초과했어요. 남은 수: ${remaining}개. 계속 이용하려면 회원가입 또는 업그레이드를 해주세요.`
        });
      }
    }
    // Pass preferences by binding to helper context
    const normalizedOrder = (order === 'sequential') ? 'sequential' : 'random';
    const builder = buildQuizQuestions.bind({ __modePreference: modePreference, __orderPolicy: normalizedOrder });
    // 가상의 day 컨테이너(여러 Day 합쳐진 경우)
    const virtualDay = {
      key: normalizedKeys.join(','),
      label: normalizedKeys.join(', '),
      entries: mergedEntries
    };
    const targetDay = selectedDays[0] || {
      key: normalizedKeys[0] || 'TEMP_DAY',
      label: normalizedKeys[0] || doc.title,
      entries: mergedEntries
    };
    const problems = builder(virtualDay, vocabulary.days, desiredCount);

    const responseProblems = [];

    for (const problem of problems) {
      const circledOptions = problem.options.map((option, idx) => `${CIRCLED_DIGITS[idx]} ${option}`);
      const metadata = {
        ...problem.metadata,
        term: problem.term
      };

      try {
        const insertResult = await database.run(
          `INSERT INTO problems (document_id, type, question, options, answer, explanation, difficulty, main_text, metadata)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            documentId,
            'vocabulary_quiz',
            problem.prompt,
            JSON.stringify(circledOptions),
            problem.answer,
            problem.explanation,
            'basic',
            metadata.dayLabel || metadata.dayKey,
            JSON.stringify(metadata)
          ]
        );

        if (!insertResult?.id) {
          continue;
        }

        responseProblems.push({
          problemId: insertResult.id,
          prompt: problem.prompt,
          term: problem.term,
          meaning: problem.meaning,
          options: problem.options,
          mode: problem.mode,
          order: metadata.order,
          dayKey: metadata.dayKey
        });
      } catch (error) {
        console.error('[vocabulary] failed to persist quiz question:', error?.message || error);
      }
    }


    if (!responseProblems.length) {
      const fallbackList = await buildFallbackProblems({
        type: 'vocabulary',
        count: Math.max(1, Math.min(desiredCount, 3)),
        docTitle: doc.title,
        documentCode: String(documentId),
        reasonTag: 'vocabulary_quiz_fallback'
      });

      for (const fallback of fallbackList) {
        const normalizedOptions = (fallback.options || []).map((value) =>
          String(value || '')
            .replace(/^(①|②|③|④|⑤)\s*/, '')
            .trim()
        );
        const circledOptions = normalizedOptions.map((option, idx) => `${CIRCLED_DIGITS[idx]} ${option}`.trim());
        const answerToken = String(fallback.answer || '').trim();
        const circledIndex = CIRCLED_DIGITS.indexOf(answerToken.charAt(0));
        const numericMatch = answerToken.match(/\d+/);
        const answerValue = circledIndex >= 0
          ? String(circledIndex + 1)
          : numericMatch
            ? numericMatch[0]
            : '1';

        const orderValue = responseProblems.length + 1;
        const fallbackMetadata = {
          ...(fallback.metadata || {}),
          fallback: true,
          reason: 'vocabulary_quiz_fallback',
          dayKey: targetDay.key,
          dayLabel: targetDay.label,
          order: orderValue,
          mode: 'term_to_meaning'
        };

        try {
          const insertResult = await database.run(
            `INSERT INTO problems (document_id, type, question, options, answer, explanation, difficulty, main_text, metadata)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              documentId,
              'vocabulary_quiz',
              fallback.question || targetDay.label,
              JSON.stringify(circledOptions),
              answerValue,
              fallback.explanation || '',
              'basic',
              targetDay.label,
              JSON.stringify(fallbackMetadata)
            ]
          );

          if (insertResult?.id) {
            const termMatch = /"([^\"]+)"/.exec(fallback.question || '');
            const term = termMatch ? termMatch[1] : fallbackMetadata.term || 'keyword';
            const answerIdx = Math.max(0, parseInt(answerValue, 10) - 1);
            responseProblems.push({
              problemId: insertResult.id,
              prompt: fallback.question || targetDay.label,
              term,
              meaning: normalizedOptions[answerIdx] || '',
              options: normalizedOptions,
              mode: fallbackMetadata.mode,
              order: orderValue,
              dayKey: targetDay.key
            });
          }
        } catch (error) {
          console.error('[vocabulary] failed to insert fallback quiz question:', error?.message || error);
        }
      }
    }

    if (!responseProblems.length) {
      return res.status(500).json({ success: false, message: '단어 퀴즈 문항을 준비하지 못했습니다.' });
    }

    await updateUsage(req.user.id, responseProblems.length);
    // Per-type 카운터 증가
    try { await addUsage(req.user.id, 'vocab', responseProblems.length); } catch (e) { /* ignore */ }

    res.json({
      success: true,
      documentId,
      title: doc.title,
      day: virtualDay.key,
      count: responseProblems.length,
      problems: responseProblems
    });
  } catch (error) {
    console.error('[vocabulary] quiz error:', error);
    res.status(500).json({ success: false, message: '단어 퀴즈를 생성하지 못했습니다.' });
  }
});

router.post('/vocabulary/sets/:documentId/quiz/submit', verifyToken, async (req, res) => {
  try {
    const documentId = Number(req.params.documentId);
    if (!Number.isInteger(documentId)) {
      return res.status(400).json({ success: false, message: '잘못된 문서 ID 입니다.' });
    }

    const { answers = [] } = req.body || {};
    if (!Array.isArray(answers) || answers.length === 0) {
      return res.status(400).json({ success: false, message: '제출할 답안이 없습니다.' });
    }

    const problemIds = [...new Set(answers.map((entry) => Number(entry.problemId)).filter((id) => Number.isInteger(id) && id > 0))];
    if (!problemIds.length) {
      return res.status(400).json({ success: false, message: '유효한 문제 번호가 없습니다.' });
    }

    const placeholders = problemIds.map(() => '?').join(',');
    const rows = await database.all(
      `SELECT id, document_id, type, answer, options, explanation, metadata
         FROM problems
        WHERE id IN (${placeholders})
          AND COALESCE(is_active, 1) = 1`,
      problemIds
    );

    if (!rows || !rows.length) {
      return res.status(404).json({ success: false, message: '문제 정보를 찾을 수 없습니다.' });
    }

    const problemMap = new Map();
    rows.forEach((row) => {
      problemMap.set(row.id, row);
    });

    const resultsPayload = [];
    const detail = [];

    for (const entry of answers) {
      const problemId = Number(entry.problemId);
      const selected = Number(entry.selected);
      if (!problemMap.has(problemId)) {
        continue;
      }

      const row = problemMap.get(problemId);
      if (row.document_id !== documentId || row.type !== 'vocabulary_quiz') {
        continue;
      }

      const correctAnswer = String(row.answer || '').trim();
      const userAnswer = Number.isInteger(selected) && selected > 0 ? String(selected) : '';
      const isCorrect = userAnswer && userAnswer === correctAnswer;

      let parsedOptions = [];
      try {
        parsedOptions = JSON.parse(row.options || '[]');
      } catch (error) {
        parsedOptions = [];
      }

      const metadata = (() => {
        try {
          return JSON.parse(row.metadata || '{}') || {};
        } catch (error) {
          return {};
        }
      })();

      detail.push({
        problemId,
        term: metadata.term || '',
        dayKey: metadata.dayKey || metadata.day || '',
        mode: metadata.mode || 'term_to_meaning',
        meaning: metadata.meaning || '',
        correctAnswer,
        correctOption: parsedOptions.length ? parsedOptions[Number(correctAnswer) - 1] || '' : '',
        explanation: row.explanation || '',
        options: parsedOptions,
        selected: userAnswer,
        isCorrect,
        timeSpent: Number(entry.timeSpent) || 0
      });

      resultsPayload.push({
        problemId,
        isCorrect,
        userAnswer,
        timeSpent: Number(entry.timeSpent) || 0,
        problemType: row.type
      });
    }

    if (!resultsPayload.length) {
      return res.status(400).json({ success: false, message: '채점할 답안이 없습니다.' });
    }

    const outcome = await studyService.recordStudySession(req.user.id, resultsPayload);

    res.json({
      success: true,
      summary: outcome.summary,
      stats: outcome.stats,
      rank: outcome.rank,
      updatedUser: outcome.updatedUser,
      detail
    });
  } catch (error) {
    console.error('[vocabulary] submit error:', error);
    res.status(500).json({ success: false, message: '단어 시험 결과를 기록하지 못했습니다.' });
  }
});

module.exports = router;
module.exports.__testables = {
  cleanupSpacing,
  splitTermAndMeaning,
  expandCombinedEntry,
  normalizeVocabularyDays,
  parseVocabularyContent,
  buildQuizQuestions
};
