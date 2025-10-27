'use strict';

const ProblemGenerationUtils = require('./problemGenerationUtils');

const MIN_SENTENCES_REQUIRED = 3; // 완화: 짧은 지문도 1문장 삽입 허용

class InsertionProblemGenerator3 {
  static generateInsertionProblems(passages, count, options = {}, document, parsedContent) {
    const problems = [];
    if (!Array.isArray(passages) || passages.length === 0) return problems;

    const shuffled = ProblemGenerationUtils.shuffleArray(passages);
    for (const passage of shuffled) {
      if (problems.length >= count) break;
      const problem = this.createInsertionProblem(passage, document, parsedContent);
      if (problem) problems.push(problem);
    }
    return problems;
  }

  static createInsertionProblem(passage, document, parsedContent) {
    const raw = ProblemGenerationUtils.splitSentences(passage).map((s) => s.trim()).filter(Boolean);
    if (raw.length < MIN_SENTENCES_REQUIRED) return null;

    // 가운데 문장을 주어진 문장으로 선택
    const gapIndex = Math.min(Math.max(Math.floor(raw.length / 2), 1), raw.length - 2);
    const givenSentence = raw[gapIndex];
    const display = raw.filter((_, idx) => idx !== gapIndex).map((s) => s.replace(/\s+/g, ' ').trim());

    // 경계에 (1)(2)(3)... 마커 삽입 → circled digits로 변환은 표시단계에서 처리
    const markers = [];
    const lines = [];
    for (let i = 0; i <= display.length; i++) {
      if (i < 5) markers.push(`(${i + 1})`);
      if (i < display.length) lines.push(display[i]);
    }
    const markerCount = Math.min(5, markers.length);
    const boundary = gapIndex > display.length ? display.length : gapIndex;
    const choices = Array.from({ length: markerCount }, (_, idx) => ({
      number: idx + 1,
      symbol: `(${idx + 1})`,
      value: String(idx + 1)
    }));

    const annotated = [];
    for (let i = 0; i <= display.length; i++) {
      if (i < markerCount) annotated.push(markers[i]);
      if (i < display.length) annotated.push(display[i]);
    }

    const answerIndex = Math.min(boundary, markerCount - 1);
    const docTitle = document ? (document.title || 'Document') : 'Document';
    const sourceLabel = parsedContent?.sources?.[0] || 'insertion';

    return {
      type: 'insertion',
      givenSentence,
      mainText: annotated.join('\n'),
      multipleChoices: choices,
      answer: String(answerIndex + 1),
      explanation: '주어진 문장은 문맥 전후의 연결이 가장 자연스러운 위치에 들어가야 합니다.',
      is_ai_generated: false,
      metadata: {
        originalTitle: docTitle,
        problemNumber: sourceLabel,
        source: sourceLabel,
        difficulty: 'basic',
        correctPosition: answerIndex + 1
      }
    };
  }
}

module.exports = InsertionProblemGenerator3;

