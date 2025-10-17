const {
  CIRCLED_DIGITS,
  UNDERLINE_PATTERN,
  containsHangul,
  normalizeWhitespace,
  stripTags,
  countSentences,
  countWords,
  isEnglishPhrase
} = require('../shared');
const {
  VOCAB_MIN_EXPLANATION_LENGTH,
  VOCAB_MIN_EXPLANATION_SENTENCES
} = require('../vocabulary');
const {
  BLANK_PLACEHOLDER_REGEX,
  BLANK_OPTION_MIN_WORDS,
  BLANK_OPTION_MAX_WORDS,
  MIN_BLANK_TEXT_LENGTH,
  MIN_BLANK_SENTENCE_COUNT
} = require('../blank');
const { validateTitleProblem } = require('../title');
const { validateTopicProblem } = require('../topic');
const {
  validateSummaryProblem
} = require('../../../utils/summaryTemplate');
const {
  decideExposure,
  calculateFetchCount
} = require('./exposurePolicy');

function createProblemRepository(database) {
  function parseJson(value, fallback) {
    if (!value) return fallback;
    try {
      const parsed = JSON.parse(value);
      return parsed === null ? fallback : parsed;
    } catch (error) {
      console.warn('[aiProblemRepository] JSON parse failed:', error?.message || error);
      return fallback;
    }
  }

  function mapDbProblem(row) {
    if (!row) return null;
    const options = parseJson(row.options, []);
    const sentences = parseJson(row.sentences, undefined);
    const metadata = parseJson(row.metadata, undefined);

    const generatorTag = metadata && typeof metadata.generator === 'string'
      ? metadata.generator.trim().toLowerCase()
      : null;
    if (generatorTag && !['openai', 'openai-preview', 'fallback'].includes(generatorTag)) {
      return null;
    }

    const optionArray = Array.isArray(options)
      ? options
          .map((opt) => {
            if (typeof opt === 'string') return opt.trim();
            if (opt && typeof opt === 'object') {
              const candidate = opt.text || opt.value || opt.label || opt.symbol;
              return candidate ? String(candidate).trim() : '';
            }
            return opt === null || opt === undefined ? '' : String(opt).trim();
          })
          .filter((opt) => opt && opt.length)
      : [];

    if (!row.question || !optionArray.length || !row.answer) {
      return null;
    }

    const noteText = Object.prototype.hasOwnProperty.call(row, 'note_text')
      ? row.note_text
      : Object.prototype.hasOwnProperty.call(row, 'note')
        ? row.note
        : undefined;

    const isActive = Object.prototype.hasOwnProperty.call(row, 'is_active')
      ? Number(row.is_active) !== 0
      : true;

    const problem = {
      id: row.id ? String(row.id) : undefined,
      type: row.type || 'generic',
      question: row.question,
      options: optionArray,
      answer: row.answer,
      explanation: row.explanation || '',
      difficulty: row.difficulty || 'basic',
      mainText: row.main_text || undefined,
      sentences: Array.isArray(sentences) ? sentences : undefined,
      metadata: metadata && typeof metadata === 'object' ? metadata : undefined,
      isActive
    };

    if (row.deactivated_at) {
      problem.deactivatedAt = row.deactivated_at;
    }
    if (row.deactivated_by) {
      problem.deactivatedBy = row.deactivated_by;
    }

    if (noteText !== undefined) {
      problem.note = noteText ? String(noteText).trim() : '';
    }

    if (metadata && typeof metadata === 'object') {
      if (metadata.sourceLabel && !problem.sourceLabel) {
        problem.sourceLabel = metadata.sourceLabel;
      }
      if (metadata.documentTitle && !problem.source) {
        problem.source = metadata.documentTitle;
      }
      if (metadata.originalPassage && !problem.originalPassage) {
        problem.originalPassage = metadata.originalPassage;
      }
      if (problem.type === 'summary') {
        const summarySentence = metadata.summarySentence || metadata.summary_sentence;
        if (summarySentence && !problem.summarySentence) {
          problem.summarySentence = String(summarySentence).trim();
        }
        const summarySentenceKor = metadata.summarySentenceKor || metadata.summary_sentence_kor;
        if (summarySentenceKor && !problem.summarySentenceKor) {
          problem.summarySentenceKor = String(summarySentenceKor).trim();
        }
        if (Array.isArray(metadata.keywords) && metadata.keywords.length && !problem.keywords) {
          problem.keywords = metadata.keywords.map((kw) => String(kw).trim()).filter((kw) => kw.length);
        }
        if (metadata.summaryPattern && !problem.summaryPattern) {
          problem.summaryPattern = String(metadata.summaryPattern).trim();
        }
      }
    }

    if (
      Object.prototype.hasOwnProperty.call(row, 'exposure_last_result')
      || Object.prototype.hasOwnProperty.call(row, 'exposure_last_answered_at')
    ) {
      const exposure = {
        lastResult: row.exposure_last_result || null,
        lastAnsweredAt: row.exposure_last_answered_at || null,
        lastSeenAt: row.exposure_last_seen_at || null,
        incorrectCount: Number(row.exposure_incorrect_count) || 0,
        correctCount: Number(row.exposure_correct_count) || 0
      };
      const hasData = exposure.lastResult || exposure.lastAnsweredAt || exposure.lastSeenAt;
      if (hasData) {
        problem.exposure = exposure;
      }
    }

    return problem;
  }

  function acceptCachedProblem(type, problem) {
    if (!problem || typeof problem !== 'object') {
      return false;
    }
    if (type === 'summary') {
      const validation = validateSummaryProblem(problem);
      if (!validation.valid) {
        return false;
      }
    }
    if (type === 'title') {
      const validation = validateTitleProblem(problem);
      if (!validation.valid) {
        return false;
      }
    }
    if (type === 'theme' || type === 'topic') {
      const validation = validateTopicProblem(problem);
      if (!validation.valid) {
        return false;
      }
    }
    if (type === 'blank') {
      const passage = normalizeWhitespace(problem.mainText || problem.text || '');
      if (!passage || passage.length < MIN_BLANK_TEXT_LENGTH) {
        return false;
      }
      const metadata = problem.metadata && typeof problem.metadata === 'object' ? problem.metadata : {};
      const originalLength = Number(metadata.originalPassageLength) || 0;
      if (originalLength && passage.length + 80 < originalLength) {
        return false;
      }
      if (!originalLength && passage.length < MIN_BLANK_TEXT_LENGTH + 80) {
        return false;
      }
      if (countSentences(passage) < MIN_BLANK_SENTENCE_COUNT) {
        return false;
      }
      if (!BLANK_PLACEHOLDER_REGEX.test(passage)) {
        return false;
      }
      const options = Array.isArray(problem.options) ? problem.options : [];
      if (options.length !== CIRCLED_DIGITS.length) {
        return false;
      }
      for (let i = 0; i < options.length; i += 1) {
        const marker = CIRCLED_DIGITS[i];
        const optionText = String(options[i] || '').trim();
        if (!optionText.startsWith(marker)) {
          return false;
        }
        const value = optionText.slice(marker.length).trim();
        if (!value) {
          return false;
        }
        if (!isEnglishPhrase(value)) {
          return false;
        }
        if (/\d/.test(value)) {
          return false;
        }
        const wordCount = countWords(value);
        if (wordCount < BLANK_OPTION_MIN_WORDS || wordCount > BLANK_OPTION_MAX_WORDS) {
          return false;
        }
      }
    }
    if (type === 'grammar' || type === 'grammar_multi') {
      const passage = String(problem.mainText || problem.passage || problem.text || '').trim();
      if (!passage) return false;
      if ((passage.match(UNDERLINE_PATTERN) || []).length !== 5) {
        return false;
      }
      const options = Array.isArray(problem.options) ? problem.options : [];
      if (options.length !== CIRCLED_DIGITS.length) {
        return false;
      }
      for (let i = 0; i < options.length; i += 1) {
        const expected = CIRCLED_DIGITS[i];
        const optionText = String(options[i] || '').trim();
        if (!optionText.startsWith(expected)) {
          return false;
        }
        if (!/<u[\s\S]*?<\/u>/.test(optionText)) {
          return false;
        }
      }
      const explanation = String(problem.explanation || '').trim();
      if (!containsHangul(explanation) || explanation.length < 60 || countSentences(explanation) < 2) {
        return false;
      }
      const sourceLabel = String(problem.sourceLabel || '').trim();
      if (!sourceLabel.startsWith('출처│')) {
        return false;
      }
    }

    if (type === 'vocabulary') {
      const passage = String(problem.mainText || problem.text || '').trim();
      if (!passage) return false;
      if ((passage.match(UNDERLINE_PATTERN) || []).length !== CIRCLED_DIGITS.length) {
        return false;
      }
      const options = Array.isArray(problem.options) ? problem.options : [];
      if (options.length !== CIRCLED_DIGITS.length) {
        return false;
      }
      for (let i = 0; i < options.length; i += 1) {
        const expected = CIRCLED_DIGITS[i];
        const optionText = String(options[i] || '').trim();
        if (!optionText.startsWith(expected)) {
          return false;
        }
        if (!/<u[\s\S]*?<\/u>/.test(optionText)) {
          return false;
        }
      }
      const answerIndex = parseInt(problem.correctAnswer ?? problem.answer ?? '', 10);
      if (!Number.isInteger(answerIndex) || answerIndex < 1 || answerIndex > CIRCLED_DIGITS.length) {
        return false;
      }
      const explanation = String(problem.explanation || '').trim();
      if (!containsHangul(explanation) || explanation.length < VOCAB_MIN_EXPLANATION_LENGTH || countSentences(explanation) < VOCAB_MIN_EXPLANATION_SENTENCES) {
        return false;
      }
      const sourceLabel = String(problem.sourceLabel || '').trim();
      if (!sourceLabel.startsWith('출처│')) {
        return false;
      }
      const metadata = problem.metadata && typeof problem.metadata === 'object' ? problem.metadata : {};
      const optionReasons = metadata.optionReasons && typeof metadata.optionReasons === 'object' ? metadata.optionReasons : null;
      const incorrectMarker = CIRCLED_DIGITS[answerIndex - 1];
      if (!optionReasons || !optionReasons[incorrectMarker]) {
        return false;
      }
      const correction = metadata.correction && typeof metadata.correction === 'object' ? metadata.correction : null;
      if (!correction || !correction.replacement) {
        return false;
      }
    }
    if (type === 'implicit') {
      const passage = String(problem.text || problem.mainText || '').trim();
      if (!passage) return false;
      if ((passage.match(UNDERLINE_PATTERN) || []).length !== 1) {
        return false;
      }
      const options = Array.isArray(problem.options) ? problem.options : [];
      if (options.length !== CIRCLED_DIGITS.length) {
        return false;
      }
      const isValidImplicitOption = (value) => {
        if (!value) return false;
        if (containsHangul(value)) return false;
        const cleaned = value.replace(/[’]/g, "'").replace(/[“”]/g, '"').trim();
        if (!cleaned) return false;
        const wordCount = countWords(cleaned);
        if (wordCount < 6 || wordCount > 18) {
          return false;
        }
        return /^[A-Za-z][A-Za-z\s.,'"()\-:;!?]*$/.test(cleaned);
      };
      for (let i = 0; i < options.length; i += 1) {
        const expected = CIRCLED_DIGITS[i];
        const optionText = String(options[i] || '').trim();
        if (!optionText.startsWith(expected)) {
          return false;
        }
        const value = optionText.slice(expected.length).trim();
        if (!isValidImplicitOption(value)) {
          return false;
        }
      }
      const explanation = String(problem.explanation || '').trim();
      if (!containsHangul(explanation) || explanation.length < 60 || countSentences(explanation) < 2) {
        return false;
      }
      const sourceLabel = String(problem.sourceLabel || '').trim();
      if (!sourceLabel.startsWith('출처│')) {
        return false;
      }
    }
    return true;
  }

  async function markExposures(userId, problemIds = []) {
    const numericUserId = Number(userId);
    if (!Number.isInteger(numericUserId) || numericUserId <= 0) return 0;
    const uniqueIds = [...new Set((Array.isArray(problemIds) ? problemIds : [])
      .map((id) => Number(id))
      .filter((num) => Number.isInteger(num) && num > 0))];
    if (!uniqueIds.length) return 0;
    let updated = 0;
    for (const problemId of uniqueIds) {
      try {
        await database.run(
          'INSERT INTO problem_exposures (user_id, problem_id, first_seen_at, last_seen_at, exposure_count, last_result) '
            + "VALUES (?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 1, 'pending') "
            + "ON CONFLICT(user_id, problem_id) DO UPDATE SET last_seen_at = CURRENT_TIMESTAMP, exposure_count = problem_exposures.exposure_count + 1, last_result = 'pending'",
          [numericUserId, problemId]
        );
        updated += 1;
      } catch (error) {
        console.warn('[aiProblemRepository] failed to mark exposure:', error?.message || error);
      }
    }
    return updated;
  }

  async function fetchCached(documentId, type, limit, options = {}) {
    const requested = Math.max(parseInt(limit, 10) || 0, 0);
    if (!requested) return [];

    const excludeIds = Array.isArray(options.excludeIds)
      ? options.excludeIds
          .map((id) => Number(id))
          .filter((num) => Number.isFinite(num))
      : [];

    const userId = Number(options.userId);
    const params = [];
    let query = 'SELECT p.*, pe.last_result AS exposure_last_result, pe.correct_count AS exposure_correct_count, pe.incorrect_count AS exposure_incorrect_count, pe.last_answered_at AS exposure_last_answered_at, pe.last_seen_at AS exposure_last_seen_at FROM problems p';

    if (Number.isInteger(userId) && userId > 0) {
      query += ' LEFT JOIN problem_exposures pe ON pe.problem_id = p.id AND pe.user_id = ?';
      params.push(userId);
    }

    query += ' WHERE p.document_id = ? AND p.type = ? AND COALESCE(p.is_active, 1) = 1';
    params.push(documentId, type);

    if (excludeIds.length) {
      const placeholders = excludeIds.map(() => '?').join(',');
      query += ` AND p.id NOT IN (${placeholders})`;
      params.push(...excludeIds);
    }

    const fetchCount = calculateFetchCount(requested);
    query += ' ORDER BY RANDOM() LIMIT ?';
    params.push(fetchCount);

    const rows = await database.all(query, params);
    const mapped = rows
      .map((row) => mapDbProblem(row))
      .filter((problem) => acceptCachedProblem(type, problem));

    if (!mapped.length) {
      return [];
    }

    const allowList = [];
    const deferred = [];
    mapped.forEach((problem) => {
      const decision = decideExposure(problem?.exposure);
      if (decision === 'allow') {
        allowList.push(problem);
      } else if (decision === 'defer') {
        deferred.push(problem);
      }
    });

    let final = allowList.slice(0, requested);
    if (final.length < requested && deferred.length) {
      const need = requested - final.length;
      final = final.concat(deferred.slice(0, need));
    }

    return final.slice(0, requested);
  }

  async function listProblemsForExport(options = {}) {
    const documentId = Number(options.documentId) || null;
    const limit = Math.min(Math.max(parseInt(options.limit, 10) || 40, 1), 200);
    const types = Array.isArray(options.types)
      ? options.types.map((type) => String(type || '').trim()).filter((type) => type.length)
      : [];
    const difficulties = Array.isArray(options.difficulties)
      ? options.difficulties.map((level) => String(level || '').trim().toLowerCase()).filter((level) => level.length)
      : [];
    const aiOnly = options.includeGeneratedOnly !== false;
    const randomize = options.randomize !== false;
    const includeInactive = options.includeInactive === true;

    const params = [];
    let query = 'SELECT p.*, pn.note AS note_text FROM problems p';

    if (Number.isInteger(options.userId) && options.userId > 0) {
      query += ' LEFT JOIN problem_notes pn ON pn.problem_id = p.id AND pn.user_id = ?';
      params.push(options.userId);
    } else {
      query += ' LEFT JOIN problem_notes pn ON pn.problem_id = p.id';
    }

    const conditions = [];
    if (documentId) {
      conditions.push('p.document_id = ?');
      params.push(documentId);
    }
    if (types.length) {
      const placeholders = types.map(() => '?').join(',');
      conditions.push(`p.type IN (${placeholders})`);
      params.push(...types);
    }
    if (difficulties.length) {
      const placeholders = difficulties.map(() => '?').join(',');
      conditions.push(`LOWER(p.difficulty) IN (${placeholders})`);
      params.push(...difficulties);
    }
    if (aiOnly) {
      conditions.push('p.is_ai_generated = 1');
    }
    if (!includeInactive) {
      conditions.push('COALESCE(p.is_active, 1) = 1');
    }

    if (conditions.length) {
      query += ` WHERE ${conditions.join(' AND ')}`;
    }

    const order = randomize ? ' ORDER BY RANDOM()' : ' ORDER BY p.created_at DESC';
    query += order;
    query += ' LIMIT ?';
    params.push(limit);

    const rows = await database.all(query, params);
    return rows
      .map((row) => mapDbProblem(row))
      .filter((problem) => problem);
  }

  async function saveProblems(documentId, type, problems = [], context = {}) {
    const saved = [];
    const contextTitle = context.docTitle || context.documentTitle || null;

    for (const item of Array.isArray(problems) ? problems : []) {
      if (!item || typeof item !== 'object') continue;

      const baseMetadata = { ...(item.metadata || {}) };
      if (contextTitle && !baseMetadata.documentTitle) {
        baseMetadata.documentTitle = contextTitle;
      }
      if (item.sourceLabel && !baseMetadata.sourceLabel) {
        baseMetadata.sourceLabel = item.sourceLabel;
      }
      if (item.originalPassage && !baseMetadata.originalPassage) {
        baseMetadata.originalPassage = String(item.originalPassage).trim();
      }
      if (!baseMetadata.generator) {
        baseMetadata.generator = 'openai';
      }

      if (type === 'summary') {
        if (item.summarySentence && !baseMetadata.summarySentence) {
          baseMetadata.summarySentence = String(item.summarySentence).trim();
        }
        if (item.summarySentenceKor && !baseMetadata.summarySentenceKor) {
          baseMetadata.summarySentenceKor = String(item.summarySentenceKor).trim();
        }
        if (!baseMetadata.summaryPattern && item.summaryPattern) {
          baseMetadata.summaryPattern = String(item.summaryPattern).trim();
        }
        if (!baseMetadata.keywords && Array.isArray(item.keywords)) {
          const keywords = item.keywords
            .map((kw) => String(kw).trim())
            .filter((kw) => kw.length);
          if (keywords.length) {
            baseMetadata.keywords = keywords;
          }
        }
      }

      const optionArray = Array.isArray(item.options)
        ? item.options
            .map((opt) => {
              if (typeof opt === 'string') return opt.trim();
              if (opt && typeof opt === 'object') {
                const candidate = opt.text || opt.value || opt.label || opt.symbol;
                return candidate ? String(candidate).trim() : '';
              }
              return opt === null || opt === undefined ? '' : String(opt).trim();
            })
            .filter((opt) => opt && opt.length)
        : [];
      if (!optionArray.length) continue;

      const primaryAnswer = item.correctAnswer ?? item.answer;
      const rawAnswer = Array.isArray(primaryAnswer) && primaryAnswer.length === 0
        ? undefined
        : primaryAnswer;
      const answerValue = Array.isArray(rawAnswer)
        ? rawAnswer
            .filter((val) => val !== null && val !== undefined)
            .map((val) => String(val).trim())
            .filter((val) => val.length)
            .join(',')
        : rawAnswer === undefined || rawAnswer === null
          ? ''
          : String(rawAnswer).trim();

      if (!answerValue) continue;

      const explanation = item.explanation || '';
      const difficulty = item.difficulty
        || ((type === 'grammar' || type === 'grammar_multi') ? 'advanced' : 'basic');
      const mainText = item.mainText || item.text || null;
      const sentencesJson = item.sentences ? JSON.stringify(item.sentences) : null;
      const metadataJson = Object.keys(baseMetadata).length ? JSON.stringify(baseMetadata) : null;
      const optionsJson = JSON.stringify(optionArray);

      const result = await database.run(
        'INSERT INTO problems (document_id, type, question, options, answer, explanation, difficulty, is_ai_generated, main_text, sentences, metadata, is_active, deactivated_at, deactivated_by) VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, 1, NULL, NULL)',
        [
          documentId,
          type,
          item.question || item.instruction || '',
          optionsJson,
          answerValue,
          explanation,
          difficulty,
          mainText,
          sentencesJson,
          metadataJson
        ]
      );

      const savedProblem = {
        ...item,
        id: result?.id ? String(result.id) : item.id,
        type,
        documentId,
        question: item.question || item.instruction || '',
        options: [...optionArray],
        answer: answerValue,
        explanation,
        difficulty,
        mainText,
        sentences: item.sentences ? [...item.sentences] : undefined,
        metadata: baseMetadata
      };

      if (baseMetadata.sourceLabel && !savedProblem.sourceLabel) {
        savedProblem.sourceLabel = baseMetadata.sourceLabel;
      }

      saved.push(savedProblem);
    }

    if (saved.length) {
      await pruneProblemCache(documentId, type, Number(process.env.LOE_PROBLEM_CACHE_LIMIT) || 1000);
    }

    return saved;
  }

  async function pruneProblemCache(documentId, type, maxCount = 1000) {
    if (!Number.isInteger(maxCount) || maxCount <= 0) return;
    try {
      const rows = await database.all(
        'SELECT id FROM problems WHERE document_id = ? AND type = ? ORDER BY datetime(created_at) DESC, id DESC',
        [documentId, type]
      );
      if (!Array.isArray(rows) || rows.length <= maxCount) {
        return;
      }
      const excess = rows.slice(maxCount).map((row) => Number(row.id)).filter((id) => Number.isInteger(id) && id > 0);
      if (!excess.length) return;
      const placeholders = excess.map(() => '?').join(',');
      await database.run(`DELETE FROM problems WHERE id IN (${placeholders})`, excess);
    } catch (error) {
      console.warn('[aiProblemRepository] prune cache failed:', error?.message || error);
    }
  }

  async function listReviewQueueForUser(userId, options = {}) {
    const numericUserId = Number(userId);
    if (!Number.isInteger(numericUserId) || numericUserId <= 0) {
      return { total: 0, problems: [] };
    }

    const limit = Math.max(parseInt(options.limit, 10) || 0, 0) || 20;
    const fetchLimit = Math.max(limit * 4, limit);

    const rows = await database.all(
      'SELECT p.*, pe.last_result AS exposure_last_result, pe.correct_count AS exposure_correct_count, pe.incorrect_count AS exposure_incorrect_count, pe.last_answered_at AS exposure_last_answered_at, pe.last_seen_at AS exposure_last_seen_at '
        + 'FROM problem_exposures pe '
        + 'JOIN problems p ON p.id = pe.problem_id '
        + "WHERE pe.user_id = ? AND pe.last_result = 'incorrect' "
        + 'ORDER BY datetime(pe.last_answered_at) DESC, pe.id DESC '
        + 'LIMIT ?',
      [numericUserId, fetchLimit]
    );

    const mapped = rows
      .map((row) => mapDbProblem(row))
      .filter((problem) => problem && acceptCachedProblem(problem.type, problem));

    const totalRow = await database.get(
      "SELECT COUNT(*) AS total FROM problem_exposures WHERE user_id = ? AND last_result = 'incorrect'",
      [numericUserId]
    );

    const total = Number(totalRow?.total) || mapped.length;
    return {
      total,
      problems: mapped.slice(0, limit)
    };
  }

  async function getProblemsByIds(ids = [], options = {}) {
    const numericIds = [...new Set((Array.isArray(ids) ? ids : [])
      .map((id) => Number(id))
      .filter((num) => Number.isInteger(num) && num > 0))];
    if (!numericIds.length) {
      return [];
    }

    const placeholders = numericIds.map(() => '?').join(',');
    const rows = await database.all(
      `SELECT p.*, pe.last_result AS exposure_last_result, pe.correct_count AS exposure_correct_count, pe.incorrect_count AS exposure_incorrect_count, pe.last_answered_at AS exposure_last_answered_at, pe.last_seen_at AS exposure_last_seen_at
         FROM problems p
         LEFT JOIN problem_exposures pe ON pe.problem_id = p.id AND pe.user_id = ?
        WHERE p.id IN (${placeholders})`,
      [Number(options.userId) || 0, ...numericIds]
    );

    const problems = rows
      .map((row) => mapDbProblem(row))
      .filter((problem) => problem && acceptCachedProblem(problem.type, problem));

    const ordered = numericIds
      .map((id) => problems.find((problem) => Number(problem.id) === id))
      .filter((problem) => problem);

    return ordered;
  }

  async function getProblemById(problemId) {
    const numericProblemId = Number(problemId);
    if (!Number.isInteger(numericProblemId) || numericProblemId <= 0) {
      return null;
    }

    const row = await database.get(
      'SELECT p.*, pn.note AS note_text FROM problems p LEFT JOIN problem_notes pn ON pn.problem_id = p.id WHERE p.id = ?',
      [numericProblemId]
    );

    return mapDbProblem(row);
  }

  async function recordExportHistory(payload = {}) {
    const userId = Number(payload.userId);
    if (!Number.isInteger(userId) || userId <= 0) {
      return;
    }

    const documentId = Number(payload.documentId) || null;
    const types = Array.isArray(payload.types) ? payload.types : [];
    const counts = payload.counts && typeof payload.counts === 'object' ? payload.counts : {};
    const problemIds = Array.isArray(payload.problemIds)
      ? payload.problemIds.map((id) => Number(id)).filter((id) => Number.isInteger(id) && id > 0)
      : [];
    const total = Number(payload.total) || problemIds.length || 0;
    const includeSolutions = payload.includeSolutions !== false ? 1 : 0;

    try {
      await database.run(
        'INSERT INTO problem_export_history (user_id, document_id, types, counts, problem_ids, total, include_solutions, created_at) '
          + 'VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)',
        [
          userId,
          documentId,
          JSON.stringify(types),
          JSON.stringify(counts),
          JSON.stringify(problemIds),
          total,
          includeSolutions
        ]
      );
    } catch (error) {
      console.warn('[aiProblemRepository] failed to record export history:', error?.message || error);
    }
  }

  return {
    markExposures,
    fetchCached,
    listProblemsForExport,
    saveProblems,
    listReviewQueueForUser,
    getProblemsByIds,
    getProblemById,
    recordExportHistory,
    pruneProblemCache,
    acceptCachedProblem,
    mapDbProblem,
    decideExposure
  };
}

module.exports = {
  createProblemRepository,
  decideExposure,
  calculateFetchCount
};
