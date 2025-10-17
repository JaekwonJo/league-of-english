const { CIRCLED_DIGITS } = require('../ai-problem/shared');

function chooseGrammarTargetIndex(history = []) {
  const validHistory = Array.isArray(history)
    ? history
        .map((value) => parseInt(value, 10))
        .filter((num) => Number.isInteger(num) && num >= 1 && num <= CIRCLED_DIGITS.length)
    : [];
  const usageMap = new Map();
  validHistory.forEach((idx) => {
    usageMap.set(idx, (usageMap.get(idx) || 0) + 1);
  });
  const recent = validHistory.length ? validHistory[validHistory.length - 1] : null;
  let pool = [];
  for (let i = 1; i <= CIRCLED_DIGITS.length; i += 1) {
    if (recent !== null && i === recent) {
      continue;
    }
    pool.push(i);
  }
  if (!pool.length) {
    pool = Array.from({ length: CIRCLED_DIGITS.length }, (_, index) => index + 1);
  }
  let minUsage = Infinity;
  const balanced = [];
  pool.forEach((idx) => {
    const usage = usageMap.get(idx) || 0;
    if (usage < minUsage) {
      minUsage = usage;
      balanced.length = 0;
      balanced.push(idx);
    } else if (usage === minUsage) {
      balanced.push(idx);
    }
  });
  const finalPool = balanced.length ? balanced : pool;
  const choice = finalPool[Math.floor(Math.random() * finalPool.length)];
  return Number.isInteger(choice) ? choice : 3;
}

module.exports = {
  chooseGrammarTargetIndex
};
