import 'fake-indexeddb/auto';
import { afterEach, expect, it, vi } from 'vitest';
import { LearningDB } from '../src/data/db';
import {
  importPack,
  importPackWithStatus,
  saveAnswerDraft,
  submitAnswer,
} from '../src/data/learning';
import { submitWritten, saveWrittenDraft } from '../src/data/written';
import { importListeningLibrary } from '../src/data/listening/materials';
import { submitListening } from '../src/data/listening/attempts';
import { backup } from '../src/data/transfer';
import { audioBytes } from '../src/platform/audioStorage';
import { makeDailyPlan } from '../src/domain/dailyPlan';
import { exercises, packSchema } from '../src/domain/models';
import { cetTypesForPack, cetTypesForDate } from '../src/domain/daily';
import { localDate } from '../src/domain/queue';
import { library, set, wavBytes } from './helpers/listeningFixtures';
import { historyPack, planData } from './helpers/historyFixtures';
import legacy from '../public/examples/day-001.json';

const stores: LearningDB[] = [];
const create = () => {
  const s = new LearningDB('history-' + crypto.randomUUID());
  stores.push(s);
  return s;
};
afterEach(async () => {
  for (const s of stores.splice(0)) await s.delete();
  vi.unstubAllEnvs();
});
const on22 = new Date('2026-10-22T10:00:00+08:00');
const on23 = new Date('2026-10-23T10:00:00+08:00');

it('23日补22日按原题包安排，阅读已交、选词未交；新提交用真实时间，双方进度独立', async () => {
  const store = create(),
    p22 = await importPack(historyPack(), store),
    p23 = await importPack(historyPack('2026-10-23'), store);
  if (p22.schemaVersion !== 3) throw new Error('fixture');
  for (const e of exercises(p22).filter(
    (e) => e.kind === 'choice' && e.item.id.startsWith('close-'),
  ))
    await submitAnswer(e, 'B', crypto.randomUUID(), store, on22);
  await submitWritten(
    p22.id,
    p22.written.find((t) => t.id === p22.daily?.sentenceTaskId)!,
    { response: 'A real response.' },
    'sentence',
    store,
    on22,
  );
  let data = await planData(store),
    plan = makeDailyPlan(data, p22, on23);
  expect(plan.cetTypes).toEqual(['choice', 'word-bank']);
  expect(plan.day).toBe(localDate(on23));
  expect(plan.taskDay).toBe('2026-10-22');
  expect(plan.tasks[3].parts?.map((p) => p.status)).toEqual(['done', 'ready']);
  expect(plan.tasks[3].activity?.type).toBe('written');
  expect(plan.tasks[5].status).toBe('done');
  expect(makeDailyPlan(data, p23, on23).tasks[3].parts?.map((p) => p.status)).toEqual([
    'ready',
    'ready',
  ]);
  const bank = p22.written.find((t) => t.type === 'word-bank')!;
  const result = await submitWritten(p22.id, bank, {}, 'bank', store, on23);
  expect(result.createdAt).toBe(on23.toISOString());
  expect((await store.writtenProgress.toArray()).find((p) => p.taskId === bank.id)?.due).toBe(
    new Date('2026-10-24T10:00:00+08:00').toISOString(),
  );
  data = await planData(store);
  plan = makeDailyPlan(data, p22, new Date('2026-10-24T10:00:00+08:00'));
  expect(plan.tasks[3].status).toBe('done');
  expect(makeDailyPlan(data, p23, on23).tasks[3].status).toBe('ready');
});

it('daily.cet优先于日历，旧包按自身日期回退；空安排不制造任务', () => {
  expect(cetTypesForPack(packSchema.parse(legacy), '2026-10-24')).toEqual(['choice']);
  const p = historyPack('2026-10-23');
  if (p.schemaVersion !== 3 || !p.daily) throw new Error('fixture');
  const custom = packSchema.parse({
    ...p,
    date: '2026-10-22',
    daily: { ...p.daily, cet: [p.daily.cet[0]] },
  });
  expect(cetTypesForPack(custom, '2026-10-24')).toEqual(['matching']);
  expect(cetTypesForPack(packSchema.parse({ ...p, daily: undefined }), '2026-10-24')).toEqual([
    'matching',
    'choice',
  ]);
  expect(cetTypesForDate('2026-10-24')).toEqual(['word-bank', 'matching', 'translation']);
  const empty = packSchema.parse({ ...p, daily: { ...p.daily, cet: [] } });
  expect(cetTypesForPack(empty, '2026-10-24')).toEqual([]);
});

it('上海凌晨仍用手机当地日期；ISO作答时间不改写成题包日期', async () => {
  vi.stubEnv('TZ', 'Asia/Shanghai');
  const store = create(),
    p = await importPack(historyPack(), store);
  const real = new Date('2026-10-22T16:30:00Z');
  expect(localDate(real)).toBe('2026-10-23');
  const answer = await submitAnswer(exercises(p)[0], 'x', 'midnight', store, real);
  const plan = makeDailyPlan(await planData(store), p, real);
  expect(plan.day).toBe('2026-10-23');
  expect(plan.taskDay).toBe('2026-10-22');
  expect(plan.cetTypes).toEqual(['choice', 'word-bank']);
  expect(answer.createdAt).toBe('2026-10-22T16:30:00.000Z');
});

it('跨日不把已学12词重新加入新词；未学部分可继续，其他题包的今日额度不冒领完成', async () => {
  const store = create(),
    p22 = await importPack(historyPack(), store),
    p23 = await importPack(historyPack('2026-10-23'), store);
  const words = exercises(p22).filter((e) => e.kind === 'spelling');
  await submitAnswer(words[0], 'x', 'first', store, on22);
  expect(makeDailyPlan(await planData(store), p22, on23).queues.words).toHaveLength(11);
  for (const e of words.slice(1)) await submitAnswer(e, 'x', crypto.randomUUID(), store, on22);
  const data = await planData(store);
  expect(makeDailyPlan(data, p22, on23).queues.words).toHaveLength(0);
  expect(makeDailyPlan(data, p22, on23).tasks[0].status).toBe('done');
  expect(makeDailyPlan(data, p23, on22).tasks[0].status).toBe('missing');
  expect(makeDailyPlan(data, p23, on23).tasks[0].status).toBe('ready');
});

it('并发相同导入只建一份；对象字段顺序不影响判同，内容冲突原子拒绝且保留草稿和历史', async () => {
  const store = create(),
    pack = historyPack();
  const imported = await Promise.all([
    importPackWithStatus(pack, store),
    importPackWithStatus(JSON.parse(JSON.stringify(pack)), store),
  ]);
  expect(imported.map((r) => r.status).sort()).toEqual(['existing', 'imported']);
  await submitAnswer(exercises(pack)[0], 'x', 'keep', store, on22);
  await saveAnswerDraft(exercises(pack)[1].key, 'partial', store);
  if (pack.schemaVersion !== 3) throw new Error('fixture');
  const task = pack.written[0];
  await saveWrittenDraft(pack.id, task, {}, store);
  const before = await backup(store);
  const reordered = Object.fromEntries(Object.entries(pack).reverse());
  expect((await importPackWithStatus(reordered, store)).status).toBe('existing');
  await expect(importPackWithStatus({ ...pack, title: 'changed' }, store)).rejects.toThrow(
    '内容冲突',
  );
  const after = await backup(store);
  expect({ ...after, exportedAt: '' }).toEqual({ ...before, exportedAt: '' });
});

it('8段WAV、音轨绑定、听力与词汇复习及草稿在补做和重复导入后逐字节保留', async () => {
  const store = create();
  const manifest = {
    ...library,
    tracks: Array.from({ length: 8 }, (_, i) => ({
      ...library.tracks[0],
      id: 'track-' + i,
      unit: i < 4 ? 'unit-1' : 'unit-2',
      section: ['news-report', 'conversation', 'passage-1', 'passage-2'][i % 4],
      audioFile: i + '.wav',
    })),
  };
  await importListeningLibrary(
    manifest,
    Object.fromEntries(
      manifest.tracks.map((t, i) => [t.id, new File([wavBytes(440 + i * 20).buffer], t.audioFile)]),
    ),
    store,
  );
  const base = historyPack();
  const listening = manifest.tracks.map((t, i) => ({
    ...set,
    id: 'set-' + i,
    trackId: t.id,
    questions: set.questions.map((q) => ({ ...q, id: q.id + '-' + i })),
  }));
  const p = await importPack({ ...base, listening }, store);
  await submitAnswer(exercises(p)[0], 'x', 'word', store, on22);
  const selected = makeDailyPlan(await planData(store), p, on22).tasks[2].activity;
  if (selected?.type !== 'listening') throw new Error('fixture');
  await submitListening(
    p.id,
    selected.set,
    {},
    { playCount: 2, lastPlaybackRate: 1.25 },
    'listen',
    store,
    on22,
  );
  await saveAnswerDraft(exercises(p)[1].key, 'keep-draft', store);
  const before = await backup(store);
  const bytes = await Promise.all((await store.media.toArray()).map(audioBytes));
  const first = makeDailyPlan(await planData(store), p, on22).tasks[2];
  expect(first.status).toBe('done');
  expect(makeDailyPlan(await planData(store), p, on23).tasks[2].status).toBe('done');
  expect(makeDailyPlan(await planData(store), p, on23).tasks[2].activity).toEqual(first.activity);
  await importPack(p, store);
  await expect(importPack({ ...p, words: [] }, store)).rejects.toThrow('内容冲突');
  expect(await store.media.count()).toBe(8);
  const after = await backup(store);
  expect({ ...after, exportedAt: '' }).toEqual({ ...before, exportedAt: '' });
  const afterBytes = await Promise.all((await store.media.toArray()).map(audioBytes));
  expect(afterBytes).toEqual(bytes);
  const nextPack = await importPack({ ...p, id: 'next-listening', date: '2026-10-23' }, store);
  expect(makeDailyPlan(await planData(store), nextPack, on23).tasks[2].status).toBe('ready');
});
