const crypto = require('crypto');

function createVocabPipeline({
  manualExcerpt,
  docTitle,
  callChatCompletion,
  normalizeVocabularyPayload,
  repairVocabularyOutput,
  buildVariantDirective,
  buildAnswerInstruction,
  vocabJsonBlueprint,
  deriveDirectives,
  logger = console
}) {
  function buildVariantTag({ passageIndex }) {
    const random = crypto.randomBytes(3).toString('hex');
    return `V-${Date.now()}-${passageIndex}-${random}`;
  }

  async function generateProblem({ passage, variant, passageIndex, extraContext = {} }) {
    let lastFailure = '';
    let normalized = null;
    let attempts = 0;
    const failureReasons = [];
    let selectedModel = null;
    let rawContent = '';
    let repairBudget = 2;

    while (attempts < 6 && !normalized) {
      attempts += 1;
      try {
        const variantTag = buildVariantTag({ passageIndex });
        const sections = [
          'You are a deterministic K-CSAT English vocabulary-usage item writer.',
          buildVariantDirective(variant),
          '',
          `Passage title: ${docTitle}`,
          `Passage (keep every sentence; underline exactly five expressions with <u>...</u>):\n${passage}`,
          '',
          'Manual excerpt (truncated):',
          manualExcerpt,
          '',
          'Return raw JSON only with this structure:',
          vocabJsonBlueprint
            .replace('"question": "단어 선택 문제: 다음 글의 밑줄 친 표현 중, 문맥상 어색한 것을 고르세요."', `"question": "${variant.question}"`)
            .replace('"variantTag": "V-001"', `"variantTag": "${variantTag}"`),
          '',
          'Generation requirements:',
          '- Copy the passage verbatim; do not delete or reorder sentences.',
          '- Underline exactly five expressions with <u>...</u> and reuse the identical snippets inside the options.',
          buildAnswerInstruction(variant),
          '- Provide correction.replacement + reason for every 오류 표현을 교정할 수 있도록 기록합니다.',
          '- Supply optionReasons in Korean (정답 포함).',
          '- Write the explanation in friendly, plain Korean with at least two sentences. 단계별 불릿 가능, 쉬운 단어 사용, 마지막에 격려 이모지 1개까지 허용(예: 🙂).',
          '- Respond with raw JSON only (no Markdown fences).'
        ];
        if (lastFailure && typeof deriveDirectives === 'function') {
          const fixes = deriveDirectives(lastFailure) || [];
          if (fixes.length) {
            sections.push('', 'Additional fixes based on the previous attempt:', ...fixes);
          }
        }
        const prompt = sections.filter(Boolean).join('\n\n');

        const highTier = attempts >= 3;
        const response = await callChatCompletion({
          model: highTier ? 'gpt-4o' : 'gpt-4o-mini',
          temperature: highTier ? 0.24 : 0.3,
          max_tokens: highTier ? 1050 : 900,
          messages: [{ role: 'user', content: prompt }]
        }, { label: 'vocabulary', tier: highTier ? 'primary' : 'standard' });

        rawContent = response.choices?.[0]?.message?.content || '';
        const payload = JSON.parse(String(rawContent).replace(/```json\s*|```/g, '').trim());
        normalized = normalizeVocabularyPayload(payload, {
          docTitle,
          documentCode: extraContext.documentCode,
          passage,
          index: passageIndex,
          failureReasons,
          questionText: variant.question,
          answerMode: variant.answerMode,
          targetIncorrectCount: variant.targetIncorrectCount,
          targetCorrectCount: variant.targetCorrectCount
        });
        selectedModel = highTier ? 'gpt-4o' : 'gpt-4o-mini';
      } catch (error) {
        lastFailure = String(error?.message || error || 'vocabulary failure');
        if (logger && logger.warn) logger.warn('[vocab-pipeline] gen failed:', lastFailure);
        if (!normalized && rawContent && repairBudget > 0 && typeof repairVocabularyOutput === 'function') {
          try {
            repairBudget -= 1;
            const repaired = await repairVocabularyOutput({
              rawContent,
              failureMessage: lastFailure,
              failureReasons,
              passage,
              docTitle,
              manualExcerpt,
              questionText: variant.question,
              answerMode: variant.answerMode,
              targetIncorrectCount: variant.targetIncorrectCount,
              targetCorrectCount: variant.targetCorrectCount
            });
            normalized = normalizeVocabularyPayload(repaired, {
              docTitle,
              documentCode: extraContext.documentCode,
              passage,
              index: passageIndex,
              failureReasons,
              questionText: variant.question,
              answerMode: variant.answerMode,
              targetIncorrectCount: variant.targetIncorrectCount,
              targetCorrectCount: variant.targetCorrectCount
            });
          } catch (repairError) {
            lastFailure = `${lastFailure} :: repair_failed(${String(repairError?.message || repairError)})`;
          }
        }
      }
    }

    if (!normalized) {
      throw new Error(`[vocab-pipeline] failed after retries: ${lastFailure}`);
    }

    normalized.metadata = {
      ...(normalized.metadata || {}),
      generator: normalized.metadata?.generator || 'openai',
      model: selectedModel,
      attempts
    };

    return { problem: normalized, meta: { attempts } };
  }

  return { generateProblem };
}

module.exports = {
  createVocabPipeline
};
