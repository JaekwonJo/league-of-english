'use strict';

const fs = require('fs');
const path = require('path');

const GOLDEN_ROOT = path.resolve('server/utils/data/golden');
const GOLDEN_INDEX = path.join(GOLDEN_ROOT, 'index.json');

function safeReadJson(filePath) {
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(raw);
  } catch (e) {
    return null;
  }
}

function loadIndex() {
  const data = safeReadJson(GOLDEN_INDEX);
  if (!data || typeof data !== 'object') return { maps: {} };
  return data;
}

function normalizeKey(value) {
  return String(value || '')
    .trim()
    .toLowerCase();
}

/**
 * Try to fetch pre-authored (golden) problems for a document and type.
 * The index.json supports keys by document.code and document.title.
 * {
 *   "maps": {
 *     "blank": {
 *       "2-25-10": "blank/2-25-10.json",
 *       "고2 2024년 10월 모의고사": "blank/g12-2024-10.json"
 *     }
 *   }
 * }
 */
function getGoldenProblems(document, type = 'blank', limit = 10) {
  try {
    const index = loadIndex();
    const typeMap = index?.maps?.[type] || {};
    if (!typeMap || typeof typeMap !== 'object') return [];

    const codeKey = normalizeKey(document?.code || document?.slug || document?.external_id || '');
    const titleKey = normalizeKey(document?.title || document?.name || '');

    let relPath = null;
    if (codeKey && typeMap[codeKey]) relPath = typeMap[codeKey];
    else if (titleKey && typeMap[titleKey]) relPath = typeMap[titleKey];
    if (!relPath) return [];

    const abs = path.join(GOLDEN_ROOT, relPath);
    const data = safeReadJson(abs);
    if (!data) return [];
    const list = Array.isArray(data?.problems) ? data.problems : Array.isArray(data) ? data : [];
    if (!list.length) return [];
    return list.slice(0, Math.max(1, Number(limit) || 10));
  } catch (e) {
    return [];
  }
}

module.exports = {
  getGoldenProblems
};

