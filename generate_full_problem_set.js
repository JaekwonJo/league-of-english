const fs = require('fs');
const NewPDFParser = require('./server/utils/newPdfParser');
const { generateCSATGrammarProblem } = require('./server/utils/csatGrammarGenerator');


const VOCAB_SELECTION = {
  "1. p2-no.18": "extend",
  "2. p2-no.19": "audition",
  "3. p2-no.20": "routine",
  "4. p3-no.21": "borrow",
  "5. p3-no.22": "meditative",
  "6. p3-no.23": "phenomena",
  "7. p3-no.24": "correlation",
  "8. p5-no.29": "domesticated",
  "9. p5-no.30": "hospitality",
  "10. p5-no.31": "euphoria",
  "11. p5-no.32": "accumulation",
  "12. p6-no.33": "precise",
  "13. p6-no.34": "infrastructure",
  "14. p6-no.35": "autonomously",
  "15. p6-no.36": "immobile",
  "16. p7-no.37": "friction",
  "17. p7-no.38": "nonlinear",
  "18. p7-no.39": "consequences",
  "19. p7-no.40": "preconceptions",
  "20. p8-no.41~42": "defensive",
  "21. p8-no.43~45": "determined"
};
const VOCAB_BANK = {
  extend: {
    options: ['길게 늘리다', '겉모습을 꾸미다', '즉시 멈추다', '모두 나누다'],
    answer: 1,
    explanation: 'extend는 시간을 늘리거나 길게 하다라는 뜻입니다.'
  },
  audition: {
    options: ['배우나 가수를 뽑기 위한 시험', '완성된 공연', '관객의 박수', '무대 장치'],
    answer: 1,
    explanation: 'audition은 역할을 얻기 위해 보는 시험을 의미합니다.'
  },
  routine: {
    options: ['늘 반복하는 일정한 과정', '갑작스러운 사건', '특별한 축제', '불규칙한 실수'],
    answer: 1,
    explanation: 'routine은 습관처럼 반복되는 절차입니다.'
  },
  borrow: {
    options: ['빌려서 잠시 쓰다', '돈을 갚다', '영원히 소유하다', '새로 만들다'],
    answer: 1,
    explanation: 'borrow는 남의 것을 빌려 잠시 쓰다의 의미입니다.'
  },
  meditative: {
    options: ['마음을 차분하게 하는', '시끄럽고 혼란스러운', '서두르는', '위험을 부르는'],
    answer: 1,
    explanation: 'meditative는 명상하듯 마음을 차분하게 만드는 상태를 가리킵니다.'
  },
  phenomena: {
    options: ['일어나는 여러 가지 현상', '사람들의 기분', '우연한 실수', '작은 소문'],
    answer: 1,
    explanation: 'phenomena는 관찰되는 여러 자연·사회 현상을 뜻합니다.'
  },
  correlation: {
    options: ['서로 관련되어 함께 변함', '완전히 분리됨', '무작위 추측', '느린 진행'],
    answer: 1,
    explanation: 'correlation은 두 요소가 서로 연결되어 있다는 의미입니다.'
  },
  domesticated: {
    options: ['길들여져 사람이 기르기 쉬운', '야생으로 되돌아간', '갑자기 사라진', '병든'],
    answer: 1,
    explanation: 'domesticated는 동물이 길들여져 집에서 기를 수 있음을 뜻합니다.'
  },
  hospitality: {
    options: ['따뜻하게 맞이하고 대접함', '엄격한 규칙', '거친 말투', '물건을 숨김'],
    answer: 1,
    explanation: 'hospitality는 손님을 친절히 대접하는 태도입니다.'
  },
  euphoria: {
    options: ['큰 기쁨과 황홀감', '깊은 피로', '지루함', '걱정스러운 불안'],
    answer: 1,
    explanation: 'euphoria는 매우 큰 기쁨과 들뜬 감정을 말합니다.'
  },
  accumulation: {
    options: ['차곡차곡 쌓임', '갑작스러운 폭발', '빠른 감소', '즉각적인 중단'],
    answer: 1,
    explanation: 'accumulation은 어떤 것이 점점 쌓여 가는 것을 의미합니다.'
  },
  precise: {
    options: ['아주 정확한', '엉성하고 틀린', '느리고 게으른', '간신히 들리는'],
    answer: 1,
    explanation: 'precise는 매우 정확하고 세밀한 상태를 뜻합니다.'
  },
  infrastructure: {
    options: ['기반이 되는 시설과 장치', '잠깐의 실수', '개인 취미', '불필요한 장식'],
    answer: 1,
    explanation: 'infrastructure는 사회를 지탱하는 기본 시설을 말합니다.'
  },
  autonomously: {
    options: ['스스로 판단하여', '남이 시키는 대로만', '완전히 멈춰서', '무작위로'],
    answer: 1,
    explanation: 'autonomously는 다른 사람 도움 없이 스스로 판단함을 뜻합니다.'
  },
  immobile: {
    options: ['거의 움직이지 않는', '빠르게 자라는', '소리를 크게 내는', '밝게 빛나는'],
    answer: 1,
    explanation: 'immobile은 움직이지 않고 가만히 있는 상태입니다.'
  },
  friction: {
    options: ['서로 비벼져 움직임을 막는 힘', '빛을 내는 에너지', '소리를 키우는 장치', '공기를 차단하는 막'],
    answer: 1,
    explanation: 'friction은 물체끼리 문질러져 움직임을 방해하는 힘입니다.'
  },
  nonlinear: {
    options: ['순서대로 한 줄로 진행되지 않는', '항상 같은 속도로 움직이는', '빛을 이용한', '자연에서만 쓰이는'],
    answer: 1,
    explanation: 'nonlinear는 정해진 순서대로 이어지지 않는 방식을 의미합니다.'
  },
  consequences: {
    options: ['어떤 행동 뒤에 따라오는 결과', '사전에 세운 계획', '일시적인 기분', '무의미한 소음'],
    answer: 1,
    explanation: 'consequences는 어떤 행동으로 인해 생기는 결과입니다.'
  },
  preconceptions: {
    options: ['미리 갖고 있는 생각이나 선입견', '새로운 발명품', '자연 풍경', '정확한 측정값'],
    answer: 1,
    explanation: 'preconceptions는 경험하기 전에 미리 품은 선입견을 뜻합니다.'
  },
  defensive: {
    options: ['스스로를 지키려는 태도', '기쁜 감정을 표현함', '남을 돕고 격려함', '느긋하게 쉬는 모습'],
    answer: 1,
    explanation: 'defensive는 스스로를 보호하려는 태도를 말합니다.'
  },
  determined: {
    options: ['굳게 마음을 먹은', '우연히 지나가는', '겁에 질린', '쉽게 포기하는'],
    answer: 1,
    explanation: 'determined는 해야겠다고 굳게 마음먹은 상태입니다.'
  }
};
const SUMMARY_BANK = {
  "1. p2-no.18": {
    options: [
      "학생회장이 도서관 운영 시간을 늘려 달라고 정중히 건의한다.",
      "도서관을 폐쇄해야 한다고 주장한다.",
      "학교 급식 메뉴를 바꾸자는 내용이다.",
      "학생회 선거 공약을 홍보하는 글이다."
    ],
    answer: 1,
    explanation: "도서관 운영 시간을 오후 7시까지 연장해 달라는 요청이다."
  },
  "2. p2-no.19": {
    options: [
      "첫 오디션 결과를 초조하게 기다리다 작은 역할에 합격하는 이야기다.",
      "무대에서 실수하여 탈락하는 장면이다.",
      "친구와 갈등을 해결하는 대화이다.",
      "새로운 공연을 직접 연출하는 이야기다."
    ],
    answer: 1,
    explanation: "전화로 오디션 결과를 듣고 조연 역할에 합격하는 이야기다."
  },
  "3. p2-no.20": {
    options: [
      "수업 시작 10분 루틴이 수업 분위기를 결정한다는 조언이다.",
      "학생들이 스스로 수업을 마무리해야 한다는 주장이다.",
      "체벌의 교육 효과를 설명한다.",
      "숙제를 줄여야 한다는 설득 편지다."
    ],
    answer: 1,
    explanation: "첫 몇 분의 준비 루틴이 수업 집중도를 높인다고 강조한다."
  },
  "4. p3-no.21": {
    options: [
      "우리 몸의 원자는 우주만큼 오래되어 서로 빌려 쓰고 있다고 설명한다.",
      "원자는 한 번 쓰면 사라진다고 주장한다.",
      "인간이 스스로 원자를 만들어 낸다고 말한다.",
      "지구 나이가 최근에서야 밝혀졌다고 주장한다."
    ],
    answer: 1,
    explanation: "원자는 돌고 돌아 모두가 함께 빌려 쓰는 자원이라고 설명한다."
  },
  "5. p3-no.22": {
    options: [
      "정원 가꾸기가 신체 건강과 마음 건강 모두에 도움이 된다고 말한다.",
      "정원 가꾸기는 시간 낭비이니 하지 말아야 한다고 권한다.",
      "정원 가꾸기는 전문가만 할 수 있다고 강조한다.",
      "정원 가꾸기는 오히려 불안을 키운다고 주장한다."
    ],
    answer: 1,
    explanation: "정원 가꾸기가 운동이 되고 마음을 안정시킨다고 소개한다."
  },
  "6. p3-no.23": {
    options: [
      "인간이 감각으로 느끼지 못하는 현상을 도구로 관찰해 왔음을 설명한다.",
      "감각을 쓰지 않아야 더 잘 배울 수 있다고 주장한다.",
      "과학 도구가 인간을 혼란스럽게 만든다고 경고한다.",
      "현대 기술은 자연 현상을 왜곡한다고 비판한다."
    ],
    answer: 1,
    explanation: "도구가 감각을 확장해 보이지 않던 현상을 보게 해 준다고 설명한다."
  },
  "7. p3-no.24": {
    options: [
      "동물실험과 의학 발전의 상관관계가 법적 요구 때문에 나타난 것이라고 비판한다.",
      "동물실험이 모든 의학 발전의 유일한 원인이라고 주장한다.",
      "의사들이 동물실험을 완전히 중단해야 한다고 주장한다.",
      "동물실험이 최근 들어 새롭게 시작되었다고 소개한다."
    ],
    answer: 1,
    explanation: "법 때문에 실험이 선행되었을 뿐 인과관계 증거는 아니라고 반박한다."
  },
  "8. p5-no.29": {
    options: [
      "가젤처럼 겁 많은 동물은 너무 예민해서 가축으로 길들이기 어렵다고 설명한다.",
      "모든 초식동물은 쉽게 길들여진다고 말한다.",
      "인간이 가젤을 길들이는 데 성공했다고 축하한다.",
      "육식동물이 초식동물을 지켜 준다는 이야기다."
    ],
    answer: 1,
    explanation: "겁이 많고 빠른 종은 갇히면 패닉에 빠져 가축화가 어렵다고 설명한다."
  },
  "9. p5-no.30": {
    options: [
      "풍족해지면 나누려는 마음이 줄어들어 관계가 멀어진다고 지적한다.",
      "부자가 되면 모두 더 많이 베풀게 된다고 말한다.",
      "부족할수록 이기심이 커진다고 주장한다.",
      "유목민은 낯선 이를 거절한다고 설명한다."
    ],
    answer: 1,
    explanation: "부족할 땐 나눔이 필요하지만 풍족하면 오히려 벽을 만든다고 말한다."
  },
  "10. p5-no.31": {
    options: [
      "사람은 좋은 일과 나쁜 일에 적응하며 다시 평소의 기분으로 돌아온다고 말한다.",
      "기쁨은 한 번 느끼면 영원히 유지된다고 주장한다.",
      "슬픔은 시간이 지나도 결코 사라지지 않는다고 강조한다.",
      "감정은 주변 사람에게 전혀 영향을 받지 않는다고 말한다."
    ],
    answer: 1,
    explanation: "행복과 슬픔 모두 시간이 지나면 기본 수준으로 되돌아간다고 설명한다."
  },
  "11. p5-no.32": {
    options: [
      "아데노신이 쌓이면 잠이 부족하다는 신호를 보내 잠을 자게 만든다고 설명한다.",
      "잠은 마음먹기에 따라 완전히 없앨 수 있다고 말한다.",
      "카페인이 잠의 필요성을 완전히 없앤다고 주장한다.",
      "잠을 줄이면 몸이 자동으로 적응한다고 말한다."
    ],
    answer: 1,
    explanation: "아데노신 축적으로 인해 잠 부족을 채우려 한다고 소개한다."
  },
  "12. p6-no.33": {
    options: [
      "수치의 정확성은 사용 목적에 따라 다르게 느껴진다고 설명한다.",
      "태양까지의 거리가 정확히 측정되었다고 자랑한다.",
      "불확실성을 줄이려면 숫자를 버려야 한다고 주장한다.",
      "도시 사이 거리는 중요하지 않다고 말한다."
    ],
    answer: 1,
    explanation: "정밀도는 활용 목적에 따라 다르게 받아들여진다고 강조한다."
  },
  "13. p6-no.34": {
    options: [
      "재생에너지로 전환하려면 많은 기반 시설을 짓는 동안 화석연료를 더 써야 한다고 지적한다.",
      "재생에너지는 돈이 거의 들지 않는다고 주장한다.",
      "화석연료 사용은 이미 완전히 중단되었다고 소개한다.",
      "재생에너지 설비는 스스로 자라난다고 설명한다."
    ],
    answer: 1,
    explanation: "전환 공사에 드는 에너지와 비용을 함께 계산해야 한다고 경고한다."
  },
  "14. p6-no.35": {
    options: [
      "오래전부터 인간은 사람처럼 생각하는 기계를 꿈꿔 왔다고 소개한다.",
      "로봇은 최근에서야 처음 상상되었다고 말한다.",
      "튜링은 기계가 생각할 수 없다고 선언했다고 말한다.",
      "인공지능은 인간의 감정을 없애는 기술이라고 주장한다."
    ],
    answer: 1,
    explanation: "옛 신화부터 현대 연구까지 인간이 지능형 기계를 상상해 왔다고 정리한다."
  },
  "15. p6-no.36": {
    options: [
      "사막 거북이는 물을 저장하는 방광 덕분에 오랫동안 버틴다고 설명한다.",
      "사막 거북이는 더위를 피해 강으로 이주한다고 말한다.",
      "거북이는 사람 도움 없이는 비를 모을 수 없다고 주장한다.",
      "거북이는 여름마다 잠을 자지 않는다고 소개한다."
    ],
    answer: 1,
    explanation: "거북이는 방광에 물을 저장하므로 함부로 들어 올리면 안 된다고 당부한다."
  },
  "16. p7-no.37": {
    options: [
      "자전거가 서서히 멈추는 이유를 마찰력으로 쉽게 설명한다.",
      "자전거는 힘이 없어도 항상 같은 속도로 달린다고 말한다.",
      "바람은 자전거를 도와 더 빨라지게 한다고 주장한다.",
      "브레이크는 공기를 식히기 위한 장치라고 설명한다."
    ],
    answer: 1,
    explanation: "브레이크와 공기 저항 등 마찰력이 속도를 줄인다고 설명한다."
  },
  "17. p7-no.38": {
    options: [
      "비선형 편집 시스템은 원하는 장면을 바로 찾아 고칠 수 있다고 설명한다.",
      "비선형 편집은 필름을 반드시 처음부터 끝까지 다시 찍어야 한다고 말한다.",
      "디지털 편집은 종이보다 느리다고 주장한다.",
      "비선형 편집은 효과를 전혀 넣을 수 없다고 설명한다."
    ],
    answer: 1,
    explanation: "비선형 편집은 랜덤 접근과 편리한 수정이 가능하다고 소개한다."
  },
  "18. p7-no.39": {
    options: [
      "도덕적으로 좋은 사람은 의도와 결과 모두에서 남보다 더 선해야 한다고 설명한다.",
      "착한 마음만 있으면 행동은 중요하지 않다고 말한다.",
      "실수로 도운 사람도 무조건 도덕적으로 선하다고 말한다.",
      "결과만 좋으면 의도는 전혀 상관없다고 주장한다."
    ],
    answer: 1,
    explanation: "좋은 의도와 실제 행동 결과가 모두 필요하다고 이야기한다."
  },
  "19. p7-no.40": {
    options: [
      "우리는 물건과의 기능적 관계 때문에 선입견을 갖고 본다고 설명한다.",
      "사진은 사람보다 더 왜곡한다고 주장한다.",
      "사람의 눈은 항상 카메라와 똑같이 본다고 말한다.",
      "사람은 어떤 물체도 미리 떠올리지 못한다고 말한다."
    ],
    answer: 1,
    explanation: "선입견이 시야를 제한해 카메라처럼 객관적으로 보기 어렵다고 말한다."
  },
  "20. p8-no.41~42": {
    options: [
      "“May I help you?”라는 질문이 고객을 방어적으로 만들어 판매를 막을 수 있다고 설명한다.",
      "“May I help you?”는 고객을 가장 행복하게 만든다고 주장한다.",
      "판매원은 말을 아끼는 것이 최선이라고 말한다.",
      "모든 고객은 도움을 받기 싫어한다고 강조한다."
    ],
    answer: 1,
    explanation: "형식적인 인사보다 열린 질문이 고객을 편안하게 한다고 조언한다."
  },
  "21. p8-no.43~45": {
    options: [
      "자신을 비웃는 상황에서도 끝까지 포기하지 않은 소년과 그를 도운 선배의 따뜻함을 전한다.",
      "돈을 잃어버린 학생이 경찰에 신고하는 장면이다.",
      "복도에서 다툰 학생들이 벌을 받는 이야기다.",
      "교사가 학생에게 과제를 내주는 장면이다."
    ],
    answer: 1,
    explanation: "포기하지 않는 마음과 작은 친절이 주는 위로를 담은 이야기다."
  }
};
const BLANK_BANK = {
  "1. p2-no.18": {
    text: "Therefore, I'd like to ask you to _____ so that students can study after regular class hours.",
    options: [
      "① shorten the library's schedule to 3 p.m.",
      "② extend the library's operating hours to 7 p.m.",
      "③ close the library on weekdays.",
      "④ move the library to a smaller room.",
      "⑤ limit the library to faculty members only."
    ],
    answer: 2,
    explanation: "편지는 도서관 운영 시간을 오후 7시까지 연장해 달라는 요청이다."
  },
  "2. p2-no.19": {
    text: "That meant the casting director would call very soon with the results of my first _____ for a musical part in The Wizard of Oz.",
    options: [
      "① rehearsal",
      "② audition",
      "③ newspaper review",
      "④ stage construction",
      "⑤ costume fitting"
    ],
    answer: 2,
    explanation: "전화로 기다리던 것은 첫 오디션 결과였다."
  },
  "3. p2-no.20": {
    text: "In summary, you should establish an opening _____ to develop your class with an effective start.",
    options: [
      "① punishment",
      "② routine",
      "③ competition",
      "④ distraction",
      "⑤ survey"
    ],
    answer: 2,
    explanation: "수업 시작 루틴을 만들어야 수업이 효과적으로 시작된다."
  },
  "4. p3-no.21": {
    text: "You don't 'own' the atoms that make up your body; you _____ them.",
    options: [
      "① manufacture",
      "② borrow",
      "③ waste",
      "④ analyze",
      "⑤ freeze"
    ],
    answer: 2,
    explanation: "우리 몸의 원자는 빌려 쓰는 것이라고 설명한다."
  },
  "5. p3-no.22": {
    text: "Tending to plants can be incredibly _____ and meditative.",
    options: [
      "① calming",
      "② chaotic",
      "③ risky",
      "④ loud",
      "⑤ impatient"
    ],
    answer: 1,
    explanation: "정원 가꾸기는 마음을 차분하게 한다고 했다."
  },
  "6. p3-no.23": {
    text: "In some cases, this consists of simply _____ that feed into our normal sensory inputs.",
    options: [
      "① damping noises",
      "② amplifying signals",
      "③ blocking colors",
      "④ erasing images",
      "⑤ randomizing sounds"
    ],
    answer: 2,
    explanation: "도구가 감각에 들어오는 신호를 증폭한다고 설명한다."
  },
  "7. p3-no.24": {
    text: "Opponents of research reject this _____ because it mistakes correlation for proof of causation.",
    options: [
      "① habit",
      "② inference",
      "③ celebration",
      "④ apology",
      "⑤ lottery"
    ],
    answer: 2,
    explanation: "동물실험이 의학 발전을 일으켰다는 추론을 반박한다."
  },
  "8. p5-no.29": {
    text: "If put into an enclosure, they are likely to _____, and either die of shock or hit themselves against the fence.",
    options: [
      "① relax",
      "② panic",
      "③ fall asleep",
      "④ build nests",
      "⑤ freeze solid"
    ],
    answer: 2,
    explanation: "겁 많은 종은 갇히면 패닉에 빠진다고 했다."
  },
  "9. p5-no.30": {
    text: "When we have less, we tend to be more open to _____ what we have.",
    options: [
      "① guarding",
      "② hiding",
      "③ sharing",
      "④ selling",
      "⑤ wasting"
    ],
    answer: 3,
    explanation: "부족할 때일수록 가진 것을 나누려 한다고 설명한다."
  },
  "10. p5-no.31": {
    text: "As humans, we _____?to new information and events both good and bad?and return to our personal default level of well-being.",
    options: [
      "① complain",
      "② predict",
      "③ adjust",
      "④ ignore",
      "⑤ accelerate"
    ],
    answer: 3,
    explanation: "사람은 새로운 일에 적응해 기본 행복 수준으로 돌아간다."
  },
  "11. p5-no.32": {
    text: "This natural chemical builds up in your blood as time awake increases. While you sleep, your body _____ the adenosine.",
    options: [
      "① hoards",
      "② breaks down",
      "③ multiplies",
      "④ colors",
      "⑤ shares"
    ],
    answer: 2,
    explanation: "잠을 자는 동안 아데노신을 분해한다고 설명한다."
  },
  "12. p6-no.33": {
    text: "If I care only about what minute the sun will rise tomorrow, then the number quoted here is _____.",
    options: [
      "① useless",
      "② fine",
      "③ dangerous",
      "④ hidden",
      "⑤ imaginary"
    ],
    answer: 2,
    explanation: "용도에 따라 같은 수치도 충분히 정확할 수 있다."
  },
  "13. p6-no.34": {
    text: "This transformation cannot happen without _____.",
    options: [
      "① fossil fuels",
      "② solar panels",
      "③ ancient myths",
      "④ volunteer labor",
      "⑤ instant teleportation"
    ],
    answer: 1,
    explanation: "재생에너지 전환에도 화석연료가 필요하다고 지적한다."
  },
  "14. p6-no.35": {
    text: "A few years later, MIT professor John McCarthy coined 'artificial intelligence,' replacing the previously used expression _____.",
    options: [
      "① cosmic harmony",
      "② automata studies",
      "③ musical chairs",
      "④ digital painting",
      "⑤ parallel poetry"
    ],
    answer: 2,
    explanation: "기존 용어 automata studies를 AI로 바꾸었다고 소개한다."
  },
  "15. p6-no.36": {
    text: "The tortoise stocks up on water by eating plants and _____ to collect rain.",
    options: [
      "① sculpting statues",
      "② digging holes",
      "③ painting shells",
      "④ stretching legs",
      "⑤ humming songs"
    ],
    answer: 2,
    explanation: "식물과 빗물을 모아 물을 저장한다고 설명한다."
  },
  "16. p7-no.37": {
    text: "Because the brakes change your movement, making you slow down more suddenly, they must be exerting a force on the bicycle and you. This is the force called _____.",
    options: [
      "① friction",
      "② fusion",
      "③ expansion",
      "④ radiation",
      "⑤ levitation"
    ],
    answer: 1,
    explanation: "마찰력 때문에 자전거가 멈춘다고 설명한다."
  },
  "17. p7-no.38": {
    text: "With nonlinear editing, shots and scenes can be easily added or removed anywhere in the program, and the computer _____ the program length automatically.",
    options: [
      "① guesses",
      "② adjusts",
      "③ ignores",
      "④ resists",
      "⑤ forgets"
    ],
    answer: 2,
    explanation: "비선형 편집은 프로그램 길이를 자동으로 조절한다."
  },
  "18. p7-no.39": {
    text: "But actual _____ are important. A person who always tries to prevent harm but never does is not generally thought of as morally good.",
    options: [
      "① schedules",
      "② consequences",
      "③ costumes",
      "④ slogans",
      "⑤ invitations"
    ],
    answer: 2,
    explanation: "실제 결과가 있어야 도덕적으로 선하다고 본다."
  },
  "19. p7-no.40": {
    text: "The functional relationship we have with objects creates visual expectations that _____ with our ability to see 'like a camera.'",
    options: [
      "① harmonize",
      "② interfere",
      "③ celebrate",
      "④ memorize",
      "⑤ applaud"
    ],
    answer: 2,
    explanation: "기능적 관계가 카메라처럼 객관적으로 보는 것을 방해한다."
  },
  "20. p8-no.41~42": {
    text: "'May I help you?' are the worst four words that a retail salesperson can utter because they don't encourage the customer to talk and put them on the _____.",
    options: [
      "① stage",
      "② defensive",
      "③ escalator",
      "④ headline",
      "⑤ mailing list"
    ],
    answer: 2,
    explanation: "이 말은 고객을 방어적으로 만든다고 했다."
  },
  "21. p8-no.43~45": {
    text: "With a determined expression, he kept _____ pushing the dollar bill into the machine.",
    options: [
      "① aimlessly",
      "② proudly",
      "③ fearfully",
      "④ angrily",
      "⑤ secretly"
    ],
    answer: 1,
    explanation: "소년은 결심한 표정으로 계속 돈을 넣었다고 묘사된다."
  }
};
const TITLE_BANK = {
  "1. p2-no.18": {
    options: [
      "① Extending Library Hours for Student Success",
      "② Building a Brand-New School Auditorium",
      "③ Managing Noise Complaints in the Library",
      "④ Encouraging Students to Join Sports Clubs"
    ],
    answer: 1,
    explanation: "글의 핵심은 도서관 운영 시간 연장 요청이다."
  },
  "2. p2-no.19": {
    options: [
      "① Waiting for the Wizard of Oz Call",
      "② Practicing Piano with My Father",
      "③ Casting Spells on Stagehands",
      "④ Returning Costumes After the Show"
    ],
    answer: 1,
    explanation: "오디션 결과 전화를 기다리는 내용이다."
  },
  "3. p2-no.20": {
    options: [
      "① Start Strong with a Classroom Warm-Up",
      "② The Dangers of Arriving to Class Late",
      "③ How to Punish Distracted Students",
      "④ Turning Homework into Group Games"
    ],
    answer: 1,
    explanation: "수업 시작 루틴의 중요성을 다룬다."
  },
  "4. p3-no.21": {
    options: [
      "① Borrowed Atoms in Our Bodies",
      "② Why Stars Disappear Quickly",
      "③ The Secret Recipe for Making Gold",
      "④ How to Store Air in Your Lungs"
    ],
    answer: 1,
    explanation: "우리 몸의 원자가 얼마나 오래되었는지 설명한다."
  },
  "5. p3-no.22": {
    options: [
      "① Gardening for Body and Mind",
      "② Protecting Plants from Night Pests",
      "③ Building a Backyard Observatory",
      "④ Growing Vegetables without Water"
    ],
    answer: 1,
    explanation: "정원 가꾸기의 신체·정신 건강 효과를 강조한다."
  },
  "6. p3-no.23": {
    options: [
      "① Tools That Expand Human Senses",
      "② Why Telescopes Are Dangerous",
      "③ The End of Scientific Instruments",
      "④ Learning to Ignore New Data"
    ],
    answer: 1,
    explanation: "도구가 인간 감각을 확장한다고 설명한다."
  },
  "7. p3-no.24": {
    options: [
      "① Questioning Animal Experimentation's Impact",
      "② Celebrating Every Laboratory Triumph",
      "③ Training Doctors to Handle Fewer Patients",
      "④ Teaching Pets to Perform Surgery"
    ],
    answer: 1,
    explanation: "동물실험과 의학 발전의 상관관계를 비판한다."
  },
  "8. p5-no.29": {
    options: [
      "① Why Gazelles Stayed Wild",
      "② The Easiest Animals to Tame",
      "③ Building the Perfect Barn",
      "④ Gourmet Meals for Desert Creatures"
    ],
    answer: 1,
    explanation: "가젤이 길들이기 어려운 이유를 설명한다."
  },
  "9. p5-no.30": {
    options: [
      "① When Plenty Makes Us Stingy",
      "② How to Host Endless Feasts",
      "③ Designing the Perfect Fence",
      "④ Tracking Travelers across the Desert"
    ],
    answer: 1,
    explanation: "풍족함이 나눔을 막는 상황을 다룬다."
  },
  "10. p5-no.31": {
    options: [
      "① Returning to Our Happiness Baseline",
      "② Discovering the Saddest Song Ever",
      "③ Building a Toy Collection Forever",
      "④ Escaping from Every Emotion"
    ],
    answer: 1,
    explanation: "감정이 기본 수준으로 돌아오는 현상을 설명한다."
  },
  "11. p5-no.32": {
    options: [
      "① Why Your Body Demands Sleep",
      "② Celebrating the Benefits of All-Nighters",
      "③ Designing the Perfect Bedroom Decor",
      "④ How Dreams Predict the Future"
    ],
    answer: 1,
    explanation: "아데노신이 잠을 요구하는 이유를 다룬다."
  },
  "12. p6-no.33": {
    options: [
      "① Precision Depends on Purpose",
      "② Measuring the Sun Once and for All",
      "③ Mapping Every Street by Hand",
      "④ Counting Stars without Telescopes"
    ],
    answer: 1,
    explanation: "불확실성의 의미는 목적에 따라 달라진다."
  },
  "13. p6-no.34": {
    options: [
      "① The Hidden Cost of Going Green",
      "② Free Energy for Every Nation",
      "③ Why Oil Will Never Be Needed Again",
      "④ Teaching Children to Plant Trees"
    ],
    answer: 1,
    explanation: "에너지 전환에 드는 비용과 화석연료 사용 문제를 지적한다."
  },
  "14. p6-no.35": {
    options: [
      "① Dreaming of Thinking Machines",
      "② Forgetting the Legends of Greece",
      "③ Acting Lessons for Artificial Actors",
      "④ How to Unplug Every Computer"
    ],
    answer: 1,
    explanation: "사람처럼 생각하는 기계를 꿈꾼 역사를 소개한다."
  },
  "15. p6-no.36": {
    options: [
      "① How the Desert Tortoise Saves Water",
      "② Teaching Pets to Swim in Sand",
      "③ Building a Turtle Water Park",
      "④ Why Rain Never Reaches Reptiles"
    ],
    answer: 1,
    explanation: "사막 거북이가 물을 저장하는 방식을 설명한다."
  },
  "16. p7-no.37": {
    options: [
      "① Friction Slows You Down",
      "② Riding with Rockets Every Morning",
      "③ Painting Bicycles for Fun",
      "④ The Secret Life of Brake Lights"
    ],
    answer: 1,
    explanation: "마찰력이 속도를 줄인다고 설명한다."
  },
  "17. p7-no.38": {
    options: [
      "① Editing Freedom in the Digital Era",
      "② Why Tape Machines Are Faster",
      "③ Throwing Away Every Raw Footage",
      "④ Planning a Movie with Paper Only"
    ],
    answer: 1,
    explanation: "비선형 편집의 장점을 다룬다."
  },
  "18. p7-no.39": {
    options: [
      "① Doing Good Requires Good Outcomes",
      "② Let Intentions Handle Everything",
      "③ How to Ignore Other People",
      "④ Practicing Kindness Once a Year"
    ],
    answer: 1,
    explanation: "선한 의도와 결과가 모두 필요하다고 강조한다."
  },
  "19. p7-no.40": {
    options: [
      "① Why We Can't See Like a Camera",
      "② Building Better Digital Lenses",
      "③ Photographing Deserts at Night",
      "④ Teaching Robots to Blink"
    ],
    answer: 1,
    explanation: "기능적 선입견이 시각을 제한한다고 설명한다."
  },
  "20. p8-no.41~42": {
    options: [
      "① A Better Way to Greet Customers",
      "② How to Sell Only to Friends",
      "③ Closing Shops Earlier Every Day",
      "④ Designing Expensive Shopping Bags"
    ],
    answer: 1,
    explanation: "형식적 인사 대신 열린 질문이 필요하다는 내용이다."
  },
  "21. p8-no.43~45": {
    options: [
      "① A Small Kindness at the Vending Machine",
      "② Winning the Cafeteria Talent Show",
      "③ Planning a Prank on New Students",
      "④ Studying Alone in the Library"
    ],
    answer: 1,
    explanation: "작은 친절이 서로를 위로하는 장면을 그린다."
  }
};
const THEME_BANK = {
  "1. p2-no.18": {
    options: [
      "① 학생들의 학습을 돕기 위해 도서관 운영 시간을 늘려 달라는 요청",
      "② 도서관 소음 문제로 이용을 제한해야 한다는 주장",
      "③ 학생회장의 개인적인 진로 고민 공유",
      "④ 학교 보안 강화를 위한 규칙 안내"
    ],
    answer: 1,
    explanation: "전체 글은 도서관 운영 시간 연장을 요구한다."
  },
  "2. p2-no.19": {
    options: [
      "① 초조함 속에서도 공연에 참여하게 된 기쁨을 느끼는 화자",
      "② 아버지에게 연기를 그만두라고 설득하는 딸",
      "③ 친구와 역할을 놓고 다투는 배우 지망생",
      "④ 오디션 준비 대신 학업을 선택한 학생"
    ],
    answer: 1,
    explanation: "오디션 결과를 기다리는 감정과 합격의 기쁨을 다룬다."
  },
  "3. p2-no.20": {
    options: [
      "① 수업 시작 시간을 계획적으로 활용해야 한다는 조언",
      "② 학생들은 스스로 수업을 진행해야 한다는 주장",
      "③ 교실 환경을 꾸미는 방법 소개",
      "④ 수업 전 체육 활동을 해야 한다는 제안"
    ],
    answer: 1,
    explanation: "첫 몇 분의 루틴이 수업 분위기를 만든다고 강조한다."
  },
  "4. p3-no.21": {
    options: [
      "① 우리는 우주의 원자를 함께 빌려 쓰고 있다는 깨달음",
      "② 인간은 스스로 새로운 원자를 만들어 낼 수 있다는 확신",
      "③ 우주가 곧 사라질 것이라는 경고",
      "④ 원자는 더 이상 중요하지 않다는 주장"
    ],
    answer: 1,
    explanation: "원자는 순환하며 모두가 공유한다고 설명한다."
  },
  "5. p3-no.22": {
    options: [
      "① 정원 가꾸기는 신체와 정신 건강 모두에 도움이 된다",
      "② 정원 가꾸기는 높은 비용이 들어 부담스럽다",
      "③ 정원 가꾸기는 젊은 사람만 할 수 있는 활동이다",
      "④ 정원 가꾸기는 경쟁심을 키우는 수단이다"
    ],
    answer: 1,
    explanation: "운동과 마음의 안정에 도움이 됨을 강조한다."
  },
  "6. p3-no.23": {
    options: [
      "① 도구는 인간의 감각을 확장해 보이지 않던 현상을 보여 준다",
      "② 감각을 쓰지 않는 것이 과학적 사고에 더 도움이 된다",
      "③ 기술은 자연 현상을 왜곡하므로 사용을 줄여야 한다",
      "④ 인간 감각은 완벽하니 도구가 필요 없다"
    ],
    answer: 1,
    explanation: "과학 도구의 감각 확장 기능을 설명한다."
  },
  "7. p3-no.24": {
    options: [
      "① 상관관계가 인과관계로 착각되는 문제를 경계해야 한다",
      "② 동물실험은 의학 발전에 절대적으로 필요하다",
      "③ 동물실험은 이미 사라지고 있다는 사실",
      "④ 의학 발전은 과거와 관련이 없다"
    ],
    answer: 1,
    explanation: "법적 요구로 생긴 상관관계를 인과로 착각하면 안 된다고 경고한다."
  },
  "8. p5-no.29": {
    options: [
      "① 겁 많고 빠른 동물은 길들이기 어렵다",
      "② 모든 초식동물은 쉽게 길들여진다",
      "③ 인간은 사냥을 멈춰야 한다",
      "④ 야생동물은 스스로 우리에 들어온다"
    ],
    answer: 1,
    explanation: "가젤을 예로 들어 길들이기 어려움을 설명한다."
  },
  "9. p5-no.30": {
    options: [
      "① 풍족함이 오히려 나눔을 어렵게 만들 수 있다",
      "② 부족하면 서로 돕지 않게 된다",
      "③ 부자는 모두 나눔을 즐긴다",
      "④ 여행자는 언제나 문전박대를 당한다"
    ],
    answer: 1,
    explanation: "풍족함이 벽을 만들고 소통을 줄인다고 지적한다."
  },
  "10. p5-no.31": {
    options: [
      "① 사람은 좋은 일과 나쁜 일 모두에 적응한다",
      "② 감정은 한 번 생기면 영원히 유지된다",
      "③ 아이들은 장난감을 금방 잊지 못한다",
      "④ 기쁨은 슬픔보다 더 빨리 사라진다"
    ],
    answer: 1,
    explanation: "감정이 결국 기본 수준으로 돌아온다고 말한다."
  },
  "11. p5-no.32": {
    options: [
      "① 아데노신 축적이 잠의 필요성을 알려 준다",
      "② 의지만 강하면 잠이 필요 없다",
      "③ 수면은 건강과 무관하다",
      "④ 잠을 줄이면 생산성이 높아진다"
    ],
    answer: 1,
    explanation: "과학적 근거로 수면의 필요를 설명한다."
  },
  "12. p6-no.33": {
    options: [
      "① 불확실성의 의미는 활용 목적에 따라 달라진다",
      "② 숫자는 언제나 동일한 가치를 지닌다",
      "③ 정확성은 일상생활에 필요 없다",
      "④ 측정값은 믿을 수 없으니 버려야 한다"
    ],
    answer: 1,
    explanation: "정확성 판단이 상황에 따라 달라짐을 설명한다."
  },
  "13. p6-no.34": {
    options: [
      "① 재생에너지 전환에는 숨은 비용과 화석연료 사용이 따른다",
      "② 재생에너지 전환은 거의 비용이 들지 않는다",
      "③ 화석연료는 이미 사라졌다",
      "④ 에너지 전환은 기술과 무관하다"
    ],
    answer: 1,
    explanation: "전환 비용과 자원 문제를 함께 고려해야 함을 강조한다."
  },
  "14. p6-no.35": {
    options: [
      "① 인간은 오래전부터 지능형 기계를 꿈꿔 왔다",
      "② 인공지능은 최근 갑자기 등장한 발명이다",
      "③ 기계는 결코 사람처럼 생각할 수 없다",
      "④ 신화와 과학은 전혀 연결되지 않는다"
    ],
    answer: 1,
    explanation: "역사 속에서 AI 개념이 발전해 왔다고 설명한다."
  },
  "15. p6-no.36": {
    options: [
      "① 사막 거북이는 방광을 이용해 물을 저장한다",
      "② 거북이는 비를 모으지 못한다",
      "③ 사람의 도움 없이는 생존할 수 없다",
      "④ 거북이는 더위를 피해 바다로 이동한다"
    ],
    answer: 1,
    explanation: "방광에 물을 저장하므로 함부로 잡지 말라고 당부한다."
  },
  "16. p7-no.37": {
    options: [
      "① 마찰력은 물체의 운동을 느리게 만든다",
      "② 공기 저항은 항상 속도를 높인다",
      "③ 자전거는 힘이 없어도 계속 달린다",
      "④ 브레이크는 장식용 장치다"
    ],
    answer: 1,
    explanation: "마찰력과 공기 저항이 속도를 줄임을 설명한다."
  },
  "17. p7-no.38": {
    options: [
      "① 비선형 편집은 원하는 장면을 자유롭게 수정할 수 있게 한다",
      "② 필름 편집이 가장 빠르고 효율적이다",
      "③ 영상 편집은 순차적으로만 가능하다",
      "④ 비선형 편집은 효과를 만들 수 없다"
    ],
    answer: 1,
    explanation: "디지털 편집의 장점을 소개한다."
  },
  "18. p7-no.39": {
    options: [
      "① 도덕적으로 선하려면 의도와 결과가 모두 중요하다",
      "② 선한 마음만 있으면 충분하다",
      "③ 우연히 좋은 결과가 나면 항상 선하다",
      "④ 결과는 전혀 중요하지 않다"
    ],
    answer: 1,
    explanation: "선한 의도와 실질적 결과를 모두 강조한다."
  },
  "19. p7-no.40": {
    options: [
      "① 기능적 관계가 시각적 선입견을 만든다",
      "② 사진은 현실을 왜곡한다",
      "③ 인간의 눈은 언제나 객관적이다",
      "④ 사물은 기능과 무관하게 보인다"
    ],
    answer: 1,
    explanation: "물건과의 관계가 인식 방식을 좌우한다고 말한다."
  },
  "20. p8-no.41~42": {
    options: [
      "① 형식적인 질문보다 열린 대화가 고객을 편안하게 한다",
      "② 고객은 도움을 전혀 원하지 않는다",
      "③ 판매원은 말을 줄이는 것이 좋다",
      "④ 인사는 간단히 끝내야 한다"
    ],
    answer: 1,
    explanation: "열린 질문이 판매에 유리하다고 설명한다."
  },
  "21. p8-no.43~45": {
    options: [
      "① 작은 친절과 포기가 서로에게 큰 위로가 된다",
      "② 실수한 학생에게 벌을 주는 장면이다",
      "③ 친구를 놀리면 재미있다는 이야기다",
      "④ 혼자 있는 학생은 항상 위험하다"
    ],
    answer: 1,
    explanation: "따뜻한 도움과 공감을 전하는 이야기다."
  }
};
const IMPLICIT_BANK = {
  "1. p2-no.18": {
    text: "This change would greatly benefit students by providing additional time to focus on their academic goals. I hope you will consider this proposal as a step toward improving our academic environment and <u>better supporting our needs</u>.",
    options: [
      "① 학생들의 요구에 더 잘 맞춰 달라는 뜻이다.",
      "② 도서관 대신 체육관을 사용하라는 의미다.",
      "③ 자율학습을 중단하겠다는 의도다.",
      "④ 도서관을 폐쇄해도 괜찮다는 생각이다.",
      "⑤ 학생회장이 사퇴하겠다는 암시다."
    ],
    answer: 1,
    explanation: "학생들이 원하는 학습 환경을 마련해 달라는 의미다."
  },
  "2. p2-no.19": {
    text: "He announced, \"That was The Wizard of Oz. You're second senior munchkin.\" I got a little rush of excitement, knowing <u>I was in ? that whatever happened I could be involved in one of the productions</u>.",
    options: [
      "① 어떤 역할이든 무대에 설 기회를 얻었다는 뜻이다.",
      "② 이번 공연에 참여하지 않겠다는 말이다.",
      "③ 오디션을 다시 봐야 한다는 통보다.",
      "④ 연출가로 활동하게 되었다는 의미다.",
      "⑤ 다른 극단으로 옮기라는 요구다."
    ],
    answer: 1,
    explanation: "조연으로라도 공연에 참여하게 되었다는 기쁨을 드러낸다."
  },
  "3. p2-no.20": {
    text: "If you are prepared for class and have taught your students an opening routine, they can use this brief time to <u>make mental and emotional transitions</u> from the last class and prepare to focus on learning new material.",
    options: [
      "① 앞선 수업에서 새로운 수업으로 마음과 생각을 옮긴다는 뜻이다.",
      "② 이전 수업 내용을 모두 잊어버리게 한다는 의미다.",
      "③ 학생들에게 휴식을 길게 주어야 한다는 말이다.",
      "④ 학생들에게 감정을 숨기게 하려는 의도다.",
      "⑤ 수업 전 교사와 상담을 하라는 지시다."
    ],
    answer: 1,
    explanation: "이전 수업에서 벗어나 새 수업에 집중하도록 돕는다는 의미다."
  },
  "4. p3-no.21": {
    text: "You're the present caretaker of the atoms in your body. There will be many who will follow you, because we all <u>borrow</u> the same atoms.",
    options: [
      "① 잠시 맡아 두었다가 다른 곳으로 옮겨간다는 뜻이다.",
      "② 원자를 완전히 소유할 수 있다는 의미다.",
      "③ 새로운 원자를 만들어 낼 수 있다는 뜻이다.",
      "④ 원자를 버려도 상관없다는 말이다.",
      "⑤ 원자를 다시 되돌려 받을 수 없다는 의미다."
    ],
    answer: 1,
    explanation: "원자는 잠시 사용하는 것이며 언젠가 다른 존재에게 간다는 의미다."
  },
  "5. p3-no.22": {
    text: "The sense of accomplishment from watching your plants grow and thrive can also <u>boost self-esteem and overall well-being</u>.",
    options: [
      "① 자신감과 전반적인 행복감을 높여 준다는 뜻이다.",
      "② 자존심을 버리라는 의미다.",
      "③ 건강을 해친다는 경고다.",
      "④ 다른 취미를 포기하라는 말이다.",
      "⑤ 성장 과정이 지루하다는 표현이다."
    ],
    answer: 1,
    explanation: "정원 가꾸기가 자신감을 높이고 행복감을 준다는 의미다."
  },
  "6. p3-no.23": {
    text: "Some of these take the form of expanding the reach of our current senses, such as <u>creating visible images based on the ultraviolet spectrum of light</u>.",
    options: [
      "① 눈에 보이지 않는 영역을 눈으로 볼 수 있게 해 준다는 뜻이다.",
      "② 눈을 감고도 모든 것을 본다는 의미다.",
      "③ 빛을 전혀 사용하지 않는다는 말이다.",
      "④ 감각을 줄여야 한다는 주장이다.",
      "⑤ 자연의 빛을 없애겠다는 선언이다."
    ],
    answer: 1,
    explanation: "보이지 않는 자외선 영역을 가시화한다는 뜻이다."
  },
  "7. p3-no.24": {
    text: "The correlation between animal experimentation and medical discovery is the result of <u>legal necessity</u>, not evidence that animal experimentation led to medical advances.",
    options: [
      "① 법 규정 때문에 어쩔 수 없이 나타난 결과라는 뜻이다.",
      "② 실험이 전혀 필요 없었다는 말이다.",
      "③ 법이 모두 잘못되었다는 주장이다.",
      "④ 의사들이 법을 무시한다는 의미다.",
      "⑤ 실험이 불법이라는 의미다."
    ],
    answer: 1,
    explanation: "법이 요구해서 생긴 상관관계라는 점을 강조한다."
  },
  "8. p5-no.29": {
    text: "Just imagine trying to herd an animal that runs away, <u>blindly hits itself against walls</u>, can leap up to nearly 30 feet, and can run at a speed of 50 miles per hour!",
    options: [
      "① 겁에 질려 앞을 보지 못한 채 부딪힌다는 뜻이다.",
      "② 벽을 정확히 계산해 뛰어넘는다는 의미다.",
      "③ 벽에 그림을 그린다는 표현이다.",
      "④ 벽을 쉽게 허문다는 말이다.",
      "⑤ 벽을 좋아한다는 표현이다."
    ],
    answer: 1,
    explanation: "두려움으로 벽에 부딪혀 다칠 위험이 크다는 의미다."
  },
  "9. p5-no.30": {
    text: "Our desire for more, combined with our decreased physical interaction with the 'common folk,' starts to create a <u>disconnection</u> or blindness to reality.",
    options: [
      "① 평범한 사람들과의 거리가 벌어진다는 뜻이다.",
      "② 모두와 더 가까워진다는 의미다.",
      "③ 현실을 더 잘 본다는 말이다.",
      "④ 사람들을 무조건 배척하라는 뜻이다.",
      "⑤ 부자가 되는 것이 불가능하다는 의미다."
    ],
    answer: 1,
    explanation: "나눔이 줄어들며 현실과 단절된다는 의미다."
  },
  "10. p5-no.31": {
    text: "Like water seeking its own level, we are pulled toward our <u>baseline</u> ? back up after bad news and back down after good.",
    options: [
      "① 기본적인 행복 수준으로 돌아간다는 뜻이다.",
      "② 새로운 감정을 계속 유지한다는 의미다.",
      "③ 감정이 완전히 사라진다는 말이다.",
      "④ 다른 사람의 기분을 복제한다는 뜻이다.",
      "⑤ 기쁨만 남기고 슬픔은 없앤다는 의미다."
    ],
    answer: 1,
    explanation: "결국 원래의 행복 수준으로 돌아온다는 의미다."
  },
  "11. p5-no.32": {
    text: "Because of such built-in molecular feedback, <u>you can't become accustomed to getting less sleep than your body needs</u>.",
    options: [
      "① 몸이 필요로 하는 잠을 줄이면 결국 한계가 온다는 뜻이다.",
      "② 잠을 줄일수록 더 건강해진다는 의미다.",
      "③ 잠을 줄이면 새로운 습관이 생긴다는 말이다.",
      "④ 잠을 줄이면 꿈을 더 꾸게 된다는 뜻이다.",
      "⑤ 잠을 줄이면 공부 시간이 늘어난다는 의미다."
    ],
    answer: 1,
    explanation: "잠을 줄이면 몸이 결국 다시 부족한 잠을 채우려 한다는 의미다."
  },
  "12. p6-no.33": {
    text: "If the next digit is uncertain, that means the uncertainty in knowing the precise Earth-sun distance is <u>larger than the distance between New York and Chicago</u>!",
    options: [
      "① 오차 범위가 상당히 크다는 뜻이다.",
      "② 도시 간 거리가 의미 없다는 말이다.",
      "③ 지구와 태양 거리가 도시보다 가깝다는 의미다.",
      "④ 도시 이름을 변경해야 한다는 주장이다.",
      "⑤ 비행기를 타야만 한다는 의미다."
    ],
    answer: 1,
    explanation: "오차가 실제 도시 거리보다 크다는 점을 강조한다."
  },
  "13. p6-no.34": {
    text: "Heinberg remarks that the cost of building this new energy infrastructure is <u>seldom counted in transition proposals</u>.",
    options: [
      "① 전환 계획에 공사 비용을 거의 반영하지 않는다는 뜻이다.",
      "② 전환 비용을 충분히 고려한다는 의미다.",
      "③ 공사가 너무 쉬워 비용이 들지 않는다는 말이다.",
      "④ 계획이 모두 취소되었다는 뜻이다.",
      "⑤ 설비가 무료로 제공된다는 의미다."
    ],
    answer: 1,
    explanation: "전환 비용이 과소평가되고 있음을 지적한다."
  },
  "14. p6-no.35": {
    text: "Since then, artificial intelligence has become the study and practice of 'making intelligent machines' that are <u>programmed to think like humans</u>.",
    options: [
      "① 인간처럼 사고하도록 설계된다는 뜻이다.",
      "② 인간의 감정을 없앤다는 의미다.",
      "③ 컴퓨터를 모두 파괴한다는 말이다.",
      "④ 사람을 대신해 감옥에 보낸다는 뜻이다.",
      "⑤ 인간과 완전히 단절된다는 의미다."
    ],
    answer: 1,
    explanation: "기계가 인간과 비슷하게 사고하도록 만드는 연구라는 의미다."
  },
  "15. p6-no.36": {
    text: "Tortoises become so terrified when people pick them up that <u>they empty their bladders, losing their precious water reserves</u>.",
    options: [
      "① 사람 손에 들리면 저장한 물을 버리게 된다는 뜻이다.",
      "② 사람을 좋아해 물을 나눠 준다는 의미다.",
      "③ 방광이 필요 없다는 말이다.",
      "④ 거북이가 물을 마시지 않는다는 뜻이다.",
      "⑤ 거북이가 물 대신 모래를 마신다는 의미다."
    ],
    answer: 1,
    explanation: "건드리면 물을 버려 생존이 위협받을 수 있음을 뜻한다."
  },
  "16. p7-no.37": {
    text: "Another is air resistance, which you can feel, <u>pushing you backwards</u> as you and the bicycle move forwards.",
    options: [
      "① 공기 저항이 뒤에서 밀어 속도를 줄인다는 뜻이다.",
      "② 공기가 앞에서 끌어 준다는 의미다.",
      "③ 공기가 항상 도움만 준다는 말이다.",
      "④ 공기가 무게를 줄인다는 뜻이다.",
      "⑤ 공기를 마시면 속도가 빨라진다는 의미다."
    ],
    answer: 1,
    explanation: "공기 저항이 진행 방향과 반대로 작용한다는 의미다."
  },
  "17. p7-no.38": {
    text: "Linear editing was like composing a paper on a typewriter. If a mistake was made or new information needed to be added the whole piece had to be retyped. Nonlinear editing, on the other hand, is like using a word processing program. If a mistake is made, it is easily deleted and fixed with a few keystrokes, and new information can be added easily. 이 비유에서 <u>nonlinear editing</u>은 무엇을 뜻하는가?",
    options: [
      "① 컴퓨터로 쉽게 수정·추가할 수 있는 편집 방식",
      "② 종이로만 작업해야 하는 방식",
      "③ 영화를 한 번만 촬영해야 하는 규칙",
      "④ 편집을 완전히 없애자는 주장",
      "⑤ 타자기를 새로 사야 한다는 의미"
    ],
    answer: 1,
    explanation: "비선형 편집이 컴퓨터 기반으로 쉽게 수정 가능함을 비유한 것이다."
  },
  "18. p7-no.39": {
    text: "Of such a person, it may be said that she means well; but, contrary to Kant, <u>some results are necessary before she is regarded as morally good</u>.",
    options: [
      "① 실제로 좋은 결과가 있어야 도덕적으로 선하다고 여겨진다는 뜻이다.",
      "② 결과와 상관없이 의도만 좋으면 된다는 의미다.",
      "③ 칸트의 주장을 그대로 따른다는 말이다.",
      "④ 결과가 나쁘면 의도가 없어도 된다는 뜻이다.",
      "⑤ 타인의 결과를 빼앗으라는 의미다."
    ],
    answer: 1,
    explanation: "좋은 의도 외에도 실제 결과가 필요함을 강조한다."
  },
  "19. p7-no.40": {
    text: "In viewing a scene, we establish unconscious hierarchies that reflect our functional relationship to objects and our momentary priorities. 이때 <u>unconscious hierarchies</u>가 의미하는 것은?",
    options: [
      "① 무의식적으로 기능 중심으로 사물을 중요도에 따라 배열하는 것",
      "② 의식적으로 숫자를 세는 것",
      "③ 사진을 무조건 믿는 태도",
      "④ 사물을 전혀 인식하지 못하는 상태",
      "⑤ 물체를 모두 같은 크기로 본다는 생각"
    ],
    answer: 1,
    explanation: "무의식적으로 기능에 따라 시각적 우선순위를 정한다는 의미다."
  },
  "20. p8-no.41~42": {
    text: "This line is a <u>rote approach</u> that is so overused by untrained and uninterested salespeople.",
    options: [
      "① 진심 없이 습관처럼 반복되는 말이라는 뜻이다.",
      "② 창의적이고 새롭다는 의미다.",
      "③ 고객에게 감동을 준다는 뜻이다.",
      "④ 판매원이 공부를 마쳤다는 의미다.",
      "⑤ 판매원이 도움을 거절하라는 말이다."
    ],
    answer: 1,
    explanation: "습관적으로 반복되는 형식적인 멘트라는 의미다."
  },
  "21. p8-no.43~45": {
    text: "As I walked away from my lunch table that day, I looked at Dave. I thought <u>he and the dollar were very much alike</u>.",
    options: [
      "① 둘 다 쉽게 받아들여지지 못했다는 뜻이다.",
      "② 둘 다 새것이라는 의미다.",
      "③ 둘 다 값비싸다는 말이다.",
      "④ 둘 다 잃어버렸다는 뜻이다.",
      "⑤ 둘 다 쓸모없다는 의미다."
    ],
    answer: 1,
    explanation: "소년과 지폐 모두 받아들여지지 못했지만 결국 제자리를 찾게 되리란 희망을 드러낸다."
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
    const blankProblems = [];
    const titleProblems = [];
    const themeProblems = [];
    const implicitProblems = [];
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
          mainText: questionText,
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

      // Blank
      const blankInfo = BLANK_BANK[source];
      if (blankInfo) {
        blankProblems.push({
          type: 'blank',
          question: '다음 글의 빈칸에 들어갈 말로 가장 적절한 것은?',
          mainText: passage,
          blankText: blankInfo.text,
          options: blankInfo.options,
          answer: String(blankInfo.answer),
          explanation: blankInfo.explanation,
          metadata: {
            source,
            passageIndex: index + 1
          }
        });
      } else {
        failures.push({ type: 'blank', source, reason: '빈칸 데이터 없음' });
      }
      // Title
      const titleInfo = TITLE_BANK[source];
      if (titleInfo) {
        titleProblems.push({
          type: 'title',
          question: '다음 글의 제목으로 가장 적절한 것은?',
          mainText: passage,
          options: titleInfo.options,
          answer: String(titleInfo.answer),
          explanation: titleInfo.explanation,
          metadata: {
            source,
            passageIndex: index + 1
          }
        });
      } else {
        failures.push({ type: 'title', source, reason: '제목 데이터 없음' });
      }

      // Theme
      const themeInfo = THEME_BANK[source];
      if (themeInfo) {
        themeProblems.push({
          type: 'theme',
          question: '다음 글의 주제로 가장 적절한 것은?',
          mainText: passage,
          options: themeInfo.options,
          answer: String(themeInfo.answer),
          explanation: themeInfo.explanation,
          metadata: {
            source,
            passageIndex: index + 1
          }
        });
      } else {
        failures.push({ type: 'theme', source, reason: '주제 데이터 없음' });
      }

      // Implicit meaning
      const implicitInfo = IMPLICIT_BANK[source];
      if (implicitInfo) {
        implicitProblems.push({
          type: 'implicit',
          question: '다음 글에서 밑줄 친 부분이 가장 가까이 의미하는 것은?',
          mainText: implicitInfo.text,
          options: implicitInfo.options,
          answer: String(implicitInfo.answer),
          explanation: implicitInfo.explanation,
          metadata: {
            source,
            passageIndex: index + 1,
            originalPassage: passage
          }
        });
      } else {
        failures.push({ type: 'implicit', source, reason: '함축 의미 데이터 없음' });
      }
    });

    const output = {
      documentTitle: parsed.title,
      generatedAt: new Date().toISOString(),
      counts: {
        grammar: grammarProblems.length,
        vocabulary: vocabularyProblems.length,
        summary: summaryProblems.length,
        blank: blankProblems.length,
        title: titleProblems.length,
        theme: themeProblems.length,
        implicit: implicitProblems.length
      },
      grammar: grammarProblems,
      vocabulary: vocabularyProblems,
      summary: summaryProblems,
      blank: blankProblems,
      title: titleProblems,
      theme: themeProblems,
      implicit: implicitProblems,
      failures
    };

    fs.writeFileSync('generated_full_problem_set.json', JSON.stringify(output, null, 2), 'utf8');
    console.log(`Generated grammar:${grammarProblems.length}, vocabulary:${vocabularyProblems.length}, summary:${summaryProblems.length}, blank:${blankProblems.length}, title:${titleProblems.length}, theme:${themeProblems.length}, implicit:${implicitProblems.length}. Failures: ${failures.length}`);
  } catch (error) {
    console.error('Failed to generate full problem set:', error);
    process.exit(1);
  }
})();
