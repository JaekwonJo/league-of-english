const crypto = require('crypto');
const { loadConfig } = require('./config');
const { buildPrompt } = require('./promptBuilder');
const { createOpenAiRunner } = require('./openAiRunner');
const { deriveGrammarDirectives } = require('./directives');
const { chooseGrammarTargetIndex } = require('./history');
const { createDiffReporter } = require('./diffReporter');
const { createFallback } = require('./fallbackFactory');

function createGrammarPipeline({
  manualExcerpt,
  docTitle,
  baselinePath,
  callChatCompletion,
  normalizeGrammarPayload,
  repairGrammarOutput,
  logger = console,
  diffLabel,
  answerHistory = []
}) {
  const config = loadConfig();
  const openAiRunner = createOpenAiRunner({ callChatCompletion });
  const diffReporter = createDiffReporter({ baselinePath, label: diffLabel || config.diff?.baselineLabel });

  async function generateProblem({ passage, variant, passageIndex, extraContext = {} }) {
    const desiredIndex = chooseGrammarTargetIndex(answerHistory);
    const variantTag = buildVariantTag({ passageIndex });
    let attemptInfo = [];
    let lastFailure = '';
    let normalized = null;
    let selectedModel = null;
    let attempts = 0;

    const failureReasons = [];

    for (let modelIdx = 0; modelIdx < config.models.length && !normalized; modelIdx += 1) {
      const modelConfig = config.models[modelIdx];
      for (let retry = 0; retry < modelConfig.retries && !normalized; retry += 1) {
        attempts += 1;
        try {
          const directiveSet = new Set([...(extraContext.directives || []), ...failureReasons]);
          const prompt = buildPrompt({
            passage,
            docTitle,
            passageIndex,
            manualExcerpt,
            variantTag,
            desiredAnswerIndex: attempts <= 3 ? desiredIndex : null,
            variant,
            extraDirectives: Array.from(directiveSet),
            lastFailure
          });
          const payload = await openAiRunner.runPrompt({
            prompt,
            configModels: [{ ...modelConfig, retries: 1 }]
          });
          selectedModel = modelConfig.name;
          normalized = normalizeGrammarPayload(payload, {
            docTitle,
            documentCode: extraContext.documentCode,
            passage,
            index: passageIndex,
            desiredAnswerIndex: attempts <= 3 ? desiredIndex : null,
            failureReasons,
            questionText: variant.question,
            answerMode: variant.answerMode,
            targetIncorrectCount: variant.targetIncorrectCount,
            targetCorrectCount: variant.targetCorrectCount
          });
        } catch (error) {
          lastFailure = String(error?.message || error || 'unknown grammar failure');
          const directives = deriveGrammarDirectives(lastFailure);
          directives.forEach((directive) => {
            if (!failureReasons.includes(directive)) {
              failureReasons.push(directive);
            }
          });
          attemptInfo.push({
            attempt: attempts,
            model: modelConfig.name,
            error: lastFailure
          });
          if (error?.rawContent && typeof repairGrammarOutput === 'function') {
            try {
              const repairedPayload = await repairGrammarOutput({
                rawContent: error.rawContent,
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
              normalized = normalizeGrammarPayload(repairedPayload, {
                docTitle,
                documentCode: extraContext.documentCode,
                passage,
                index: passageIndex,
                desiredAnswerIndex: attempts <= 3 ? desiredIndex : null,
                failureReasons,
                questionText: variant.question,
                answerMode: variant.answerMode,
                targetIncorrectCount: variant.targetIncorrectCount,
                targetCorrectCount: variant.targetCorrectCount
              });
            } catch (repairError) {
              const repairMessage = String(repairError?.message || repairError || 'repair failed');
              lastFailure = `${lastFailure} :: repair_failed(${repairMessage})`;
              attemptInfo.push({
                attempt: `${attempts}-repair`,
                model: modelConfig.name,
                error: repairMessage
              });
            }
          }
        }
      }
    }

    if (!normalized) {
      const fallback = await createFallback({
        docTitle,
        passage,
        count: 1,
        reason: lastFailure || 'openai_failed'
      });
      if (fallback && fallback.length) {
        const [fallbackProblem] = fallback;
        fallbackProblem.metadata = {
          ...(fallbackProblem.metadata || {}),
          generator: 'fallback',
          fallbackReason: lastFailure || 'openai_failed'
        };
        return {
          problem: fallbackProblem,
          meta: {
            usedFallback: true,
            attempts,
            attemptInfo
          }
        };
      }
      throw new Error(`[grammar-pipeline] generation failed after retries: ${lastFailure || 'unknown failure'}`);
    }

    const diff = diffReporter.compare({
      order: extraContext.order,
      problem: normalized
    });

    normalized.metadata = {
      ...(normalized.metadata || {}),
      generator: 'openai',
      model: selectedModel,
      attempts,
      diff
    };

    return {
      problem: normalized,
      meta: {
        usedFallback: false,
        attempts,
        attemptInfo,
        diff
      },
      desiredIndex
    };
  }

  return {
    generateProblem
  };
}

function buildVariantTag({ passageIndex }) {
  const random = crypto.randomBytes(3).toString('hex');
  return `G-${Date.now()}-${passageIndex}-${random}`;
}

module.exports = {
  createGrammarPipeline
};
