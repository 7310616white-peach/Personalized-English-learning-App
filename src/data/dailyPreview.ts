import fixture from '../../public/examples/daily-preview.json';
import { packSchema } from '../domain/models';
import { cetTypesForDate } from '../domain/daily';
import { localDate } from '../domain/queue';
import { importPack } from './learning';
import { loadListeningDemo } from './listening/demo';
import { db, type LearningDB } from './db';

export function dailyPreviewPack(now = new Date()) {
  const date = localDate(now);
  const base = packSchema.parse(fixture);
  if (base.schemaVersion !== 3 || !base.daily) throw new Error('预览题包缺少每日安排');
  const types = cetTypesForDate(date);
  const cet = types.map((type) =>
    type === 'choice'
      ? { type, choiceIds: base.choices.filter((q) => q.id.startsWith('close-')).map((q) => q.id) }
      : { type, taskId: base.written.find((t) => t.type === type)!.id },
  );
  return packSchema.parse({
    ...base,
    id: 'daily-preview-' + date.replaceAll('-', ''),
    date,
    daily: { ...base.daily, cet },
    written: base.written.filter(
      (t) =>
        t.id === base.daily!.sentenceTaskId || cet.some((c) => 'taskId' in c && c.taskId === t.id),
    ),
  });
}
/** Explicit preview import; repeated loading retains every attempt and draft. */
export async function loadDailyPreview(store: LearningDB = db, fetcher = fetch, now = new Date()) {
  const pack = dailyPreviewPack(now);
  const existing = await store.packs.get(pack.id);
  if (existing && JSON.stringify(existing) !== JSON.stringify(pack))
    throw new Error('预览题包ID冲突，已有记录未修改');
  await loadListeningDemo(store, fetcher);
  if (!existing) await importPack(pack, store);
  return pack;
}
