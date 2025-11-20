const { parseQuestions } = require('./server/scripts/import-exam-pdf');

const sampleText = `
1. 
다음 글의 밑줄 친 부분 중, 어법상 
틀린 것은? [18]
 Dear Executive Manager Schulz,
 It is a week before the internship program starts. I am
 writing to bring your attention to a matter that ①
 requires immediate consideration regarding the issue
 my department has. As the coordinator, it is becoming
 ② 
apparently to me that the budget, previously ③
 approved by your department, needs some
 adjustments in order to meet the emerging
 modifications. Since my department has hired three
 more interns than planned ④ 
initially, the most
 expensive need is for additional funding to cover their
 wages, training costs, and materials. I kindly request
 an additional budget allocation for ⑤ 
these expenses.
 Please refer to the attachment for details. Thank you
 for your attention.
 Best regards,
 Matt Perry 
2. 
다음 글의 제목으로 가장 적절한 것은? [20]
 To be mathematically literate means to be able to think
 critically about societal issues on which mathematics
 has bearing so as to make informed decisions about
 how to solve these problems.
 ① The Role of Math
 ② The Importance of Mathematics
`;

console.log('--- Parsing Test ---');
const result = parseQuestions(sampleText);
console.log('Found Questions:', result.questions.length);
result.questions.forEach((q, i) => {
    console.log(`
[Question ${i+1}] No.${q.number}`);
    console.log(`Type: ${q.type}`);
    console.log(`Passage Preview: ${q.passage.slice(0, 50)}...`);
    console.log(`Options: ${q.options.length}개`);
    console.log(q.options);
});
