import { db, type LearningDB } from './db';
import { exercises, type Exercise } from '../domain/models';

async function checkWord(exercise: Exercise, store: LearningDB) {
  const pack = await store.packs.get(exercise.packId);
  const canonical = pack && exercises(pack).find((e) => e.key === exercise.key);
  if (
    exercise.kind !== 'spelling' ||
    canonical?.kind !== 'spelling' ||
    JSON.stringify(canonical.item) !== JSON.stringify(exercise.item)
  )
    throw new Error('词汇内容已变更，请保存退出后重新进入');
}

/** Reading is a preparation draft, never a scored attempt or a review schedule. */
export async function readWordStudy(queue: Exercise[], store: LearningDB = db) {
  return store.transaction('r', [store.packs, store.drafts, store.progress], async () => {
    for (const exercise of queue) await checkWord(exercise, store);
    const drafts = await store.drafts.bulkGet(queue.map((e) => e.key));
    const progress = await store.progress.bulkGet(queue.map((e) => e.key));
    return queue.map((_, i) => !!drafts[i]?.wordStudy || !!progress[i]);
  });
}

export async function confirmWordStudy(
  exercise: Exercise,
  store: LearningDB = db,
  now = new Date(),
) {
  return store.transaction('rw', [store.packs, store.drafts], async () => {
    await checkWord(exercise, store);
    const draft = await store.drafts.get(exercise.key);
    await store.drafts.put({
      key: exercise.key,
      answer: draft?.answer ?? '',
      wordStudy: draft?.wordStudy ?? { version: 1, viewedAt: now.toISOString() },
    });
  });
}
