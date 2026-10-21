import 'fake-indexeddb/auto';
import { readFile } from 'node:fs/promises';
import { expect, it } from 'vitest';
import { cetTypesForDate } from '../src/domain/daily';
import { makeDailyPlan, type PlanData } from '../src/domain/dailyPlan';
import { dailyPreviewPack, loadDailyPreview } from '../src/data/dailyPreview';
import { packSchema, exercises } from '../src/domain/models';
import { LearningDB } from '../src/data/db';
import { submitAnswer } from '../src/data/learning';
import { submitWritten } from '../src/data/written';
import { backup, restore } from '../src/data/transfer';
import { dailyPromptForDate, setupPrompt } from '../src/features/transfer/prompts';
import { library, daily } from './helpers/listeningFixtures';
const now = new Date('2026-10-22T10:00:00');
const empty = (): PlanData => ({
  packs: [],
  progress: [],
  attempts: [],
  writtenAttempts: [],
  writtenProgress: [],
  libraries: [],
  listeningAttempts: [],
  listeningProgress: [],
  media: [],
});
const fixture = () => {
  const p = dailyPreviewPack(now);
  if (p.schemaVersion !== 3 || !p.daily) throw new Error('fixture');
  return p;
};
const fetcher: typeof fetch = async (input) =>
  new Response(await readFile('public' + String(input)));

it('每天阅读三选二，按三天轮换；每三天段落翻译一次，永不自动安排写作', () => {
  expect(cetTypesForDate('2026-10-22')).toEqual(['choice', 'word-bank']);
  expect(cetTypesForDate('2026-10-23')).toEqual(['matching', 'choice']);
  expect(cetTypesForDate('2026-10-24')).toEqual(['word-bank', 'matching', 'translation']);
  expect(cetTypesForDate('2026-10-25')).toEqual(['choice', 'word-bank']);
  const all = ['22', '23', '24', '25', '26', '27'].flatMap((d) => cetTypesForDate('2026-10-' + d));
  expect(all.filter((t) => t === 'translation')).toHaveLength(2);
  expect(all).not.toContain('writing');
});
it('每日角色引用、段落与一句翻译区分、文献原文和范文ID先校验再导入', () => {
  const p = fixture();
  expect(() =>
    packSchema.parse({ ...p, daily: { ...p.daily, researchChoiceIds: ['missing'] } }),
  ).toThrow();
  expect(() =>
    packSchema.parse({ ...p, daily: { ...p.daily, researchChoiceIds: ['close-1'] } }),
  ).toThrow();
  expect(() =>
    packSchema.parse({
      ...p,
      daily: { ...p.daily, cet: [{ type: 'translation', taskId: 'daily-sentence' }] },
    }),
  ).toThrow();
  expect(() =>
    packSchema.parse({
      ...p,
      daily: { ...p.daily, modelEssays: [...p.daily!.modelEssays, ...p.daily!.modelEssays] },
    }),
  ).toThrow();
});
it('缺内容保持待补充，六项顺序固定；草稿与昨天的记录不会完成今天任务', () => {
  const p = fixture();
  const d = empty();
  d.packs = [p];
  let plan = makeDailyPlan(d, p, now);
  expect(plan.tasks.map((t) => t.id)).toEqual([
    'words',
    'review',
    'listening',
    'cet',
    'research',
    'sentence',
  ]);
  expect(plan.tasks[2].status).toBe('missing');
  expect(plan.recommended).toBe(0);
  expect(plan.tasks[3].parts).toHaveLength(2);
  const e = exercises(p).find((e) => e.kind === 'choice' && e.item.id === 'research-1')!;
  d.attempts.push({
    id: 'a',
    key: e.key,
    packId: p.id,
    itemId: e.item.id,
    kind: 'choice',
    answer: 'B',
    correct: true,
    createdAt: '2026-10-21T02:00:00Z',
  });
  plan = makeDailyPlan(d, p, now);
  expect(plan.tasks[4].status).toBe('ready');
  expect(makeDailyPlan(empty(), undefined, now).tasks[0].status).toBe('missing');
});
it('校考优先于四级和内置演示；缺WAV时不偷换任务或伪报完成', () => {
  const d = empty();
  const p = fixture();
  d.packs = [p, packSchema.parse(daily)];
  d.libraries = [{ id: library.id, manifest: library, bindings: {} }];
  const plan = makeDailyPlan(d, p, now);
  expect(plan.tasks[2].status).toBe('missing');
  expect(plan.tasks[2].detail).toContain('WAV');
  expect(plan.tasks[2].activity).toBeUndefined();
});
it('真实提交后依次推进；四级两项必须都完成，文献与每日一句互不冒领', async () => {
  const s = new LearningDB('daily-' + crypto.randomUUID());
  try {
    const p = await loadDailyPreview(s, fetcher, now);
    if (p.schemaVersion !== 3) throw new Error('fixture');
    const read = async (): Promise<PlanData> => ({
      packs: await s.packs.toArray(),
      progress: await s.progress.toArray(),
      attempts: await s.attempts.toArray(),
      writtenAttempts: await s.writtenAttempts.toArray(),
      writtenProgress: await s.writtenProgress.toArray(),
      libraries: await s.listeningLibraries.toArray(),
      listeningAttempts: await s.listeningAttempts.toArray(),
      listeningProgress: await s.listeningProgress.toArray(),
      media: await s.media.toArray(),
    });
    for (const e of exercises(p).filter((e) => e.kind === 'spelling'))
      await submitAnswer(e, 'wrong', crypto.randomUUID(), s, now);
    let plan = makeDailyPlan(await read(), p, now);
    expect(plan.tasks[0].status).toBe('done');
    expect(plan.recommended).toBe(2);
    const choices = exercises(p).filter(
      (e) => e.kind === 'choice' && e.item.id.startsWith('close-'),
    );
    for (const e of choices) await submitAnswer(e, 'B', crypto.randomUUID(), s, now);
    plan = makeDailyPlan(await read(), p, now);
    expect(plan.tasks[3].status).toBe('ready');
    expect(plan.tasks[3].parts![0].status).toBe('done');
    await submitWritten(
      p.id,
      p.written.find((t) => t.type === 'word-bank')!,
      {},
      'bank',
      s,
      now,
    );
    plan = makeDailyPlan(await read(), p, now);
    expect(plan.tasks[3].status).toBe('done');
    expect(plan.tasks[4].status).toBe('ready');
    expect(plan.tasks[5].status).toBe('ready');
    await loadDailyPreview(s, fetcher, now);
    expect(await s.writtenAttempts.count()).toBe(1);
  } finally {
    await s.delete();
  }
});
it('v3每日元数据与范文可备份恢复，旧题包继续可用；导出前不丢新字段', async () => {
  const s = new LearningDB('daily-' + crypto.randomUUID());
  const t = new LearningDB('daily-' + crypto.randomUUID());
  try {
    await loadDailyPreview(s, fetcher, now);
    await restore(await backup(s), t);
    const p = await t.packs.get(fixture().id);
    expect(p?.schemaVersion === 3 && p.daily?.modelEssays[0].body).toContain('reading habit');
  } finally {
    await s.delete();
    await t.delete();
  }
});
it('复制提示词带实际日期和当日阅读搭配，不自动加作文', () => {
  expect(dailyPromptForDate(new Date('2026-10-24T09:00:00'))).toContain(
    '选词填空＋信息匹配＋段落翻译',
  );
  expect(dailyPromptForDate(now)).toContain('2026-10-22');
  expect(setupPrompt).toContain('不要安排作文');
  expect(setupPrompt).toContain('researchChoiceIds');
});
it('同一拼写提交ID不能拿来提交不同答案，避免结果与页面不一致', async () => {
  const s = new LearningDB('daily-' + crypto.randomUUID());
  try {
    const p = await loadDailyPreview(s, fetcher, now);
    const e = exercises(p)[0];
    await submitAnswer(e, 'one', 'id', s, now);
    await expect(submitAnswer(e, 'two', 'id', s, now)).rejects.toThrow('不一致');
    expect(await s.attempts.count()).toBe(1);
  } finally {
    await s.delete();
  }
});
