export const workbookMeta = {
  id: '1-25-10',
  title: '워크북 1 · 고1 2025년 10월 모의고사',
  description: '읽기-어휘-추론 10단계로 구성된 리그오브잉글리시 전용 워크북입니다. 각 단계마다 짧은 미션과 카드 뒤집기로 핵심 포인트를 익혀요.',
  totalSteps: 10,
};

export const workbookSteps = [
  {
    step: 1,
    label: 'Step 1',
    title: 'Warm-up · 주제 감 잡기',
    mood: '🌅',
    intro: '짧은 힌트를 읽으면서 오늘 지문이 다루는 주제를 가볍게 떠올려요. 핵심 단어에 밑줄을 긋고, 내 생활과 연결해 보세요.',
    mission: '힌트 문장을 읽고 ✔ 체크하기 → 주제 후보 2가지를 적어보기',
    cards: [
      {
        front: '🧐 Hint 1\n"The text compares different social creatures."',
        back: '사회성을 기준으로 두 집단을 견주는 글이라는 걸 캐치! 인간 vs 곤충 같은 대비가 나올 가능성이 커요.'
      },
      {
        front: '💡 Hint 2\n키워드: colony, nurture, adaptability',
        back: 'colony(군집)는 곤충, nurture(양육)는 인간 쪽에 자주 붙어요. 적응력(adaptability) 얘기가 나오면 변화가 핵심이라는 표시.'
      }
    ],
    takeaways: [
      '키워드 3개 이상 표시하기',
      '주제 후보 2개를 메모장에 적고 저장'
    ]
  },
  {
    step: 2,
    label: 'Step 2',
    title: 'Vocabulary Sprint',
    mood: '🔤',
    intro: '지문 속 핵심 어휘를 카드로 미리 익혀요. 뜻만 외우지 말고 문장 속 뉘앙스까지 생각해 주세요.',
    mission: '카드 뒤집기 → 내 말로 예문 말해보기 → 알파벳 순으로 정렬해 보기',
    cards: [
      { front: 'colony', back: '🐜 군집, 집단. 곤충 사회에서 조직화된 집단을 의미해요.' },
      { front: 'propelled', back: '🚀 (행동을) 추진하다. 본능, 페로몬 같은 요인이 행동을 밀어주는 그림을 떠올려요.' },
      { front: 'nurture', back: '🌱 양육, 후천적 영향. 인간 사회에서 배움·문화가 행동을 바꾼다는 메시지와 연결!' },
      { front: 'diverse', back: '🎨 다양한, 다채로운. 인간 사회의 변화 가능성을 강조할 때 꼭 등장.' }
    ],
    takeaways: [
      '모르는 단어는 별표 ⭐ 표시',
      '뜻 + 예문을 나만의 표현으로 1회 말하기'
    ]
  },
  {
    step: 3,
    label: 'Step 3',
    title: 'Skimming Route',
    mood: '🛤️',
    intro: '단락의 첫 문장과 연결어만 빠르게 훑으며 글 흐름을 파악합니다. 세부 내용은 나중에! 흐름만 챙겨요.',
    mission: '첫 문장 읽고 핵심 동사 표시 → 그러나/하지만 같은 전환어 체크 → 단락별 요약 1줄',
    cards: [
      { front: 'Para 1', back: '곤충이 얼마나 사회적으로 조직돼 있는지 강조 (비교 대상 소개)' },
      { front: 'Para 2', back: '그 행동이 유전적으로 고정되어 있다는 설명 (propelled pheromonally)' },
      { front: 'Para 3', back: '인간은 자유도가 높아 다양한 사회 패턴을 만든다는 전환' },
      { front: 'Para 4', back: '세대별로 바뀌는 “춤” 비유로 결론 정리' }
    ],
    takeaways: [
      '각 단락 핵심 동사를 노트에 적기',
      '전환어(However, Instead 등) 하이라이트'
    ]
  },
  {
    step: 4,
    label: 'Step 4',
    title: 'Scanning Challenge',
    mood: '🔍',
    intro: '세부 정보를 pinpoint! 인물·숫자·전문 용어처럼 중요한 정보만 정확히 찾아요.',
    mission: '지문에서 특정 표현 위치 찾기 → 카드 뒷면과 맞춰보기',
    cards: [
      { front: 'which phrase shows instincts?', back: 'tightly programmed genetically' },
      { front: 'which phrase hints at culture?', back: 'patterns that are shaped by nurture' },
      { front: 'what imagery closes the text?', back: 'Every group dances a slightly different dance' }
    ],
    takeaways: [
      '표현과 위치를 함께 메모',
      '비슷한 표현이 있으면 ★표시'
    ]
  },
  {
    step: 5,
    label: 'Step 5',
    title: 'Inference Lab',
    mood: '🧠',
    intro: '글쓴이의 숨은 의도와 함의를 추론합니다. “왜 이 말을 했을까?”만 계속 떠올려 보세요.',
    mission: '카드를 뒤집고 “왜?” 질문 작성 → 근거 문장 찾기',
    cards: [
      { front: 'Why praise insects first?', back: '독자의 고정관념을 깨기 위한 대비 장치. 인간이 최고라는 생각을 흔들어요.' },
      { front: 'Why mention pheromones?', back: '곤충 사회의 자동화를 강조, 인간의 자유도와 대비하려는 장치.' },
      { front: 'Why talk about choreographies?', back: '세대마다 바뀌는 문화적 패턴을 “춤”으로 비유해 이해를 쉽게 만들어요.' }
    ],
    takeaways: [
      '각 카드마다 근거 문장 적어두기',
      '추론 근거는 “because + 문장”으로 작성'
    ]
  },
  {
    step: 6,
    label: 'Step 6',
    title: 'Structure Mapping',
    mood: '🧩',
    intro: '지문 구조를 시각화합니다. 비교-대조-결론의 흐름을 그림으로 정리해요.',
    mission: '카드 속 구조 힌트를 보고 노트에 다이어그램 그리기',
    cards: [
      { front: 'Hook', back: '곤충 사회가 더 “사회적”이라는 도발적인 주장' },
      { front: 'Contrast', back: '프로그램된 곤충 vs 자유로운 인간' },
      { front: 'Resolution', back: '자연(nature)보다 양육(nurture)이 인간 사회를 가른다' }
    ],
    takeaways: [
      'hook → contrast → resolution 순서로 도식화',
      '각 단계 감정선(놀람→설명→설득)도 표시'
    ]
  },
  {
    step: 7,
    label: 'Step 7',
    title: 'Grammar Clinic',
    mood: '✏️',
    intro: '지문 속 주요 문법 패턴을 짚어봅니다. 밑줄 친 표현을 고쳐 쓰거나 다른 예문을 만들어보세요.',
    mission: '카드 앞면: 원문 패턴 → 카드 뒷면: 분석 + 변형 연습',
    cards: [
      { front: 'There are numerous ways wildlife is managed', back: '사물주어+수동태 구조. 동사 manage의 수동형이 반복됨을 기억!' },
      { front: 'Other populations may not be actively managed', back: '조동사 + be p.p: 수동태 가능성 강조. not be ~ed 패턴 연습.' },
      { front: 'We still think and act in ways that are in harmony', back: '관계대명사절 that are ~ : “way + that” 구조 확인.' }
    ],
    takeaways: [
      'each pattern → 나만의 예문 1개 작성',
      '수동태/관계절 포인트 정리'
    ]
  },
  {
    step: 8,
    label: 'Step 8',
    title: 'Expression Upgrade',
    mood: '💬',
    intro: '지문에서 바로 쓸 수 있는 표현을 회화/글쓰기 버전으로 확장해 봅니다.',
    mission: '카드 앞: 원문 표현 → 뒤집기 → 확장 표현 말/쓰기',
    cards: [
      { front: 'put humanity to shame', back: '“~을 무색하게 만들다” → My teammate’s preparation put me to shame.' },
      { front: 'tightly programmed', back: '“철저히 계획된” → The schedule was tightly programmed for efficiency.' },
      { front: 'more diverse and dynamic', back: '“더 다양한·역동적인” → I want my notes to be more diverse and dynamic.' }
    ],
    takeaways: [
      '표현 3개 말하기 + 녹음하기',
      '확장 문장 SNS 초안으로 작성'
    ]
  },
  {
    step: 9,
    label: 'Step 9',
    title: 'Self-Check Quiz',
    mood: '📝',
    intro: '빠른 O/X 체크로 이해도를 점검합니다. 헷갈리는 문항은 다시 Step으로 이동하세요.',
    mission: '카드 앞: 질문 → 뒤집어서 정답 확인 → 다시 덮고 말로 설명',
    cards: [
      { front: '곤충 사회의 행동은 주로 문화적 요인에서 비롯된다. (O/X)', back: '❌ 유전 + 페로몬에 의해 작동.' },
      { front: '인간 사회가 다양한 이유는 nurture 때문이다. (O/X)', back: '⭕ 양육/문화가 사회 패턴을 변화시킨다고 설명.' },
      { front: '“dance” 비유는 일관성을 강조한다. (O/X)', back: '❌ 변화와 세대별 다른 패턴을 강조.' }
    ],
    takeaways: [
      '틀린 문항은 해당 Step으로 돌아가 복습',
      '정답 이유를 한 문장으로 말하기'
    ]
  },
  {
    step: 10,
    label: 'Step 10',
    title: 'Reflection & Action',
    mood: '🚀',
    intro: '오늘 배운 내용을 내 삶이나 수업에 바로 적용할 아이디어를 정리합니다.',
    mission: '카드 앞: 질문 → 뒤집어서 아이디어 예시 확인 → 나만의 답 작성',
    cards: [
      { front: '수업/스터디에서 곤충 vs 인간 비교를 활용할 수 있는 활동은?', back: '토론 주제: “사회성을 바라보는 두 관점” 역할극 + 설문' },
      { front: '오늘 배운 어휘 3개를 어디에 쓸까?', back: '에세이 서론, 발표 슬라이드, SNS 글에 응용하기' },
      { front: '나의 사회성을 기르는 새 습관 한 가지?', back: '주간 reflection 작성, 다른 문화와 협업 연습' }
    ],
    takeaways: [
      '적용 아이디어 2개 작성',
      '다음 스터디에서 공유할 목표 설정'
    ]
  }
];
