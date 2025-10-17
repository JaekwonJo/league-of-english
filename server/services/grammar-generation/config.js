const fs = require('fs');
const path = require('path');

const CONFIG_PATH = path.join(__dirname, 'config.json');

const DEFAULT_CONFIG = {
  models: [
    { name: 'gpt-4o-mini', retries: 3, temperature: 0.25, maxTokens: 900 },
    { name: 'gpt-4o', retries: 3, temperature: 0.2, maxTokens: 1100 }
  ],
  minExplanationChars: 120,
  minExplanationSentences: 3,
  minReasonChars: 18,
  allowedTags: [
    'subject-verb',
    'tense',
    'gerund',
    'to-infinitive',
    'participle',
    'relative',
    'modal',
    'conditional',
    'comparison',
    'preposition'
  ],
  diff: {
    baselineLabel: 'wolgo-2024'
  }
};

function loadConfig() {
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      const raw = fs.readFileSync(CONFIG_PATH, 'utf8');
      const parsed = JSON.parse(raw);
      return { ...DEFAULT_CONFIG, ...parsed };
    }
  } catch (error) {
    console.warn('[grammar-config] Failed to load config.json:', error?.message || error);
  }
  return { ...DEFAULT_CONFIG };
}

module.exports = {
  loadConfig,
  DEFAULT_CONFIG
};
