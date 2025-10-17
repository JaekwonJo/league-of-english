#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

function parseArgs() {
  const args = process.argv.slice(2);
  const options = { baseline: null, candidate: null, output: null };
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg.startsWith('--baseline=')) {
      options.baseline = arg.split('=')[1];
    } else if (arg === '--baseline' && args[i + 1]) {
      options.baseline = args[i + 1];
      i += 1;
    } else if (arg.startsWith('--candidate=')) {
      options.candidate = arg.split('=')[1];
    } else if (arg === '--candidate' && args[i + 1]) {
      options.candidate = args[i + 1];
      i += 1;
    } else if (arg.startsWith('--output=')) {
      options.output = arg.split('=')[1];
    } else if (arg === '--output' && args[i + 1]) {
      options.output = args[i + 1];
      i += 1;
    } else if (!options.baseline) {
      options.baseline = arg;
    } else if (!options.candidate) {
      options.candidate = arg;
    } else if (!options.output) {
      options.output = arg;
    }
  }
  if (!options.baseline || !options.candidate) {
    throw new Error('Usage: compare-grammar-datasets <baseline.json> <candidate.json> [output.md]');
  }
  if (!options.output) {
    options.output = 'tmp/grammar-diff-report.md';
  }
  options.baseline = path.resolve(options.baseline);
  options.candidate = path.resolve(options.candidate);
  options.output = path.resolve(options.output);
  return options;
}

function loadJson(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function normaliseSegment(segment) {
  if (!segment) return '';
  return segment.replace(/\s+/g, ' ').trim();
}

function compareQuestions(baselineItems, candidateItems) {
  const candidateMap = new Map(candidateItems.map((item) => [item.order, item]));
  const diffs = [];

  for (const baseItem of baselineItems) {
    const candidate = candidateMap.get(baseItem.order);
    if (!candidate) {
      diffs.push({
        order: baseItem.order,
        issues: [`⚠️ 후보 데이터에 문항이 없어요.`]
      });
      continue;
    }

    const issues = [];

    if (baseItem.answer !== candidate.answer) {
      issues.push(`정답: 기준 ${baseItem.answerMarker || baseItem.answer} ↔ 후보 ${candidate.answerMarker || candidate.answer}`);
    }

    if (!arraysEqual(baseItem.segments, candidate.segments, (a, b) => normaliseSegment(a.text) === normaliseSegment(b.text))) {
      issues.push('보기(밑줄) 내용이 달라요.');
    }

    if (normaliseSegment(baseItem.explanation) !== normaliseSegment(candidate.explanation)) {
      issues.push('해설이 달라요.');
    }

    if (baseItem.conditions && baseItem.conditions.length) {
      const baseConditions = baseItem.conditions.map(normaliseSegment);
      const candidateConditions = (candidate.conditions || []).map(normaliseSegment);
      if (!arraysEqual(baseConditions, candidateConditions, (a, b) => a === b)) {
        issues.push('조건(추가 지시문)이 달라요.');
      }
    }

    if (issues.length) {
      diffs.push({ order: baseItem.order, issues });
    }
  }

  const candidateOrders = new Set(candidateItems.map((item) => item.order));
  for (const baseItem of baselineItems) {
    candidateOrders.delete(baseItem.order);
  }
  if (candidateOrders.size) {
    for (const extra of [...candidateOrders].sort((a, b) => a - b)) {
      diffs.push({ order: extra, issues: ['候補 데이터에만 있는 추가 문항이에요.'] });
    }
  }

  return diffs.sort((a, b) => a.order - b.order);
}

function arraysEqual(a = [], b = [], comparator = (x, y) => x === y) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    if (!comparator(a[i], b[i])) return false;
  }
  return true;
}

function buildReport({ baselinePath, candidatePath, diffs, baselineCount, candidateCount }) {
  const lines = [];
  lines.push('# Grammar Diff Report');
  lines.push('');
  lines.push(`- 기준 파일: ${baselinePath}`);
  lines.push(`- 비교할 파일: ${candidatePath}`);
  lines.push(`- 기준 문항 수: ${baselineCount}`);
  lines.push(`- 비교 문항 수: ${candidateCount}`);
  lines.push('');

  if (diffs.length === 0) {
    lines.push('모든 문항이 똑같이 일치해요! ✅');
  } else {
    lines.push(`총 ${diffs.length}개의 문항에서 차이가 보여요.`);
    lines.push('');
    for (const diff of diffs) {
      lines.push(`## 문항 ${diff.order}`);
      for (const issue of diff.issues) {
        lines.push(`- ${issue}`);
      }
      lines.push('');
    }
  }
  return lines.join('\n');
}

function ensureDir(filePath) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

(async () => {
  try {
    const { baseline, candidate, output } = parseArgs();
    const baselineData = loadJson(baseline);
    const candidateData = loadJson(candidate);
    const diffs = compareQuestions(baselineData.items || [], candidateData.items || []);
    const report = buildReport({
      baselinePath: baseline,
      candidatePath: candidate,
      diffs,
      baselineCount: (baselineData.items || []).length,
      candidateCount: (candidateData.items || []).length
    });
    ensureDir(output);
    fs.writeFileSync(output, report, 'utf8');
    console.log('📄 diff 리포트가 만들어졌어요:', output);
    if (diffs.length === 0) {
      console.log('✅ 모든 문항이 동일합니다!');
    } else {
      console.log(`⚠️ ${diffs.length}개의 문항에서 차이가 있어요. 리포트를 확인해 주세요.`);
    }
  } catch (error) {
    console.error('❌ 오류가 발생했어요:', error.message || error);
    process.exit(1);
  }
})();
