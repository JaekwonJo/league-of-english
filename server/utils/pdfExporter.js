const path = require('path');
const PDFDocument = require('pdfkit');

const FONT_REGULAR_PATH = path.join(__dirname, '..', 'assets', 'fonts', 'NotoSansKR-Regular.otf');
const CIRCLED_DIGITS = ['①', '②', '③', '④', '⑤'];

const TYPE_LABELS = {
  blank: '빈칸',
  grammar: '어법',
  grammar_multi: '어법(복수)',
  vocabulary: '어휘',
  title: '제목',
  theme: '주제',
  summary: '요약',
  implicit: '함축 의미',
  irrelevant: '흐름 무관',
  order: '순서 배열',
  insertion: '문장 삽입'
};

function resolveTypeLabel(type) {
  const key = typeof type === 'string' ? type.trim().toLowerCase() : '';
  if (!key) return '문항';
  return TYPE_LABELS[key] || key.toUpperCase();
}

function formatAnswer(answer) {
  if (!answer) return '정답 미제공';
  const trimmed = String(answer).trim();
  if (!trimmed) return '정답 미제공';
  if (CIRCLED_DIGITS.includes(trimmed.charAt(0))) {
    return trimmed;
  }
  const numeric = Number(trimmed);
  if (Number.isInteger(numeric) && numeric >= 1 && numeric <= CIRCLED_DIGITS.length) {
    return CIRCLED_DIGITS[numeric - 1];
  }
  return trimmed;
}

function formatSource(problem) {
  if (problem?.sourceLabel) {
    return String(problem.sourceLabel).trim();
  }
  if (problem?.metadata?.documentTitle) {
    return String(problem.metadata.documentTitle).trim();
  }
  return null;
}

function createProblemsPdf(problems = [], options = {}) {
  const title = options.title || 'League of English 문제 세트';
  const subtitle = options.subtitle || null;
  const includeSolutions = options.includeSolutions !== false;

  const doc = new PDFDocument({ margin: 56, size: 'A4' });
  doc.registerFont('LoE-Regular', FONT_REGULAR_PATH);
  doc.font('LoE-Regular');
  doc.on('pageAdded', () => {
    doc.font('LoE-Regular');
  });

  const contentWidth = () => doc.page.width - doc.page.margins.left - doc.page.margins.right;

  doc.fontSize(20).text(title, { align: 'center' });
  if (subtitle) {
    doc.moveDown(0.4);
    doc.fontSize(12).fillColor('#555555').text(subtitle, { align: 'center' });
    doc.fillColor('black');
  }
  doc.moveDown(0.8);

  problems.forEach((problem, index) => {
    if (!problem) {
      return;
    }

    const typeLabel = resolveTypeLabel(problem.type);
    doc.fontSize(13).fillColor('#222222').text(`${index + 1}. [${typeLabel}]`, { width: contentWidth() });

    const source = formatSource(problem);
    if (source) {
      doc.moveDown(0.1);
      doc.fontSize(10).fillColor('#666666').text(`출처: ${source}`, {
        width: contentWidth()
      });
      doc.fillColor('black');
    }

    const passage = problem.mainText || problem.text || problem.question || '';
    if (passage) {
      doc.moveDown(0.2);
      doc.fontSize(11).text(passage, {
        width: contentWidth()
      });
    }

    const optionsList = Array.isArray(problem.options) ? problem.options : [];
    if (optionsList.length) {
      doc.moveDown(0.2);
      doc.fontSize(11);
      optionsList.forEach((option) => {
        const line = typeof option === 'string' ? option : JSON.stringify(option);
        doc.text(line, {
          width: contentWidth(),
          indent: 18
        });
      });
    }

    if (includeSolutions) {
      doc.moveDown(0.25);
      doc.fontSize(11).fillColor('#1b5e20').text(`정답: ${formatAnswer(problem.answer)}`, {
        width: contentWidth()
      });
      doc.fillColor('black');
      if (problem.explanation) {
        doc.moveDown(0.1);
        doc.fontSize(10).fillColor('#333333').text(`해설: ${problem.explanation}`, {
          width: contentWidth()
        });
        doc.fillColor('black');
      }
    }

    doc.moveDown(0.6);
    if (index < problems.length - 1 && doc.y > doc.page.height - doc.page.margins.bottom - 120) {
      doc.addPage();
    }
  });

  if (!problems.length) {
    doc.fontSize(12).text('저장된 문제가 아직 없습니다.', { align: 'center' });
  }

  return doc;
}

module.exports = {
  createProblemsPdf
};
