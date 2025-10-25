"use strict";

// High-level validators and helpers shared across grammar/vocabulary pipelines

const { rebuildUnderlinesFromOptions } = require('../underlined');

const CIRCLED = ['\u2460','\u2461','\u2462','\u2463','\u2464'];

function hasFiveUnderlines(text = '') {
  const count = (String(text).match(/<u[\s\S]*?<\/u>/gi) || []).length;
  return count === 5;
}

function hasMarkersBeforeEachUnderline(text = '') {
  const str = String(text);
  const matches = str.match(/<u[\s\S]*?<\/u>/gi) || [];
  if (matches.length !== 5) return false;
  let cursor = 0;
  for (const m of matches) {
    const idx = str.indexOf(m, cursor);
    if (idx === -1) return false;
    const prev = idx > 0 ? str.charAt(idx - 1) : '';
    if (!CIRCLED.includes(prev)) return false;
    cursor = idx + m.length;
  }
  return true;
}

// Ensure ①–⑤ markers appear once before each underline; returns possibly updated mainText/options
function ensureMarkers(mainText, options = [], failureReasons = null) {
  if (!mainText || !Array.isArray(options) || options.length !== 5) return { mainText, options };
  const ok = hasFiveUnderlines(mainText) && hasMarkersBeforeEachUnderline(mainText);
  if (ok) return { mainText, options };
  const rebuilt = rebuildUnderlinesFromOptions(mainText, options, failureReasons || []);
  return rebuilt || { mainText, options };
}

module.exports = {
  hasFiveUnderlines,
  hasMarkersBeforeEachUnderline,
  ensureMarkers
};

