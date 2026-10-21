import { exercises } from '../domain/models';
import { validateBackup, type Backup } from '../domain/backup';
import { mediaMetaSchema, type MediaRecord } from '../domain/listening';
import { db, type LearningDB } from './db';
export { validateBackup } from '../domain/backup';

export async function backup(store: LearningDB = db): Promise<Backup> {
  return store.transaction('r', store.tables, async () => {
    const common = {
      format: 'english-pocket-backup' as const,
      exportedAt: new Date().toISOString(),
      packs: await store.packs.toArray(),
      progress: await store.progress.toArray(),
      attempts: await store.attempts.toArray(),
      drafts: await store.drafts.toArray(),
    };
    const listeningLibraries = await store.listeningLibraries.toArray();
    if (!listeningLibraries.length) return { ...common, version: 1 };
    return {
      ...common,
      version: 2,
      mediaIncluded: false,
      listeningLibraries,
      media: (await store.media.toArray()).map((m) =>
        mediaMetaSchema.parse({
          id: m.id,
          fileName: m.fileName,
          byteLength: m.byteLength,
          durationSec: m.durationSec,
          sampleRate: m.sampleRate,
          channels: m.channels,
          bits: m.bits,
        }),
      ),
      listeningQuestions: await store.listeningQuestions.toArray(),
      listeningAttempts: await store.listeningAttempts.toArray(),
      listeningProgress: await store.listeningProgress.toArray(),
      listeningDrafts: await store.listeningDrafts.toArray(),
      listeningNotes: await store.listeningNotes.toArray(),
    };
  });
}
/** Restore retains matching local audio bytes; absent bytes become explicit rebind placeholders. */
export async function restore(
  input: unknown,
  store: LearningDB = db,
  provided: MediaRecord[] = [],
) {
  const data = validateBackup(input);
  await store.transaction('rw', store.tables, async () => {
    const available = new Map((await store.media.toArray()).map((m) => [m.id, m]));
    for (const m of provided) available.set(m.id, m);
    await Promise.all(store.tables.map((t) => t.clear()));
    await store.packs.bulkAdd(data.packs);
    await store.progress.bulkAdd(data.progress);
    await store.attempts.bulkAdd(data.attempts);
    await store.drafts.bulkAdd(data.drafts);
    if (data.version === 2) {
      await store.listeningLibraries.bulkAdd(data.listeningLibraries);
      await store.media.bulkAdd(
        data.media.map((m) => ({
          ...m,
          ...(available.get(m.id) ?? { storage: 'missing' as const }),
        })),
      );
      await store.listeningQuestions.bulkAdd(data.listeningQuestions);
      await store.listeningAttempts.bulkAdd(data.listeningAttempts);
      await store.listeningProgress.bulkAdd(data.listeningProgress);
      await store.listeningDrafts.bulkAdd(data.listeningDrafts);
      await store.listeningNotes.bulkAdd(data.listeningNotes);
    }
  });
}
export async function results(store: LearningDB = db) {
  const snapshot = await backup(store);
  const items = new Map(snapshot.packs.flatMap(exercises).map((e) => [e.key, e]));
  return {
    format: 'english-pocket-results',
    version: snapshot.version,
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
    ...(snapshot.version === 2
      ? {
          listeningAttempts: snapshot.listeningAttempts.map((a) => ({
            ...a,
            annotations: snapshot.listeningNotes.filter((n) => n.attemptId === a.id),
            practiceCounts: Object.fromEntries(
              a.questions.map((q) => [
                q.id,
                snapshot.listeningAttempts.filter(
                  (t) =>
                    t.libraryId === a.libraryId &&
                    t.questions.some((x) => x.id === q.id) &&
                    t.createdAt <= a.createdAt,
                ).length,
              ]),
            ),
          })),
        }
      : {}),
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
