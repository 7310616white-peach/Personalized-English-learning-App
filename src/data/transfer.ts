import { exercises } from '../domain/models';
import { validateBackup } from '../domain/backup';
import { db, type LearningDB } from './db';
export { validateBackup } from '../domain/backup';

export async function backup(store: LearningDB = db) {
  return store.transaction('r', store.tables, async () => ({
    format: 'english-pocket-backup' as const,
    version: 1 as const,
    exportedAt: new Date().toISOString(),
    packs: await store.packs.toArray(),
    progress: await store.progress.toArray(),
    attempts: await store.attempts.toArray(),
    drafts: await store.drafts.toArray(),
  }));
}
export async function restore(input: unknown, store: LearningDB = db) {
  const data = validateBackup(input);
  await store.transaction('rw', store.tables, async () => {
    await Promise.all(store.tables.map((t) => t.clear()));
    await store.packs.bulkAdd(data.packs);
    await store.progress.bulkAdd(data.progress);
    await store.attempts.bulkAdd(data.attempts);
    await store.drafts.bulkAdd(data.drafts);
  });
}
export async function results(store: LearningDB = db) {
  const snapshot = await backup(store);
  const items = new Map(snapshot.packs.flatMap(exercises).map((e) => [e.key, e]));
  return {
    format: 'english-pocket-results',
    version: 1,
    exportedAt: snapshot.exportedAt,
    attempts: snapshot.attempts.map((a) => {
      const e = items.get(a.key);
      return {
        ...a,
        prompt: e?.kind === 'spelling' ? e.item.meaning : e?.item.prompt,
        passage: e?.kind === 'choice' ? e.item.passage : undefined,
        expected: e?.kind === 'spelling' ? e.item.term : e?.item.answerId,
        options: e?.kind === 'choice' ? e.item.options : undefined,
        explanation: e?.kind === 'choice' ? e.item.explanation : undefined,
      };
    }),
  };
}
export async function readJson(file: File, maxMB = 10) {
  if (file.size > maxMB * 1024 * 1024) throw new Error(`文件超过 ${maxMB} MB，无法导入`);
  try {
    return JSON.parse(await file.text());
  } catch {
    throw new Error('无法读取 JSON，请检查文件格式');
  }
}
