const { translate } = require('@vitalets/google-translate-api');

const cache = new Map();
const DEFAULT_TARGET = 'ko';

function buildCacheKey(text, target) {
  return `${target}::${text}`;
}

async function translateText(text = '', options = {}) {
  const original = String(text || '').trim();
  if (!original) return '';

  const target = options?.target || DEFAULT_TARGET;
  const cacheKey = buildCacheKey(original, target);
  if (cache.has(cacheKey)) {
    return cache.get(cacheKey);
  }

  try {
    const result = await translate(original, { to: target });
    const translated = String(result?.text || '').replace(/\s+/g, ' ').trim();
    if (translated) {
      cache.set(cacheKey, translated);
    }
    return translated;
  } catch (error) {
    const fallback = options?.fallback || '';
    if (fallback) {
      cache.set(cacheKey, fallback);
      return fallback;
    }
    return '';
  }
}

module.exports = {
  translateText
};
