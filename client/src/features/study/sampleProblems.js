export const sampleProblems = {
  grammar: {
    id: 'preview-grammar-1',
    type: 'grammar',
    question: '다음 글의 밑줄 친 부분 중, 어법상 틀린 것은?',
    questionVariant: 'single',
    sourceLabel: '출처│월고 2024 - No.20',
    mainText: `Too many times people, especially in today’s generation, expect things to just <u>happen overnight</u>.
When we have these false expectations, it tends to discourage us <u>from continuing to move forward</u>.
Because this is a high tech society, everything we want <u>have to be within the parameters of our comfort and convenience</u>.
If it doesn’t happen <u>fast enough</u>, we’re tempted to lose interest.
So many people don’t want to take the time it requires to be successful.
Success is not a matter of mere desire; you should develop patience in order to achieve it.
Have you <u>fallen prey to impatience</u>? Great things take time to build.`,
    options: [
      '① <u>happen overnight</u>',
      '② <u>from continuing to move forward</u>',
      '③ <u>have to be within the parameters of our comfort and convenience</u>',
      '④ <u>fast enough</u>',
      '⑤ <u>fallen prey to impatience</u>'
    ],
    answer: '3',
    explanation: "③번은 everything(단수)을 주어로 받으므로 'has to be'로 써야 합니다.",
    footnotes: ['* parameter: 매개 변수, 제한'],
    metadata: {
      footnotes: ['* parameter: 매개 변수, 제한'],
      previewLabel: '미리보기'
    }
  },
  vocabulary: {
    id: 'preview-vocab-1',
    type: 'vocabulary',
    question: '다음 글의 밑줄 친 부분 중, 문맥상 낱말의 쓰임이 적절하지 않은 것은?',
    sourceLabel: '출처│미리보기 - No.5',
    mainText: `Technology has allowed teams to stay <u>connected</u> even when they are oceans apart.
Daily briefings keep everyone <u>informed</u>, and quick chats help members feel <u>supported</u>.
However, sending <u>recklessly</u> crafted messages can confuse the whole project.
A thoughtful schedule keeps the workload <u>balanced</u> and the team encouraged.`,
    options: [
      '① <u>connected</u>',
      '② <u>informed</u>',
      '③ <u>supported</u>',
      '④ <u>recklessly</u>',
      '⑤ <u>balanced</u>'
    ],
    answer: '4',
    explanation: "④번 recklessly(무모하게)는 협업 상황에서 부정적 뉘앙스로 문맥에 맞지 않습니다. carefully 또는 thoughtfully와 같은 표현이 자연스럽습니다.",
    metadata: {
      previewLabel: '미리보기'
    }
  }
};

export const supportedPreviewTypes = Object.keys(sampleProblems);
