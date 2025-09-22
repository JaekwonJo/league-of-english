const fs = require('fs');
const NewPDFParser = require('./server/utils/newPdfParser');
const { generateCSATGrammarProblem } = require('./server/utils/csatGrammarGenerator');
const ProblemGenerationUtils = require('./server/utils/problemGenerationUtils');

const VOCAB_SELECTION = {
  '1. p2-no.18': 'extend',
  '2. p2-no.19': 'audition',
  '3. p2-no.20': 'routine',
  '4. p3-no.21': 'borrow',
  '5. p3-no.22': 'meditative',
  '6. p3-no.23': 'phenomena',
  '7. p3-no.24': 'correlation',
  '8. p5-no.29': 'domesticated',
  '9. p5-no.30': 'hospitality',
  '10. p5-no.31': 'euphoria',
  '11. p5-no.32': 'accumulation',
  '12. p6-no.33': 'precise',
  '13. p6-no.34': 'infrastructure',
  '14. p6-no.35': 'autonomously',
  '15. p6-no.36': 'immobile',
  '16. p7-no.37': 'friction',
  '17. p7-no.38': 'nonlinear',
  '18. p7-no.39': 'consequences',
  '19. p7-no.40': 'preconceptions',
  '20. p8-no.41~42': 'defensive',
  '21. p8-no.43~45': 'determined'
};

const VOCAB_BANK = {
  extend: {
    options: ['길게 늘리다', '겉모습을 꾸미다', '즉시 멈추다', '모두 나누다'],
    answer: 1,
    explanation: '\"extend\"는 시간을 늘리거나 길게 하다라는 뜻입니다.'
  },
  audition: {
    options: ['배우나 가수를 뽑기 위한 시험', '완성된 공연', '관객의 박수', '무대 장치'],
    answer: 1,
    explanation: '\"audition\"은 역할을 얻기 위해 보는 시험을 의미합니다.'
  },
  routine: {
    options: ['늘 반복하는 일정한 과정', '갑작스러운 사건', '특별한 축제', '불규칙한 실수'],
    answer: 1,
    explanation: '\"routine\"은 습관처럼 반복되는 절차입니다.'
  },
  borrow: {
    options: ['빌려서 잠시 쓰다', '돈을 갚다', '영원히 소유하다', '새로 만들다'],
    answer: 1,
    explanation: '\"borrow\"는 남의 것을 빌려 잠시 쓰다의 의미입니다.'
  },
  meditative: {
    options: ['마음을 차분하게 하는', '시끄럽고 혼란스러운', '서두르는', '위험을 부르는'],
    answer: 1,
    explanation: '\"meditative\"는 명상하듯 마음을 차분하게 만드는 상태를 가리킵니다.'
  },
  phenomena: {
    options: ['일어나는 여러 가지 현상', '사람들의 기분', '우연한 실수', '작은 소문'],
    answer: 1,
    explanation: '\"phenomena\"는 관찰되는 여러 자연·사회 현상을 뜻합니다.'
  },
  correlation: {
    options: ['서로 관련되어 함께 변함', '완전히 분리됨', '무작위 추측', '느린 진행'],
    answer: 1,
    explanation: '\"correlation\"은 두 요소가 서로 연결되어 있다는 의미입니다.'
  },
  domesticated: {
    options: ['길들여져 사람이 기르기 쉬운', '야생으로 되돌아간', '갑자기 사라진', '병든'],
    answer: 1,
    explanation: '\"domesticated\"는 동물이 길들여져 집에서 기를 수 있음을 뜻합니다.'
  },
  hospitality: {
    options: ['따뜻하게 맞이하고 대접함', '엄격한 규칙', '거친 말투', '물건을 숨김'],
    answer: 1,
    explanation: '\"hospitality\"는 손님을 친절히 대접하는 태도입니다.'
  },
  euphoria: {
    options: ['큰 기쁨과 황홀감', '깊은 피로', '지루함', '걱정스러운 불안'],
    answer: 1,
    explanation: '\"euphoria\"는 매우 큰 기쁨과 들뜬 감정을 말합니다.'
  },
  accumulation: {
    options: ['차곡차곡 쌓임', '갑작스러운 폭발', '빠른 감소', '즉각적인 중단'],
    answer: 1,
    explanation: '\"accumulation\"은 어떤 것이 점점 쌓여 가는 것을 의미합니다.'
  },
  precise: {
    options: ['아주 정확한', '엉성하고 틀린', '느리고 게으른', '간신히 들리는'],
    answer: 1,
    explanation: '\"precise\"는 매우 정확하고 세밀한 상태를 뜻합니다.'
  },
  infrastructure: {
    options: ['기반이 되는 시설과 장치', '잠깐의 실수', '개인 취미', '불필요한 장식'],
    answer: 1,
    explanation: '\"infrastructure\"는 사회를 지탱하는 기본 시설을 말합니다.'
  },
  autonomously: {
    options: ['스스로 판단하여', '남이 시키는 대로만', '완전히 멈춰서', '무작위로'],
    answer: 1,
    explanation: '\"autonomously\"는 다른 사람 도움 없이 스스로 판단함을 뜻합니다.'
  },
  immobile: {
    options: ['거의 움직이지 않는', '빠르게 자라는', '소리를 크게 내는', '밝게 빛나는'],
    answer: 1,
    explanation: '\"immobile\"은 움직이지 않고 가만히 있는 상태입니다.'
  },
  friction: {
    options: ['서로 비벼져 움직임을 막는 힘', '빛을 내는 에너지', '소리를 키우는 장치', '공기를 차단하는 막'],
    answer: 1,
    explanation: '\"friction\"은 물체끼리 문질러져 움직임을 방해하는 힘입니다.'
  },
  nonlinear: {
    options: ['순서대로 한 줄로 진행되지 않는', '항상 같은 속도로 움직이는', '빛을 이용한', '자연에서만 쓰이는'],
    answer: 1,
    explanation: '\"nonlinear\"는 정해진 순서대로 이어지지 않는 방식을 의미합니다.'
  },
  consequences: {
    options: ['어떤 행동 뒤에 따라오는 결과', '사전에 세운 계획', '일시적인 기분', '무의미한 소음'],
    answer: 1,
    explanation: '\"consequences\"는 어떤 행동으로 인해 생기는 결과입니다.'
  },
  preconceptions: {
    options: ['미리 갖고 있는 생각이나 선입견', '새로운 발명품', '자연 풍경', '정확한 측정값'],
    answer: 1,
    explanation: '\"preconceptions\"는 경험하기 전에 미리 품은 선입견을 뜻합니다.'
  },
  defensive: {
    options: ['스스로를 지키려는 태도', '기쁜 감정을 표현함', '남을 돕고 격려함', '느긋하게 쉬는 모습'],
    answer: 1,
    explanation: '\"defensive\"는 스스로를 보호하려는 태도를 말합니다.'
  },
  determined: {
    options: ['굳게 마음을 먹은', '우연히 지나가는', '겁에 질린', '쉽게 포기하는'],
    answer: 1,
    explanation: '\"determined\"는 해야겠다고 굳게 마음먹은 상태입니다.'
  }
};

const SUMMARY_BANK = {
  '1. p2-no.18': {
    options: [
      '학생회장이 도서관 운영 시간을 늘려 달라고 정중히 건의한다.',
      '도서관을 폐쇄해야 한다고 주장한다.',
      '학교 급식 메뉴를 바꾸자는 내용이다.',
      '학생회 선거 공약을 홍보하는 글이다.'
    ],
    answer: 1,
    explanation: '편지는 도서관 운영 시간을 오후 7시까지 연장해 달라는 요청이다.'
  },
  '2. p2-no.19': {
    options: [
      '첫 오디션 결과를 초조하게 기다리다 작은 역할에 합격하는 이야기다.',
      '무대에서 실수하여 탈락하는 장면이다.',
      '친구와 갈등을 해결하는 대화이다.',
      '새로운 공연을 직접 연출하는 이야기다.'
    ],
    answer: 1,
    explanation: '전화로 오디션 결과를 듣고 조연 역할에 합격하는 이야기다.'
  },
  '3. p2-no.20': {
    options: [
      '수업 시작 10분 루틴이 수업 분위기를 결정한다는 조언이다.',
      '학생들이 스스로 수업을 마무리해야 한다는 주장이다.',
      '체벌의 교육 효과를 설명한다.',
      '숙제를 줄여야 한다는 설득 편지다.'
    ],
    answer: 1,
    explanation: '첫 몇 분의 준비 루틴이 수업 집중도를 높인다고 강조한다.'
  },
  '4. p3-no.21': {
    options: [
      '우리 몸의 원자는 우주만큼 오래되어 서로 빌려 쓰고 있다고 설명한다.',
      '원자는 한 번 쓰면 사라진다고 주장한다.',
      '인간이 스스로 원자를 만들어 낸다고 말한다.',
      '지구 나이가 최근에서야 밝혀졌다고 주장한다.'
    ],
    answer: 1,
    explanation: '원자는 돌고 돌아 모두가 함께 빌려 쓰는 자원이라고 설명한다.'
  },
  '5. p3-no.22': {
    options: [
      '정원 가꾸기가 신체 건강과 마음 건강 모두에 도움이 된다고 말한다.',
      '정원 가꾸기는 시간 낭비이니 하지 말아야 한다고 권한다.',
      '정원 가꾸기는 전문가만 할 수 있다고 강조한다.',
      '정원 가꾸기는 오히려 불안을 키운다고 주장한다.'
    ],
    answer: 1,
    explanation: '정원 가꾸기가 운동이 되고 마음을 안정시킨다고 소개한다.'
  },
  '6. p3-no.23': {
    options: [
      '인간이 감각으로 느끼지 못하는 현상을 도구로 관찰해 왔음을 설명한다.',
      '감각을 쓰지 않아야 더 잘 배울 수 있다고 주장한다.',
      '과학 도구가 인간을 혼란스럽게 만든다고 경고한다.',
      '현대 기술은 자연 현상을 왜곡한다고 비판한다.'
    ],
    answer: 1,
    explanation: '도구가 감각을 확장해 보이지 않던 현상을 보게 해 준다고 설명한다.'
  },
  '7. p3-no.24': {
    options: [
      '동물실험과 의학 발전의 상관관계가 법적 요구 때문에 나타난 것이라고 비판한다.',
      '동물실험이 모든 의학 발전의 유일한 원인이라고 주장한다.',
      '의사들이 동물실험을 완전히 중단해야 한다고 주장한다.',
      '동물실험이 최근 들어 새롭게 시작되었다고 소개한다.'
    ],
    answer: 1,
    explanation: '법 때문에 실험이 선행되었을 뿐 인과관계 증거는 아니라고 반박한다.'
  },
  '8. p5-no.29': {
    options: [
      '가젤처럼 겁 많은 동물은 너무 예민해서 가축으로 길들이기 어렵다고 설명한다.',
      '모든 초식동물은 쉽게 길들여진다고 말한다.',
      '인간이 가젤을 길들이는 데 성공했다고 축하한다.',
      '육식동물이 초식동물을 지켜 준다는 이야기다.'
    ],
    answer: 1,
    explanation: '겁이 많고 빠른 종은 갇히면 패닉에 빠져 가축화가 어렵다고 설명한다.'
  },
  '9. p5-no.30': {
    options: [
      '풍족해지면 나누려는 마음이 줄어들어 관계가 멀어진다고 지적한다.',
      '부자가 되면 모두 더 많이 베풀게 된다고 말한다.',
      '부족할수록 이기심이 커진다고 주장한다.',
      '유목민은 낯선 이를 거절한다고 설명한다.'
    ],
    answer: 1,
    explanation: '부족할 땐 나눔이 필요하지만 풍족하면 오히려 벽을 만든다고 말한다.'
  },
  '10. p5-no.31': {
    options: [
      '사람은 좋은 일과 나쁜 일에 적응하며 다시 평소의 기분으로 돌아온다고 말한다.',
      '기쁨은 한 번 느끼면 영원히 유지된다고 주장한다.',
      '슬픔은 시간이 지나도 결코 사라지지 않는다고 강조한다.',
      '감정은 주변 사람에게 전혀 영향을 받지 않는다고 말한다.'
    ],
    answer: 1,
    explanation: '행복과 슬픔 모두 시간이 지나면 기본 수준으로 되돌아간다고 설명한다.'
  },
  '11. p5-no.32': {
    options: [
      '아데노신이 쌓이면 잠이 부족하다는 신호를 보내 잠을 자게 만든다고 설명한다.',
      '잠은 마음먹기에 따라 완전히 없앨 수 있다고 말한다.',
      '카페인이 잠의 필요성을 완전히 없앤다고 주장한다.',
      '잠을 줄이면 몸이 자동으로 적응한다고 말한다.'
    ],
    answer: 1,
    explanation: '아데노신 축적으로 인해 잠 부족을 채우려 한다고 소개한다.'
  },
  '12. p6-no.33': {
    options: [
      '수치의 정확성은 사용 목적에 따라 다르게 느껴진다고 설명한다.',
      '태양까지의 거리가 정확히 측정되었다고 자랑한다.',
      '불확실성을 줄이려면 숫자를 버려야 한다고 주장한다.',
      '도시 사이 거리는 중요하지 않다고 말한다.'
    ],
    answer: 1,
    explanation: '정밀도는 활용 목적에 따라 다르게 받아들여진다고 강조한다.'
  },
  '13. p6-no.34': {
    options: [
      '재생에너지로 전환하려면 많은 기반 시설을 짓는 동안 화석연료를 더 써야 한다고 지적한다.',
      '재생에너지는 돈이 거의 들지 않는다고 주장한다.',
      '화석연료 사용은 이미 완전히 중단되었다고 소개한다.',
      '재생에너지 설비는 스스로 자라난다고 설명한다.'
    ],
    answer: 1,
    explanation: '전환 공사에 드는 에너지와 비용을 함께 계산해야 한다고 경고한다.'
  },
  '14. p6-no.35': {
    options: [
      '오래전부터 인간은 사람처럼 생각하는 기계를 꿈꿔 왔다고 소개한다.',
      '로봇은 최근에서야 처음 상상되었다고 말한다.',
      '튜링은 기계가 생각할 수 없다고 선언했다고 말한다.',
      '인공지능은 인간의 감정을 없애는 기술이라고 주장한다.'
    ],
    answer: 1,
    explanation: '옛 신화부터 현대 연구까지 인간이 지능형 기계를 상상해 왔다고 정리한다.'
  },
  '15. p6-no.36': {
    options: [
      '사막 거북이는 물을 저장하는 방광 덕분에 오랫동안 버틴다고 설명한다.',
      '사막 거북이는 더위를 피해 강으로 이주한다고 말한다.',
      '거북이는 사람 도움 없이는 비를 모을 수 없다고 주장한다.',
      '거북이는 여름마다 잠을 자지 않는다고 소개한다.'
    ],
    answer: 1,
    explanation: '거북이는 방광에 물을 저장하므로 함부로 들어 올리면 안 된다고 당부한다.'
  },
  '16. p7-no.37': {
    options: [
      '자전거가 서서히 멈추는 이유를 마찰력으로 쉽게 설명한다.',
      '자전거는 힘이 없어도 항상 같은 속도로 달린다고 말한다.',
      '바람은 자전거를 도와 더 빨라지게 한다고 주장한다.',
      '브레이크는 공기를 식히기 위한 장치라고 설명한다.'
    ],
    answer: 1,
    explanation: '브레이크와 공기 저항 등 마찰력이 속도를 줄인다고 설명한다.'
  },
  '17. p7-no.38': {
    options: [
      '비선형 편집 시스템은 원하는 장면을 바로 찾아 고칠 수 있다고 설명한다.',
      '비선형 편집은 필름을 반드시 처음부터 끝까지 다시 찍어야 한다고 말한다.',
      '디지털 편집은 종이보다 느리다고 주장한다.',
      '비선형 편집은 효과를 전혀 넣을 수 없다고 설명한다.'
    ],
    answer: 1,
    explanation: '비선형 편집은 랜덤 접근과 편리한 수정이 가능하다고 소개한다.'
  },
  '18. p7-no.39': {
    options: [
      '도덕적으로 좋은 사람은 의도와 결과 모두에서 남보다 더 선해야 한다고 설명한다.',
      '착한 마음만 있으면 행동은 중요하지 않다고 말한다.',
      '실수로 도운 사람도 무조건 도덕적으로 선하다고 말한다.',
      '결과만 좋으면 의도는 전혀 상관없다고 주장한다.'
    ],
    answer: 1,
    explanation: '좋은 의도와 실제 행동 결과가 모두 필요하다고 이야기한다.'
  },
  '19. p7-no.40': {
    options: [
      '우리는 물건과의 기능적 관계 때문에 선입견을 갖고 본다고 설명한다.',
      '사진은 사람보다 더 왜곡한다고 주장한다.',
      '사람의 눈은 항상 카메라와 똑같이 본다고 말한다.',
      '사람은 어떤 물체도 미리 떠올리지 못한다고 말한다.'
    ],
    answer: 1,
    explanation: '선입견이 시야를 제한해 카메라처럼 객관적으로 보기 어렵다고 말한다.'
  },
  '20. p8-no.41~42': {
    options: [
      '“May I help you?”라는 질문이 고객을 방어적으로 만들어 판매를 막을 수 있다고 설명한다.',
      '“May I help you?”는 고객을 가장 행복하게 만든다고 주장한다.',
      '판매원은 말을 아끼는 것이 최선이라고 말한다.',
      '모든 고객은 도움을 받기 싫어한다고 강조한다.'
    ],
    answer: 1,
    explanation: '형식적인 인사보다 열린 질문이 고객을 편안하게 한다고 조언한다.'
  },
  '21. p8-no.43~45': {
    options: [
      '자신을 비웃는 상황에서도 끝까지 포기하지 않은 소년과 그를 도운 선배의 따뜻함을 전한다.',
      '돈을 잃어버린 학생이 경찰에 신고하는 장면이다.',
      '복도에서 다툰 학생들이 벌을 받는 이야기다.',
      '교사가 학생에게 과제를 내주는 장면이다.'
    ],
    answer: 1,
    explanation: '포기하지 않는 마음과 작은 친절이 주는 위로를 담은 이야기다.'
  }
};

function underlineWord(passage, word) {
  const regex = new RegExp(`\\b(${word})\\b`, 'i');
  if (!regex.test(passage)) return passage;
  return passage.replace(regex, (match) => `<u>${match}</u>`);
}

(async () => {
  try {
    const rawText = fs.readFileSync('tmp_pdf_text.txt', 'utf8');
    const parser = new NewPDFParser();
    const parsed = await parser.parse(rawText);

    const grammarProblems = [];
    const vocabularyProblems = [];
    const summaryProblems = [];
    const failures = [];

    parsed.passages.forEach((passage, index) => {
      const source = parsed.sources[index] || `Passage ${index + 1}`;

      // Grammar
      try {
        const grammar = generateCSATGrammarProblem(passage, { seed: index + 1 });
        grammar.metadata = {
          ...(grammar.metadata || {}),
          source,
          passageIndex: index + 1
        };
        grammarProblems.push(grammar);
      } catch (err) {
        failures.push({ type: 'grammar', source, reason: err.message });
      }

      // Vocabulary
      const vocabKey = VOCAB_SELECTION[source];
      if (vocabKey && VOCAB_BANK[vocabKey]) {
        const vocabInfo = VOCAB_BANK[vocabKey];
        const questionText = underlineWord(passage, vocabKey);
        vocabularyProblems.push({
          type: 'vocabulary',
          question: '문맥상 밑줄 친 단어와 의미가 가장 가까운 것은?',
          text: questionText,
          options: vocabInfo.options,
          answer: String(vocabInfo.answer),
          explanation: vocabInfo.explanation,
          metadata: {
            word: vocabKey,
            source,
            passageIndex: index + 1
          }
        });
      } else {
        failures.push({ type: 'vocabulary', source, reason: '사전 매칭 단어 없음' });
      }

      // Summary
      const summaryInfo = SUMMARY_BANK[source];
      if (summaryInfo) {
        summaryProblems.push({
          type: 'summary',
          question: '다음 글의 요지로 가장 적절한 것은?',
          mainText: passage,
          options: summaryInfo.options,
          answer: String(summaryInfo.answer),
          explanation: summaryInfo.explanation,
          metadata: {
            source,
            passageIndex: index + 1
          }
        });
      } else {
        failures.push({ type: 'summary', source, reason: '요약 문항 데이터 없음' });
      }
    });

    const output = {
      documentTitle: parsed.title,
      generatedAt: new Date().toISOString(),
      counts: {
        grammar: grammarProblems.length,
        vocabulary: vocabularyProblems.length,
        summary: summaryProblems.length
      },
      grammar: grammarProblems,
      vocabulary: vocabularyProblems,
      summary: summaryProblems,
      failures
    };

    fs.writeFileSync('generated_additional_problems.json', JSON.stringify(output, null, 2), 'utf8');
    console.log(`Grammar ${grammarProblems.length}, Vocabulary ${vocabularyProblems.length}, Summary ${summaryProblems.length}. Failures: ${failures.length}`);
  } catch (error) {
    console.error('Failed to generate additional problems:', error);
    process.exit(1);
  }
})();
