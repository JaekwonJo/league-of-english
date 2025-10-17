const { jsonrepair } = require('jsonrepair');

function createOpenAiRunner({ callChatCompletion }) {
  if (typeof callChatCompletion !== 'function') {
    throw new Error('callChatCompletion must be provided to openAiRunner');
  }

  async function runPrompt({ prompt, configModels }) {
    let attempt = 0;
    let lastError = null;

    for (const modelConfig of configModels) {
      const { name, retries = 1, temperature = 0.2, maxTokens = 900 } = modelConfig;
      for (let i = 0; i < retries; i += 1) {
        attempt += 1;
        try {
          const response = await callChatCompletion({
            model: name,
            temperature,
            max_tokens: maxTokens,
            messages: [{ role: 'user', content: prompt }]
          }, { label: 'grammar', tier: name.includes('4o') ? 'primary' : 'standard' });

          const rawContent = response?.choices?.[0]?.message?.content || '';
          const cleaned = String(rawContent || '').trim();
          if (!cleaned) {
            throw createError('JSON_EMPTY', '응답이 비어 있습니다.');
          }

          try {
            return JSON.parse(cleaned);
          } catch (parseError) {
            try {
              const repaired = jsonrepair(cleaned);
              return JSON.parse(repaired);
            } catch (repairError) {
              throw createError('JSON_PARSE_FAILED', repairError.message || parseError.message, {
                rawContent: cleaned,
                parseError,
                repairError
              });
            }
          }
        } catch (error) {
          lastError = normalizeError(error, { attempt, model: name });
        }
      }
    }

    const finalError = new Error(lastError?.message || 'OpenAI 호출 실패');
    finalError.code = lastError?.code || 'OPENAI_FAILED';
    finalError.attempt = attempt;
    finalError.lastError = lastError;
    throw finalError;
  }

  return {
    runPrompt
  };
}

function createError(code, message, extra = {}) {
  const error = new Error(message || code);
  error.code = code;
  Object.assign(error, extra);
  return error;
}

function normalizeError(error, { attempt, model }) {
  if (!error) return { code: 'UNKNOWN', message: '알 수 없는 오류', attempt, model };
  const normalized = {
    code: error.code || 'OPENAI_ERROR',
    message: error.message || String(error),
    attempt,
    model
  };
  if (error.rawContent) normalized.rawContent = error.rawContent;
  if (error.parseError) normalized.parseError = error.parseError;
  if (error.repairError) normalized.repairError = error.repairError;
  return normalized;
}

module.exports = {
  createOpenAiRunner
};
