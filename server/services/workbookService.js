const crypto = require('crypto');

const database = require('../models/database');
const analysisService = require('./analysisService');
const { getUserStats, getUserRank } = require('./studyService');
const { getTierInfo, getNextTier, calculateProgress } = require('../utils/tierUtils');

const DEFAULT_EMOJI = '📘';
const WORKBOOK_TEST_MAX_QUESTIONS = 10;
const TEST_POINTS_CORRECT = 10;
const TEST_POINTS_INCORRECT = -5;

class WorkbookService {
  constructor() {
    this.analysisService = analysisService;
  }

  _createCardId(stepNumber, index, seed = '') {
    const normalizedStep = Number.isInteger(stepNumber) ? stepNumber : 0;
    const normalizedIndex = Number.isInteger(index) ? index : 0;
    const base = `${normalizedStep}-${normalizedIndex}-${seed}`;
    const hash = crypto.createHash('sha1').update(base).digest('hex').slice(0, 10);
    return `wc-${normalizedStep}-${normalizedIndex}-${hash}`;
  }

  _assignCardIds(stepNumber, cards = []) {
    return (Array.isArray(cards) ? cards : []).map((card, index) => {
      if (card && card.id) {
        return card;
      }
      const seed = typeof card?.front === 'string'
        ? card.front
        : JSON.stringify({ type: card?.type || 'card', hint: card?.hint || null });
      return {
        ...card,
        id: this._createCardId(stepNumber, index, seed || `${stepNumber}-${index}`)
      };
    });
  }

  _normalizeAnswer(value) {
    if (value === null || value === undefined) return '';
    if (Array.isArray(value)) {
      return value.map((item) => this._normalizeAnswer(item)).join(' ');
    }
    return String(value)
      .trim()
      .replace(/\s+/g, ' ')
      .toLowerCase();
  }

  _normalizeAnswerArray(values = []) {
    if (!Array.isArray(values)) return [];
    return values.map((value) => this._normalizeAnswer(value));
  }

  _formatAnswerList(values = [], delimiter = ', ') {
    if (!Array.isArray(values)) return '';
    return values
      .map((value) => (value === null || value === undefined ? '' : String(value).trim()))
      .filter((value) => value.length)
      .join(delimiter);
  }

  async listWorkbooks(filter = {}) {
    const conditions = [];
    const params = [];

    if (filter.documentId) {
      conditions.push('ws.document_id = ?');
      params.push(filter.documentId);
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const rows = await database.all(
      `SELECT ws.*, d.title AS document_title
         FROM workbook_sets ws
         LEFT JOIN documents d ON ws.document_id = d.id
       ${whereClause}
        ORDER BY ws.updated_at DESC, ws.created_at DESC`,
      params
    );

    return rows.map((row) => this._formatRow(row, { includeSteps: false }));
  }

  async getWorkbook(id) {
    const row = await database.get(
      `SELECT ws.*, d.title AS document_title
         FROM workbook_sets ws
         LEFT JOIN documents d ON ws.document_id = d.id
        WHERE ws.id = ?`,
      [id]
    );

    if (!row) {
      throw new Error('워크북을 찾을 수 없습니다.');
    }

    return this._formatRow(row, { includeSteps: true });
  }

  async generateWorkbook({ documentId, passageNumber = 1, userId = null, regenerate = false }) {
    if (!documentId) {
      throw new Error('documentId가 필요합니다.');
    }

    const numericPassage = Number(passageNumber) || 1;
    const document = await database.get('SELECT id, title, content FROM documents WHERE id = ?', [documentId]);
    if (!document) {
      throw new Error('문서를 찾을 수 없습니다.');
    }

    const passages = this.analysisService.extractPassages(document.content);
    if (!Array.isArray(passages) || passages.length === 0) {
      throw new Error('이 문서에는 사용할 수 있는 지문이 없습니다.');
    }

    if (numericPassage < 1 || numericPassage > passages.length) {
      throw new Error(`유효하지 않은 지문 번호입니다. (1-${passages.length})`);
    }

    const existing = await database.get(
      'SELECT * FROM workbook_sets WHERE document_id = ? AND passage_number = ?',
      [documentId, numericPassage]
    );

    if (existing && !regenerate) {
      const formatted = this._formatRow(existing, { includeSteps: true, documentTitle: document.title });
      formatted.cached = true;
      return formatted;
    }

    const { payload: workbookPayload } = await this._prepareWorkbookPayload(document, numericPassage, passages[numericPassage - 1] || '');

    if (!Array.isArray(workbookPayload.steps) || workbookPayload.steps.length === 0) {
      throw new Error('워크북 단계를 생성하지 못했습니다.');
    }

    const stepsJson = JSON.stringify(workbookPayload.steps);
    const metaJson = JSON.stringify(workbookPayload.meta || {});

    let workbookId = existing?.id || null;
    if (existing) {
      await database.run(
        `UPDATE workbook_sets
            SET title = ?,
                description = ?,
                cover_emoji = ?,
                steps_json = ?,
                meta_json = ?,
                status = 'ready',
                updated_at = CURRENT_TIMESTAMP,
                created_by = COALESCE(created_by, ?)
          WHERE id = ?`,
        [
          workbookPayload.title,
          workbookPayload.description,
          workbookPayload.coverEmoji || DEFAULT_EMOJI,
          stepsJson,
          metaJson,
          userId || null,
          existing.id
        ]
      );
      workbookId = existing.id;
    } else {
      const insert = await database.run(
        `INSERT INTO workbook_sets
           (document_id, passage_number, title, description, cover_emoji, steps_json, meta_json, status, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'ready', ?)`,
        [
          documentId,
          numericPassage,
          workbookPayload.title,
          workbookPayload.description,
          workbookPayload.coverEmoji || DEFAULT_EMOJI,
          stepsJson,
          metaJson,
          userId || null
        ]
      );
      workbookId = insert.id;
    }

    const savedRow = await database.get(
      'SELECT ws.*, d.title AS document_title FROM workbook_sets ws LEFT JOIN documents d ON ws.document_id = d.id WHERE ws.id = ?',
      [workbookId]
    );

    const formatted = this._formatRow(savedRow, { includeSteps: true });
    formatted.cached = false;
    return formatted;
  }

  async _prepareWorkbookPayload(document, numericPassage, rawPassageText) {
    const passageText = String(rawPassageText || '').trim();
    if (!passageText) {
      throw new Error('선택한 지문이 비어 있습니다.');
    }

    let analysis = await this.analysisService.getPassageAnalysis(document.id, numericPassage);
    let variant = Array.isArray(analysis?.variants) && analysis.variants.length ? analysis.variants[0] : null;

    if (!variant) {
      const generatedVariant = await this.analysisService.analyzer.analyzeIndividualPassage(passageText, numericPassage);
      const { allVariants } = await this.analysisService.appendVariants(document.id, numericPassage, passageText, [generatedVariant]);
      variant = allVariants[0];
    }

    if (!variant) {
      throw new Error('워크북을 만들 분석 데이터를 준비하지 못했습니다.');
    }

    const payload = this._buildWorkbookFromVariant({
      document,
      passageNumber: numericPassage,
      variant,
      passageText
    });

    return { payload, variant, passageText };
  }

  async _getWorkbookPayloadById(workbookId) {
    const workbookRow = await database.get(
      'SELECT id, document_id, passage_number FROM workbook_sets WHERE id = ?',
      [workbookId]
    );
    if (!workbookRow) {
      throw new Error('워크북을 찾을 수 없습니다.');
    }

    const document = await database.get('SELECT id, title, content FROM documents WHERE id = ?', [workbookRow.document_id]);
    if (!document) {
      throw new Error('문서를 찾을 수 없습니다.');
    }

    const passages = this.analysisService.extractPassages(document.content);
    if (!Array.isArray(passages) || !passages.length) {
      throw new Error('해당 문서에서 지문을 찾지 못했습니다.');
    }

    const numericPassage = Number(workbookRow.passage_number) || 1;
    if (numericPassage < 1 || numericPassage > passages.length) {
      throw new Error(`유효하지 않은 지문 번호입니다. (1-${passages.length})`);
    }

    const rawPassage = passages[numericPassage - 1] || '';
    const { payload } = await this._prepareWorkbookPayload(document, numericPassage, rawPassage);

    return {
      workbookRow,
      document,
      payload,
      numericPassage
    };
  }

  async deleteWorkbook(id) {
    const numericId = Number(id);
    if (!Number.isInteger(numericId) || numericId <= 0) {
      throw new Error('유효한 워크북 ID가 필요합니다.');
    }

    const existing = await database.get('SELECT id FROM workbook_sets WHERE id = ?', [numericId]);
    if (!existing) {
      throw new Error('워크북을 찾을 수 없습니다.');
    }

    const result = await database.run('DELETE FROM workbook_sets WHERE id = ?', [numericId]);
    return { id: numericId, deleted: result?.changes || 0 };
  }

  _formatRow(row, options = {}) {
    const includeSteps = Boolean(options.includeSteps);
    const documentTitle = options.documentTitle !== undefined ? options.documentTitle : row.document_title;

    const steps = includeSteps ? this._safeParseJSON(row.steps_json, []) : [];
    const meta = includeSteps ? this._safeParseJSON(row.meta_json, {}) : undefined;
    const stepCount = includeSteps ? steps.length : this._countSteps(row.steps_json);

    const base = {
      id: row.id,
      documentId: row.document_id,
      documentTitle: documentTitle || 'Untitled Document',
      passageNumber: row.passage_number,
      title: row.title,
      description: row.description,
      coverEmoji: row.cover_emoji || DEFAULT_EMOJI,
      status: row.status || 'ready',
      createdBy: row.created_by || null,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      totalSteps: stepCount
    };

    if (includeSteps) {
      base.steps = steps;
      base.meta = meta;
    }

    return base;
  }

  _safeParseJSON(payload, fallback) {
    if (!payload) return fallback;
    try {
      const parsed = JSON.parse(payload);
      return parsed === null ? fallback : parsed;
    } catch (error) {
      console.warn('[workbook] JSON parse 실패:', error?.message || error);
      return fallback;
    }
  }

  _countSteps(payload) {
    const parsed = this._safeParseJSON(payload, []);
    return Array.isArray(parsed) ? parsed.length : 0;
  }

  _buildWorkbookFromVariant({ document, passageNumber, variant, passageText }) {
    const meta = variant?.meta || {};
    const sentences = Array.isArray(variant?.sentenceAnalysis) ? variant.sentenceAnalysis : [];
    const englishTitles = Array.isArray(meta?.englishTitles) ? meta.englishTitles : [];

    const vocabularyPool = this._collectVocabulary(sentences);
    const grammarPoints = this._collectGrammar(sentences);

    const englishSummary = this._clean(meta.englishSummary);
    const englishSummaryKo = this._clean(meta.englishSummaryKorean);
    const koreanMainIdea = this._clean(meta.koreanMainIdea);
    const authorsClaim = this._clean(meta.authorsClaim);
    const deepDive = meta.deepDive || {};
    const modernApps = Array.isArray(meta.modernApplications) ? meta.modernApplications : [];

    const steps = this._buildClassicWorkbookSteps({
      document,
      passageNumber,
      passageText,
      sentences,
      vocabularyPool,
      grammarPoints,
      englishTitles,
      englishSummary,
      englishSummaryKo,
      koreanMainIdea,
      authorsClaim,
      deepDive,
      modernApps
    });

    return {
      title: `${document.title || '워크북'} 10단계 학습`,
      description: koreanMainIdea || englishSummaryKo || '지문의 핵심을 10단계 워크북으로 재구성했습니다.',
      coverEmoji: DEFAULT_EMOJI,
      steps,
      meta: {
        documentTitle: document.title,
        passageNumber,
        passagePreview: this._trim(passageText, 220),
        englishSummary,
        englishSummaryKo,
        authorsClaim,
        koreanMainIdea,
        modernApplications: modernApps,
        vocabularyTerms: vocabularyPool.map((item) => item.term)
      }
    };
  }

  _buildClassicWorkbookSteps({
    document,
    passageNumber,
    passageText,
    sentences,
    vocabularyPool,
    grammarPoints,
    englishTitles,
    englishSummary,
    englishSummaryKo,
    koreanMainIdea,
    authorsClaim,
    deepDive,
    modernApps
  }) {
    const readingCardsRaw = this._buildReadingPracticeCards(sentences, englishTitles, englishSummaryKo);
    const blankKoCardsRaw = this._buildBlankPracticeCards(sentences, vocabularyPool, { hintType: 'korean', maxCards: 8 });
    const multiBlankCardsRaw = this._buildMultiBlankCards(sentences, vocabularyPool, { blanks: 2 });
    const grammarChoiceCardsRaw = this._buildGrammarChoiceCards(sentences, vocabularyPool, grammarPoints);
    const tripleBlankCardsRaw = this._buildMultiBlankCards(sentences, vocabularyPool, { blanks: 3, maxCards: 4 });
    const wordOrderCardsRaw = this._buildWordOrderCards(sentences);
    const paragraphCardsRaw = this._buildParagraphCards(sentences, koreanMainIdea || englishSummaryKo, authorsClaim);
    const insertionCardsRaw = this._buildInsertionCards(sentences, englishSummaryKo || englishSummary);
    const writingPuzzleCardsRaw = this._buildWritingPuzzleCards(sentences, englishSummary, englishSummaryKo, modernApps);

    const readingCards = this._ensureCards(
      readingCardsRaw,
      '지문 문장이 아직 준비되지 않았어요. 분석본을 먼저 생성해 주세요.'
    );

    const blankKoCards = this._ensureCards(
      blankKoCardsRaw,
      '지문 속 어휘가 부족하여 빈칸 연습을 만들지 못했습니다.'
    );

    const multiBlankCards = this._ensureCards(
      multiBlankCardsRaw,
      '두 개 이상 빈칸으로 만들 수 있는 문장이 부족합니다.'
    );

    const grammarChoiceCards = this._ensureCards(
      grammarChoiceCardsRaw,
      '어법/어휘 고치기 문제를 만들 수 있는 예시가 부족합니다.'
    );

    const tripleBlankCards = this._ensureCards(
      tripleBlankCardsRaw,
      '세 개의 빈칸을 만들 문장을 찾지 못했습니다.'
    );

    const wordOrderCards = this._ensureCards(
      wordOrderCardsRaw,
      '단어 배열 연습을 만들 수 있는 문장이 부족합니다.'
    );

    const paragraphCards = this._ensureCards(
      paragraphCardsRaw,
      '문단 배열 연습을 만들 수 있는 정보가 부족합니다.'
    );

    const insertionCards = this._ensureCards(
      insertionCardsRaw,
      '문장 삽입 연습을 만들 수 있는 단락을 찾지 못했습니다.'
    );

    const writingPuzzleCards = this._ensureCards(
      writingPuzzleCardsRaw,
      '영작 퍼즐을 만들 수 있는 문장이 부족합니다.'
    );

    const reviewCards = this._ensureCards(
      this._buildReviewCards([
        { label: 'STEP 1', cards: readingCardsRaw },
        { label: 'STEP 2', cards: blankKoCardsRaw },
        { label: 'STEP 3', cards: multiBlankCardsRaw },
        { label: 'STEP 4', cards: grammarChoiceCardsRaw },
        { label: 'STEP 5', cards: tripleBlankCardsRaw },
        { label: 'STEP 6', cards: wordOrderCardsRaw },
        { label: 'STEP 7', cards: paragraphCardsRaw },
        { label: 'STEP 8', cards: insertionCardsRaw },
        { label: 'STEP 9', cards: writingPuzzleCardsRaw }
      ]),
      '복습할 카드가 부족합니다. 앞 단계를 먼저 학습해 주세요.'
    );

    return [
      this._createStep(1, '한글 해석하기', '📖', '원문을 한 문장씩 읽고 자연스러운 우리말로 이해해 보세요.', '각 문장을 소리 내어 읽고, 모르는 표현은 별표로 표시해 보세요.', readingCards, [
        '모르는 표현은 노트에 정리',
        '소리 내어 읽으며 억양 익히기'
      ]),
      this._createStep(2, '빈칸 완성 (우리말)', '🧩', '우리말 힌트를 보고 빈칸을 채워 보세요.', '힌트를 참고해 문장에 알맞은 영어 단어를 채워 보세요.', blankKoCards, [
        '힌트 해석과 정답을 연결해 보기',
        '정답 단어의 철자를 정확히 확인'
      ]),
      this._createStep(3, '이중 빈칸 도전', '🧠', '두 개 이상의 핵심 표현을 동시에 채워 보세요.', '번호에 맞춰 빈칸을 채우고, 힌트를 활용해 정확한 단어를 찾으세요.', multiBlankCards, [
        '문맥을 먼저 해석한 뒤 빈칸 채우기',
        '정답 단어를 이용해 문장을 다시 소리 내어 읽기'
      ]),
      this._createStep(4, '어법·어휘 고치기', '🧐', '어색한 문장을 읽고 알맞은 표현으로 바로잡아 보세요.', '틀린 부분을 눈으로 확인한 뒤, 가장 자연스러운 표현을 골라 보세요.', grammarChoiceCards, [
        '틀린 표현과 정답 표현 비교',
        '수정된 문장을 소리 내어 읽기'
      ]),
      this._createStep(5, '세 칸 빈칸 채우기', '✏️', '문맥을 떠올리며 세 개의 핵심 단어를 채워 보세요.', '힌트를 참고해 문장 속 세 개의 빈칸을 모두 채워 보세요.', tripleBlankCards, [
        '먼저 문장을 소리 내어 읽기',
        '정답 단어로 다시 한 번 문장 읽어 보기'
      ]),
      this._createStep(6, '단어 배열 퍼즐', '🧱', '단어 조각을 클릭해서 올바른 순서로 맞춰 보세요.', '퍼즐 조각을 눌러 문장을 완성하고, 완성되면 소리 내어 읽어 보세요.', wordOrderCards, [
        '힌트를 먼저 읽고 핵심 어순 떠올리기',
        '틀렸다면 초기화 후 다시 도전'
      ]),
      this._createStep(7, '문단 배열', '📚', 'A·B·C 단락을 자연스러운 흐름으로 다시 정렬해 보세요.', '단락을 읽고 도입-전개-마무리 순서대로 배열해 보세요.', paragraphCards, [
        '단락마다 핵심 문장을 표시',
        '왜 그 순서가 자연스러운지 말로 설명'
      ]),
      this._createStep(8, '문장 삽입', '➕', '단락 속 공백에 어울리는 문장을 골라 보세요.', '앞뒤 문맥을 비교해 가장 자연스러운 문장을 선택해 보세요.', insertionCards, [
        '앞 문장과 뒤 문장의 연결 표현 체크',
        '선택한 문장을 넣고 다시 읽어 보기'
      ]),
      this._createStep(9, '영작 퍼즐', '🧠✍️', '힌트 단어로 시작하고 나머지는 직접 타이핑해 보세요.', '제시된 단서를 활용해 문장을 입력하고, 완성 후 소리 내어 읽어 보세요.', writingPuzzleCards, [
        '힌트 단어로 뼈대를 만들기',
        '완성 문장을 소리 내어 읽으며 리듬 익히기'
      ]),
      this._createStep(10, '랜덤 복습', '🎯', '앞 단계에서 풀었던 카드 중 핵심만 다시 확인해 보세요.', '질문을 읽고 답을 떠올린 뒤 뒷면을 확인해 보세요.', reviewCards, [
        '틀렸던 카드는 즐겨찾기에 추가',
        '복습 후 난이도 다시 평가'
      ])
    ];
  }

  _createStep(stepNumber, title, mood, intro, mission, cards, takeaways) {
    const normalizedCards = this._assignCardIds(stepNumber, cards);
    return {
      step: stepNumber,
      label: `STEP ${stepNumber}`,
      title,
      mood,
      intro,
      mission,
      cards: normalizedCards,
      takeaways
    };
  }

  _ensureCards(cards, fallbackMessage) {
    if (Array.isArray(cards) && cards.length) {
      return cards;
    }
    return [{
      front: fallbackMessage,
      back: '필요한 데이터를 먼저 준비해 주세요.'
    }];
  }

  _buildReadingPracticeCards(sentences, englishTitles, summaryKo) {
    if (!Array.isArray(sentences) || !sentences.length) {
      return [];
    }
    const cards = sentences.map((entry, idx) => ({
      front: `[문장 해석 ${idx + 1}]\n${this._cleanEnglish(entry.english)}`,
      back: this._cleanLine(entry.korean) || this._cleanLine(entry.analysis)
    }));

    if (!cards.length && Array.isArray(englishTitles)) {
      englishTitles.slice(0, 2).forEach((titleEntry, idx) => {
        cards.push({
          front: `[제목 힌트 ${idx + 1}] ${this._clean(titleEntry?.title)}`,
          back: this._clean(titleEntry?.korean) || summaryKo || '제목 느낌을 직접 정리해 보세요.'
        });
      });
    }

    if (summaryKo) {
      cards.push({
        front: '[핵심 메시지]\n핵심 내용을 한 문장으로 정리해 보세요.',
        back: this._trim(summaryKo, 220)
      });
    }

    return cards;
  }

  _buildBlankPracticeCards(sentences, vocabularyPool, options = {}) {
    const { hintType = 'korean', maxCards = 5 } = options;
    const cards = [];
    const used = new Set();
    (sentences || []).forEach((entry) => {
      if (cards.length >= maxCards) return;
      const selection = this._selectBlankTarget(entry, vocabularyPool);
      if (!selection) return;
      const english = this._cleanEnglish(entry.english);
      if (!english || used.has(selection.word.toLowerCase())) return;
      used.add(selection.word.toLowerCase());
      const blanked = this._blankWordInSentence(english, selection.word);
      const hint = hintType === 'english'
        ? this._buildEnglishHint(selection.word, selection.vocab, entry)
        : this._cleanLine(entry.korean) || '우리말 뜻을 떠올려 보세요.';
      cards.push({
        type: 'single-blank',
        blanks: 1,
        prompt: blanked,
        hint,
        answers: [selection.word],
        sentence: english,
        front: `[빈칸] ${blanked}\n힌트: ${hint}`,
        back: `정답: ${selection.word}`
      });
    });
    return cards;
  }

  _buildMultiBlankCards(sentences, vocabularyPool, options = {}) {
    const { maxCards = 4, hintType = 'korean', blanks = 2 } = options;
    const cards = [];
    (sentences || []).forEach((entry) => {
      if (cards.length >= maxCards) return;
      const english = this._cleanEnglish(entry.english);
      if (!english) return;
      const rawTargets = this._selectMultipleTargets(entry, vocabularyPool, blanks);
      if (rawTargets.length < blanks) return;

      const orderedTargets = this._orderTargetsByPosition(english, rawTargets);
      if (orderedTargets.length < blanks) return;

      let display = english;
      const answers = [];
      orderedTargets.forEach((target, idx) => {
        const placeholder = `_____${idx + 1}`;
        const regex = new RegExp(`\\b${this._escapeRegex(target.word)}\\b`, 'i');
        if (!regex.test(display)) return;
        display = display.replace(regex, placeholder);
        answers.push(`${idx + 1}. ${target.word}`);
      });

      if (answers.length < blanks) return;

      const label = blanks === 3 ? '세 칸 빈칸' : blanks === 2 ? '이중 빈칸' : '빈칸 연습';
      const hint = hintType === 'english'
        ? this._buildEnglishHint(orderedTargets[0].word, orderedTargets[0].vocab, entry)
        : this._cleanLine(entry.korean) || this._cleanLine(entry.analysis) || '문맥을 차분히 해석해 보세요.';

      cards.push({
        type: blanks === 1 ? 'single-blank' : 'multi-blank',
        blanks,
        prompt: display,
        hint,
        answers: orderedTargets.map((target) => target.word),
        sentence: english,
        front: `[${label} ${cards.length + 1}]\n${display}\n힌트: ${hint}`,
        back: `정답:\n${answers.join('\n')}`
      });
    });
    return cards;
  }

  _buildTranslationPracticeCards(sentences) {
    return (sentences || []).slice(0, 6).map((entry, idx) => ({
      front: `[해석 연습 ${idx + 1}]\n${this._cleanEnglish(entry.english)}\n→ 자연스러운 우리말로 적어 보세요.`,
      back: `정답 예시: ${this._cleanLine(entry.korean) || this._cleanLine(entry.analysis) || '스스로 해석을 적어 보고 비교해 보세요.'}`
    }));
  }

  _buildGrammarChoiceCards(sentences, vocabularyPool, grammarPoints = []) {
    const cards = [];
    (sentences || []).forEach((entry) => {
      if (cards.length >= 4) return;
      const english = this._cleanEnglish(entry.english);
      if (!english) return;
      const selection = this._selectBlankTarget(entry, vocabularyPool);
      if (!selection || !selection.word) return;

      const distractors = this._makeChoiceDistractors(selection.word).filter(Boolean).slice(0, 2);
      if (distractors.length < 2) return;

      const incorrectWord = distractors[0];
      const mutatedSentence = this._replaceFirstMatch(english, selection.word, incorrectWord);
      if (!mutatedSentence || mutatedSentence === english) return;

      const optionSet = [
        { text: selection.word, correct: true },
        { text: incorrectWord, correct: false },
        { text: distractors[1], correct: false }
      ];
      const shuffled = this._shuffleArray(optionSet);
      const labeledOptions = shuffled.map((option, idx) => ({
        label: this._choiceLabel(idx + 1),
        text: option.text,
        isCorrect: option.correct
      }));
      const answerIndex = labeledOptions.findIndex((option) => option.isCorrect);
      cards.push({
        type: 'grammar-choice',
        options: labeledOptions,
        correctOption: answerIndex >= 0 ? labeledOptions[answerIndex].label : null,
        prompt: mutatedSentence,
        front: `[어법 고치기 ${cards.length + 1}]\n문장: ${mutatedSentence}\n틀린 표현을 고쳐 줄 말을 고르세요.\n${labeledOptions.map((option) => `${option.label} ${option.text}`).join('\n')}`,
        back: `정답: ${answerIndex >= 0 ? labeledOptions[answerIndex].label : this._choiceLabel(1)} ${selection.word}\n수정 문장: ${english}`
      });
    });

    if (!cards.length && Array.isArray(grammarPoints) && grammarPoints.length) {
      cards.push(...this._buildGrammarCards(grammarPoints).slice(0, 2));
    }

    return cards;
  }

  _buildWordOrderCards(sentences) {
    const cards = [];
    (sentences || []).forEach((entry) => {
      if (cards.length >= 4) return;
      const english = this._cleanEnglish(entry.english);
      const korean = this._cleanLine(entry.korean) || this._cleanLine(entry.analysis);
      if (!english) return;
      const chunks = this._chunkSentenceForOrdering(english);
      if (chunks.length < 4) return;
      const scrambled = this._scrambleChunks(chunks);
      const tokenPool = scrambled.map((token, idx) => ({ id: `${idx}-${token}`, text: token }));
      cards.push({
        type: 'word-order',
        prompt: korean || '힌트를 읽고 단어를 올바른 순서로 배열해 보세요.',
        tokens: tokenPool,
        answer: chunks.join(' '),
        answerTokens: chunks,
        preview: `[단어 배열 퍼즐] ${korean || english}`,
        back: `정답: ${chunks.join(' ')}\n어순 체크: ${chunks.join(' / ')}`
      });
    });
    return cards;
  }

  _chunkSentenceForOrdering(sentence) {
    const words = sentence
      .split(/\s+/)
      .map((word) => word.trim())
      .filter(Boolean);
    if (words.length < 4) return [];
    const chunks = [];
    for (let i = 0; i < words.length; i += 2) {
      const pair = words.slice(i, i + 2).join(' ');
      chunks.push(pair.trim());
    }
    return chunks;
  }

  _scrambleChunks(chunks) {
    const result = [];
    for (let i = 0; i < chunks.length; i += 2) {
      if (i + 1 < chunks.length) {
        result.push(chunks[i + 1], chunks[i]);
      } else {
        result.push(chunks[i]);
      }
    }
    return result;
  }

  _buildAwkwardCards(sentences, vocabularyPool) {
    const cards = [];
    (sentences || []).forEach((entry, idx) => {
      if (cards.length >= 3) return;
      const selection = this._selectBlankTarget(entry, vocabularyPool);
      const english = this._cleanEnglish(entry.english);
      if (!selection || !english) return;
      const incorrect = this._distortWord(selection.word);
      const awkwardSentence = this._blankWordInSentence(english, selection.word).replace('_____', `${incorrect} (?)`);
      cards.push({
        front: `[어색한 곳 찾기 ${idx + 1}]\n${awkwardSentence}`,
        back: `어색한 부분: ${incorrect} → ${selection.word}`
      });
    });
    return cards;
  }

  _buildSequenceCards(sentences, summaryLine) {
    const fragments = this._createSequenceFragments(sentences, summaryLine);
    if (!fragments.length) return [];
    const labels = ['A', 'B', 'C', 'D'];
    const lines = fragments.map((frag, idx) => `${labels[idx]}. ${frag}`);
    const answer = labels.slice(0, fragments.length).join(' → ');
    return [{
      front: '[순서 배열]\n흩어진 문장을 읽고 자연스러운 순서를 적어 보세요.\n' + lines.join('\n'),
      back: `정답 예시: ${answer}`
    }];
  }

  _buildParagraphCards(sentences) {
    const blocks = this._createParagraphChunks(sentences);
    if (blocks.length < 3) return [];
    const letters = ['A', 'B', 'C'];
    const original = blocks.slice(0, 3).map((text, idx) => ({ index: idx, text }));
    const shuffled = this._shuffleArray(original.slice()).map((item, displayIndex) => ({
      displayLabel: letters[displayIndex],
      sourceIndex: item.index,
      text: item.text
    }));
    const lines = shuffled.map((item) => `(${item.displayLabel}) ${item.text}`);
    const answer = original
      .map((item) => {
        const match = shuffled.find((shuffledItem) => shuffledItem.sourceIndex === item.index);
        return match ? `(${match.displayLabel})` : '';
      })
      .filter(Boolean)
      .join(' → ');
    return [{
      front: '[문단 배열]\n다음 단락을 자연스러운 순서로 배열해 보세요.\n' + lines.join('\n'),
      back: `정답: ${answer}`
    }];
  }

  _buildInsertionCards(sentences, summaryLine) {
    const cards = [];
    if (!Array.isArray(sentences) || sentences.length < 3) {
      return cards;
    }

    const englishSentences = sentences.map((entry) => this._cleanEnglish(entry?.english)).filter(Boolean);
    if (englishSentences.length < 3) {
      return cards;
    }

    for (let idx = 1; idx < englishSentences.length - 1 && cards.length < 3; idx += 1) {
      const targetSentence = englishSentences[idx];
      if (!targetSentence) continue;

      const reduced = englishSentences.filter((_, sentenceIndex) => sentenceIndex !== idx);
      const markers = this._buildMarkerList(reduced.length + 1);
      if (markers.length < 3) continue;

      const passageLines = reduced.map((sentence, lineIdx) => `${markers[lineIdx]} ${sentence}`);
      const endMarker = markers[reduced.length];
      if (endMarker) {
        passageLines.push(`${endMarker} (문단 끝)`);
      }

      const optionEntries = markers.map((marker, optionIdx) => ({
        label: marker,
        text: optionIdx === reduced.length ? `${marker} (문단 끝)` : `${marker} 위치`
      }));

      const resolvedParagraph = this._insertSentenceAtPosition(reduced, idx, targetSentence);

      cards.push({
        type: 'sentence-insert',
        givenSentence: targetSentence,
        contextLines: passageLines,
        options: optionEntries,
        correctOption: markers[idx],
        front: `[문장 삽입 ${cards.length + 1}]\n[주어진 문장]\n${targetSentence}\n\n본문:\n${passageLines.join('\n')}\n\n선택지:\n${optionEntries.map((entry) => entry.text).join('\n')}`,
        back: `정답: ${markers[idx]}\n삽입 후 문장: ${resolvedParagraph}${summaryLine ? `\n단락 요약: ${this._trim(summaryLine, 120)}` : ''}`
      });
    }

    return cards;
  }

  _buildWritingPuzzleCards(sentences, englishSummary, englishSummaryKo, modernApps) {
    const cards = [];

    const buildCard = (english, koreanHint) => {
      const cleanSentence = this._cleanEnglish(english);
      if (!cleanSentence) return null;
      const hintTokens = this._pickHintTokens(cleanSentence, 5);
      const promptLines = [];
      if (koreanHint) promptLines.push(koreanHint);
      if (hintTokens.length) {
        promptLines.push(`힌트 단어: ${hintTokens.join(' · ')}`);
      }
      const prompt = promptLines.length ? promptLines.join('\n') : '힌트 단어를 참고해 문장을 완성해 보세요.';
      return {
        type: 'word-order-input',
        prompt,
        tokens: hintTokens,
        answer: cleanSentence,
        preview: `[영작 퍼즐] ${this._trim(cleanSentence, 80)}`,
        back: `정답 예시: ${cleanSentence}`
      };
    };

    (sentences || []).slice(0, 4).forEach((entry) => {
      if (cards.length >= 4) return;
      const card = buildCard(entry?.english, this._cleanLine(entry?.korean) || englishSummaryKo || englishSummary);
      if (card) cards.push(card);
    });

    if (!cards.length && englishSummary) {
      const summaryCard = buildCard(englishSummary, englishSummaryKo);
      if (summaryCard) cards.push(summaryCard);
    }

    if (!cards.length && Array.isArray(modernApps) && modernApps.length) {
      const idea = this._trim(modernApps[0], 150);
      const fallbackSentence = 'I will apply this idea to create better study habits.';
      const fallback = buildCard(fallbackSentence, idea ? `아이디어 예시: ${idea}` : '아이디어를 활용해 한 문장을 작성해 보세요.');
      if (fallback) cards.push(fallback);
    }

    return cards;
  }


  _pickHintTokens(sentence, desiredCount = 5) {
    if (!sentence) return [];
    const words = sentence
      .split(/[^A-Za-z']+/)
      .map((word) => word.trim())
      .filter(Boolean);
    const unique = [];
    const seen = new Set();
    words.forEach((word) => {
      const lower = word.toLowerCase();
      if (!lower || seen.has(lower)) return;
      seen.add(lower);
      unique.push(word);
    });
    if (!unique.length) return [];
    const count = Math.min(desiredCount, Math.max(2, unique.length));
    const step = Math.max(1, Math.floor(unique.length / count));
    const picked = [];
    for (let i = 0; i < unique.length && picked.length < count; i += step) {
      picked.push(unique[i]);
    }
    if (unique.length && !picked.includes(unique[0])) picked.unshift(unique[0]);
    return Array.from(new Set(picked)).slice(0, desiredCount);
  }


  _buildReviewCards(stepSources = []) {
    const pool = [];
    stepSources.forEach((source) => {
      if (!source || !Array.isArray(source.cards) || !source.cards.length) return;
      source.cards.forEach((card) => {
        if (!card || !card.back) return;
        const preview = this._describeCardFront(card);
        if (!preview) return;
        pool.push({
          front: `[${source.label}] 빠른 점검\n${preview}`,
          back: card.back
        });
      });
    });
    if (!pool.length) return [];
    const shuffled = this._shuffleArray(pool);
    return shuffled.slice(0, 10);
  }

  _buildTestCardIndex(steps = []) {
    const index = new Map();
    (steps || []).forEach((step) => {
      if (!step || !Array.isArray(step.cards)) return;
      step.cards.forEach((card) => {
        if (!card || !card.id) return;
        index.set(card.id, { card, step });
      });
    });
    return index;
  }

  _convertCardToQuestion(step, card) {
    if (!card || !card.id) return null;
    const base = {
      id: card.id,
      type: card.type || 'flashcard',
      step: step.step,
      stepLabel: step.label,
      mission: step.mission || null,
      title: step.title || null
    };

    switch (card.type) {
      case 'single-blank':
        return {
          ...base,
          prompt: card.prompt || card.front,
          hint: card.hint || null,
          blanks: 1
        };
      case 'multi-blank':
        return {
          ...base,
          prompt: card.prompt || card.front,
          hint: card.hint || null,
          blanks: Array.isArray(card.answers) ? card.answers.length : (card.blanks || 2)
        };
      case 'grammar-choice': {
        const options = Array.isArray(card.options)
          ? card.options.map((option) => ({ label: option.label, text: option.text }))
          : [];
        return {
          ...base,
          prompt: card.prompt || card.front,
          options
        };
      }
      case 'sentence-insert': {
        const options = Array.isArray(card.options)
          ? card.options.map((option) => ({ label: option.label, text: option.text }))
          : [];
        return {
          ...base,
          givenSentence: card.givenSentence,
          contextLines: card.contextLines || [],
          options
        };
      }
      case 'word-order':
        return {
          ...base,
          tokens: Array.isArray(card.tokens) ? card.tokens : [],
          hint: card.prompt || null
        };
      case 'word-order-input':
        return {
          ...base,
          tokens: Array.isArray(card.tokens) ? card.tokens : [],
          hint: card.prompt || null
        };
      default:
        return null;
    }
  }

  _buildTestQuestions(steps = [], options = {}) {
    const pool = [];
    (steps || []).forEach((step) => {
      if (!step || Number(step.step) >= 10) return;
      (step.cards || []).forEach((card) => {
        const question = this._convertCardToQuestion(step, card);
        if (question) {
          pool.push(question);
        }
      });
    });

    if (!pool.length) {
      return [];
    }

    const limit = Math.min(options.limit || WORKBOOK_TEST_MAX_QUESTIONS, pool.length);
    const shuffled = this._shuffleArray(pool);
    return shuffled.slice(0, limit).map((question, index) => ({
      ...question,
      order: index + 1
    }));
  }

  async getWorkbookTest(workbookId, options = {}) {
    const context = await this._getWorkbookPayloadById(workbookId);
    const questions = this._buildTestQuestions(context.payload.steps, options);

    return {
      workbook: {
        id: context.workbookRow.id,
        title: context.payload.title,
        description: context.payload.description,
        coverEmoji: context.payload.coverEmoji || DEFAULT_EMOJI,
        documentTitle: context.document.title,
        passageNumber: context.workbookRow.passage_number,
        totalSteps: context.payload.steps.length
      },
      questions
    };
  }

  _evaluateTestAnswer(card, rawAnswer, fallbackType = null) {
    const type = card?.type || fallbackType;
    const explanation = card?.back || null;

    switch (type) {
      case 'single-blank': {
        const expectedList = Array.isArray(card?.answers) ? card.answers : [];
        const normalizedExpected = this._normalizeAnswerArray(expectedList);
        const userValue = this._normalizeAnswer(rawAnswer);
        const correct = Boolean(userValue) && normalizedExpected.includes(userValue);
        return {
          correct,
          correctAnswer: this._formatAnswerList(expectedList) || null,
          correctAnswers: expectedList,
          userAnswer: typeof rawAnswer === 'string' ? rawAnswer.trim() : String(rawAnswer || '').trim(),
          userAnswers: rawAnswer ? [String(rawAnswer)] : [],
          explanation,
          score: correct ? TEST_POINTS_CORRECT : TEST_POINTS_INCORRECT
        };
      }
      case 'multi-blank': {
        const expectedList = Array.isArray(card?.answers) ? card.answers : [];
        const normalizedExpected = this._normalizeAnswerArray(expectedList);
        const userList = Array.isArray(rawAnswer) ? rawAnswer : [];
        const normalizedUser = this._normalizeAnswerArray(userList);
        const correct = normalizedUser.length === normalizedExpected.length
          && normalizedUser.every((value, idx) => value && value === normalizedExpected[idx]);
        return {
          correct,
          correctAnswer: this._formatAnswerList(expectedList, ' / ') || null,
          correctAnswers: expectedList,
          userAnswer: this._formatAnswerList(userList, ' / ') || '',
          userAnswers: userList,
          explanation,
          score: correct ? TEST_POINTS_CORRECT : TEST_POINTS_INCORRECT
        };
      }
      case 'grammar-choice': {
        const options = Array.isArray(card?.options) ? card.options : [];
        const expectedLabel = card?.correctOption || null;
        const userLabel = typeof rawAnswer === 'string' ? rawAnswer.trim() : '';
        const correctOption = options.find((option) => option.label === expectedLabel);
        const userOption = options.find((option) => option.label === userLabel);
        const correctText = correctOption ? `${correctOption.label} ${correctOption.text}` : expectedLabel;
        const userText = userOption ? `${userOption.label} ${userOption.text}` : userLabel;
        const correct = Boolean(expectedLabel) && expectedLabel === userLabel;
        return {
          correct,
          correctAnswer: correctText || null,
          correctAnswers: correctOption ? [correctOption] : [],
          userAnswer: userText || '',
          userAnswers: userOption ? [userOption] : [],
          explanation,
          score: correct ? TEST_POINTS_CORRECT : TEST_POINTS_INCORRECT
        };
      }
      case 'sentence-insert': {
        const options = Array.isArray(card?.options) ? card.options : [];
        const expectedLabel = card?.correctOption || null;
        const userLabel = typeof rawAnswer === 'string' ? rawAnswer.trim() : '';
        const correctOption = options.find((option) => option.label === expectedLabel);
        const userOption = options.find((option) => option.label === userLabel);
        const correctText = correctOption ? correctOption.text : expectedLabel;
        const userText = userOption ? userOption.text : userLabel;
        const correct = Boolean(expectedLabel) && expectedLabel === userLabel;
        return {
          correct,
          correctAnswer: correctText || null,
          correctAnswers: correctOption ? [correctOption] : [],
          userAnswer: userText || '',
          userAnswers: userOption ? [userOption] : [],
          explanation,
          score: correct ? TEST_POINTS_CORRECT : TEST_POINTS_INCORRECT
        };
      }
      case 'word-order': {
        const expectedTokens = Array.isArray(card?.answerTokens)
          ? card.answerTokens
          : (card?.answer ? String(card.answer).split(/\s+/) : []);
        const userTokens = Array.isArray(rawAnswer)
          ? rawAnswer
          : (typeof rawAnswer === 'string' ? rawAnswer.split(/\s+/) : []);
        const normalizedExpected = this._normalizeAnswerArray(expectedTokens);
        const normalizedUser = this._normalizeAnswerArray(userTokens);
        const correct = normalizedUser.length === normalizedExpected.length
          && normalizedUser.every((value, idx) => value && value === normalizedExpected[idx]);
        return {
          correct,
          correctAnswer: this._formatAnswerList(expectedTokens, ' '),
          correctAnswers: expectedTokens,
          userAnswer: this._formatAnswerList(userTokens, ' '),
          userAnswers: userTokens,
          explanation,
          score: correct ? TEST_POINTS_CORRECT : TEST_POINTS_INCORRECT
        };
      }
      case 'word-order-input': {
        const expected = card?.answer || '';
        const userText = typeof rawAnswer === 'string' ? rawAnswer : '';
        const correct = this._normalizeAnswer(userText) === this._normalizeAnswer(expected);
        return {
          correct,
          correctAnswer: expected,
          correctAnswers: [expected],
          userAnswer: userText,
          userAnswers: [userText],
          explanation,
          score: correct ? TEST_POINTS_CORRECT : TEST_POINTS_INCORRECT
        };
      }
      default:
        return {
          correct: false,
          correctAnswer: null,
          correctAnswers: [],
          userAnswer: rawAnswer ? String(rawAnswer) : '',
          userAnswers: rawAnswer ? [String(rawAnswer)] : [],
          explanation,
          score: TEST_POINTS_INCORRECT
        };
    }
  }

  async submitWorkbookTest(workbookId, userId, submissions = []) {
    const numericUserId = Number(userId);
    if (!Number.isInteger(numericUserId) || numericUserId <= 0) {
      throw new Error('유효한 사용자 정보가 필요합니다.');
    }

    if (!Array.isArray(submissions) || submissions.length === 0) {
      throw new Error('답안을 제출해 주세요.');
    }

    const userRow = await database.get(
      'SELECT id, points, tier, name, username, school, grade FROM users WHERE id = ?',
      [numericUserId]
    );
    if (!userRow) {
      throw new Error('사용자를 찾을 수 없습니다.');
    }

    const context = await this._getWorkbookPayloadById(workbookId);
    const cardIndex = this._buildTestCardIndex(context.payload.steps);

    const evaluations = [];
    const seen = new Set();

    submissions.forEach((entry) => {
      if (!entry || typeof entry !== 'object') return;
      const questionId = String(entry.questionId || entry.id || '').trim();
      if (!questionId || seen.has(questionId)) return;
      seen.add(questionId);

      const indexed = cardIndex.get(questionId);
      if (!indexed) {
        evaluations.push({
          questionId,
          type: entry.type || 'unknown',
          step: null,
          stepLabel: null,
          question: null,
          correct: false,
          correctAnswer: null,
          correctAnswers: [],
          userAnswer: entry.answer ? String(entry.answer) : '',
          userAnswers: entry.answer ? [String(entry.answer)] : [],
          explanation: null,
          score: TEST_POINTS_INCORRECT,
          error: 'not_found'
        });
        return;
      }

      const { card, step } = indexed;
      const evaluation = this._evaluateTestAnswer(card, entry.answer, entry.type);
      const questionMeta = this._convertCardToQuestion(step, card);

      evaluations.push({
        questionId,
        type: card.type || entry.type || 'unknown',
        step: step.step,
        stepLabel: step.label,
        question: questionMeta,
        ...evaluation
      });
    });

    if (!evaluations.length) {
      throw new Error('채점할 답안을 찾지 못했습니다.');
    }

    const total = evaluations.length;
    const correct = evaluations.filter((evaluation) => evaluation.correct).length;
    const incorrect = total - correct;
    const accuracy = total ? Math.round((correct / total) * 1000) / 10 : 0;

    const basePoints = Number(userRow.points) || 0;
    const pointsDelta = correct * TEST_POINTS_CORRECT + incorrect * TEST_POINTS_INCORRECT;
    const totalPoints = Math.max(0, basePoints + pointsDelta);
    const tierInfo = getTierInfo(totalPoints);
    const nextTier = getNextTier(tierInfo);
    const progressToNext = nextTier ? calculateProgress(totalPoints, tierInfo, nextTier) : 100;

    await database.run(
      'UPDATE users SET points = ?, tier = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [totalPoints, tierInfo.name, numericUserId]
    );

    try {
      await database.run(
        `INSERT INTO workbook_test_logs (workbook_id, user_id, total_questions, correct, incorrect, score, points_delta)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          context.workbookRow.id,
          numericUserId,
          total,
          correct,
          incorrect,
          correct,
          pointsDelta
        ]
      );
    } catch (logError) {
      console.warn('[workbook] failed to log workbook test:', logError?.message || logError);
    }

    const stats = await getUserStats(numericUserId);
    const rank = await getUserRank(numericUserId);

    return {
      summary: {
        total,
        correct,
        incorrect,
        accuracy,
        pointsDelta,
        totalPoints
      },
      details: evaluations,
      stats,
      rank,
      updatedUser: {
        id: numericUserId,
        name: userRow.name,
        username: userRow.username,
        school: userRow.school,
        grade: userRow.grade,
        points: totalPoints,
        tier: tierInfo.name,
        tierInfo,
        nextTier,
        progressToNext
      }
    };
  }

  _buildWritingCards(modernApps, englishSummary, englishSummaryKo, deepDive) {
    const prompts = [];
    const ideas = Array.isArray(modernApps) ? modernApps.filter(Boolean) : [];
    if (ideas.length) {
      ideas.slice(0, 2).forEach((idea, idx) => {
        prompts.push({
          front: `영작 연습 ${idx + 1}\n아이디어: ${this._trim(idea, 150)}\n→ 이 아이디어로 2~3문장을 작성해 보세요.`,
          back: '예시 답안은 직접 작성해 보세요.'
        });
      });
    }
    const tone = this._clean(deepDive.toneAndStyle) || englishSummary || englishSummaryKo;
    prompts.push({
      front: '한 문장 요약을 활용해 영작해 보세요.\n→ 글의 핵심을 한 문장으로 정리한 뒤, 자신의 생각을 덧붙여 보세요.',
      back: tone ? `참고 요약: ${this._trim(tone, 180)}` : '핵심 내용을 한 줄로 정리하고 내 생각을 덧붙여 보세요.'
    });
    return prompts;
  }

  _selectBlankTarget(sentence, vocabularyPool) {
    const english = this._cleanEnglish(sentence?.english);
    if (!english) return null;
    const candidates = Array.isArray(vocabularyPool) ? vocabularyPool : [];
    for (const vocab of candidates) {
      const term = this._clean(vocab?.term);
      if (!term) continue;
      const regex = new RegExp(`\\b${this._escapeRegex(term)}\\b`, 'i');
      const match = english.match(regex);
      if (match) {
        return { word: match[0], vocab };
      }
    }
    const fallback = this._pickKeywordFromSentence(english);
    if (!fallback) return null;
    return { word: fallback, vocab: null };
  }

  _selectMultipleTargets(sentence, vocabularyPool, count = 2) {
    const english = this._cleanEnglish(sentence?.english);
    if (!english) return [];
    const selected = [];
    const used = new Set();

    (Array.isArray(vocabularyPool) ? vocabularyPool : []).forEach((vocab) => {
      if (selected.length >= count) return;
      const term = this._clean(vocab?.term);
      if (!term) return;
      const regex = new RegExp(`\\b${this._escapeRegex(term)}\\b`, 'i');
      const match = english.match(regex);
      if (!match) return;
      const found = match[0];
      const key = found.toLowerCase();
      if (used.has(key)) return;
      used.add(key);
      selected.push({ word: found, vocab });
    });

    if (selected.length < count) {
      const needed = count - selected.length;
      const extras = this._pickKeywords(english, needed, used);
      extras.forEach((word) => {
        used.add(word.toLowerCase());
        selected.push({ word, vocab: null });
      });
    }

    return selected.slice(0, count);
  }

  _orderTargetsByPosition(sentence, targets = []) {
    const lowerSentence = String(sentence || '').toLowerCase();
    const consumed = new Set();
    return (Array.isArray(targets) ? targets : [])
      .map((target) => {
        const regex = new RegExp(`\\b${this._escapeRegex(target.word)}\\b`, 'i');
        const match = regex.exec(sentence);
        let position = match ? match.index : lowerSentence.indexOf(String(target.word || '').toLowerCase());
        if (position < 0) position = Number.MAX_SAFE_INTEGER;
        while (consumed.has(position)) {
          position += 0.0001;
        }
        consumed.add(position);
        return { ...target, _position: position };
      })
      .sort((a, b) => (a._position || 0) - (b._position || 0))
      .map(({ _position, ...rest }) => rest);
  }

  _blankWordInSentence(sentence, word) {
    const regex = new RegExp(`\\b${this._escapeRegex(word)}\\b`, 'gi');
    return sentence.replace(regex, '_____');
  }

  _pickKeywords(sentence, count, exclude = new Set()) {
    if (!sentence) return [];
    const stop = new Set(['the', 'a', 'an', 'and', 'with', 'for', 'from', 'into', 'of', 'to', 'in', 'on', 'at', 'as', 'but', 'or', 'is', 'are', 'was', 'were', 'be', 'this', 'that', 'these', 'those']);
    const words = sentence
      .split(/[^A-Za-z]+/)
      .filter((word) => {
        const lower = word.toLowerCase();
        return lower.length >= 4 && !stop.has(lower) && !exclude.has(lower);
      })
      .sort((a, b) => b.length - a.length);
    const picked = [];
    for (const word of words) {
      if (picked.length >= count) break;
      picked.push(word);
    }
    return picked;
  }

  _buildEnglishHint(word, vocabEntry, sentence) {
    if (vocabEntry) {
      if (Array.isArray(vocabEntry.synonyms) && vocabEntry.synonyms.length) {
        return `동의어: ${vocabEntry.synonyms.slice(0, 2).join(', ')}`;
      }
      if (Array.isArray(vocabEntry.antonyms) && vocabEntry.antonyms.length) {
        return `반의어: ${vocabEntry.antonyms.slice(0, 2).join(', ')}`;
      }
      if (vocabEntry.meaning) {
        return vocabEntry.meaning;
      }
    }
    return this._cleanLine(sentence?.analysis) || '문맥을 떠올려 보고 알맞은 표현을 적어 보세요.';
  }

  _createSequenceFragments(sentences, summaryLine) {
    const fragments = [];
    if (Array.isArray(sentences) && sentences.length) {
      const first = sentences[0];
      const middle = sentences[Math.floor(sentences.length / 2)];
      const last = sentences[sentences.length - 1];
      if (first) fragments.push(this._trim(this._cleanLine(first.analysis) || first.english || '', 120));
      if (middle && middle !== first && middle !== last) {
        fragments.push(this._trim(this._cleanLine(middle.analysis) || middle.english || '', 120));
      }
      if (last && last !== first) fragments.push(this._trim(this._cleanLine(last.analysis) || last.english || '', 120));
    }
    if (summaryLine) {
      fragments.push(this._trim(summaryLine, 120));
    }
    return fragments.slice(0, 4);
  }

  _createParagraphFragments(sentences, mainIdea, authorsClaim) {
    const fragments = [];
    if (mainIdea) {
      fragments.push(`도입: ${this._trim(mainIdea, 120)}`);
    }
    if (Array.isArray(sentences) && sentences.length > 1) {
      const middle = sentences[Math.floor(sentences.length / 2)];
      if (middle) {
        fragments.push(`전개: ${this._trim(this._cleanLine(middle.analysis) || middle.english || '', 120)}`);
      }
    }
    if (authorsClaim) {
      fragments.push(`마무리: ${this._trim(authorsClaim, 120)}`);
    }
    return fragments.slice(0, 3);
  }

  _createParagraphChunks(sentences) {
    if (!Array.isArray(sentences) || sentences.length < 3) {
      return [];
    }
    const cleaned = sentences
      .map((entry) => this._cleanEnglish(entry.english))
      .filter(Boolean);
    if (cleaned.length < 3) {
      return [];
    }
    const chunkSize = Math.max(1, Math.ceil(cleaned.length / 3));
    const chunks = [];
    for (let i = 0; i < 3; i += 1) {
      const slice = cleaned.slice(i * chunkSize, (i + 1) * chunkSize);
      if (!slice.length) continue;
      chunks.push(this._trim(slice.join(' '), 220));
    }
    return chunks;
  }

  _pickKeywordFromSentence(sentence) {
    if (!sentence) return '';
    const stop = new Set(['the', 'a', 'an', 'and', 'with', 'for', 'from', 'into', 'of', 'to', 'in', 'on', 'at', 'as', 'but', 'or', 'is', 'are', 'was', 'were', 'be', 'this', 'that', 'these', 'those']);
    const words = sentence.split(/[^A-Za-z]+/).filter((word) => {
      const lower = word.toLowerCase();
      return lower.length >= 4 && !stop.has(lower);
    });
    words.sort((a, b) => b.length - a.length);
    return words[0] || '';
  }

  _escapeRegex(value) {
    return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  _shuffleArray(array) {
    const items = Array.isArray(array) ? array.slice() : [];
    for (let i = items.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [items[i], items[j]] = [items[j], items[i]];
    }
    return items;
  }

  _buildGrammarCards(grammarPoints) {
    if (!Array.isArray(grammarPoints) || !grammarPoints.length) {
      return [{
        front: '문법 포인트를 직접 찾아보세요!',
        back: '지문에서 수동태·관계절·가정법 등 눈에 띄는 패턴을 2개 이상 표시해 보세요.'
      }];
    }

    return grammarPoints.slice(0, 3).map((point, idx) => ({
      front: `✏️ Grammar ${idx + 1}`,
      back: point
    }));
  }

  _makeChoiceDistractors(word) {
    const lower = String(word || '').toLowerCase();
    if (!lower) return [];
    const variations = new Set();
    variations.add(lower.endsWith('ing') ? `${lower.slice(0, -3)}ed` : `${lower}ing`);
    variations.add(lower.endsWith('ed') ? `${lower.slice(0, -2)}ing` : `${lower}ed`);
    variations.add(lower.endsWith('ly') ? `${lower.slice(0, -2)}` : `${lower}ly`);
    const result = Array.from(variations).filter((item) => item !== lower);
    if (result.length < 2) {
      result.push(`${lower}s`);
    }
    return result.slice(0, 2);
  }

  _replaceFirstMatch(sentence, target, replacement) {
    if (!sentence || !target) return sentence;
    const regex = new RegExp(`\\b${this._escapeRegex(target)}\\b`, 'i');
    return sentence.replace(regex, replacement);
  }

  _choiceLabel(index) {
    const circled = ['①', '②', '③', '④', '⑤', '⑥'];
    return circled[index - 1] || `${index}.`;
  }

  _buildMarkerList(count) {
    const markers = [];
    const total = Math.max(0, Number(count) || 0);
    for (let i = 1; i <= total; i += 1) {
      markers.push(this._choiceLabel(i));
    }
    return markers;
  }

  _insertSentenceAtPosition(sentences, insertIndex, targetSentence) {
    const arranged = Array.isArray(sentences) ? sentences.slice() : [];
    const safeIndex = Math.min(Math.max(insertIndex, 0), arranged.length);
    arranged.splice(safeIndex, 0, targetSentence);
    return arranged.join(' ');
  }

  _distortWord(word) {
    const lower = String(word || '').toLowerCase();
    if (!lower) return '';
    if (lower.endsWith('e')) {
      return `${lower}ly`;
    }
    if (lower.endsWith('ly')) {
      return `${lower.slice(0, -2)}ness`;
    }
    return `${lower}ness`;
  }

  _describeCardFront(card) {
    if (!card) return '';
    if (typeof card.preview === 'string' && card.preview.trim()) {
      return this._trim(card.preview, 160);
    }
    const front = typeof card.front === 'string' ? card.front : card.prompt;
    if (!front) return '';
    const firstLine = front.split('\n')[0] || front;
    return this._trim(firstLine, 160);
  }

  _collectVocabulary(sentences) {
    const unique = new Map();
    (sentences || []).forEach((entry) => {
      const words = entry?.vocabulary?.words || [];
      words.forEach((word) => {
        const key = String(word?.term || '').toLowerCase();
        if (!key || unique.has(key)) return;
        unique.set(key, {
          term: this._clean(word?.term),
          meaning: this._clean(word?.meaning),
          synonyms: Array.isArray(word?.synonyms)
            ? word.synonyms.map((syn) => this._clean(syn)).filter(Boolean)
            : [],
          antonyms: Array.isArray(word?.antonyms)
            ? word.antonyms.map((ant) => this._clean(ant)).filter(Boolean)
            : [],
          note: this._clean(word?.note)
        });
      });
    });
    return Array.from(unique.values());
  }

  _collectGrammar(sentences) {
    const lines = [];
    (sentences || []).forEach((entry) => {
      if (entry?.grammar) {
        lines.push(this._cleanLine(entry.grammar));
      }
    });
    return lines.filter(Boolean);
  }

  _collectExamples(sentences) {
    const lines = [];
    (sentences || []).forEach((entry) => {
      if (entry?.example) {
        lines.push(this._cleanLine(entry.example));
      }
    });
    return lines.filter(Boolean);
  }

  _collectBackgrounds(sentences) {
    const lines = [];
    (sentences || []).forEach((entry) => {
      if (entry?.background) {
        lines.push(this._cleanLine(entry.background));
      }
    });
    return lines;
  }

  _clean(text) {
    if (!text) return '';
    return String(text).trim();
  }

  _cleanLine(text) {
    const cleaned = this._clean(text)
      .replace(/^\*{3}\s*[^:]+:\s*/i, '')
      .replace(/^✏️\s*[^:]+:\s*/i, '')
      .replace(/^어법 포인트[:：]?\s*/i, '')
      .replace(/^한글 해석[:：]?\s*/i, '')
      .replace(/^내용 분석[:：]?\s*/i, '')
      .replace(/^분석[:：]?\s*/i, '')
      .replace(/^추가 메모[:：]?\s*/i, '')
      .replace(/^이 문장에 필요한 배경지식[:：]?\s*/i, '')
      .replace(/^생활 예시[:：]?\s*/i, '')
      .replace(/^이 문장에 필요한 사례[:：]?\s*/i, '')
      .replace(/^필수 어휘[:：]?\s*/i, '')
      .replace(/^어휘 포인트[:：]?\s*/i, '')
      .trim();
    return cleaned;
  }

  _cleanEnglish(text) {
    return this._clean(String(text || '').replace(/\*\*/g, ''));
  }

  _trim(text, max = 200) {
    const cleaned = this._clean(text);
    if (cleaned.length <= max) return cleaned;
    return `${cleaned.slice(0, max - 1)}…`;
  }

  _splitSentences(text) {
    const cleaned = this._clean(text);
    if (!cleaned) return [];
    return cleaned
      .split(/(?<=[.!?])\s+/)
      .map((part) => part.trim())
      .filter(Boolean);
  }
}

module.exports = new WorkbookService();
