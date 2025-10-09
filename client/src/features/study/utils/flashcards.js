import { VOCAB_FLASHCARDS } from '../constants';

export const pickFlashcards = (count = 3, excludeWords = [], random = Math.random) => {
  const excludeSet = new Set(excludeWords);
  const available = VOCAB_FLASHCARDS.filter((card) => !excludeSet.has(card.word));
  const basePool = available.length ? available : VOCAB_FLASHCARDS;
  const pool = [...basePool];
  const picked = [];

  while (pool.length && picked.length < count) {
    const index = Math.floor(random() * pool.length);
    picked.push(pool.splice(index, 1)[0]);
  }

  while (picked.length < count) {
    const fallback = VOCAB_FLASHCARDS[Math.floor(random() * VOCAB_FLASHCARDS.length)];
    picked.push(fallback);
  }

  return picked.slice(0, count);
};
