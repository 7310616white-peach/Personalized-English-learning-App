import 'fake-indexeddb/auto';
import { readFile } from 'node:fs/promises';
import { afterEach, expect, it } from 'vitest';
import { LearningDB } from '../src/data/db';
import { loadListeningDemo } from '../src/data/listening/demo';
import { submitAnswer } from '../src/data/learning';
import { exercises } from '../src/domain/models';
import { inspectWav } from '../src/domain/wav';

const stores: LearningDB[] = [];
afterEach(async () => {
  for (const store of stores.splice(0)) await store.delete();
});
const fetchSample: typeof fetch = async (input) => {
  const bytes = await readFile('public' + String(input));
  return new Response(bytes);
};
it('体验库包含四段有效语音；重复载入保留记录且不重复创建题包', async () => {
  const store = new LearningDB('demo-test-' + crypto.randomUUID());
  stores.push(store);
  const pack = await loadListeningDemo(store, fetchSample);
  expect(pack.schemaVersion).toBe(2);
  expect(await store.listeningQuestions.count()).toBe(12);
  const media = await store.media.toArray();
  expect(media).toHaveLength(4);
  for (const file of media) {
    expect(inspectWav(await file.blob!.arrayBuffer()).durationSec).toBeGreaterThan(15);
  }
  await submitAnswer(exercises(pack)[0], 'wrong', 'demo-answer', store);
  await loadListeningDemo(store, fetchSample);
  expect(await store.packs.count()).toBe(1);
  expect(await store.attempts.count()).toBe(1);
  expect(await store.progress.count()).toBe(1);
});
it('体验音频读取失败时，不写入题包或材料', async () => {
  const store = new LearningDB('demo-test-' + crypto.randomUUID());
  stores.push(store);
  const unavailable: typeof fetch = (input, init) =>
    String(input).endsWith('.wav')
      ? Promise.resolve(new Response('', { status: 404 }))
      : fetchSample(input, init);
  await expect(loadListeningDemo(store, unavailable)).rejects.toThrow('读取失败');
  expect(await store.packs.count()).toBe(0);
  expect(await store.listeningLibraries.count()).toBe(0);
});
