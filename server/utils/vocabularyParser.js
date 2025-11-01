'use strict';

const LINE_SPLIT_REGEX = /\n+/;
const DAY_MARKER_REGEX = /^(\d+\s*)?Day\s*(\d{1,2})\s*$/i;
// Accept lines like "no18", "no.18", "1no.18", "35 no18", "문항 18", "번호18"
const NO_MARKER_REGEX = /^(?:\d+\s*)?(?:no\.?|문항|번호)\s*(\d{1,3})\s*$/i;
// Accept textbook style markers like "Lesson 3", "1Lesson 4"
const LESSON_MARKER_REGEX = /^(?:\d+\s*)?Lesson\s*(\d{1,2})\s*$/i;
// Inline entries like: "367no.41~42 generate 뜻..." or "no.18 express 뜻..."
const INLINE_NO_ENTRY_REGEX = /^(?:\d+\s*)?no\.?\s*(\d{1,3})(?:~\d+)?\s+([A-Za-z][A-Za-z\s'\-]*)\s+(.+)$/i;
const NUMBER_MARKER_REGEX = /^(\d{1,5})\s*번$/i;
const NUMBER_ONLY_REGEX = /^(\d{2,5})$/;

class VocabularyParser {
  parse(rawText = '') {
    const lines = String(rawText || '')
      .split(LINE_SPLIT_REGEX)
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    const days = [];
    const dayMap = new Map();
    let currentDay = null;
    let currentEntry = null;

    const finalizeEntry = () => {
      if (!currentDay || !currentEntry || !currentEntry.term) return;
      const meaning = (currentEntry.meaningLines || [])
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim();
      if (!meaning) return;

      currentDay.entries.push({
        index: currentEntry.index,
        term: currentEntry.term,
        meaning
      });
      currentEntry = null;
    };

    const ensureDay = (label) => {
      if (!dayMap.has(label)) {
        const dayData = {
          key: label,
          label,
          order: dayMap.size + 1,
          entries: []
        };
        dayMap.set(label, dayData);
        days.push(dayData);
      }
      return dayMap.get(label);
    };

    const extractStandaloneNumber = (input) => {
      if (!input) return null;
      const compact = String(input).replace(/\s+/g, '');
      let match = compact.match(NUMBER_MARKER_REGEX);
      if (!match && NUMBER_ONLY_REGEX.test(compact)) {
        match = [compact, compact];
      }
      if (!match) return null;
      const [, digits] = match;
      let numeric = parseInt(digits, 10);
      if (Number.isNaN(numeric) || numeric <= 0) return null;
      if (numeric >= 100) {
        const modHundred = numeric % 100;
        if (modHundred) numeric = modHundred;
      }
      return numeric;
    };

    for (const line of lines) {
      // 0) Inline entry handling: noXX + term + meaning on one line
      const inlineNo = line.match(INLINE_NO_ENTRY_REGEX);
      if (inlineNo) {
        finalizeEntry();
        const [, noNumber, term, rest] = inlineNo;
        const label = `no${parseInt(noNumber, 10)}`;
        currentDay = ensureDay(label);
        currentEntry = {
          index: currentDay.entries.length + 1,
          term: String(term || '').trim(),
          meaningLines: [String(rest || '').trim()]
        };
        continue;
      }
      const dayMatch = line.match(DAY_MARKER_REGEX);
      const noMatch = dayMatch ? null : line.match(NO_MARKER_REGEX);
      const lessonMatch = (dayMatch || noMatch) ? null : line.match(LESSON_MARKER_REGEX);
      const standaloneNumber = (dayMatch || noMatch || lessonMatch)
        ? null
        : extractStandaloneNumber(line);
      if (dayMatch || noMatch || lessonMatch || standaloneNumber !== null) {
        finalizeEntry();
        if (dayMatch) {
          const [, index, dayNumber] = dayMatch;
          currentDay = ensureDay(`Day ${String(dayNumber).padStart(2, '0')}`);
          currentEntry = {
            index: index ? parseInt(index, 10) : currentDay.entries.length + 1,
            term: '',
            meaningLines: []
          };
          continue;
        }
        if (noMatch) {
          // noXX 스타일을 Day처럼 취급 (label: no18 등)
          const [, noNumber] = noMatch;
          const label = `no${parseInt(noNumber, 10)}`;
          currentDay = ensureDay(label);
          currentEntry = {
            index: currentDay.entries.length + 1,
            term: '',
            meaningLines: []
          };
          continue;
        }
        if (lessonMatch) {
          // Lesson N → N과 로 표기
          const [, lessonNumber] = lessonMatch;
          const label = `${parseInt(lessonNumber, 10)}과`;
          currentDay = ensureDay(label);
          currentEntry = {
            index: currentDay.entries.length + 1,
            term: '',
            meaningLines: []
          };
          continue;
        }
        if (standaloneNumber !== null) {
          const label = `no${standaloneNumber}`;
          currentDay = ensureDay(label);
          currentEntry = {
            index: currentDay.entries.length + 1,
            term: '',
            meaningLines: []
          };
          continue;
        }
      }

      if (!currentDay) {
        continue;
      }

      if (currentEntry && !currentEntry.term) {
        currentEntry.term = line;
        continue;
      }

      if (currentEntry) {
        currentEntry.meaningLines.push(line);
      }
    }

    finalizeEntry();

    const enrichedDays = days
      .map((day) => ({
        ...day,
        entries: day.entries.map((entry, idx) => ({
          order: idx + 1,
          term: entry.term,
          meaning: entry.meaning
        }))
      }))
      .filter((day) => day.entries.length > 0);

    const totalWords = enrichedDays.reduce((sum, day) => sum + day.entries.length, 0);

    return {
      days: enrichedDays,
      totalDays: enrichedDays.length,
      totalWords
    };
  }
}

module.exports = VocabularyParser;
