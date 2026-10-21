import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { dictionaryWords, findWords, normalizeQuery } from '../src/domain/lookup';
import { packSchema, wordSchema } from '../src/domain/models';
import { saveVocabulary, vocabularyPackId } from '../src/data/vocabulary';
import { importPack } from '../src/data/learning';
import { LearningDB } from '../src/data/db';
import { backup, restore } from '../src/data/transfer';
import sample from '../public/examples/day-001.json';
import glossary from '../src/features/lookup/glossary.json';

const base = glossary.map((w) => wordSchema.parse(w));
describe('阅读查词与生词持久化', () => {
  it('规范查询词，优先使用导入语境，提供词形候选而非误判成原词', () => {
    expect(normalizeQuery(' (COHORT). ')).toBe('cohort');
    const words = dictionaryWords([packSchema.parse(sample)], base);
    expect(findWords(words, 'cohort').exact?.example).toContain('researchers');
    expect(findWords(words, 'cohorts').exact).toBeUndefined();
    expect(findWords(words, 'cohorts').suggestions.map((w) => w.term)).toContain('cohort');
    expect(findWords(words, '').suggestions).toHaveLength(0);
    expect(findWords(words, 'not-in-local-dictionary').exact).toBeUndefined();
  });
  it('生词收藏去重，拒绝外部覆盖保留题包，并包含在完整备份中', async () => {
    const source = new LearningDB('lookup-' + crypto.randomUUID());
    const target = new LearningDB('lookup-' + crypto.randomUUID());
    try {
      const word = wordSchema.parse({
        id: 'custom-1',
        term: 'causal',
        meaning: 'adj. 因果的',
        level: '科研英语',
      });
      expect(await saveVocabulary(word, source)).toBe(true);
      expect(await saveVocabulary({ ...word, id: 'custom-2', term: 'CAUSAL' }, source)).toBe(false);
      expect((await source.packs.get(vocabularyPackId))?.words).toHaveLength(1);
      await expect(importPack({ ...sample, id: vocabularyPackId }, source)).rejects.toThrow('保留');
      await restore(await backup(source), target);
      expect((await target.packs.get(vocabularyPackId))?.words[0].term).toBe('causal');
    } finally {
      await source.delete();
      await target.delete();
    }
  });
});
