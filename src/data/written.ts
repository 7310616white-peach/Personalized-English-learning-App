import { db, type LearningDB } from './db';
import { nextSchedule } from '../domain/scheduler';
import {
  gradeWritten,
  writtenDraftSchema,
  writtenKey,
  type WrittenTask,
  type WrittenAnswers,
} from '../domain/written';

async function canonical(packId: string, task: WrittenTask, store: LearningDB) {
  const pack = await store.packs.get(packId);
  const saved = pack?.schemaVersion === 3 && pack.written.find((t) => t.id === task.id);
  if (!saved || JSON.stringify(saved) !== JSON.stringify(task))
    throw new Error('题包已变更，请重新进入练习');
  return saved;
}
export async function saveWrittenDraft(
  packId: string,
  task: WrittenTask,
  answers: WrittenAnswers,
  store: LearningDB = db,
) {
  const draft = writtenDraftSchema.parse({
    key: writtenKey(packId, task.id),
    packId,
    taskId: task.id,
    answers,
  });
  if (task.type === 'word-bank' || task.type === 'matching') gradeWritten(task, answers);
  else if (Object.keys(answers).some((key) => key !== 'response'))
    throw new Error('作答包含未知题号');
  await store.transaction('rw', [store.packs, store.writtenDrafts], async () => {
    await canonical(packId, task, store);
    await store.writtenDrafts.put(draft);
  });
}
export async function submitWritten(
  packId: string,
  task: WrittenTask,
  answers: WrittenAnswers,
  attemptId: string,
  store: LearningDB = db,
  now = new Date(),
) {
  const grade = gradeWritten(task, answers);
  const key = writtenKey(packId, task.id);
  return store.transaction(
    'rw',
    [store.packs, store.writtenAttempts, store.writtenProgress, store.writtenDrafts],
    async () => {
      await canonical(packId, task, store);
      const previous = await store.writtenAttempts.get(attemptId);
      if (previous) {
        if (previous.key !== key || JSON.stringify(previous.answers) !== JSON.stringify(answers))
          throw new Error('提交 ID 与作答不一致');
        return previous;
      }
      const attempt = {
        id: attemptId,
        key,
        packId,
        taskId: task.id,
        answers,
        ...grade,
        createdAt: now.toISOString(),
      };
      await store.writtenAttempts.add(attempt);
      if (grade.correct !== null) {
        const progress = await store.writtenProgress.get(key);
        await store.writtenProgress.put({
          key,
          packId,
          taskId: task.id,
          ...nextSchedule(progress, grade.correct, now),
        });
      }
      const draft = await store.writtenDrafts.get(key);
      if (JSON.stringify(draft?.answers) === JSON.stringify(answers))
        await store.writtenDrafts.delete(key);
      return attempt;
    },
  );
}
