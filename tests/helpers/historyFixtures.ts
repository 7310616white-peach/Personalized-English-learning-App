import { readFileSync } from 'node:fs';
import { packSchema } from '../../src/domain/models';
import type { CetType } from '../../src/domain/daily';
import type { PlanData } from '../../src/domain/dailyPlan';
import type { LearningDB } from '../../src/data/db';

export function historyPack(day = '2026-10-22') {
  const pack = packSchema.parse(
    JSON.parse(
      readFileSync(new URL('../../public/examples/daily-preview.json', import.meta.url), 'utf8'),
    ),
  );
  if (pack.schemaVersion !== 3 || !pack.daily) throw new Error('fixture');
  const types: CetType[] =
    day === '2026-10-23'
      ? ['matching', 'choice']
      : day === '2026-10-24'
        ? ['word-bank', 'matching', 'translation']
        : ['choice', 'word-bank'];
  const cet = types.map((type) =>
    type === 'choice'
      ? { type, choiceIds: pack.choices.filter((q) => q.id.startsWith('close-')).map((q) => q.id) }
      : { type, taskId: pack.written.find((t) => t.type === type)!.id },
  );
  return packSchema.parse({
    ...pack,
    id: 'history-' + day,
    date: day,
    title: '原创历史测试 ' + day,
    listening: [],
    daily: { ...pack.daily, cet },
    written: pack.written.filter(
      (t) =>
        t.id === pack.daily!.sentenceTaskId || cet.some((c) => 'taskId' in c && c.taskId === t.id),
    ),
  });
}
export async function planData(store: LearningDB): Promise<PlanData> {
  return {
    packs: await store.packs.toArray(),
    progress: await store.progress.toArray(),
    attempts: await store.attempts.toArray(),
    writtenAttempts: await store.writtenAttempts.toArray(),
    writtenProgress: await store.writtenProgress.toArray(),
    libraries: await store.listeningLibraries.toArray(),
    listeningAttempts: await store.listeningAttempts.toArray(),
    listeningProgress: await store.listeningProgress.toArray(),
    media: await store.media.toArray(),
  };
}
