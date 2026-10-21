import { registerListeningQuestions } from './listening/questions';
import { vocabularyPackId } from './vocabulary';
import { db, type LearningDB } from './db';
import { grade } from '../domain/grading';
import { nextSchedule } from '../domain/scheduler';
import { exercises, packSchema, type Exercise } from '../domain/models';
export async function importPack(input: unknown, store: LearningDB = db) {
  const pack = packSchema.parse(input);
  if (pack.id === vocabularyPackId) throw new Error('此题包 ID 为个人生词本保留，请使用其他 ID');
  await store.transaction(
    'rw',
    store.packs,
    store.listeningLibraries,
    store.listeningQuestions,
    async () => {
      if (await store.packs.get(pack.id))
        throw new Error('这个题包 ID 已存在。为保护学习记录，请为新题包使用新 ID。');
      await registerListeningQuestions(pack, store);
      await store.packs.add(pack);
    },
  );
  return pack;
}
export async function submitAnswer(
  exercise: Exercise,
  answer: string,
  attemptId: string,
  store: LearningDB = db,
  now = new Date(),
) {
  if (!answer.trim()) throw new Error('请先填写答案');
  return store.transaction(
    'rw',
    store.packs,
    store.attempts,
    store.progress,
    store.drafts,
    async () => {
      const existing = await store.attempts.get(attemptId);
      if (existing) {
        if (existing.key !== exercise.key) throw new Error('重复提交 ID 与题目不一致');
        return existing;
      }
      const pack = await store.packs.get(exercise.packId);
      const canonical = pack && exercises(pack).find((e) => e.key === exercise.key);
      if (!canonical || JSON.stringify(canonical.item) !== JSON.stringify(exercise.item))
        throw new Error('题包已变更，请重新进入练习');
      if (canonical.kind === 'choice' && !canonical.item.options.some((o) => o.id === answer))
        throw new Error('请选择有效选项');
      const correct = grade(exercise, answer);
      const previous = await store.progress.get(exercise.key);
      const attempt = {
        id: attemptId,
        key: exercise.key,
        packId: exercise.packId,
        itemId: exercise.item.id,
        kind: exercise.kind,
        answer,
        correct,
        createdAt: now.toISOString(),
      };
      await store.attempts.add(attempt);
      await store.progress.put({
        key: exercise.key,
        packId: exercise.packId,
        itemId: exercise.item.id,
        kind: exercise.kind,
        ...nextSchedule(previous, correct, now),
      });
      const draft = await store.drafts.get(exercise.key);
      if (draft?.answer === answer) await store.drafts.delete(exercise.key);
      return attempt;
    },
  );
}
