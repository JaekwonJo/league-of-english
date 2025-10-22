/**
 * 문장 순서 배열 문제 생성기
 */

const ProblemGenerationUtils = require('./problemGenerationUtils');
const SimpleOrderGenerator = require('./simpleOrderGenerator');

const SYMBOLS = ['①', '②', '③', '④', '⑤'];

class OrderProblemGenerator {
  /**
   * 순서 배열 문제 생성
   */
  static generateOrderProblems(passages, count, options, document, parsedContent) {
    const problems = [];
    const difficulty = options.orderDifficulty === 'advanced' ? 'advanced' : 'basic';
    const targetParts = difficulty === 'advanced' ? 5 : 3;

    console.log(`📙 총 ${passages.length}개 지문에서 ${count}개 순서 배열 문제 생성`);

    const shuffledIndexes = ProblemGenerationUtils.shuffleArray([...Array(passages.length).keys()]);
    const usedIndexes = new Set();

    const attemptGeneration = (parts, label) => {
      if (problems.length >= count) return;
      console.log(`🎯 ${label} 단계 시작: targetParts=${parts}, 필요 문제=${count - problems.length}`);
      for (const passageIndex of shuffledIndexes) {
        if (problems.length >= count) break;
        if (usedIndexes.has(passageIndex)) continue;
        const passage = passages[passageIndex];
        if (!passage) continue;
        console.log(`🧩 시도 ${problems.length + 1}: 지문 ${passageIndex + 1} (길이 ${passage.length})`);
        const problem = this.createOrderProblem(
          passage,
          parts,
          problems.length + 1,
          passageIndex + 1,
          document,
          parsedContent
        );
        if (problem) {
          problems.push(problem);
          usedIndexes.add(passageIndex);
          console.log(`✅ 순서 문제 생성 완료 (지문 ${passageIndex + 1}, 난도 ${parts === 3 ? 'basic' : 'advanced'})`);
        } else {
          console.log(`⚠️ 순서 문제 생성 실패 (지문 ${passageIndex + 1}, targetParts=${parts})`);
        }
      }
    };

    attemptGeneration(targetParts, '주요');
    if (problems.length < count && targetParts > 3) {
      console.log('🔁 advanced 난도로 부족하여 basic(3문장) 보조 생성 시도');
      attemptGeneration(3, '보조');
    }

    if (problems.length < count) {
      console.log('🔁 규칙 기반 생성만으로 부족하여 간단 생성기 보충을 시도합니다.');
      try {
        const simpleGenerator = new SimpleOrderGenerator();
        const fallbackNeeded = count - problems.length;
        const simpleProblems = simpleGenerator.generateOrderProblems(passages, difficulty, fallbackNeeded);
        for (const simpleProblem of simpleProblems) {
          if (problems.length >= count) break;
          const converted = this.transformSimpleProblem(simpleProblem);
          if (converted) {
            problems.push(converted);
            console.log('✅ 간단 생성기 보충 문제 추가 완료');
          }
        }
      } catch (error) {
        console.log('⚠️ 간단 생성기 보충 중 오류:', error?.message || error);
      }
    }

    if (problems.length < count) {
      console.log(`⚠️ 요청한 ${count}개 중 ${problems.length}개만 생성되었습니다.`);
    }

    return problems;
  }

  /**
   * 지문 하나에서 순서 배열 문제 구성
   */
  static createOrderProblem(passage, targetParts, problemNumber, originalPageNumber, document, parsedContent) {
    console.log(`🔍 원본 지문 확인: "${passage.substring(0, 100)}..."`);

    const rawSentences = ProblemGenerationUtils.splitSentences(passage);
    console.log(`📝 문장 분리 결과: ${rawSentences.length}개`);
    rawSentences.forEach((sent, idx) => console.log(`  ${idx + 1}. "${sent.substring(0, 60)}..."`));

    let sentences = ProblemGenerationUtils.filterValidSentences(rawSentences, 25);
    console.log(`✅ 1차 필터링 후 문장: ${sentences.length}개`);

    if (sentences.length < targetParts + 1) {
      console.log('⚠️ 문장이 충분하지 않아 보조 임계값으로 재시도합니다.');
      const fallbackThresholds = [20, 16, 12, 8];
      for (const threshold of fallbackThresholds) {
        const candidate = ProblemGenerationUtils.filterValidSentences(rawSentences, threshold);
        console.log(`  ↪︎ ${threshold}자 기준 필터링 결과: ${candidate.length}개`);
        if (candidate.length >= targetParts + 1) {
          sentences = candidate;
          break;
        }
        if (candidate.length > sentences.length) {
          sentences = candidate;
        }
      }
    }

    if (sentences.length < targetParts + 1) {
      console.log('⚠️ 필터링 후에도 문장이 부족하여 원시 문장을 완화된 조건으로 사용합니다.');
      const relaxed = rawSentences
        .map((sentence) => (sentence ? sentence.trim() : ''))
        .filter((sentence) => sentence && /[a-zA-Z]/.test(sentence))
        .map((sentence) => (/[.!?]$/.test(sentence) ? sentence : `${sentence}.`));
      if (relaxed.length >= targetParts + 1) {
        sentences = relaxed;
      }
    }

    if (sentences.length < targetParts + 1) {
      console.log(`⚠️ 문장이 여전히 부족합니다: ${sentences.length} < ${targetParts + 1}`);
      return null;
    }

    const mainText = sentences[0];
    const remainingSentences = sentences.slice(1);
    const parts = ProblemGenerationUtils.splitIntoEqualParts(remainingSentences, targetParts);

    const labels = ['A', 'B', 'C', 'D', 'E'];
    const correctOrder = labels.slice(0, targetParts);

    const shuffledParts = ProblemGenerationUtils.shuffleArray([...parts]);
    const sentenceChoices = shuffledParts.map((part, index) => ({
      label: labels[index],
      text: part.join(' ')
    }));

    console.log('🗂️ 보기 구성:');
    sentenceChoices.forEach(choice => console.log(`  ${choice.label}: "${choice.text.substring(0, 50)}..."`));

    const multipleChoices = this.generateMultipleChoices(targetParts);
    const correctChoice = this.findCorrectAnswer(parts, shuffledParts, correctOrder, multipleChoices);

    console.log(`🧠 문제 ${problemNumber}: "${mainText.substring(0, 50)}..." → 정답 ${correctChoice}`);

    const documentTitle = document ? document.title : '문서';
    const originalSource = parsedContent?.sources?.[originalPageNumber - 1] || `page-${originalPageNumber}`;

    return {
      type: 'order',
      mainText: mainText,
      sentences: sentenceChoices,
      multipleChoices: multipleChoices,
      answer: correctChoice.toString(),
      correctOrder: correctOrder.join(''),
      explanation: `올바른 순서는 ${correctOrder.join('-')} 입니다.`,
      is_ai_generated: false,
      metadata: {
        originalTitle: documentTitle,
        problemNumber: originalSource,
        source: originalSource,
        difficulty: targetParts === 3 ? 'basic' : 'advanced',
        originalPageNumber: originalPageNumber
      }
    };
  }

  /**
   * 객관식 보기 생성 (최대 5개)
   */
  static generateMultipleChoices(targetParts) {
    const labels = ['A', 'B', 'C', 'D', 'E'];
    const correctOrder = labels.slice(0, targetParts);

    const allPermutations = ProblemGenerationUtils.generatePermutations(correctOrder);

    let choices = [];
    choices.push(correctOrder.join(''));

    const otherChoices = allPermutations
      .filter(perm => perm.join('') !== correctOrder.join(''))
      .sort(() => Math.random() - 0.5)
      .slice(0, 4);

    choices.push(...otherChoices.map(perm => perm.join('')));
    choices = ProblemGenerationUtils.shuffleArray(choices);

    const symbols = ['①', '②', '③', '④', '⑤'];
    return choices.map((choice, index) => ({
      number: index + 1,
      symbol: symbols[index],
      value: choice
    }));
  }

  /**
   * 정답 찾기
   */
  static findCorrectAnswer(originalParts, shuffledParts, correctOrder, multipleChoices) {
    const answerLabels = [];

    for (let i = 0; i < originalParts.length; i++) {
      const originalPart = originalParts[i];
      const shuffledIndex = shuffledParts.findIndex(shuffledPart =>
        JSON.stringify(shuffledPart) === JSON.stringify(originalPart)
      );
      if (shuffledIndex !== -1) {
        answerLabels.push(String.fromCharCode(65 + shuffledIndex));
      }
    }

    const correctAnswerSequence = answerLabels.join('');
    console.log(`🔑 정답 순서: ${correctAnswerSequence}`);

    for (let i = 0; i < multipleChoices.length; i++) {
      if (multipleChoices[i].value === correctAnswerSequence) {
        return i + 1;
      }
    }

    return 1;
  }

  /**
   * 간단 순서배열 생성기를 통해 반환된 문제를 정규 형식으로 변환
   */
  static transformSimpleProblem(simpleProblem) {
    if (!simpleProblem || !Array.isArray(simpleProblem.sentences) || simpleProblem.sentences.length === 0) {
      return null;
    }

    const baseParts = simpleProblem.sentences
      .map((item) => ({
        originalLabel: item?.label ? String(item.label).trim().toUpperCase() : '',
        text: item?.text ? String(item.text).trim() : ''
      }))
      .filter((item) => item.text.length > 0);

    const partCount = baseParts.length;
    if (partCount < 2) return null;

    const canonicalLabels = baseParts.map((part, index) => part.originalLabel || String.fromCharCode(65 + index));
    const normalizedAnswer = String(simpleProblem.correctAnswer || '')
      .toUpperCase()
      .replace(/[^A-Z]/g, '');
    if (!normalizedAnswer) return null;

    const shuffledParts = ProblemGenerationUtils.shuffleArray(baseParts.map((part) => ({ ...part })));
    const displayLabels = ['A', 'B', 'C', 'D', 'E'].slice(0, shuffledParts.length);
    const labelMap = new Map();
    const sentenceChoices = shuffledParts.map((part, idx) => {
      const originalLabel = part.originalLabel || canonicalLabels[idx] || displayLabels[idx];
      const assignedLabel = displayLabels[idx];
      labelMap.set(originalLabel, assignedLabel);
      return {
        label: assignedLabel,
        text: part.text
      };
    });

    const correctSequence = normalizedAnswer
      .split('')
      .map((label) => labelMap.get(label) || displayLabels[0])
      .join('');

    const permutations = ProblemGenerationUtils.generatePermutations(displayLabels);
    const otherValues = permutations
      .map((perm) => perm.join(''))
      .filter((value) => value !== correctSequence);
    const optionValuesBase = [correctSequence, ...otherValues];
    const uniqueOptionValues = [...new Set(optionValuesBase)];
    const trimmedValues = uniqueOptionValues.slice(0, Math.min(5, uniqueOptionValues.length));

    let shuffledValues = ProblemGenerationUtils.shuffleArray(trimmedValues);
    if (!shuffledValues.includes(correctSequence)) {
      shuffledValues = ProblemGenerationUtils.shuffleArray([
        correctSequence,
        ...shuffledValues.slice(0, Math.max(0, 4))
      ]);
    }

    const multipleChoices = shuffledValues.slice(0, 5).map((value, idx) => ({
      number: idx + 1,
      symbol: SYMBOLS[idx] || `${idx + 1}.`,
      value
    }));

    const answerIndex = multipleChoices.findIndex((choice) => choice.value === correctSequence);
    const answer = answerIndex === -1 ? '1' : String(multipleChoices[answerIndex].number);

    return {
      type: 'order',
      mainText: simpleProblem.mainText || '',
      sentences: sentenceChoices,
      multipleChoices,
      answer,
      correctOrder: correctSequence,
      explanation:
        simpleProblem.explanation || `올바른 순서는 ${correctSequence.split('').join('-')} 입니다.`,
      is_ai_generated: false,
      metadata: {
        ...(simpleProblem.metadata || {}),
        generator: 'simple-fallback'
      }
    };
  }
}

module.exports = OrderProblemGenerator;
