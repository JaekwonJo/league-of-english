const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const database = require('../models/database');
const analysisService = require('../services/analysisService');

function createVariant(label) {
  const topicSentence = label === 1;
  const englishSentence = topicSentence
    ? '**Mentors guide anxious students with calm breathing cues.**'
    : 'They remind each learner to notice steady heartbeats before answering.';

  const korean = topicSentence
    ? '*** 한글 해석: 멘토가 불안한 학생들에게 차분한 호흡 신호를 주면서 마음을 안정시키도록 돕는 장면이에요. 학생도 이렇게 차분하게 연습할 수 있어요! 😊'
    : '*** 한글 해석: 대답하기 전에 심장이 일정하게 뛰는지를 살펴보라고 조심스럽게 알려 주는 모습이에요. 이렇게 하면 누구나 침착하게 답할 수 있어요! 😊';

  const analysis = topicSentence
    ? '*** 분석: 글은 따뜻한 멘토가 학생 곁에서 숨을 고르게 하며 긴장을 풀도록 도와준다고 말해요. 이런 장면을 떠올리면 독자가 왜 차분한 안내가 필요한지 자연스럽게 느끼게 되지요. 😊'
    : '*** 분석: 이어지는 문장은 학생에게 구체적인 행동 요령을 다시 알려 주면서 앞 문장의 조언을 실천하도록 이끌어요. 작은 습관을 반복하면 자신감이 커진다는 메시지를 강조하고 있어요. 😊';

  const background = topicSentence
    ? '*** 이 문장에 필요한 배경지식: 학교 상담 시간이나 심리 수업에서는 깊고 느린 호흡이 우리 몸의 긴장을 낮춰 준다고 배워요. 이런 원리를 알고 읽으면 문장을 더 잘 이해할 수 있답니다.'
    : '*** 이 문장에 필요한 배경지식: 생리학에서는 심박수를 살피는 행동이 자율신경계를 안정시키는 데 도움이 된다고 설명해요. 그래서 상담 장면에서 이런 안내가 자주 등장해요.';

  const example = topicSentence
    ? '*** 이 문장에 필요한 사례: 발표를 앞둔 친구의 손을 살짝 잡고 "같이 천천히 숨 쉬어 보자"라고 말하는 모습을 떠올려 보세요. 이렇게 구체적인 도움을 주면 금세 긴장이 풀려요. 🏫'
    : '*** 이 문장에 필요한 사례: 수학 시간에 어려운 문제를 풀기 전에 손을 가슴에 얹고 심장 박동을 느끼는 연습을 하면 집중력이 올라가요. 실제로 많은 학생들이 이 방법을 사용해요. 🏫';

  const grammar = topicSentence
    ? '✏️ 어법 포인트: guide 다음에 목적어와 to부정사 대신 with + 명사를 쓰면서 도구를 강조했어요. 분사구문처럼 보이지만 현재분사 guiding의 뉘앙스가 살아 있어 사건이 진행 중임을 느낄 수 있어요.'
    : '✏️ 어법 포인트: remind 다음에 목적어와 to부정사가 생략된 that절이 붙어 행동을 알려 줍니다. notice steady heartbeats는 형용사 steady가 heartbeats를 꾸며 안정감을 강조하는 표현이에요.';

  const vocabularyIntro = '*** 어휘 포인트: calm, reassure, steady 같은 낱말을 함께 익히면 마음을 안정시키는 장면을 쉽게 설명할 수 있어요! 😊';

  const vocabularyWords = [
    {
      term: 'calm',
      meaning: '마음을 잔잔하게 만들고 호흡을 고르게 하는 상태를 뜻해요.',
      synonyms: ['soothe', 'compose'],
      antonyms: ['agitate'],
      note: 'Calm down, Take a calm breath처럼 활용하면 친구를 다독이는 표현이 돼요.'
    },
    {
      term: 'steady',
      meaning: '흔들리지 않고 일정한 움직임을 유지하는 모습을 말해요.',
      synonyms: ['even', 'consistent'],
      antonyms: ['uneven'],
      note: 'steady rhythm, steady voice처럼 꾸준함을 나타내는 말과 자주 함께 쓰여요.'
    }
  ];

  const meta = {
    deepDive: {
      coreMessage: '이 분석본은 차분한 안내가 학생의 자신감을 키운다는 메시지를 반복해서 전하며 정서적 지지를 강조해요.',
      logicalFlow: '첫 문장에서 멘토의 차분한 행동을 소개하고, 이어지는 문장에서 구체적인 실천 방법을 보여 주어 독자가 바로 따라 할 수 있게 돕습니다.',
      toneAndStyle: '전체적으로 다정하고 격려하는 어조를 유지하면서 과학적 설명과 실천 팁을 함께 섞어 친근하게 안내합니다.'
    },
    englishTitles: [
      { title: 'Calm Mentors Lead the Way', korean: '차분한 멘토가 길잡이가 돼요', isQuestion: false },
      { title: 'Can Steady Breathing Lift Confidence?', korean: '꾸준한 호흡이 자신감을 높일까요?', isQuestion: true },
      { title: 'Trust Grows Through Gentle Coaching', korean: '다정한 코칭이 믿음을 키워요', isQuestion: false }
    ],
    koreanMainIdea: '멘토가 학생의 호흡을 바로잡고 구체적인 행동을 안내하면 긴장이 줄어들고 학습 자신감이 자연스럽게 자라난다는 점을 알려 줍니다.',
    authorsClaim: '정서적 안정은 가르침의 첫걸음이라는 주장으로, 섬세한 코칭이 있어야 학습자가 실력을 발휘할 수 있다는 메시지를 전합니다.',
    englishSummary: 'Supportive mentors model calm breathing cues so anxious students regain confidence and participate with steady focus in class discussions.',
    englishSummaryKorean: '따뜻한 멘토가 차분한 호흡 신호를 보여 주면 불안한 학생도 다시 집중력을 찾고 수업 대화에 자신 있게 참여하게 된다는 뜻이에요.',
    modernApplications: [
      '학급 회의 전에 교사가 짧은 호흡 명상을 이끌어 학생이 마음을 가다듬도록 돕는 활동을 시도해 보세요.',
      '상담 시간에는 심박을 느끼며 말을 시작하는 연습을 하게 하여 발표 불안을 줄이는 프로그램을 운영할 수 있어요.',
      '가정에서는 부모가 아이와 함께 “세 번 깊게 숨 쉬기” 의식을 만들고 중요한 대화를 시작하면 긴장이 풀립니다.'
    ]
  };

  return {
    passageNumber: 1,
    variantIndex: label,
    generatedAt: new Date().toISOString(),
    generator: 'test-suite',
    sentenceAnalysis: [
      {
        english: englishSentence,
        isTopicSentence: topicSentence,
        korean,
        analysis,
        background,
        example,
        grammar,
        vocabulary: { intro: vocabularyIntro, words: vocabularyWords }
      }
    ],
    meta
  };
}

test('analysisService removeVariant reindexes and cleans up passage analyses', async () => {
  const createdDb = !database.db;
  const suffix = Date.now();
  const relativeDbPath = createdDb ? `tmp/analysis-variant-${suffix}.sqlite` : null;
  let absoluteDbPath = null;
  let documentId = null;

  try {
    if (createdDb) {
      const tmpDir = path.join(__dirname, '..', '..', 'tmp');
      fs.mkdirSync(tmpDir, { recursive: true });
      process.env.DB_FILE = relativeDbPath;
      absoluteDbPath = path.join(__dirname, '..', relativeDbPath);
      await database.connect();
    }

    const content = JSON.stringify({ passages: ['Mentors guide anxious students with calm breathing cues.'] });
    const result = await database.run(
      `INSERT INTO documents (title, content, type, category, school, grade, created_by)
       VALUES (?, ?, 'reading', '테스트', '전체', 3, 1)`,
      [`테스트 문서 ${suffix}`, content]
    );
    documentId = result.id;

    const passageText = 'Mentors guide anxious students with calm breathing cues.';
    await analysisService.appendVariants(documentId, 1, passageText, [createVariant(1), createVariant(2)]);

    let analysis = await analysisService.getPassageAnalysis(documentId, 1);
    assert.equal(analysis.variants.length, 2);
    assert.deepEqual(analysis.variants.map((variant) => variant.variantIndex), [1, 2]);

    const removeFirst = await analysisService.removeVariant(documentId, 1, 1, 'admin', 1);
    assert.ok(removeFirst.success);
    assert.equal(removeFirst.data.variants.length, 1);
    assert.equal(removeFirst.data.variants[0].variantIndex, 1);

    const storedAfterFirst = await database.get(
      'SELECT variants FROM passage_analyses WHERE document_id = ? AND passage_number = ?',
      [documentId, 1]
    );
    assert.ok(storedAfterFirst);
    const parsedVariants = JSON.parse(storedAfterFirst.variants || '[]');
    assert.equal(parsedVariants.length, 1);

    const removeLast = await analysisService.removeVariant(documentId, 1, 1, 'admin', 1);
    assert.ok(removeLast.success);
    assert.equal(removeLast.data.variants.length, 0);

    const rowAfterCleanup = await database.get(
      'SELECT * FROM passage_analyses WHERE document_id = ? AND passage_number = ?',
      [documentId, 1]
    );
    assert.equal(rowAfterCleanup, null);
  } finally {
    if (documentId) {
      await database.run('DELETE FROM documents WHERE id = ?', [documentId]);
    }
    if (createdDb) {
      await database.close();
      if (absoluteDbPath && fs.existsSync(absoluteDbPath)) {
        fs.unlinkSync(absoluteDbPath);
      }
      delete process.env.DB_FILE;
    }
  }
});
