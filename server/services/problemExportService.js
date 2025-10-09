const aiService = require('./aiProblemService');
const problemSetService = require('./problemSetService');
const database = require('../models/database');
const { createProblemsPdf } = require('../utils/pdfExporter');

const EXPORT_MAX_TOTAL = 100;

function createHttpError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function normalizeTypes(rawTypes) {
  if (!rawTypes) return [];
  if (Array.isArray(rawTypes)) {
    return rawTypes
      .map((type) => String(type || '').trim())
      .filter((type) => type.length);
  }
  if (typeof rawTypes === 'string' && rawTypes.trim()) {
    return rawTypes
      .split(',')
      .map((type) => type.trim())
      .filter((type) => type.length);
  }
  return [];
}

function normalizeCounts(counts = {}) {
  return problemSetService.normalizeExportCounts(counts);
}

function computeFinalLimit({ normalizedCounts, requestedLimit }) {
  const totalFromCounts = Object.values(normalizedCounts).reduce((sum, value) => sum + value, 0);
  const numericLimit = Math.min(Math.max(parseInt(requestedLimit, 10) || 0, 0), EXPORT_MAX_TOTAL);
  const finalLimit = totalFromCounts > 0
    ? Math.min(totalFromCounts, EXPORT_MAX_TOTAL)
    : Math.min(Math.max(numericLimit, 0), EXPORT_MAX_TOTAL);

  return { finalLimit, totalFromCounts };
}

async function fetchProblemsByCounts({ documentId, normalizedCounts, includeGeneratedOnly }) {
  const aggregated = [];
  const seenIds = new Set();

  for (const [type, count] of Object.entries(normalizedCounts)) {
    if (count <= 0) continue;
    const fetched = await aiService.listProblemsForExport({
      documentId,
      types: [type],
      limit: count,
      includeGeneratedOnly: includeGeneratedOnly ?? false
    });
    fetched.forEach((problem) => {
      if (problem && problem.id && !seenIds.has(problem.id)) {
        aggregated.push(problem);
        seenIds.add(problem.id);
      }
    });
  }

  return aggregated;
}

async function fetchProblemsByTypes({ documentId, normalizedTypes, finalLimit, includeGeneratedOnly }) {
  const aggregated = [];
  const seenIds = new Set();
  const fetched = await aiService.listProblemsForExport({
    documentId,
    types: normalizedTypes,
    limit: finalLimit,
    includeGeneratedOnly: includeGeneratedOnly ?? false,
    randomize: false
  });

  fetched.forEach((problem) => {
    if (problem && problem.id && !seenIds.has(problem.id)) {
      aggregated.push(problem);
      seenIds.add(problem.id);
    }
  });

  return aggregated.slice(0, finalLimit);
}

async function gatherProblems(options = {}) {
  const {
    documentId = null,
    types = [],
    counts = {},
    limit = EXPORT_MAX_TOTAL,
    includeSolutions = true,
    includeGeneratedOnly = false
  } = options;

  const normalizedTypes = normalizeTypes(types);
  const normalizedCounts = normalizeCounts(counts);
  const { finalLimit, totalFromCounts } = computeFinalLimit({
    normalizedCounts,
    requestedLimit: limit
  });

  if (!finalLimit || finalLimit < 5) {
    throw createHttpError(400, '내보낼 문제 수를 5문제 이상 선택해 주세요.');
  }

  let problems;
  if (totalFromCounts > 0) {
    problems = await fetchProblemsByCounts({
      documentId,
      normalizedCounts,
      includeGeneratedOnly
    });
  } else {
    problems = await fetchProblemsByTypes({
      documentId,
      normalizedTypes,
      finalLimit,
      includeGeneratedOnly
    });
  }

  if (!Array.isArray(problems) || problems.length === 0) {
    throw createHttpError(404, 'PDF로 내보낼 저장된 문제가 아직 부족해요.');
  }

  const sliced = problems.slice(0, finalLimit);
  const problemIds = sliced
    .map((problem) => Number(problem.id))
    .filter((id) => Number.isInteger(id) && id > 0);

  return {
    problems: sliced,
    total: sliced.length,
    problemIds,
    normalizedTypes,
    normalizedCounts,
    includeSolutions,
    documentId
  };
}

async function recordExportHistory(payload = {}) {
  try {
    await aiService.recordExportHistory(payload);
  } catch (error) {
    console.warn('[problemExportService] history log skipped:', error?.message || error);
  }
}

function buildPdfStream(problems, metadata = {}) {
  const {
    title = 'League of English 문제 세트',
    subtitle = null,
    includeSolutions = true,
    documentId = null
  } = metadata;

  return createProblemsPdf(problems, {
    title,
    subtitle: subtitle || (documentId ? `문서 ID ${documentId}` : null),
    includeSolutions
  });
}

function safeJsonParse(value, fallback) {
  if (!value) return fallback;
  try {
    return JSON.parse(value);
  } catch (error) {
    return fallback;
  }
}

async function listExportHistory(limit = 10) {
  const capped = Math.min(Math.max(parseInt(limit, 10) || 10, 1), 50);
  const rows = await database.all(
    'SELECT h.*, u.name AS user_name, u.username AS user_username, d.title AS document_title ' +
      'FROM problem_export_history h ' +
      'LEFT JOIN users u ON u.id = h.user_id ' +
      'LEFT JOIN documents d ON d.id = h.document_id ' +
      'ORDER BY datetime(h.created_at) DESC, h.id DESC LIMIT ?',
    [capped]
  );

  return rows.map((row) => ({
    id: row.id,
    user: {
      id: row.user_id,
      name: row.user_name || row.user_username || '관리자'
    },
    documentId: row.document_id,
    documentTitle: row.document_title || null,
    total: Number(row.total) || 0,
    includeSolutions: row.include_solutions === 1 || row.include_solutions === '1',
    problemIds: safeJsonParse(row.problem_ids, []),
    types: safeJsonParse(row.types, []),
    counts: safeJsonParse(row.counts, {}),
    createdAt: row.created_at
  }));
}

module.exports = {
  EXPORT_MAX_TOTAL,
  gatherProblems,
  recordExportHistory,
  buildPdfStream,
  listExportHistory,
  normalizeTypes,
  normalizeCounts,
  computeFinalLimit
};
