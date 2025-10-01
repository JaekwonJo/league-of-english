const SUMMARY_FALLBACK = [
  {
    passage: "Schools introduced five-minute mindfulness breaks so students could reset between classes. Teachers reported fewer classroom disruptions, and students said they felt less anxious about exams.",
    summarySentence: "(A) mindfulness breaks helped students return to their (B) calm baseline.",
    options: [
      "\u2460 short pauses \u2013 disrupted focus",
      "\u2461 brief breathing \u2013 calmer baseline",
      "\u2462 longer lectures \u2013 higher stress",
      "\u2463 strict routines \u2013 louder classrooms",
      "\u2464 heavy workloads \u2013 quicker burnout"
    ],
    answer: "2",
    explanation: "Mindfulness breaks reduced anxiety and restored focus.",
    sourceLabel: "\uCD9C\uCC98: LoE Summary Essential"
  },
  {
    passage: "A community library extended its weekend hours after parents requested more study spaces. The longer schedule led to higher weekend attendance and new volunteer programs for tutoring younger students.",
    summarySentence: "(A) longer library hours created (B) new opportunities for students.",
    options: [
      "\u2460 shorter schedules \u2013 fewer tutors",
      "\u2461 longer hours \u2013 more support",
      "\u2462 weekend closures \u2013 higher demand",
      "\u2463 limited seating \u2013 reduced visits",
      "\u2464 strict silence \u2013 declining interest"
    ],
    answer: "2",
    explanation: "Extending hours led directly to additional study support.",
    sourceLabel: "\uCD9C\uCC98: LoE Summary Essential"
  },
  {
    passage: "Engineers developed a lightweight battery casing made from recycled aluminum. The design reduces manufacturing waste, cuts transportation costs, and keeps batteries cooler during use.",
    summarySentence: "(A) recycled casings lowered (B) waste and transport costs.",
    options: [
      "\u2460 reusable shells \u2013 heavier loads",
      "\u2461 recycled casings \u2013 higher waste",
      "\u2462 lighter housings \u2013 cooler operation",
      "\u2463 plastic covers \u2013 slower charging",
      "\u2464 rigid frames \u2013 rising expenses"
    ],
    answer: "3",
    explanation: "The recycled casing kept batteries lighter, cooler, and cheaper to ship.",
    sourceLabel: "\uCD9C\uCC98: LoE Summary Essential"
  }
];

const GRAMMAR_FALLBACK = [
  {
    mainText: "(A) Despite of the rain, the event continued.\n(B) Having finished the report, she took a break.\n(C) There solutions were presented at the meeting.\n(D) The committee has decided to postpone the launch.\n(E) The manager demanded that the file is submitted today.",
    options: [
      "\u2460 <u>Despite of</u> the rain, the event continued.",
      "\u2461 <u>Having finished</u> the report, she took a break.",
      "\u2462 <u>There</u> solutions were presented at the meeting.",
      "\u2463 The committee <u>has decided</u> to postpone the launch.",
      "\u2464 The manager demanded that the file <u>is submitted</u> today."
    ],
    answer: "2",
    explanation: "Sentence (B) is the only option without a grammatical error.",
    sourceLabel: "\uCD9C\uCC98: LoE Grammar Essential"
  },
  {
    mainText: "(A) Hardly had she entered than the phone rang.\n(B) Not only did he apologize, but he also offered help.\n(C) The equipment were delivered on time.\n(D) Each of the students is responsible for cleanup.\n(E) The project was completed ahead of schedule.",
    options: [
      "\u2460 Hardly had she entered <u>than</u> the phone rang.",
      "\u2461 Not only <u>did he apologize</u>, but he also offered help.",
      "\u2462 The equipment <u>were delivered</u> on time.",
      "\u2463 Each of the students <u>is responsible</u> for cleanup.",
      "\u2464 The project <u>was completed</u> ahead of schedule."
    ],
    answer: "4",
    explanation: "Only option (D) keeps subject-verb agreement intact.",
    sourceLabel: "\uCD9C\uCC98: LoE Grammar Essential"
  },
  {
    mainText: "(A) She made him to wait outside.\n(B) The news is encouraging for investors.\n(C) Anyone which arrives late must wait outside.\n(D) The book, the cover of which is torn, needs repair.\n(E) It is important that he finishes immediately.",
    options: [
      "\u2460 She made him <u>to wait</u> outside.",
      "\u2461 The news <u>is</u> encouraging for investors.",
      "\u2462 Anyone <u>which arrives</u> late must wait outside.",
      "\u2463 The book, the cover of which <u>is torn</u>, needs repair.",
      "\u2464 It is important that he <u>finishes</u> immediately."
    ],
    answer: "4",
    explanation: "Option (D) correctly uses the relative clause structure.",
    sourceLabel: "\uCD9C\uCC98: LoE Grammar Essential"
  }
];

const VOCAB_FALLBACK = [
  {
    passage: "The coach praised the <u>tenacious</u> defender for never giving up until the final whistle.",
    options: ["timid", "persistent", "careless", "rebellious"],
    answer: "2",
    explanation: "'Tenacious' means persistent and determined.",
    sourceLabel: "\uCD9C\uCC98: LoE Vocabulary Essential"
  },
  {
    passage: "Shoppers were surprised that the company would <u>reimburse</u> the full cost of the defective product.",
    options: ["replace", "apologize for", "refund", "inspect"],
    answer: "3",
    explanation: "'Reimburse' means to refund money that was spent.",
    sourceLabel: "\uCD9C\uCC98: LoE Vocabulary Essential"
  },
  {
    passage: "The speaker urged the audience to remain <u>vigilant</u> even after the immediate crisis had passed.",
    options: ["confident", "watchful", "relaxed", "aggressive"],
    answer: "2",
    explanation: "'Vigilant' describes being alert and watchful.",
    sourceLabel: "\uCD9C\uCC98: LoE Vocabulary Essential"
  },
  {
    passage: "Despite the CEO's calm statement, investors could sense the <u>turmoil</u> inside the company.",
    options: ["conflict", "growth", "cooperation", "prosperity"],
    answer: "1",
    explanation: "'Turmoil' refers to a state of great disturbance or confusion.",
    sourceLabel: "\uCD9C\uCC98: LoE Vocabulary Essential"
  },
  {
    passage: "The scientist was praised for proposing an <u>innovative</u> solution to the long-standing problem.",
    options: ["imaginative", "impractical", "delayed", "predictable"],
    answer: "1",
    explanation: "'Innovative' means imaginative and original.",
    sourceLabel: "\uCD9C\uCC98: LoE Vocabulary Essential"
  }
];

const TITLE_FALLBACK = [
  {
    passage: "Urban residents transformed an abandoned lot into a shared vegetable garden. The project improved the neighborhood's appearance and provided fresh produce to local families.",
    options: ["Growing Community Roots", "Designing Highways", "Fueling City Traffic", "Planning Winter Festivals"],
    answer: "1",
    explanation: "The passage focuses on a community garden initiative.",
    sourceLabel: "\uCD9C\uCC98: LoE Title Essential"
  },
  {
    passage: "Researchers tracked how sleep habits influence students' memory. They discovered that consistent bedtimes strengthen focus, while irregular schedules harm long-term retention.",
    options: ["Why Night Owls Excel", "Sleep Patterns Shape Memory", "Secrets of Weekend Study Groups", "Meal Plans for Busy Students"],
    answer: "2",
    explanation: "The main idea is the link between sleep patterns and memory.",
    sourceLabel: "\uCD9C\uCC98: LoE Title Essential"
  },
  {
    passage: "A small tech startup created solar-powered backpacks that recharge phones during daytime hikes. Demand grew quickly among campers looking to travel lighter.",
    options: ["Marketing Luxury Fashion", "Rethinking River Preservation", "Portable Power for Hikers", "Budget Airlines Take Off"],
    answer: "3",
    explanation: "The text highlights a portable solar-charging backpack.",
    sourceLabel: "\uCD9C\uCC98: LoE Title Essential"
  }
];

const THEME_FALLBACK = [
  {
    passage: "During the drought, volunteers installed rain barrels throughout the town. The simple system collected enough water to sustain community gardens until regular rainfall returned.",
    options: ["Community action sustains vital resources.", "Strict laws discourage public involvement.", "Technology eliminates environmental threats entirely.", "Tourism replaces traditional agriculture."],
    answer: "1",
    explanation: "The central idea is collective action to preserve water.",
    sourceLabel: "\uCD9C\uCC98: LoE Theme Essential"
  },
  {
    passage: "After noticing students struggling with heavy backpacks, the principal introduced digital textbooks. Teachers reported higher engagement, and students enjoyed carrying fewer materials.",
    options: ["Reducing physical burdens improves learning.", "Old-fashioned methods remain the best choice.", "Reading print editions builds stronger memory.", "Students resist any technology in the classroom."],
    answer: "1",
    explanation: "Digital materials lighten physical loads and aid learning.",
    sourceLabel: "\uCD9C\uCC98: LoE Theme Essential"
  },
  {
    passage: "Neighbors organized weekly cooking lessons to help new immigrants feel welcome. Sharing family recipes encouraged friendships and eased the transition to life in the city.",
    options: ["Cultural exchange strengthens communities.", "Healthy eating requires expensive ingredients.", "Traveling chefs inspire modern cuisine.", "Immigration policies limit cooperation."],
    answer: "1",
    explanation: "The theme is building community through shared cooking.",
    sourceLabel: "\uCD9C\uCC98: LoE Theme Essential"
  }
];

module.exports = {
  SUMMARY_FALLBACK,
  GRAMMAR_FALLBACK,
  VOCAB_FALLBACK,
  TITLE_FALLBACK,
  THEME_FALLBACK
};
