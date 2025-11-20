const fs = require('fs');
const path = require('path');
const pdf = require('pdf-parse');
const database = require('../models/database');

async function readPdf(filePath) {
  const dataBuffer = fs.readFileSync(filePath);
  const data = await pdf(dataBuffer);
  return String(data.text || '').replace(/\r/g, '');
}

function repairText(text) {
  if (!text) return '';
  try {
    if (/[À-ÿ]{3,}/.test(text)) {
        const buffer = Buffer.from(text, 'binary');
        const decoded = buffer.toString('utf8');
        if (/[가-힣]/.test(decoded)) return decoded;
    }
  } catch (e) {}
  return text;
}

function parseQuestions(fullText) {
  let cleanedText = repairText(fullText);

  // Clean up common noise
  cleanedText = cleanedText.replace(/^\s*-\s*\d+\s*-\s*$/gm, '');
  cleanedText = cleanedText.replace(/^\s*2024년도.*?모의고사\s*$/gm, '');
  cleanedText = cleanedText.replace(/^\s*진진영어\s*$/gm, '');
  // Remove "1.", "2." style headers which might confuse
  cleanedText = cleanedText.replace(/^\d+\.\s*$/gm, '');

  // Split Answers
  let answerSectionIndex = cleanedText.search(/\d+\s*번\s*-\s*[①-⑤1-5]/);
  if (answerSectionIndex === -1) answerSectionIndex = cleanedText.length;

  const problemText = cleanedText.slice(0, answerSectionIndex);
  const answerText = cleanedText.slice(answerSectionIndex);

  const questions = [];
  
  // Find all [Number] occurrences
  // Use a global regex without anchors to be robust against line breaks
  const headerRegex = /[\[\s*(\d{1,3})\s*\]/g;
  
  const headers = [];
  let match;
  while ((match = headerRegex.exec(problemText)) !== null) {
    // We found a [18]. Now we need to find the PROMPT before it.
    // The prompt is usually the sentence ending right before [18].
    // We scan backwards from match.index for a newline or period.
    
    const num = parseInt(match[1], 10);
    const endOfHeader = match.index + match[0].length;
    
    // Find start of this line (or previous line if wrapped)
    let promptStart = problemText.lastIndexOf('\n', match.index);
    if (promptStart === -1) promptStart = 0;
    
    // Check if prompt is multiline (e.g. "어법상 \n 틀린 것은?")
    // Heuristic: scan back 100 chars or 2 lines
    let promptCandidate = problemText.slice(promptStart, match.index).trim();
    
    // If candidate is too short (< 5 chars), maybe the prompt is on previous line
    if (promptCandidate.length < 5) {
        const prevLineEnd = promptStart;
        const prevLineStart = problemText.lastIndexOf('\n', prevLineEnd - 1);
        if (prevLineStart !== -1) {
            promptCandidate = problemText.slice(prevLineStart, match.index).trim();
            promptStart = prevLineStart;
        }
    }
    
    headers.push({
      number: num,
      prompt: promptCandidate,
      startContent: endOfHeader,
      index: match.index
    });
  }

  for (let i = 0; i < headers.length; i++) {
    const current = headers[i];
    const next = headers[i+1];
    
    const contentStart = current.startContent;
    const contentEnd = next ? next.index - (next.prompt.length + 10) : problemText.length; 
    // Subtracting next prompt length roughly to avoid capturing next question's prompt as this question's options
    // But better is to cut at next.index and then Trim the tail.
    
    // Let's take strictly until the start of next header's Prompt line
    let rawContent = problemText.slice(contentStart, next ? problemText.lastIndexOf('\n', next.index) : problemText.length).trim();
    
    // Sometimes the slicing logic misses. Fallback: Slice until next match.index
    if (next && rawContent.length > (next.index - contentStart)) {
         rawContent = problemText.slice(contentStart, next.index).trim();
    }

    // Split Passage vs Options
    const markerRegex = /([①②③④⑤]|\(\s*[1-5]\s*\))/;
    const matchOption = rawContent.match(markerRegex);
    
    let passage = '';
    const options = [];
    
    if (matchOption) {
        passage = rawContent.slice(0, matchOption.index).trim();
        const optionsBlock = rawContent.slice(matchOption.index);
        
        // Clean up passage (remove trailing "1." or prompts)
        passage = passage.replace(/\n\d+\.\s*$/g, '');
        
        // Split options
        const parts = optionsBlock.split(/([①②③④⑤]|\(\s*[1-5]\s*\))/);
        for (let k = 1; k < parts.length; k += 2) {
            const marker = parts[k];
            const text = (parts[k+1] || '').trim();
            if (text) {
                const m = marker.replace(/[\(\)\s]/g, '')
                                .replace('1', '①').replace('2', '②').replace('3', '③').replace('4', '④').replace('5', '⑤');
                options.push(`${m} ${text}`);
            }
        }
    } else {
        passage = rawContent;
    }
    
    passage = autoUnderline(passage, options);

    questions.push({
        number: current.number,
        type: current.prompt.replace(/\n/g, ' '),
        passage: passage,
        options: options
    });
  }

  return { questions, answerText: repairText(answerText) };
}

function autoUnderline(passage, options) {
  if (!passage || !options || !options.length) return passage;
  let underlinedPassage = passage;
  options.forEach(opt => {
    const match = opt.match(/^([①②③④⑤])\s*(.*)/);
    if (!match) return;
    const marker = match[1];
    
    // Find marker in passage
    const markerIdx = underlinedPassage.indexOf(marker);
    if (markerIdx !== -1) {
        // Wrap marker + next word
        const simpleRegex = new RegExp(`(${marker})\\s*([^\\s]+)`, 'i');
        underlinedPassage = underlinedPassage.replace(simpleRegex, '$1 <u>$2</u>');
    }
  });
  return underlinedPassage;
}

function parseAnswers(text) {
    const answers = {}; 
    const regex = /(\d+)\s*번\s*-\s*([①-⑤])\s*([\s\S]*?)(?=(\d+\s*번\s*-)|$)/g;
    let match;
    while ((match = regex.exec(text)) !== null) {
        const num = parseInt(match[1], 10);
        const ansSymbol = match[2];
        const explanation = match[3].trim();
        const ansMap = { '①': '1', '②': '2', '③': '3', '④': '4', '⑤': '5' };
        answers[num] = {
            answer: ansMap[ansSymbol] || ansSymbol,
            explanation: explanation
        };
    }
    return answers;
}

// CLI support
if (require.main === module) {
    // Dummy main for CLI testing not implemented here, use import
}

module.exports = { parseQuestions, parseAnswers };
