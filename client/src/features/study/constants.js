export const TYPE_LABELS = {
  blank: '빈칸',
  order: '순서 배열',
  insertion: '문장 삽입',
  grammar: '어법',
  vocabulary: '어휘',
  title: '제목',
  theme: '주제',
  summary: '요약',
  implicit: '함축 의미',
  irrelevant: '무관 문장'
};

export const GENERATION_STAGES = [
  '요청 정보를 정리하고 있어요...',
  '캐시에서 사용할 수 있는 문제를 찾는 중이에요...',
  'AI가 새 문제를 빚고 있어요...',
  '문제를 검토하고 정리 중이에요...'
];

export const TIER_ORDER = [
  'Iron',
  'Bronze',
  'Silver',
  'Gold',
  'Platinum',
  'Diamond',
  'Master',
  'Challenger'
];


export const VOCAB_FLASHCARDS = [
  { word: 'construct', meaning: '구성하다, 건설하다' },
  { word: 'ensure', meaning: '보장하다, 확실히 하다' },
  { word: 'discard', meaning: '버리다, 폐기하다' },
  { word: 'expand', meaning: '확장하다, 넓히다' },
  { word: 'display', meaning: '전시하다, 드러내다' },
  { word: 'integrate', meaning: '통합하다, 하나로 만들다' },
  { word: 'mediate', meaning: '중재하다, 조정하다' },
  { word: 'navigate', meaning: '길을 찾다, 항해하다' },
  { word: 'observe', meaning: '관찰하다, 준수하다' },
  { word: 'perceive', meaning: '인지하다, 파악하다' },
  { word: 'reinforce', meaning: '강화하다, 보강하다' },
  { word: 'sustain', meaning: '지속하다, 떠받치다' },
  { word: 'transform', meaning: '변형시키다, 바꾸다' },
  { word: 'undergo', meaning: '겪다, 경험하다' },
  { word: 'violate', meaning: '위반하다, 침해하다' },
  { word: 'allocate', meaning: '할당하다, 배분하다' },
  { word: 'assess', meaning: '평가하다, 산정하다' },
  { word: 'compile', meaning: '편집하다, 엮다' },
  { word: 'depict', meaning: '묘사하다, 그리다' },
  { word: 'emphasize', meaning: '강조하다' },
  { word: 'facilitate', meaning: '촉진하다, 쉽게 하다' },
  { word: 'generate', meaning: '생성하다, 만들어 내다' },
  { word: 'illustrate', meaning: '설명하다, 예시를 들다' },
  { word: 'justify', meaning: '정당화하다' },
  { word: 'mitigate', meaning: '완화하다, 줄이다' },
  { word: 'negotiate', meaning: '협상하다' },
  { word: 'optimize', meaning: '최적화하다' },
  { word: 'presume', meaning: '추정하다, 가정하다' },
  { word: 'quantify', meaning: '수량화하다' },
  { word: 'regulate', meaning: '규제하다, 조절하다' },
  { word: 'synthesize', meaning: '종합하다, 합성하다' },
  { word: 'trigger', meaning: '촉발하다, 유발하다' },
  { word: 'uphold', meaning: '유지하다, 옹호하다' },
  { word: 'withstand', meaning: '견디다, 버티다' },
  { word: 'accumulate', meaning: '축적하다, 모으다' },
  { word: 'clarify', meaning: '명확히 하다' },
  { word: 'dedicate', meaning: '헌신하다, 바치다' },
  { word: 'eliminate', meaning: '제거하다, 없애다' },
  { word: 'formulate', meaning: '공식화하다, 만들어 내다' },
  { word: 'highlight', meaning: '강조하다, 부각시키다' },
  { word: 'immerse', meaning: '몰두하게 하다, 담그다' },
  { word: 'moderate', meaning: '완화하다, 조절하다' },
  { word: 'prohibit', meaning: '금지하다' },
  { word: 'refine', meaning: '정제하다, 개선하다' },
  { word: 'scrutinize', meaning: '면밀히 조사하다' },
  { word: 'terminate', meaning: '종결하다, 끝내다' },
  { word: 'validate', meaning: '검증하다, 입증하다' }
];

export const LOADING_SNIPPETS = [
  { type: 'message', text: '지금 당신만을 위한 문제를 정성껏 빚는 중이에요. 잠시만 기다려줘요 😊' },
  { type: 'quote', quote: 'The future depends on what you do today.', author: 'Mahatma Gandhi', translation: '미래는 오늘 당신이 하는 일에 달려 있어요.' },
  { type: 'message', text: 'AI 선생님이 해설까지 다시 확인하고 있어요! 준비되면 바로 시작할게요 ✨' },
  { type: 'quote', quote: 'Success is the sum of small efforts, repeated day in and day out.', author: 'Robert Collier', translation: '성공은 매일 반복되는 작은 노력들의 합이에요.' },
  { type: 'message', text: '따뜻한 햇살처럼 마음 편한 문제 세트를 데워 오는 중이에요 ☕' },
  { type: 'message', text: '은하수를 건너 감성 한 스푼을 더 담고 있어요. 조금만 더 기다려줄래요? 🌌' },
  { type: 'quote', quote: 'It always seems impossible until it is done.', author: 'Nelson Mandela', translation: '끝낼 때까지는 불가능해 보여도, 결국 우리는 해내게 되어 있어요.' },
  { type: 'quote', quote: 'You are never too small to make a difference.', author: 'Greta Thunberg', translation: '어떤 마음도 작지 않아요. 당신의 노력이 변화를 만들 거예요.' },
  { type: 'message', text: '문제에 쓸 향기로운 단어들을 고르고 있어요. 숨 한번 크게 쉬어볼까요? 🌿' },
  { type: 'message', text: '조용히 집중이 내려앉을 수 있게 창문을 살짝 열어두었어요. 곧 시작해요 💫' },
  { type: 'quote', quote: 'Learning never exhausts the mind.', author: 'Leonardo da Vinci', translation: '배움은 마음을 지치게 하지 않아요. 오히려 더 단단하게 만들어 주죠.' },
  { type: 'quote', quote: 'Stars can’t shine without darkness.', author: 'Unknown', translation: '밤이 있기에 별빛이 반짝여요. 지금의 고요도 반짝임의 준비랍니다.' },
  { type: 'message', text: '손에 쥔 연필이 조금 더 가벼워지도록 격려를 살짝 뿌려둘게요 ✏️' },
  { type: 'quote', quote: 'Every day is a chance to learn something new.', author: 'Unknown', translation: '매일은 새로운 것을 배울 수 있는 기회예요.' },
  { type: 'message', text: '지금 당신에게 꼭 맞는 문장을 찾는 중이에요. 조금만 더 기다려 주세요 🌈' },
  { type: 'quote', quote: 'The beautiful thing about learning is that no one can take it away from you.', author: 'B.B. King', translation: '배움의 아름다움은 누구도 그것을 빼앗을 수 없다는 데 있어요.' },
  { type: 'message', text: '창문에 빗방울처럼 잔잔한 아이디어를 모으는 중이에요 ☔️' }
];

export const REVEAL_STEP_SECONDS = 3;
