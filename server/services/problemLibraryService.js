const aiService = require('./aiProblemService');
const database = require('../models/database');
const { normalizeAll } = require('../utils/csatProblemNormalizer');

function createHttpError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function normalizeListParam(rawValue) {
  if (!rawValue) return [];
  if (Array.isArray(rawValue)) {
    return rawValue
      .map((item) => String(item || '').trim())
      .filter((item) => item.length);
  }
  if (typeof rawValue === 'string' && rawValue.trim()) {
    return rawValue
      .split(',')
      .map((item) => item.trim())
      .filter((item) => item.length);
  }
  return [];
}

async function listProblems(options = {}) {
  const {
    documentId = null,
    limit = 40,
    includeGeneratedOnly = true,
    types = [],
    difficulties = [],
    includeInactive = false
  } = options;

  const problems = await aiService.listProblemsForExport({
    documentId,
    types,
    difficulties,
    limit,
    includeGeneratedOnly,
    randomize: false,
    includeInactive
  });

  return normalizeAll(problems || []);
}

async function summarizeProblems(options = {}) {
  const {
    documentId = null,
    includeGeneratedOnly = true,
    difficulties = [],
    includeInactive = false
  } = options;

  let query = 'SELECT type, COUNT(*) AS total FROM problems WHERE 1=1';
  const params = [];

  if (documentId) {
    query += ' AND document_id = ?';
    params.push(documentId);
  }

  if (includeGeneratedOnly) {
    query += ' AND is_ai_generated = 1';
  }

  if (!includeInactive) {
    query += ' AND COALESCE(is_active, 1) = 1';
  }

  if (difficulties.length) {
    const placeholders = difficulties.map(() => '?').join(',');
    query += ` AND LOWER(difficulty) IN (${placeholders})`;
    params.push(...difficulties.map((item) => item.toLowerCase()));
  }

  query += ' GROUP BY type';

  const rows = await database.all(query, params);
  return rows.reduce((accumulator, row) => {
    accumulator[row.type] = Number(row.total) || 0;
    return accumulator;
  }, {});
}

async function saveProblemNote({ problemId, userId, note }) {
  const updated = await aiService.saveProblemNote(problemId, userId, note);
  const normalized = normalizeAll([updated]);
  return normalized[0] || null;
}

function parseMetadata(raw) {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch (error) {
    console.warn('[problemLibrary] metadata parse failed:', error?.message || error);
    return {};
  }
}

function stringifyMetadata(meta) {
  if (!meta || typeof meta !== 'object' || !Object.keys(meta).length) {
    return null;
  }
  try {
    return JSON.stringify(meta);
  } catch (error) {
    console.warn('[problemLibrary] metadata stringify failed:', error?.message || error);
    return null;
  }
}

async function setProblemActive({ problemId, isActive, userId, reason }) {
  const numericId = Number(problemId);
  if (!Number.isInteger(numericId) || numericId <= 0) {
    throw createHttpError(400, '유효한 문항 ID가 필요해요.');
  }

  const row = await database.get(
    'SELECT id, metadata, is_active, deactivated_at, deactivated_by FROM problems WHERE id = ?',
    [numericId]
  );

  if (!row) {
    throw createHttpError(404, '문항 정보를 찾을 수 없어요.');
  }

  const targetActive = isActive ? 1 : 0;
  const currentActive = Number(row.is_active ?? 1) === 0 ? 0 : 1;
  if (targetActive === currentActive) {
    return {
      id: numericId,
      isActive: currentActive === 1,
      metadata: parseMetadata(row.metadata)
    };
  }

  const metadata = parseMetadata(row.metadata);
  const nowIso = new Date().toISOString();

  if (!isActive) {
    metadata.retired = {
      at: nowIso,
      by: userId || null,
      reason: reason ? String(reason).slice(0, 300) : ''
    };
  } else if (metadata.retired) {
    metadata.retired = {
      ...metadata.retired,
      restoredAt: nowIso,
      restoredBy: userId || null
    };
  }

  const metadataJson = stringifyMetadata(metadata);

  await database.run(
    'UPDATE problems SET is_active = ?, metadata = ?, deactivated_at = ?, deactivated_by = ? WHERE id = ?',
    [
      targetActive,
      metadataJson,
      isActive ? null : nowIso,
      isActive ? null : (userId || null),
      numericId
    ]
  );

  if (!isActive) {
    try {
      await database.run(
        "UPDATE problem_exposures SET last_result = 'retired' WHERE problem_id = ?",
        [numericId]
      );
    } catch (error) {
      console.warn('[problemLibrary] failed to mark exposures retired:', error?.message || error);
    }
  }

  return {
    id: numericId,
    isActive,
    metadata
  };
}

module.exports = {
  normalizeListParam,
  listProblems,
  summarizeProblems,
  saveProblemNote,
  setProblemActive
};
