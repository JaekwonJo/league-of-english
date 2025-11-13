const { CIRCLED_DIGITS, ensureSourceLabel } = require('../services/ai-problem/shared');
const grammarBank = require('./fallbackGrammarData');
const vocabularyBank = require('./fallbackVocabularyData');
const {
  buildGrammarFallbackProblems,
  buildVocabularyFallbackProblems
} = require('./documentProblemFallback');

const rotationCursor = new Map();

const blankBank = [
  {
    docTitle: 'LoE 핵심 빈칸',
    question: '다음 빈칸에 들어갈 말로 가장 적절한 것은?',
    // 두 문장 이상, 실제 시험지처럼 문단 구성 + 구/절 단위 정답
    mainText:
      'Many teachers noticed that students progressed faster when they reflected at the end of each week. By writing a few lines about what confused them and what finally clicked, they built a habit of ____ that guided their next steps.',
    options: [
      '① setting clear study intentions',
      '② skipping review every weekend',
      '③ copying answers without thinking',
      '④ relying only on last-minute cramming'
    ],
    answer: '①',
    explanation:
      '글의 핵심은 “매주 되돌아보기”가 다음 학습을 이끄는 습관을 만든다는 점이에요. 따라서 (①) setting clear study intentions(공부 의도를 분명히 세우기)가 문맥에 맞아요. ② 주말 복습 건너뛰기, ③ 생각 없이 베끼기, ④ 벼락치기 의존은 “성찰 습관”과 반대되는 행동이에요. 😊',
    difficulty: 'basic'
  },
  {
    docTitle: 'LoE 핵심 빈칸',
    question: '다음 빈칸에 들어갈 말로 가장 적절한 것은?',
    mainText:
      'The club designed simple weekly challenges and encouraged everyone to share one small win. Over time, this practice helped the group focus on effort rather than perfection and created a culture of ____.',
    options: [
      '① celebrating consistent progress',
      '② arguing about who is best',
      '③ delaying tasks without reasons',
      '④ spending money on trophies only'
    ],
    answer: '①',
    explanation:
      '문단은 “완벽”보다 “노력의 꾸준함”을 강조해요. 그래서 (①) celebrating consistent progress(꾸준한 진전을 기뻐하기)가 가장 자연스러워요. 나머지는 경쟁만 부추기거나(②), 이유 없는 지연(③), 트로피에만 집중(④)처럼 본문 흐름과 어긋나요. ✨',
    difficulty: 'basic'
  },
  {
    docTitle: 'LoE 핵심 빈칸',
    question: '다음 빈칸에 들어갈 말로 가장 적절한 것은?',
    mainText:
      'When feedback is kind and specific, students feel brave enough to ask follow-up questions. In the next discussion, this often leads to deeper dialogue and a healthy habit of ____ among classmates.',
    options: [
      '① exploring ideas together',
      '② staying silent out of fear',
      '③ keeping distant from the group',
      '④ doubting every peer’s comment'
    ],
    answer: '①',
    explanation:
      '친절하고 구체적인 피드백은 “같이 생각을 탐구하는 분위기”를 만들어요. 따라서 (①) exploring ideas together(함께 아이디어 탐구하기)가 알맞습니다. ② 두려워 침묵/③ 거리두기/④ 과도한 의심은 본문 효과와 반대예요. 💡',
    difficulty: 'basic'
  }
];

const titleBank = [
  {
    docTitle: 'LoE 제목 마스터',
    question: '이 글의 제목으로 가장 알맞은 것은?',
    mainText: 'Students at the academy started a kindness wall where classmates post thank-you notes. Every week the wall fills with messages, reminding everyone that even small gestures make school warmer.',
    options: ['① Kind Notes That Brighten Our Day', '② The Strict Rules of Study Hall', '③ How to Win Every Competition', '④ The History of Ancient Kings'],
    answer: '①',
    explanation: '글의 핵심은 감사 메시지를 나누어 학교 분위기를 따뜻하게 만든다는 내용입니다.',
    difficulty: 'basic'
  },
  {
    docTitle: 'LoE 제목 마스터',
    question: '이 글의 제목으로 가장 적절한 것은?',
    mainText: 'After surveying classmates, the council introduced a silent reading morning once a week. Students reported starting classes feeling calmer and more focused.',
    options: ['① A Calmer Start to the School Day', '② Preparing for a Mountain Hike', '③ Reasons to Skip Breakfast', '④ The Science of Comets'],
    answer: '①',
    explanation: '조용한 아침 독서 시간이 학생들의 집중력을 높여준다는 점을 가장 잘 담고 있습니다.',
    difficulty: 'basic'
  }
];

const themeBank = [
  {
    docTitle: 'LoE 주제 마스터',
    question: '이 글의 주제로 가장 알맞은 것을 고르세요.',
    mainText: 'When the robotics team invited new members from different grades, collaboration improved. Mentors paired with beginners, and everyone celebrated the creative solutions that emerged.',
    options: ['① 협력은 다양한 아이디어를 모으게 한다', '② 대회는 승패만이 전부다', '③ 혼자 연습해야 실력이 는다', '④ 시간 계획은 의미가 없다'],
    answer: '①',
    explanation: '여러 학년이 함께 협력하면서 새로운 해결책을 찾아냈다는 내용이므로 협력의 힘이 주제입니다.',
    difficulty: 'basic'
  },
  {
    docTitle: 'LoE 주제 마스터',
    question: '이 글의 주제로 가장 적절한 것은?',
    mainText: 'A photography class partnered with a local shelter to capture adoption portraits. Students noticed how patient lighting and gentle conversation helped each animal relax.',
    options: ['① 세심한 관심은 마음을 놓이게 한다', '② 화려한 기술이 사진을 좌우한다', '③ 반려동물은 훈련이 어렵다', '④ 단체 프로젝트는 비효율적이다'],
    answer: '①',
    explanation: '사진 촬영에서 세심한 배려가 동물을 편안하게 해준다는 교훈이 중심입니다.',
    difficulty: 'basic'
  }
];

const orderBank = [
  {
    docTitle: 'LoE 순서 마스터',
    question: '다음 글에서 문장이 이어질 순서로 가장 적절한 것을 고르세요.',
    sentences: [
      { label: 'A', text: 'First, the service club surveyed classmates about helpful after-school programs.' },
      { label: 'B', text: 'Next, members invited local mentors who could support homework help sessions.' },
      { label: 'C', text: 'Finally, the club created a sign-up calendar and shared success stories online.' }
    ],
    options: ['① (A)-(B)-(C)', '② (A)-(C)-(B)', '③ (B)-(A)-(C)', '④ (C)-(A)-(B)', '⑤ (B)-(C)-(A)'],
    answer: '①',
    explanation: '조사 → 멘토 초대 → 홍보 순으로 전개되어야 자연스럽습니다.',
    difficulty: 'basic'
  },
  {
    docTitle: 'LoE 순서 마스터',
    question: '다음 글의 전개 순서로 알맞은 것을 고르세요.',
    sentences: [
      { label: 'A', text: 'Our eco-team listed simple classroom habits that reduce waste.' },
      { label: 'B', text: 'They piloted the ideas in three classes and collected reflections.' },
      { label: 'C', text: 'The team presented the positive results and invited every homeroom to join.' }
    ],
    options: ['① (A)-(B)-(C)', '② (A)-(C)-(B)', '③ (B)-(A)-(C)', '④ (B)-(C)-(A)', '⑤ (C)-(B)-(A)'],
    answer: '①',
    explanation: '습관 제안 → 시험 적용 → 전체 공유의 순서가 자연스럽기 때문입니다.',
    difficulty: 'basic'
  }
];

const insertionBank = [
  {
    docTitle: 'LoE 삽입 마스터',
    question: '윗글에 주어진 문장을 넣기에 가장 알맞은 곳은?',
    givenSentence: '또한 팀은 학부모와 지역 도서관을 초대해 협력 네트워크를 넓혔다.',
    mainText: '(1) The reading club started by pairing mentors with younger students.\n(2) Weekly check-ins kept everyone accountable and encouraged.\n(3) Soon, students wanted to invite more people who could recommend fresh books.\n(4) The growing team planned a mini book festival to celebrate.',
    options: ['① (1)과 (2) 사이', '② (2)와 (3) 사이', '③ (3)과 (4) 사이', '④ (4) 다음'],
    answer: '③',
    explanation: '네트워크를 확장했다는 문장은 (3)과 (4) 사이에 들어가야 흐름이 자연스럽습니다.',
    difficulty: 'basic'
  },
  {
    docTitle: 'LoE 삽입 마스터',
    question: '다음 글에 주어진 문장을 넣을 위치로 가장 적절한 곳은?',
    givenSentence: '그 덕분에 프로젝트는 다른 학년으로도 빠르게 확산되었다.',
    mainText: '(1) The science ambassadors created short experiment videos for younger students.\n(2) Teachers noticed that curiosity grew each time a new video was shared.\n(3) Many classes started requesting demonstrations during homeroom.\n(4) Some ambassadors began mentoring lab assistants after school.',
    options: ['① (1)과 (2) 사이', '② (2)와 (3) 사이', '③ (3)과 (4) 사이', '④ (4) 다음'],
    answer: '②',
    explanation: '관심이 높아지고 확산되었다는 내용은 (2) 바로 뒤에 들어가야 합니다.',
    difficulty: 'basic'
  }
];

function takeFromBank(type, bank, count) {
  const normalized = Math.max(1, Number(count) || 1);
  if (!Array.isArray(bank) || bank.length === 0) return [];
  const items = [];
  for (let i = 0; i < normalized; i += 1) {
    const idx = (rotationCursor.get(type) || 0) % bank.length;
    const template = bank[idx];
    rotationCursor.set(type, (idx + 1) % bank.length);
    items.push(template);
  }
  return items;
}

function buildGrammarProblems({ count = 1, docTitle, reasonTag }) {
  const templates = takeFromBank('grammar', grammarBank, count);
  return templates.map((template, index) => {
    const baseTitle = docTitle || template.docTitle || 'LoE 어법 마스터';
    const id = `${template.id || 'grammar_fallback'}_${Date.now()}_${index}`;
    const normalizedOptions = normalizeOptions(template.options);
    const templateType = template.type || (Array.isArray(template.answers) && template.answers.length > 1 ? 'grammar_multi' : 'grammar');
    const answerValue = template.answer
      || (template.correctAnswer ? String(template.correctAnswer) : null)
      || (Array.isArray(template.answers) ? template.answers.join(',') : null);
    const metadata = {
      generator: 'fallback',
      documentTitle: baseTitle,
      sourceDocTitle: template.docTitle,
      grammarPoint: template.grammarPoint,
      fallbackReason: reasonTag || 'fallback'
    };
    if (template.answerMarkers) {
      metadata.answerMarkers = template.answerMarkers;
    }
    if (template.sourceLabel) {
      metadata.sourceLabel = template.sourceLabel;
    }
    const questionVariant = template.questionVariant
      || (templateType === 'grammar_multi' ? 'multi' : 'single');

    return {
      id,
      type: templateType,
      question: template.question,
      questionVariant,
      mainText: template.mainText,
      text: template.mainText,
      options: normalizedOptions,
      answers: template.answers,
      answer: answerValue,
      correctAnswer: answerValue,
      explanation: template.explanation,
      difficulty: template.difficulty || 'advanced',
      metadata,
      sourceLabel: template.sourceLabel || baseTitle
    };
  });
}

function buildVocabularyProblems({ count = 1, docTitle, reasonTag }) {
  const templates = takeFromBank('vocabulary', vocabularyBank, count);
  return templates.map((template, index) => {
    const baseTitle = docTitle || template.docTitle || 'LoE 어휘 마스터';
    const id = `${template.id || 'vocab_fallback'}_${Date.now()}_${index}`;
    const normalizedOptions = normalizeOptions(template.options);
    const answerValue = template.answer
      || (template.correctAnswer ? String(template.correctAnswer) : null)
      || (Array.isArray(template.answers) ? template.answers.join(',') : null);
    const baseMetadata = {
      generator: 'fallback',
      documentTitle: baseTitle,
      sourceDocTitle: template.docTitle,
      vocabularyFocus: template.vocabularyFocus,
      fallbackReason: reasonTag || 'fallback'
    };
    const mergedMetadata = { ...template.metadata, ...baseMetadata };

    return {
      id,
      type: 'vocabulary',
      question: template.question,
      mainText: template.mainText,
      text: template.mainText,
      options: normalizedOptions,
      answer: answerValue,
      correctAnswer: answerValue,
      explanation: template.explanation,
      difficulty: template.difficulty || 'standard',
      slots: template.slots,
      metadata: mergedMetadata,
      sourceLabel: template.sourceLabel || baseTitle
    };
  });
}

function normalizeOptions(rawOptions = []) {
  const list = Array.isArray(rawOptions) ? rawOptions.slice(0, CIRCLED_DIGITS.length) : [];
  const padded = list.length ? list : ['① option A', '② option B', '③ option C', '④ option D'];
  return padded.map((text, index) => {
    const marker = CIRCLED_DIGITS[index] || `${index + 1}`;
    const trimmed = String(text || '').trim();
    if (!trimmed.startsWith('①') && !trimmed.startsWith('②') && !trimmed.startsWith('③') && !trimmed.startsWith('④') && !trimmed.startsWith('⑤')) {
      return `${marker} ${trimmed || `선택지 ${index + 1}`}`;
    }
    return trimmed;
  });
}

function buildSimpleBankProblems({ type, count = 1, bank, docTitle, reasonTag }) {
  const templates = takeFromBank(type, bank, count);
  return templates.map((template, index) => {
    const baseTitle = docTitle || template.docTitle || 'LoE 자료';
    const id = `${type}_fallback_${Date.now()}_${index}`;
    const options = template.options ? normalizeOptions(template.options) : undefined;
    return {
      id,
      type,
      question: template.question,
      mainText: template.mainText,
      text: template.mainText,
      options,
      answer: template.answer,
      correctAnswer: template.answer,
      explanation: template.explanation,
      difficulty: template.difficulty || 'basic',
      sentences: template.sentences,
      givenSentence: template.givenSentence,
      metadata: {
        generator: 'fallback',
        documentTitle: baseTitle,
        fallbackReason: reasonTag || 'fallback'
      },
      sourceLabel: baseTitle
    };
  });
}

async function _buildFallbackProblems({
  type,
  count = 1,
  docTitle,
  documentCode,
  reasonTag = 'fallback',
  passages,
  context
}) {
  if (!type) return [];
  const normalizedType = String(type);

  switch (normalizedType) {
    case 'grammar': {
      const docBased = await buildGrammarFallbackProblems({
        passages: context?.passages || passages || [],
        count,
        docTitle,
        reasonTag
      });
      if (docBased.length >= count) {
        return docBased;
      }
      const remaining = count - docBased.length;
      const bankProblems = buildGrammarProblems({ count: remaining, docTitle, reasonTag });
      return [...docBased, ...bankProblems];
    }
    case 'vocabulary': {
      const docBased = await buildVocabularyFallbackProblems({
        passages: context?.passages || passages || [],
        count,
        docTitle,
        reasonTag
      });
      if (docBased.length >= count) {
        return docBased;
      }
      const remaining = count - docBased.length;
      const bankProblems = buildVocabularyProblems({ count: remaining, docTitle, reasonTag });
      return [...docBased, ...bankProblems];
    }
    case 'blank':
      return buildSimpleBankProblems({ type: 'blank', count, bank: blankBank, docTitle, reasonTag });
    case 'title':
      return buildSimpleBankProblems({ type: 'title', count, bank: titleBank, docTitle, reasonTag });
    case 'theme':
      return buildSimpleBankProblems({ type: 'theme', count, bank: themeBank, docTitle, reasonTag });
    case 'order':
      return buildSimpleBankProblems({ type: 'order', count, bank: orderBank, docTitle, reasonTag });
    case 'insertion':
      return buildSimpleBankProblems({ type: 'insertion', count, bank: insertionBank, docTitle, reasonTag });
    default:
      return [];
  }
}

function applySourceLabels(problems, { docTitle, documentCode }) {
  if (!Array.isArray(problems)) return problems;
  return problems.map((problem, index) => {
    const contextTitle = docTitle || problem.metadata?.documentTitle || problem.sourceLabel || documentCode;
    const sequence = index + 1;
    const labeled = ensureSourceLabel(problem.sourceLabel, {
      docTitle: contextTitle,
      documentCode,
      sequence
    });
    return {
      ...problem,
      sourceLabel: labeled,
      metadata: {
        ...(problem.metadata || {}),
        sourceLabel: labeled,
        sequenceNo: sequence
      }
    };
  });
}

module.exports = {
  buildFallbackProblems: async (params) => {
    const list = await _buildFallbackProblems(params);
    return applySourceLabels(list, params || {});
  }
};
