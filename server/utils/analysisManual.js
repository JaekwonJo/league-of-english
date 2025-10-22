'use strict';

const fs = require('fs');
const path = require('path');

const MANUAL_PATH = path.join(__dirname, '..', '..', 'problem manual', 'analysis.html');

let cachedManual = null;

function stripHtml(html = '') {
  return String(html || '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, '\n')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\r/g, '\n')
    .replace(/\n{2,}/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .trim();
}

function readAnalysisManual(limit = 2400) {
  if (cachedManual !== null) {
    return cachedManual.slice(0, limit);
  }

  let raw = '';
  try {
    raw = fs.readFileSync(MANUAL_PATH, 'utf8');
  } catch (error) {
    console.warn('[analysisManual] failed to read manual:', error?.message || error);
    cachedManual = '';
    return cachedManual;
  }

  const stripped = stripHtml(raw);
  cachedManual = stripped || '';
  return cachedManual.slice(0, limit);
}

module.exports = {
  readAnalysisManual
};
