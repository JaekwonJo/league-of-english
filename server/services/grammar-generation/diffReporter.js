const fs = require('fs');
const path = require('path');
const { normalizeWhitespace } = require('../ai-problem/shared');

function createDiffReporter({ baselinePath, label = 'baseline' } = {}) {
  let baselineMap = null;
  if (baselinePath) {
    try {
      const absolutePath = path.isAbsolute(baselinePath)
        ? baselinePath
        : path.join(process.cwd(), baselinePath);
      if (fs.existsSync(absolutePath)) {
        const raw = fs.readFileSync(absolutePath, 'utf8');
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed.items)) {
          baselineMap = new Map(parsed.items.map((item) => [Number(item.order), item]));
        }
      }
    } catch (error) {
      console.warn('[grammar diff] baseline load failed:', error?.message || error);
    }
  }

  function compare({ order, problem }) {
    if (!baselineMap) {
      return {
        baseline: label,
        hasBaseline: false,
        issues: []
      };
    }
    const baseline = baselineMap.get(Number(order));
    if (!baseline) {
      return {
        baseline: label,
        hasBaseline: false,
        issues: [`baseline order ${order} not found`]
      };
    }

    const issues = [];

    const baselineSegments = (baseline.segments || []).map((segment) => normalizeWhitespace(segment.text || segment.raw || ''));
    const candidateSegments = Array.isArray(problem.options)
      ? problem.options.map((option) => {
          const match = String(option || '').match(/<u[\s\S]*?>([\s\S]*?)<\/u>/i);
          return normalizeWhitespace(match && match[1] ? match[1] : option);
        })
      : [];

    if (baselineSegments.length !== candidateSegments.length) {
      issues.push(`segment_count mismatch: baseline ${baselineSegments.length} vs candidate ${candidateSegments.length}`);
    } else {
      baselineSegments.forEach((segment, index) => {
        const candidate = candidateSegments[index];
        if (segment && candidate) {
          const overlap = computeOverlap(segment, candidate);
          if (overlap < 0.7) {
            issues.push(`segment ${index + 1} low overlap (${(overlap * 100).toFixed(1)}%)`);
          }
        }
      });
    }

    if (baseline.answer && problem.answer) {
      const baseAnswer = Array.isArray(baseline.answer) ? baseline.answer.join(',') : String(baseline.answer);
      const candidateAnswer = Array.isArray(problem.answer) ? problem.answer.join(',') : String(problem.answer);
      if (baseAnswer !== candidateAnswer) {
        issues.push(`answer mismatch: baseline ${baseAnswer} vs candidate ${candidateAnswer}`);
      }
    }

    return {
      baseline: label,
      hasBaseline: true,
      issues
    };
  }

  return {
    compare
  };
}

function computeOverlap(a, b) {
  const textA = normalizeWhitespace(a || '').toLowerCase();
  const textB = normalizeWhitespace(b || '').toLowerCase();
  if (!textA || !textB) return 0;
  const setA = new Set(textA.split(/\s+/));
  const setB = new Set(textB.split(/\s+/));
  const intersection = [...setA].filter((token) => setB.has(token));
  return intersection.length / Math.max(setA.size, setB.size, 1);
}

module.exports = {
  createDiffReporter
};
