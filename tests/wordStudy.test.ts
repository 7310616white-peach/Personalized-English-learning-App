import 'fake-indexeddb/auto';
import { afterEach, expect, it } from 'vitest';
import { LearningDB } from '../src/data/db';
import { importPack, saveAnswerDraft, submitAnswer } from '../src/data/learning';
import { confirmWordStudy, readWordStudy } from '../src/data/wordStudy';
import { backup, restore, validateBackup } from '../src/data/transfer';
import { exercises, packSchema } from '../src/domain/models';
import { makeQueues } from '../src/domain/queue';
import sample from '../public/examples/day-001.json';

const stores: LearningDB[] = [];
const createStore = () => {
  const store = new LearningDB('word-study-' + crypto.randomUUID());
  stores.push(store);
  return store;
};
afterEach(async () => {
  for (const store of stores.splice(0)) await store.delete();
});
const pack = packSchema.parse(sample);
const words = exercises(pack).filter((e) => e.kind === 'spelling');
const now = new Date('2026-10-22T02:00:00Z');

it('词义学习断点与旧拼写草稿共存，可备份恢复，不计答题或启动间隔复习', async () => {
  const source = createStore();
  const target = createStore();
  await importPack(pack, source);
  await saveAnswerDraft(words[0].key, 'appr', source);
  await confirmWordStudy(words[0], source, now);
  expect((await source.drafts.get(words[0].key))?.answer).toBe('appr');
  await saveAnswerDraft(words[0].key, 'appro', source);
  source.close();
  await source.open();
  expect(await readWordStudy(words, source)).toEqual([true, ...Array(11).fill(false)]);
  expect(await source.attempts.count()).toBe(0);
  expect(await source.progress.count()).toBe(0);
  expect(makeQueues([pack], [], [], pack.id, now).words).toHaveLength(12);
  const snapshot = await backup(source);
  await restore(snapshot, target);
  expect(await readWordStudy(words, target)).toEqual(await readWordStudy(words, source));
  expect((await target.drafts.get(words[0].key))?.answer).toBe('appro');
  await submitAnswer(words[0], 'appro', 'scored', target, now);
  expect(await target.drafts.get(words[0].key)).toBeUndefined();
  expect((await readWordStudy(words, target))[0]).toBe(true);
  expect(await target.attempts.count()).toBe(1);
});

it('词汇内容过期或误传选择题时拒绝写入；重复确认不改学习时间', async () => {
  const store = createStore();
  await importPack(pack, store);
  await confirmWordStudy(words[0], store, now);
  await confirmWordStudy(words[0], store, new Date('2026-10-23T02:00:00Z'));
  expect((await store.drafts.get(words[0].key))?.wordStudy?.viewedAt).toBe(now.toISOString());
  const stale = { ...words[1], item: { ...words[1].item, meaning: 'changed' } };
  await expect(confirmWordStudy(stale, store)).rejects.toThrow('已变更');
  await expect(readWordStudy([stale], store)).rejects.toThrow('已变更');
  await expect(confirmWordStudy(exercises(pack).at(-1)!, store)).rejects.toThrow('已变更');
  expect(await store.drafts.count()).toBe(1);
});

it('学习草稿元数据版本和时间必须有效，不能伪装成选择题；旧备份仍可恢复', async () => {
  const store = createStore();
  await importPack(pack, store);
  const old = await backup(store);
  await restore(old, store);
  const draft = {
    key: words[0].key,
    answer: '',
    wordStudy: { version: 1, viewedAt: now.toISOString() },
  };
  expect(validateBackup({ ...old, drafts: [draft] }).drafts).toEqual([draft]);
  expect(() =>
    validateBackup({ ...old, drafts: [{ ...draft, key: exercises(pack).at(-1)!.key }] }),
  ).toThrow();
  expect(() =>
    validateBackup({
      ...old,
      drafts: [{ ...draft, wordStudy: { version: 2, viewedAt: now.toISOString() } }],
    }),
  ).toThrow();
  expect(() =>
    validateBackup({ ...old, drafts: [{ ...draft, wordStudy: { version: 1, viewedAt: 'bad' } }] }),
  ).toThrow();
});
