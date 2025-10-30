const database = require('../models/database');
const analysisService = require('./analysisService');

const DEFAULT_EMOJI = '📘';

class WorkbookService {
  constructor() {
    this.analysisService = analysisService;
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
    const readingCards = this._ensureCards(
      this._buildReadingPracticeCards(sentences, englishTitles, englishSummaryKo),
      '지문 문장이 아직 준비되지 않았어요. 분석본을 먼저 생성해 주세요.'
    );

    const blankKoCards = this._ensureCards(
      this._buildBlankPracticeCards(sentences, vocabularyPool, { hintType: 'korean' }),
      '지문 속 어휘가 부족하여 빈칸 연습을 만들지 못했습니다.'
    );

    const blankEnCards = this._ensureCards(
      this._buildBlankPracticeCards(sentences, vocabularyPool, { hintType: 'english' }),
      '동의어/반의어 힌트를 만들 수 있는 어휘가 부족합니다.'
    );

    const translationCards = this._ensureCards(
      this._buildTranslationPracticeCards(sentences),
      '연습할 문장을 찾지 못했습니다. 분석본을 다시 확인해 주세요.'
    );

    const verbCards = this._ensureCards(
      this._buildVerbPracticeCards(sentences),
      '동사 변형 연습에 사용할 문장이 부족합니다.'
    );

    const grammarChoiceCards = this._ensureCards(
      this._buildGrammarChoiceCards(sentences, vocabularyPool, grammarPoints),
      '어법/어휘 선택 문제를 만들 수 있는 예시가 부족합니다.'
    );

    const awkwardCards = this._ensureCards(
      this._buildAwkwardCards(sentences, vocabularyPool),
      '어색한 표현 찾기 문제를 만들 수 있는 문장이 부족합니다.'
    );

    const sequenceCards = this._ensureCards(
      this._buildSequenceCards(sentences, englishSummaryKo || englishSummary),
      '순서 배열 연습을 구성할 수 있는 정보가 부족합니다.'
    );

    const paragraphCards = this._ensureCards(
      this._buildParagraphCards(sentences, koreanMainIdea || englishSummaryKo, authorsClaim),
      '문단 배열 연습을 만들 수 있는 정보가 부족합니다.'
    );

    const writingCards = this._ensureCards(
      this._buildWritingCards(modernApps, englishSummary, englishSummaryKo, deepDive),
      '영작 아이디어가 부족합니다. 분석본의 modernApplications 항목을 확인해 주세요.'
    );

    return [
      this._createStep(1, '지문 연습', '📖', '원문을 천천히 읽으며 의미 단위로 나눠 보세요.', '각 문장을 소리 내어 읽고, 모르는 표현은 별표로 표시해 보세요.', readingCards, [
        '모르는 표현은 노트에 정리',
        '소리 내어 읽으며 억양 익히기'
      ]),
      this._createStep(2, '빈칸 완성 (우리말)', '🧩', '우리말 힌트를 보고 빈칸을 채워 보세요.', '힌트를 참고해 문장에 알맞은 영어 단어를 채워 보세요.', blankKoCards, [
        '힌트 해석과 정답을 연결해 보기',
        '정답 단어의 철자를 정확히 확인'
      ]),
      this._createStep(3, '빈칸 완성 (영문)', '🧠', '영문 힌트(동의어/반의어)를 활용해 빈칸을 채워 보세요.', '문장 분위기에 맞는 표현을 골라 빈칸을 채우세요.', blankEnCards, [
        '동의어·반의어와 의미 비교',
        '완성된 문장을 다시 읽어 자연스럽게 만들기'
      ]),
      this._createStep(4, '해석 연습', '📝', '원문을 다시 읽으며 자연스러운 우리말 해석을 연습하세요.', '직접 해석을 적은 뒤 정답 예시와 비교해 보세요.', translationCards, [
        '직접 해석한 문장을 소리 내어 읽기',
        '핵심 표현에 밑줄 긋기'
      ]),
      this._createStep(5, '동사형 연습', '⚙️', '문장 속 주요 동사를 찾아 다양한 시제로 바꿔 보세요.', '표시된 동사를 원형·과거형·현재분사로 정리해 보세요.', verbCards, [
        '원형-과거형-현재분사 묶어 학습',
        '새로운 시제로 문장 다시 써보기'
      ]),
      this._createStep(6, '어법·어휘 고르기', '🧐', '문맥에 가장 자연스러운 표현을 선택해 보세요.', '보기 중 올바른 표현을 고르고, 나머지 선택지가 어색한 이유를 설명해 보세요.', grammarChoiceCards, [
        '틀린 보기의 이유 분석',
        '정답 표현으로 예문 다시 만들기'
      ]),
      this._createStep(7, '어색한 곳 찾기', '🚨', '살짝 어색하게 바꾼 문장을 자연스럽게 고쳐 보세요.', '어색한 표현을 찾아 자연스럽게 바꾸고 이유를 적어 보세요.', awkwardCards, [
        '교정 전·후 문장을 비교해서 읽기',
        '어색했던 이유를 짧게 메모'
      ]),
      this._createStep(8, '순서 배열', '🔄', '흩어진 핵심 문장을 올바른 순서로 정리해 보세요.', '조각 문장을 읽고 자연스러운 순서를 적어 보세요.', sequenceCards, [
        '정답 순서를 말로 설명',
        '앞뒤 연결 표현 표시해 보기'
      ]),
      this._createStep(9, '문단 배열', '📚', '문단 요약을 읽고 글의 전개 흐름을 정리해 보세요.', '도입-전개-마무리 순서를 확인하고 다시 적어 보세요.', paragraphCards, [
        '각 문단의 역할(도입/전환/마무리) 표시',
        '핵심 문장을 한 줄로 다시 쓰기'
      ]),
      this._createStep(10, '영작 연습', '✍️', '지문에서 얻은 아이디어로 나만의 문장을 작성해 보세요.', '주어진 주제에 맞춰 2~3문장을 영어로 작성해 보세요.', writingCards, [
        '작성한 문장을 스스로 점검',
        '다음 학습에서 공유할 문장 고르기'
      ])
    ];
  }

  _createStep(stepNumber, title, mood, intro, mission, cards, takeaways) {
    return {
      step: stepNumber,
      label: `STEP ${stepNumber}`,
      title,
      mood,
      intro,
      mission,
      cards,
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
    const cards = sentences.slice(0, 6).map((entry, idx) => ({
      front: `[지문 문장 ${idx + 1}]\n${this._cleanEnglish(entry.english)}`,
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
    return cards;
  }

  _buildBlankPracticeCards(sentences, vocabularyPool, { hintType }) {
    const cards = [];
    const used = new Set();
    (sentences || []).forEach((entry) => {
      if (cards.length >= 5) return;
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
        front: `[빈칸] ${blanked}\n힌트: ${hint}`,
        back: `정답: ${selection.word}`
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

  _buildVerbPracticeCards(sentences) {
    const cards = [];
    (sentences || []).forEach((entry) => {
      if (cards.length >= 4) return;
      const english = this._cleanEnglish(entry.english);
      if (!english) return;
      const verbs = this._extractVerbCandidates(english);
      if (!verbs.length) return;
      const variants = verbs.map((verb) => this._suggestVerbVariants(verb)).join('\n');
      cards.push({
        front: `[동사형 연습]\n${english}`,
        back: `예시 변형:\n${variants}`
      });
    });
    return cards;
  }

  _buildGrammarChoiceCards(sentences, vocabularyPool, grammarPoints) {
    const cards = [];
    (vocabularyPool || []).slice(0, 3).forEach((word, idx) => {
      if (!word?.term) return;
      const correct = word.term;
      const distractors = this._makeChoiceDistractors(correct);
      cards.push({
        front: `[어법·어휘 고르기 ${idx + 1}]\n문맥에 가장 자연스러운 표현을 고르세요.\n① ${correct}\n② ${distractors[0]}\n③ ${distractors[1]}\n힌트: ${word.meaning || '문맥을 떠올려 보세요.'}`,
        back: `정답: ① ${correct}${word.note ? `\n설명: ${word.note}` : ''}`
      });
    });

    if (!cards.length && Array.isArray(grammarPoints)) {
      grammarPoints.slice(0, 2).forEach((point, idx) => {
        cards.push({
          front: `[어법 확인 ${idx + 1}]\n${point}`,
          back: '힌트를 읽고 지문 속 예시 문장을 다시 확인해 보세요.'
        });
      });
    }

    return cards;
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

  _buildParagraphCards(sentences, mainIdea, authorsClaim) {
    const fragments = this._createParagraphFragments(sentences, mainIdea, authorsClaim);
    if (!fragments.length) return [];
    const labels = ['①', '②', '③'];
    const lines = fragments.map((frag, idx) => `${labels[idx]} ${frag}`);
    return [{
      front: '[문단 배열]\n각 문단의 역할을 읽고 올바른 순서를 적어 보세요.\n' + lines.join('\n'),
      back: `정답 예시: ${labels.slice(0, fragments.length).join(' → ')}`
    }];
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

  _blankWordInSentence(sentence, word) {
    const regex = new RegExp(`\\b${this._escapeRegex(word)}\\b`, 'gi');
    return sentence.replace(regex, '_____');
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

  _escapeRegex(value) {
    return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
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

  _extractVerbCandidates(sentence) {
    const tokens = sentence.split(/[^A-Za-z]+/).filter(Boolean);
    const verbs = new Set();
    const pronouns = new Set(['i', 'you', 'we', 'they', 'he', 'she', 'it', 'mentors', 'students', 'teachers', 'people', 'everyone']);
    const stop = new Set(['the', 'a', 'an', 'and', 'with', 'for', 'from', 'into', 'of', 'to', 'in', 'on', 'at', 'as', 'but', 'or', 'is', 'are', 'was', 'were', 'be']);
    tokens.forEach((token, index) => {
      const lower = token.toLowerCase();
      if (lower.length < 3 || stop.has(lower)) return;
      const prev = tokens[index - 1]?.toLowerCase();
      if (prev === 'to') {
        verbs.add(lower);
        return;
      }
      if (pronouns.has(prev) || (prev && prev.endsWith('s'))) {
        verbs.add(lower);
        return;
      }
      if (lower.endsWith('ing') || lower.endsWith('ed')) {
        verbs.add(lower);
      }
    });
    return Array.from(verbs).slice(0, 3);
  }

  _suggestVerbVariants(verb) {
    const base = this._normalizeVerbBase(verb);
    if (!base) {
      return `${verb} → 다양한 시제로 바꾸어 보세요.`;
    }
    const past = base.endsWith('e') ? `${base}d` : base.endsWith('y') ? `${base.slice(0, -1)}ied` : `${base}ed`;
    const ing = base.endsWith('e') ? `${base.slice(0, -1)}ing` : `${base}ing`;
    return `${verb} → 원형 ${base}, 과거형 ${past}, 현재분사 ${ing}`;
  }

  _normalizeVerbBase(word) {
    if (!word) return '';
    const lower = word.toLowerCase();
    if (lower.endsWith('ing')) {
      let core = lower.slice(0, -3);
      if (core.endsWith(core.slice(-1).repeat(2))) {
        core = core.slice(0, -1);
      }
      if (core && !core.endsWith('e')) {
        core += 'e';
      }
      return core;
    }
    if (lower.endsWith('ied')) {
      return `${lower.slice(0, -3)}y`;
    }
    if (lower.endsWith('ed')) {
      let core = lower.slice(0, -2);
      if (core.endsWith(core.slice(-1).repeat(2))) {
        core = core.slice(0, -1);
      }
      return core;
    }
    if (lower.endsWith('ies')) {
      return `${lower.slice(0, -3)}y`;
    }
    if (lower.endsWith('es')) {
      return lower.slice(0, -2);
    }
    if (lower.endsWith('s')) {
      return lower.slice(0, -1);
    }
    return lower;
  }

  _makeChoiceDistractors(word) {
    const lower = word.toLowerCase();
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

  _distortWord(word) {
    const lower = word.toLowerCase();
    if (lower.endsWith('e')) {
      return `${lower}ly`;
    }
    if (lower.endsWith('ly')) {
      return `${lower.slice(0, -2)}ness`;
    }
    return `${lower}ness`;
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

    const passageText = String(passages[numericPassage - 1] || '').trim();
    if (!passageText) {
      throw new Error('선택한 지문이 비어 있습니다.');
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

    let analysis = await this.analysisService.getPassageAnalysis(documentId, numericPassage);
    let variant = Array.isArray(analysis?.variants) && analysis.variants.length ? analysis.variants[0] : null;

    if (!variant) {
      const generatedVariant = await this.analysisService.analyzer.analyzeIndividualPassage(passageText, numericPassage);
      const { allVariants } = await this.analysisService.appendVariants(documentId, numericPassage, passageText, [generatedVariant]);
      variant = allVariants[0];
    }

    if (!variant) {
      throw new Error('워크북을 만들 분석 데이터를 준비하지 못했습니다.');
    }

    const workbookPayload = this._buildWorkbookFromVariant({
      document,
      passageNumber: numericPassage,
      variant,
      passageText
    });

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

  _buildTitleCards(englishTitles, coreMessage, summaryKo) {
    const cards = [];
    if (Array.isArray(englishTitles) && englishTitles.length) {
      englishTitles.slice(0, 2).forEach((titleEntry, idx) => {
        const titleText = this._clean(titleEntry?.title) || `Title Option ${idx + 1}`;
        const korean = this._clean(titleEntry?.korean) || summaryKo || coreMessage;
        cards.push({
          front: `🧐 Title Hint #${idx + 1}\n${titleText}`,
          back: korean ? `한국어 제목: ${korean}` : '제목에서 느껴지는 분위기를 한 줄로 정리해 보세요.'
        });
      });
    }

    cards.push({
      front: '🌈 Core Message',
      back: this._trim(coreMessage || summaryKo || '지문의 핵심 메시지를 스스로 정리해 보세요.', 220)
    });

    cards.push({
      front: '✨ Summary Spark',
      back: this._trim(summaryKo || coreMessage || '핵심 내용을 한 문장으로 말해보세요.', 220)
    });

    return cards.slice(0, 3);
  }

  _buildVocabularyCards(vocabularyPool) {
    if (!Array.isArray(vocabularyPool) || vocabularyPool.length === 0) {
      return [{
        front: '단어가 부족해요!',
        back: '핵심 어휘를 직접 정리해 주세요. 낯선 단어 3개를 골라 뜻 · 동의어 · 반의어를 찾아보세요.'
      }];
    }

    return vocabularyPool.slice(0, 4).map((word) => ({
      front: `${word.term}`,
      back: [
        word.meaning,
        word.synonyms.length ? `동의어: ${word.synonyms.slice(0, 3).join(', ')}` : null,
        word.antonyms.length ? `반의어: ${word.antonyms.slice(0, 2).join(', ')}` : null,
        word.note ? `TIP: ${word.note}` : null
      ].filter(Boolean).join('\n')
    }));
  }

  _buildSkimmingCards(sentences) {
    if (!Array.isArray(sentences) || sentences.length === 0) {
      return [{ front: '지문이 비어 있어요.', back: '문장을 추가한 뒤 다시 시도해 주세요.' }];
    }
    return sentences.slice(0, 3).map((entry, idx) => ({
      front: `🛤️ Skim ${idx + 1}\n${this._cleanEnglish(entry.english)}`,
      back: this._cleanLine(entry.analysis)
    }));
  }

  _buildDetailCards(sentences) {
    if (!Array.isArray(sentences) || sentences.length === 0) {
      return [{ front: '세부 정보가 부족해요.', back: '지문을 먼저 등록한 뒤 다시 시도해 주세요.' }];
    }
    return sentences.slice(0, 3).map((entry, idx) => ({
      front: `🔍 Detail ${idx + 1}\n${this._cleanEnglish(entry.english)}`,
      back: [
        this._cleanLine(entry.korean),
        this._cleanLine(entry.background || entry.analysis)
      ].filter(Boolean).join('\n\n')
    }));
  }

  _buildInferenceCards(authorsClaim, coreMessage, logicalFlow, toneAndStyle) {
    return [
      {
        front: '🧠 필자의 주장',
        back: this._trim(authorsClaim || coreMessage || '필자의 주장을 직접 정리해 보세요.', 220)
      },
      {
        front: '🔗 논리 흐름',
        back: this._trim(logicalFlow || '문단이 어떤 순서로 이어지는지 말해보세요.', 220)
      },
      {
        front: '🎵 어조와 분위기',
        back: this._trim(toneAndStyle || '필자의 말투를 형용사로 표현해 보세요.', 220)
      }
    ];
  }

  _buildStructureCards(logicalFlow, sentences) {
    const flowParts = this._splitSentences(logicalFlow).slice(0, 3);
    if (flowParts.length < 3) {
      const fallback = sentences.slice(0, 3).map((entry) => this._cleanEnglish(entry.english));
      while (flowParts.length < 3 && fallback[flowParts.length]) {
        flowParts.push(fallback[flowParts.length]);
      }
    }

    return flowParts.map((text, idx) => ({
      front: `🧩 구조 포인트 ${idx + 1}`,
      back: text || '이 부분의 흐름을 직접 정리해 보세요.'
    }));
  }

  _buildGrammarCards(grammarPoints) {
    if (!grammarPoints.length) {
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

  _buildExpressionCards(vocabularyPool, examples) {
    const cards = [];
    vocabularyPool.slice(0, 2).forEach((word) => {
      cards.push({
        front: `💬 Expression · ${word.term}`,
        back: this._trim(`${word.meaning}\n활용: ${word.note || word.synonyms.slice(0, 2).join(', ')}`, 220)
      });
    });

    examples.slice(0, 2).forEach((example) => {
      cards.push({
        front: '🗣️ 생활 예시',
        back: example
      });
    });

    if (!cards.length) {
      cards.push({
        front: '표현을 직접 만들어 볼까요?',
        back: '지문에서 마음에 든 표현 2개를 골라 회화체/글쓰기 버전으로 바꿔 보세요.'
      });
    }

    return cards.slice(0, 3);
  }

  _buildQuizCards({ authorsClaim, koreanMainIdea, modernApps, englishSummaryKo }) {
    const cards = [];
    const claim = this._trim(authorsClaim || koreanMainIdea || '필자의 주장을 직접 정리해 보세요.', 160);
    const mainIdea = this._trim(koreanMainIdea || englishSummaryKo || claim, 160);
    const application = Array.isArray(modernApps) && modernApps.length ? modernApps[0] : null;

    cards.push({
      front: '지문은 다음을 주장한다. (O/X)\n' + claim,
      back: '⭕ 맞아요! 필자의 주장이에요.'
    });

    cards.push({
      front: '지문은 실천 아이디어를 전혀 제시하지 않는다. (O/X)',
      back: application ? `❌ 아니에요. 예를 들어, “${this._trim(application, 120)}”와 같은 적용 아이디어가 소개돼요.` : '❌ 아니에요. 글은 현실 적용 아이디어를 생각해 보라고 안내합니다.'
    });

    cards.push({
      front: '이 글의 핵심은 다음과 같다. (O/X)\n' + mainIdea,
      back: '⭕ 맞아요! 이 한 줄이 핵심 아이디어예요.'
    });

    return cards;
  }

  _buildReflectionCards(modernApps, englishSummary, englishSummaryKo) {
    const cards = [];
    if (Array.isArray(modernApps) && modernApps.length) {
      modernApps.slice(0, 3).forEach((idea, idx) => {
        cards.push({
          front: `🚀 적용 아이디어 ${idx + 1}`,
          back: this._trim(idea, 220)
        });
      });
    }

    if (!cards.length) {
      cards.push({
        front: '나의 적용 아이디어',
        back: '지문에서 얻은 배움을 일상/수업에 어떻게 연결할지 스스로 아이디어를 작성해 보세요.'
      });
    }

    cards.push({
      front: '한 문장 요약',
      back: this._trim(englishSummaryKo || englishSummary || '오늘 읽은 내용을 한 문장으로 정리해 보세요.', 200)
    });

    return cards.slice(0, 3);
  }

  _collectVocabulary(sentences) {
    const unique = new Map();
    (sentences || []).forEach((entry) => {
      const words = entry?.vocabulary?.words || [];
      words.forEach((word) => {
        const key = String(word?.term || '').toLowerCase();
        if (!key) return;
        if (!unique.has(key)) {
          unique.set(key, {
            term: this._clean(word?.term),
            meaning: this._clean(word?.meaning),
            synonyms: Array.isArray(word?.synonyms) ? word.synonyms.map((syn) => this._clean(syn)).filter(Boolean) : [],
            antonyms: Array.isArray(word?.antonyms) ? word.antonyms.map((ant) => this._clean(ant)).filter(Boolean) : [],
            note: this._clean(word?.note)
          });
        }
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
      .replace(/^추가 메모[:：]?\s*/i, '')
      .replace(/^생활 예시[:：]?\s*/i, '')
      .replace(/^필수 어휘[:：]?\s*/i, '')
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
