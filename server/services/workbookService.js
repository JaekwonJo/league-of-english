const database = require('../models/database');
const analysisService = require('./analysisService');

const DEFAULT_EMOJI = '📘';

class WorkbookService {
  constructor() {
    this.analysisService = analysisService;
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
    const examples = this._collectExamples(sentences);
    const backgrounds = this._collectBackgrounds(sentences);

    const englishSummary = this._clean(meta.englishSummary);
    const englishSummaryKo = this._clean(meta.englishSummaryKorean);
    const koreanMainIdea = this._clean(meta.koreanMainIdea);
    const authorsClaim = this._clean(meta.authorsClaim);
    const deepDive = meta.deepDive || {};
    const modernApps = Array.isArray(meta.modernApplications) ? meta.modernApplications : [];

    const coreMessage = this._clean(deepDive.coreMessage || koreanMainIdea || authorsClaim);
    const logicalFlow = this._clean(deepDive.logicalFlow || englishSummaryKo);
    const toneAndStyle = this._clean(deepDive.toneAndStyle || '필자의 어조를 한 줄로 정리해 보세요.');

    const steps = [];

    // Step 1
    steps.push({
      step: 1,
      label: 'Step 1',
      title: 'Warm-up · 주제 감 잡기',
      mood: '🌅',
      intro: '제목 아이디어와 핵심 요약을 보고 오늘 지문의 분위기를 가볍게 예측해 보세요.',
      mission: '카드 앞면을 읽고 ✔ 체크하기 → 내가 떠올린 주제를 한 줄로 적어보세요.',
      cards: this._buildTitleCards(englishTitles, coreMessage, englishSummaryKo),
      takeaways: [
        '예상 주제를 한 문장으로 작성',
        '느껴지는 감정/톤을 단어 2개로 정리'
      ]
    });

    // Step 2 Vocabulary
    steps.push({
      step: 2,
      label: 'Step 2',
      title: 'Vocabulary Sprint',
      mood: '🔤',
      intro: '핵심 어휘를 카드로 익히고, 동의어·반의어를 함께 외워 보세요.',
      mission: '카드 뒷면까지 읽고 나만의 예문을 소리 내어 말해보기 → 모르는 단어 별표 표시',
      cards: this._buildVocabularyCards(vocabularyPool),
      takeaways: [
        '어휘 3개 이상 소리 내어 말하기',
        '동의어·반의어를 노트에 정리'
      ]
    });

    // Step 3 Skimming
    steps.push({
      step: 3,
      label: 'Step 3',
      title: 'Skimming Route',
      mood: '🛤️',
      intro: '문장의 핵심을 빠르게 훑으며 흐름을 파악해요.',
      mission: '카드를 읽고 핵심 동사/명사에 밑줄 → 흐름을 3단계로 요약해보기',
      cards: this._buildSkimmingCards(sentences),
      takeaways: [
        '문장별 핵심 키워드 2개 표시',
        '전체 흐름을 한 줄로 설명'
      ]
    });

    // Step 4 Detail scanning
    steps.push({
      step: 4,
      label: 'Step 4',
      title: 'Scanning Challenge',
      mood: '🔍',
      intro: '세부 정보를 정확히 찾아보고 배경 지식을 함께 정리해요.',
      mission: '카드 뒷면 정보를 지문에서 찾아 표시 → 비슷한 표현 찾으면 ✔ 체크',
      cards: this._buildDetailCards(sentences, backgrounds),
      takeaways: [
        '세부 정보를 지문에서 표시',
        '배경 설명을 한 줄로 요약'
      ]
    });

    // Step 5 Inference
    steps.push({
      step: 5,
      label: 'Step 5',
      title: 'Inference Lab',
      mood: '🧠',
      intro: '필자의 숨은 의도와 강조점을 스스로 설명해 보세요.',
      mission: '카드를 뒤집고 "왜?"라는 질문에 답하기 → 근거 문장 찾아 표시',
      cards: this._buildInferenceCards(authorsClaim, coreMessage, logicalFlow, toneAndStyle),
      takeaways: [
        '주장을 뒷받침하는 문장 2개 찾기',
        '필자의 어조를 설명하는 형용사 2개 적기'
      ]
    });

    // Step 6 Structure
    steps.push({
      step: 6,
      label: 'Step 6',
      title: 'Structure Mapping',
      mood: '🧩',
      intro: '글의 구조를 부분별로 정리해 보며 연결 고리를 이해합니다.',
      mission: '카드를 읽고 흐름을 그림으로 표현 → 각 단계 제목 붙여보기',
      cards: this._buildStructureCards(logicalFlow, sentences),
      takeaways: [
        '서론-전개-결론 구조로 정리',
        '각 구조 파트에 핵심 문장 적기'
      ]
    });

    // Step 7 Grammar
    steps.push({
      step: 7,
      label: 'Step 7',
      title: 'Grammar Clinic',
      mood: '✏️',
      intro: '지문에서 포착한 핵심 문법 패턴을 재확인합니다.',
      mission: '카드 내용을 참고해 같은 패턴으로 문장을 바꿔 보기 → 오류 없이 다시 쓰기',
      cards: this._buildGrammarCards(grammarPoints),
      takeaways: [
        '핵심 구문 2개 이상 나만의 문장으로 만들기',
        '수동태/관계절 등 문법 포인트 체크'
      ]
    });

    // Step 8 Expression
    steps.push({
      step: 8,
      label: 'Step 8',
      title: 'Expression Upgrade',
      mood: '💬',
      intro: '실제로 써먹을 만한 표현과 예시를 확보해 보세요.',
      mission: '카드 표현으로 회화/글쓰기 문장 1개씩 작성 → 친구에게 설명하듯 말하기',
      cards: this._buildExpressionCards(vocabularyPool, examples),
      takeaways: [
        '표현 2개 녹음하거나 말해보기',
        'SNS/에세이용 문장 초안 작성'
      ]
    });

    // Step 9 Quiz
    steps.push({
      step: 9,
      label: 'Step 9',
      title: 'Self-Check Quiz',
      mood: '📝',
      intro: 'O/X 형태로 내용을 점검하며 헷갈린 부분을 다시 복습합니다.',
      mission: '카드를 보고 답한 뒤, 근거 문장을 찾아 표시하기',
      cards: this._buildQuizCards({
        authorsClaim,
        koreanMainIdea,
        modernApps,
        englishSummaryKo
      }),
      takeaways: [
        '틀린 문제는 해당 Step으로 돌아가 복습',
        '정답 근거 문장을 지문에서 표시'
      ]
    });

    // Step 10 Reflection
    steps.push({
      step: 10,
      label: 'Step 10',
      title: 'Reflection & Action',
      mood: '🚀',
      intro: '학습 내용을 내 삶과 수업에 어떻게 연결할지 구체적으로 정리합니다.',
      mission: '카드 아이디어를 참고해 나만의 실천 계획 작성 → 다음 스터디에서 공유할 목표 만들기',
      cards: this._buildReflectionCards(modernApps, englishSummary, englishSummaryKo),
      takeaways: [
        '실천 아이디어 2가지 이상 작성',
        '다음 학습에서 시도할 목표 정하기'
      ]
    });

    return {
      title: `${document.title || '워크북'} · ${passageNumber}단계 학습`,
      description: koreanMainIdea || englishSummaryKo || '지문의 핵심 아이디어를 10단계로 정리한 워크북입니다.',
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
