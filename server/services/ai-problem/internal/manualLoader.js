const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..', '..', '..', '..');
const PROBLEM_MANUAL_DIR = path.join(ROOT_DIR, 'problem manual');
const TEMPLATE_DIR = path.join(ROOT_DIR, 'docs', 'problem-templates');

const manualCache = new Map();

const GRAMMAR_KR_FILENAME = 'chatgpt5 전용 어법 문제 제작 통합 메뉴얼.md';

const DEFAULT_GRAMMAR_PATHS = [
  '/mnt/c/Users/jaekw/Documents/웹앱문제출제메뉴얼📘 chatgpt5 전용어법문제제작통합메뉴얼.md',
  '/mnt/c/Users/jaekw/Documents/웹앱/문제출제 메뉴얼/📘 chatgpt5 전용 어법 문제 제작 통합 메뉴얼.md'
];

const MANUAL_SOURCES = {
  grammar: [
    process.env.LOE_GRAMMAR_MANUAL_PATH,
    ...DEFAULT_GRAMMAR_PATHS,
    path.join(ROOT_DIR, GRAMMAR_KR_FILENAME),
    path.join(ROOT_DIR, 'grammar_problem_manual.md'),
    path.join(PROBLEM_MANUAL_DIR, 'grammar_problem_manual.md'),
    path.join(TEMPLATE_DIR, 'eobeop-grammar.md')
  ],
  vocabulary: [
    process.env.LOE_VOCABULARY_MANUAL_PATH,
    path.join(PROBLEM_MANUAL_DIR, 'vocabulary_problem_manual.md')
  ],
  title: [
    process.env.LOE_TITLE_MANUAL_PATH,
    path.join(TEMPLATE_DIR, 'title-master.md')
  ],
  blank: [
    process.env.LOE_BLANK_MANUAL_PATH,
    path.join(PROBLEM_MANUAL_DIR, '빈칸_메뉴얼_GPTxClaude.md')
  ],
  topic: [
    process.env.LOE_TOPIC_MANUAL_PATH,
    path.join(TEMPLATE_DIR, 'topic-master.md')
  ],
  implicit: [
    process.env.LOE_IMPLICIT_MANUAL_PATH,
    path.join(TEMPLATE_DIR, 'implicit-master.md')
  ],
  irrelevant: [
    process.env.LOE_IRRELEVANT_MANUAL_PATH,
    path.join(TEMPLATE_DIR, 'irrelevant-master.md')
  ]
};

function resolveCandidate(candidate) {
  if (!candidate) return null;
  if (path.isAbsolute(candidate)) {
    return candidate;
  }
  return path.resolve(ROOT_DIR, candidate);
}

function loadManualContent(cacheKey, rawCandidates, label) {
  if (manualCache.has(cacheKey)) {
    return manualCache.get(cacheKey);
  }

  const candidates = rawCandidates
    .map(resolveCandidate)
    .filter(Boolean);

  let content = '';
  for (const candidate of candidates) {
    try {
      if (fs.existsSync(candidate)) {
        content = fs.readFileSync(candidate, 'utf8');
        break;
      }
    } catch (error) {
      console.warn(`[aiManualLoader] failed to read ${label} manual candidate`, candidate, ':', error?.message || error);
    }
  }

  if (!content) {
    console.warn(
      `[aiManualLoader] no ${label} manual found in candidates: ${candidates.join(', ') || 'none'}`
    );
  }

  manualCache.set(cacheKey, content || '');
  return manualCache.get(cacheKey);
}

function sliceManual(cacheKey, sources, limit, label) {
  const content = loadManualContent(cacheKey, sources, label) || '';
  const shouldBypassLimit = cacheKey === 'grammar';
  if (shouldBypassLimit || !Number.isFinite(limit) || content.length <= limit) {
    return content;
  }
  return content.slice(0, Math.max(limit, 0));
}

function readGrammarManual(limit) {
  return sliceManual('grammar', MANUAL_SOURCES.grammar, limit, 'grammar');
}

function readVocabularyManual(limit = 2000) {
  return sliceManual('vocabulary', MANUAL_SOURCES.vocabulary, limit, 'vocabulary');
}

function readTitleManual(limit = 1600) {
  return sliceManual('title', MANUAL_SOURCES.title, limit, 'title');
}

function readBlankManual(limit = 2000) {
  return sliceManual('blank', MANUAL_SOURCES.blank, limit, 'blank');
}

function readTopicManual(limit = 1600) {
  return sliceManual('topic', MANUAL_SOURCES.topic, limit, 'topic');
}

function readImplicitManual(limit = 1800) {
  return sliceManual('implicit', MANUAL_SOURCES.implicit, limit, 'implicit');
}

function readIrrelevantManual(limit = 2000) {
  return sliceManual('irrelevant', MANUAL_SOURCES.irrelevant, limit, 'irrelevant');
}

module.exports = {
  readGrammarManual,
  readVocabularyManual,
  readTitleManual,
  readBlankManual,
  readTopicManual,
  readImplicitManual,
  readIrrelevantManual,
  loadManualContent
};
