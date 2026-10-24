import { registerListeningQuestions } from './listening/questions';
import { vocabularyPackId } from './vocabulary';
import { db, type LearningDB } from './db';
import { grade } from '../domain/grading';
import { nextSchedule } from '../domain/scheduler';
import { exercises, packSchema, type Exercise } from '../domain/models';
import { canonicalJson } from '../domain/packIdentity';
/** Keep preparation metadata when the learner starts typing a spelling answer. */
export async function saveAnswerDraft(key: string, answer: string, store: LearningDB = db) {
  return store.transaction('rw', store.drafts, async () => {
    const draft = await store.drafts.get(key);
    await store.drafts.put({ ...draft, key, answer });
  });
}

export async function importPack(input: unknown, store: LearningDB = db) {
  return (await importPackWithStatus(input, store)).pack;
}
export async function importPackWithStatus(input: unknown, store: LearningDB = db) {
  const pack = packSchema.parse(input);
  if (pack.id === vocabularyPackId) throw new Error('此题包 ID 为个人生词本保留，请使用其他 ID');
  return store.transaction(
    'rw',
    store.packs,
    store.listeningLibraries,
    store.listeningQuestions,
    async () => {
      const existing = await store.packs.get(pack.id);
      if (existing) {
        if (canonicalJson(packSchema.parse(existing)) !== canonicalJson(pack))
          throw new Error(
            '题包 ID 已存在，但内容冲突。未覆盖原题包，答案、草稿和复习进度均已保留。请先核对文件；内容更新需另行设计明确的版本迁移。',
          );
        return { pack: existing, status: 'existing' as const };
      }
      await registerListeningQuestions(pack, store);
      await store.packs.add(pack);
      return { pack, status: 'imported' as const };
    },
  );
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
        if (existing.key !== exercise.key || existing.answer !== answer)
          throw new Error('重复提交 ID 与题目或作答不一致');
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
