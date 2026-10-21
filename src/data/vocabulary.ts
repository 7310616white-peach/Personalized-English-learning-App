import { db, type LearningDB } from './db';
import { packSchema, wordSchema, type Word } from '../domain/models';
import { normalizeAnswer } from '../domain/grading';
import { localDate } from '../domain/queue';

export const vocabularyPackId = '_personal-vocabulary';
/** Add a word without rewriting an existing personal card or its learning history. */
export async function saveVocabulary(word: Word, store: LearningDB = db) {
  const clean = wordSchema.parse(word);
  return store.transaction('rw', store.packs, async () => {
    const current = await store.packs.get(vocabularyPackId);
    const existing = current?.words.find(
      (w) => normalizeAnswer(w.term) === normalizeAnswer(clean.term),
    );
    if (existing) return false;
    const pack = packSchema.parse(
      current ?? {
        schemaVersion: 1,
        id: vocabularyPackId,
        title: '我的阅读生词',
        date: localDate(new Date()),
        words: [clean],
        choices: [],
      },
    );
    if (current) {
      if (pack.words.length >= 500)
        throw new Error('生词本已达到 500 词，请先备份；后续版本将支持分册。');
      pack.words.push(clean);
    }
    await store.packs.put(pack);
    return true;
  });
}
