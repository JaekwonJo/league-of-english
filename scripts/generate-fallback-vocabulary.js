#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { CIRCLED_DIGITS } = require('../server/services/ai-problem/shared');
const { VOCAB_USAGE_BASE_QUESTION } = require('../server/services/ai-problem/vocabulary');

const OUTPUT_PATH = path.resolve('server/utils/data/fallback-vocabulary.json');

const ENTRIES = [
  {
    idSuffix: 'coordination',
    contextSummary: '이 글은 멘토링 행사 준비 과정을 시간대별로 정리한 안내문이에요.',
    passageTemplate: `During the mentoring hour, Mina gathered the volunteers, reviewed the updated checklist, and confirmed each supply delivery. She reminded the group to {{1}}, asked the logistics team to {{2}}, and scheduled a final call to {{3}}. Later that evening, she texted parents to {{4}} and prepared healthy snacks to {{5}}.`,
    segments: [
      {
        text: 'submit the safety forms',
        status: 'correct',
        reason: '행사 전에 필요한 안전 서류를 제출하라는 자연스러운 지시입니다.'
      },
      {
        text: 'double-check the time slots',
        status: 'correct',
        reason: '행사 시간표를 다시 확인해 달라는 요청이라 상황에 잘 맞아요.'
      },
      {
        text: 'collide the bus arrivals',
        status: 'incorrect',
        correction: 'coordinate the bus arrivals',
        reason: 'collide는 "충돌시키다"라는 뜻이라 버스 도착을 조율한다는 문맥과 어울리지 않아요.'
      },
      {
        text: 'confirm attendance',
        status: 'correct',
        reason: '참석 여부를 확인하는 자연스러운 표현입니다.'
      },
      {
        text: 'energize the helpers',
        status: 'correct',
        reason: '도움을 주는 학생들을 격려하려는 자연스러운 표현이에요.'
      }
    ],
    correctSummary: '자원봉사자들이 맡은 일을 정리하는 흐름에 꼭 맞는 표현이에요.',
    extraExplanation: '전체 단락은 준비, 연락, 격려의 순서로 진행되어 계획적인 분위기를 강조하고 있어요.',
    focus: '학교 행사 준비'
  },
  {
    idSuffix: 'science-fair',
    contextSummary: '과학 전시회를 준비하는 위원회가 역할을 점검하는 안내문이에요.',
    passageTemplate: `The science fair committee met after school to finalize the demonstration schedule. The chairperson asked presenters to {{1}}, reminded the media team to {{2}}, and assigned the stage crew to {{3}}. In addition, she encouraged newcomers to {{4}} and promised that mentors would {{5}} throughout the event.`,
    segments: [
      {
        text: 'highlight the safety cautions',
        status: 'correct',
        reason: '관람객에게 안전 수칙을 강조하는 표현이라 전시 운영과 잘 맞습니다.'
      },
      {
        text: 'calibrate the microphone levels',
        status: 'correct',
        reason: '발표 음향을 맞추는 실제 업무이기 때문에 자연스러운 표현이에요.'
      },
      {
        text: 'dismantle the visitor guide',
        status: 'incorrect',
        correction: 'distribute the visitor guide',
        reason: 'dismantle은 "해체하다"라는 뜻이라 안내 책자를 배포한다는 문맥에 어울리지 않아요.'
      },
      {
        text: 'practice their timing',
        status: 'correct',
        reason: '발표 시간을 연습하라는 요청이므로 전시 준비와 잘 연결돼요.'
      },
      {
        text: 'assist nervous students',
        status: 'correct',
        reason: '긴장한 학생을 도와준다는 표현이라 행사 운영 취지에 맞습니다.'
      }
    ],
    correctSummary: '나머지 표현은 발표 준비와 지원 과정에 자연스럽게 사용돼요.',
    extraExplanation: '위원회가 세부 역할을 나누며 실전에서 실수하지 않도록 돕는다는 점을 강조합니다.',
    focus: '과학 전시 준비'
  },
  {
    idSuffix: 'study-session',
    contextSummary: '중간고사 대비 스터디가 진행되는 모습을 담은 안내 글이에요.',
    passageTemplate: `Before the midterm study session, the class leaders summarized the plan on the whiteboard. They agreed to {{1}}, rotated partners to {{2}}, and reminded everyone not to {{3}}. Afterwards, students volunteered to {{4}} and set phone alarms to {{5}}.`,
    segments: [
      {
        text: 'summarize the key formulas',
        status: 'correct',
        reason: '핵심 공식을 정리하는 표현이라 수학 스터디와 잘 맞습니다.'
      },
      {
        text: 'organize the sample problems',
        status: 'correct',
        reason: '예제 문제를 정리하는 행동이라 학습 준비와 어울립니다.'
      },
      {
        text: "ignore the teacher's hints",
        status: 'incorrect',
        correction: "apply the teacher's hints",
        reason: 'ignore는 "무시하다"라서 힌트를 잘 활용하자는 취지와 충돌해요.'
      },
      {
        text: 'share helpful mnemonics',
        status: 'correct',
        reason: '암기법을 나누자는 제안이라 스터디 분위기에 자연스럽습니다.'
      },
      {
        text: 'schedule short breaks',
        status: 'correct',
        reason: '짧은 휴식 시간을 잡자는 표현으로 집중을 돕는 자연스러운 문장입니다.'
      }
    ],
    correctSummary: '다른 선택지는 학습 계획에 실제로 도움이 되는 자연스러운 조언이에요.',
    extraExplanation: '스터디 리더들이 협력과 집중을 동시에 챙기려는 노력을 보여 줍니다.',
    focus: '학습 전략'
  },
  {
    idSuffix: 'newspaper',
    contextSummary: '학교 신문 동아리가 기사 발간 직전에 확인하는 절차를 보여줘요.',
    passageTemplate: `On deadline night, the school newspaper team surrounded the layout table and checked every page. The editor-in-chief asked reporters to {{1}}, reminded analysts to {{2}}, and warned interns not to {{3}}. Meanwhile, the design team stayed late to {{4}} and the web editor prepared to {{5}} before sunrise.`,
    segments: [
      {
        text: 'verify the interview quotes',
        status: 'correct',
        reason: '인터뷰 인용을 확인하는 일은 기사 작성에 꼭 필요한 절차입니다.'
      },
      {
        text: 'fact-check the statistics',
        status: 'correct',
        reason: '통계를 검증하는 행동이라 언론 제작 문맥과 잘 맞습니다.'
      },
      {
        text: 'fabricate the expert sources',
        status: 'incorrect',
        correction: 'clarify the expert sources',
        reason: 'fabricate는 "조작하다"라는 의미라 신뢰를 강조하는 흐름과 정반대예요.'
      },
      {
        text: 'edit the layout draft',
        status: 'correct',
        reason: '지면 레이아웃을 다듬는 표현이라 마감 작업에 자연스럽습니다.'
      },
      {
        text: 'upload the final issue',
        status: 'correct',
        reason: '최종 호를 업로드한다는 문장도 업무 순서를 잘 보여 줍니다.'
      }
    ],
    correctSummary: '정확성과 품질을 지키려는 실제 업무 단계라 자연스럽습니다.',
    extraExplanation: '동아리는 사실 확인과 윤리성을 강조하며 책임감 있게 기사를 발행하려고 합니다.',
    focus: '신문 제작'
  },
  {
    idSuffix: 'green-campaign',
    contextSummary: '환경 동아리가 지역 캠페인을 준비하며 임무를 나누는 내용이에요.',
    passageTemplate: `For the weekend sustainability drive, the eco-club created a shared checklist and message board. The outreach captain volunteered to {{1}}, asked the mapping team to {{2}}, and reminded everyone not to {{3}}. Later, student leaders promised to {{4}} and art students stayed late to {{5}}.`,
    segments: [
      {
        text: 'collect neighborhood surveys',
        status: 'correct',
        reason: '주민 설문을 수집한다는 표현이라 캠페인 준비와 딱 맞아요.'
      },
      {
        text: 'map the recycling drop-offs',
        status: 'correct',
        reason: '재활용 수거 지점을 지도에 표시한다는 실제 활동을 말합니다.'
      },
      {
        text: 'pollute the riverbank cleanup',
        status: 'incorrect',
        correction: 'promote the riverbank cleanup',
        reason: 'pollute는 "오염시키다"라서 환경 보호 취지와 정반대 의미예요.'
      },
      {
        text: 'email local supporters',
        status: 'correct',
        reason: '지역 후원자에게 이메일을 보낸다는 자연스러운 표현입니다.'
      },
      {
        text: 'prepare bilingual posters',
        status: 'correct',
        reason: '2개 국어 홍보물을 준비한다는 말이라 캠페인 확산과 잘 맞습니다.'
      }
    ],
    correctSummary: '나머지 표현은 환경 캠페인을 알리고 돕는 실제 활동이에요.',
    extraExplanation: '동아리는 여러 언어와 채널을 활용해 주민 참여를 이끌려는 전략을 세우고 있어요.',
    focus: '환경 캠페인'
  },
  {
    idSuffix: 'art-festival',
    contextSummary: '학교 예술제를 준비하며 분야별로 점검하는 진행표예요.',
    passageTemplate: `As the art festival approached, the planning board reviewed each milestone. Coordinators met to {{1}}, gallery assistants rushed to {{2}}, and lighting students avoided instructions that told them to {{3}}. Meanwhile, hospitality volunteers agreed to {{4}} and the accessibility team promised to {{5}} before the doors opened.`,
    segments: [
      {
        text: 'coordinate student performers',
        status: 'correct',
        reason: '학생 공연자들을 조율한다는 표현이라 행사 진행과 맞아요.'
      },
      {
        text: 'label the gallery pieces',
        status: 'correct',
        reason: '전시 작품에 라벨을 붙이는 일이라 준비 과정에 어울립니다.'
      },
      {
        text: 'disturb the lighting plan',
        status: 'incorrect',
        correction: 'adjust the lighting plan',
        reason: 'disturb는 "방해하다"라서 조명 계획을 세밀하게 조정하자는 맥락과 어긋나요.'
      },
      {
        text: 'train the ushers',
        status: 'correct',
        reason: '안내 요원을 교육한다는 표현이라 관객 맞이를 준비하는 자연스러운 단계입니다.'
      },
      {
        text: 'review the accessibility options',
        status: 'correct',
        reason: '접근성 옵션을 점검한다는 문장으로 Inclusivity를 강조하고 있어요.'
      }
    ],
    correctSummary: '다른 표현은 공연 운영을 원활하게 만들기 위한 실제 준비예요.',
    extraExplanation: '각 팀이 역할을 나눠 관객 경험을 세심하게 챙기려는 목표가 드러납니다.',
    focus: '예술제 준비'
  },
  {
    idSuffix: 'career-day',
    contextSummary: '진로 박람회를 앞두고 운영팀이 체크리스트를 점검하는 장면이에요.',
    passageTemplate: `In the final briefing for career day, coordinators posted a timeline on the projector. The logistics lead moved quickly to {{1}}, registration aides volunteered to {{2}}, and supervisors cautioned interns not to {{3}}. Guides practiced how they would {{4}} and survey captains planned to {{5}} after each session.`,
    segments: [
      {
        text: 'confirm the guest speakers',
        status: 'correct',
        reason: '초청 연사를 확정한다는 표현이라 행사 진행에 꼭 필요합니다.'
      },
      {
        text: 'prepare welcome packets',
        status: 'correct',
        reason: '환영 자료를 준비하는 일도 현장에서 쓰이는 자연스러운 업무예요.'
      },
      {
        text: 'misplace the schedule boards',
        status: 'incorrect',
        correction: 'display the schedule boards',
        reason: 'misplace는 "엉뚱한 데 두다"라서 안내판을 전시한다는 취지와 반대로 쓰였어요.'
      },
      {
        text: 'guide students between rooms',
        status: 'correct',
        reason: '학생들을 이동 안내한다는 표현이라 운영 흐름에 맞습니다.'
      },
      {
        text: 'collect feedback forms',
        status: 'correct',
        reason: '설문지를 수거해 평가한다는 업무라 사후 관리와 자연스럽게 이어집니다.'
      }
    ],
    correctSummary: '다른 선택지는 박람회 운영 절차를 차근히 설명해 주는 표현이에요.',
    extraExplanation: '행사 후 피드백까지 챙기려는 체계적인 계획이 드러나요.',
    focus: '진로 박람회'
  },
  {
    idSuffix: 'robotics',
    contextSummary: '로봇 동아리가 대회 전 점검표를 확인하는 안내문이에요.',
    passageTemplate: `During the final robotics scrimmage, teammates reviewed the diagnostics projected on the lab screen. Mechanics volunteered to {{1}}, programmers promised to {{2}}, and the safety captain warned everyone not to {{3}}. The documentation crew stayed to {{4}} and the power unit rotated students so they could {{5}} before sunrise.`,
    segments: [
      {
        text: 'test the drive modules',
        status: 'correct',
        reason: '주행 모듈을 테스트하는 일이라 경기 준비와 딱 맞아요.'
      },
      {
        text: 'update the firmware logs',
        status: 'correct',
        reason: '펌웨어 기록을 갱신한다는 표현은 기술팀 업무에 자연스럽습니다.'
      },
      {
        text: 'ignore the safety protocol',
        status: 'incorrect',
        correction: 'follow the safety protocol',
        reason: 'safety protocol을 무시하는 것은 모범적인 안내문 취지와 반대 의미예요.'
      },
      {
        text: 'document the calibration steps',
        status: 'correct',
        reason: '조정 절차를 기록한다는 문장이라 팀 지식 공유에 도움이 됩니다.'
      },
      {
        text: 'charge the backup batteries',
        status: 'correct',
        reason: '예비 배터리를 충전한다는 표현도 경기 준비에 꼭 필요합니다.'
      }
    ],
    correctSummary: '나머지 표현은 로봇 팀이 대회를 준비할 때 실제로 수행하는 점검이에요.',
    extraExplanation: '안전 수칙을 강조해 동아리 활동이 책임감 있게 진행되도록 유도합니다.',
    focus: '로봇 대회'
  },
  {
    idSuffix: 'musical',
    contextSummary: '학교 뮤지컬 스태프가 게릴라 리허설을 준비하는 장면을 보여줘요.',
    passageTemplate: `On the eve of the dress rehearsal, the musical staff huddled backstage with updated cue sheets. Vocal coaches asked ensemble members to {{1}}, costume managers hurried to {{2}}, and stage directors reminded crew members not to {{3}}. Afterwards, assistant directors stayed to {{4}} while prop leaders promised to {{5}} before curtain call.`,
    segments: [
      {
        text: 'rehearse the group harmonies',
        status: 'correct',
        reason: '합창 하모니를 연습하라는 표현이라 공연 준비와 잘 맞아요.'
      },
      {
        text: 'adjust the costume fittings',
        status: 'correct',
        reason: '의상 핏을 조정하는 일이라 마지막 점검 단계에 자연스럽습니다.'
      },
      {
        text: 'derail the cue sheet sequence',
        status: 'incorrect',
        correction: 'refine the cue sheet sequence',
        reason: 'derail은 "탈선시키다"라서 큐시트를 정교하게 다듬는다는 맥락과 반대예요.'
      },
      {
        text: 'coach the understudies',
        status: 'correct',
        reason: '대타 배우를 지도한다는 표현으로 공연 안정성을 높여 줍니다.'
      },
      {
        text: 'check the stage props',
        status: 'correct',
        reason: '무대 소품을 점검한다는 문장이라 공연 준비 흐름에 적절합니다.'
      }
    ],
    correctSummary: '다른 항목은 리허설을 안정적으로 운영하려는 실제 준비 단계예요.',
    extraExplanation: '스태프가 세부 동선을 맞추며 긴장감을 관리하고 있다는 점을 보여 줍니다.',
    focus: '공연 준비'
  },
  {
    idSuffix: 'tutoring',
    contextSummary: '방과 후 튜터링 프로그램이 학습 계획을 조정하는 상황이에요.',
    passageTemplate: `At the weekly tutoring huddle, mentors projected the diagnostic chart on the classroom wall. They agreed to {{1}}, grouped participants to {{2}}, and cautioned new volunteers not to {{3}}. Afterwards, planning teams decided to {{4}} and progress coaches promised to {{5}} for every learner.`,
    segments: [
      {
        text: 'review the diagnostic results',
        status: 'correct',
        reason: '진단 결과를 다시 살피는 행동이라 수업 조정에 필수입니다.'
      },
      {
        text: 'group students by goals',
        status: 'correct',
        reason: '학습 목표별로 학생을 묶는다는 자연스러운 운영 방식입니다.'
      },
      {
        text: 'neglect the quieter learners',
        status: 'incorrect',
        correction: 'support the quieter learners',
        reason: 'neglect는 "소홀히 하다"라서 모든 학생을 돕자는 취지와 반대 의미예요.'
      },
      {
        text: 'prepare differentiated materials',
        status: 'correct',
        reason: '수준별 자료를 준비하자는 표현이라 맞춤형 수업과 연결돼요.'
      },
      {
        text: 'track weekly progress',
        status: 'correct',
        reason: '주간 성장을 기록하자는 표현으로 학습 관리에 자연스럽습니다.'
      }
    ],
    correctSummary: '나머지 선택지는 학생 지원을 강화하려는 실제 전략이에요.',
    extraExplanation: '튜터들은 조용한 학생도 놓치지 않으려는 세심한 태도를 보여 줍니다.',
    focus: '학습 지원'
  }
];

function buildPassage(entry) {
  let text = entry.passageTemplate;
  entry.segments.forEach((segment, idx) => {
    const placeholder = `{{${idx + 1}}}`;
    const underlined = `<u>${segment.text}</u>`;
    text = text.replace(placeholder, underlined);
  });
  return text;
}

function ensureValidEntry(entry) {
  if (entry.segments.length !== CIRCLED_DIGITS.length) {
    throw new Error(`${entry.idSuffix} must contain ${CIRCLED_DIGITS.length} segments.`);
  }
  const incorrectIndices = entry.segments
    .map((segment, idx) => (segment.status === 'incorrect' ? idx : -1))
    .filter((idx) => idx >= 0);
  if (incorrectIndices.length !== 1) {
    throw new Error(`${entry.idSuffix} must mark exactly one incorrect segment.`);
  }
  const invalidPlaceholder = entry.segments.some((_, idx) => !entry.passageTemplate.includes(`{{${idx + 1}}}`));
  if (invalidPlaceholder) {
    throw new Error(`${entry.idSuffix} passage template is missing placeholders.`);
  }
}

function buildOptionReasons(entry, incorrectIndex) {
  const reasons = {};
  entry.segments.forEach((segment, idx) => {
    const marker = CIRCLED_DIGITS[idx];
    if (idx === incorrectIndex) {
      reasons[marker] = `${segment.text}는 ${segment.reason}`;
    } else {
      reasons[marker] = segment.reason || '문맥에 자연스럽게 어울립니다.';
    }
  });
  return reasons;
}

const dataset = ENTRIES.map((entry, index) => {
  ensureValidEntry(entry);
  const passage = buildPassage(entry);
  const incorrectIndex = entry.segments.findIndex((segment) => segment.status === 'incorrect');
  const incorrectSegment = entry.segments[incorrectIndex];
  const incorrectMarker = CIRCLED_DIGITS[incorrectIndex];
  const options = entry.segments.map((segment, idx) => `${CIRCLED_DIGITS[idx]} <u>${segment.text}</u>`);
  const answerValue = String(incorrectIndex + 1);

  const correctMarkers = entry.segments
    .map((segment, idx) => (segment.status === 'correct' ? CIRCLED_DIGITS[idx] : null))
    .filter(Boolean)
    .join(', ');

  const explanationSentences = [
    entry.contextSummary,
    `${incorrectMarker}번 ${incorrectSegment.text}는 ${incorrectSegment.reason}${incorrectSegment.correction ? ` 그래서 ${incorrectSegment.correction}로 고쳐야 자연스럽습니다.` : ' 그래서 문맥에 어울리지 않아요.'}`,
    `${correctMarkers}번 표현은 ${entry.correctSummary}`
  ];
  if (entry.extraExplanation) {
    explanationSentences.push(entry.extraExplanation);
  }
  const explanation = explanationSentences.filter(Boolean).join(' ');

  const optionReasons = buildOptionReasons(entry, incorrectIndex);
  const optionStatuses = entry.segments.map((segment) => (segment.status === 'incorrect' ? 'incorrect' : 'correct'));

  const metadata = {
    generator: 'fallback',
    fallbackReason: 'fallback-curated',
    vocabularyUsage: true,
    incorrectIndex: incorrectIndex + 1,
    incorrectSnippet: incorrectSegment.text,
    optionReasons,
    optionStatuses
  };

  if (incorrectSegment.correction) {
    metadata.correction = {
      replacement: incorrectSegment.correction,
      reason: incorrectSegment.reason
    };
  }

  return {
    id: `vocab-fallback-${entry.idSuffix}`,
    type: 'vocabulary',
    question: VOCAB_USAGE_BASE_QUESTION,
    mainText: passage,
    text: passage,
    options,
    answer: answerValue,
    correctAnswer: answerValue,
    explanation,
    difficulty: 'csat-advanced',
    vocabularyFocus: entry.focus,
    metadata,
    sourceLabel: `출처│LoE 어휘 마스터 no${index + 1}`
  };
});

fs.writeFileSync(OUTPUT_PATH, `${JSON.stringify(dataset, null, 2)}\n`, 'utf8');
console.log(`Generated ${dataset.length} fallback vocabulary items -> ${OUTPUT_PATH}`);
