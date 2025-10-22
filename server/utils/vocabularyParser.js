'use strict';

const LINE_SPLIT_REGEX = /\n+/;
const DAY_MARKER_REGEX = /^(\d+)?\s*Day\s*(\d{2})\s*$/i;

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

    const ensureDay = (dayNumber) => {
      const label = `Day ${dayNumber}`;
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

    for (const line of lines) {
      const dayMatch = line.match(DAY_MARKER_REGEX);
      if (dayMatch) {
        finalizeEntry();
        const [, index, dayNumber] = dayMatch;
        currentDay = ensureDay(dayNumber);
        currentEntry = {
          index: index ? parseInt(index, 10) : currentDay.entries.length + 1,
          term: '',
          meaningLines: []
        };
        continue;
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
