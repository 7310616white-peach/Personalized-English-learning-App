import { z } from 'zod';

const id = z.string().regex(/^[a-zA-Z0-9_-]{1,80}$/);
const text = z.string().trim().min(1).max(30000);
const option = z.object({ id, text }).strict();
const base = { id, title: text, instructions: text, source: text };
const objective = {
  questions: z
    .array(z.object({ id, prompt: text, answerId: id, explanation: text }).strict())
    .min(1)
    .max(30),
};
export const writtenTaskSchema = z
  .discriminatedUnion('type', [
    z
      .object({
        ...base,
        type: z.literal('word-bank'),
        passage: text,
        options: z.array(option).min(2).max(30),
        ...objective,
      })
      .strict(),
    z
      .object({
        ...base,
        type: z.literal('matching'),
        paragraphs: z.array(option).min(2).max(30),
        ...objective,
      })
      .strict(),
    z
      .object({
        ...base,
        type: z.literal('translation'),
        prompt: text,
        reference: text,
        explanation: text,
      })
      .strict(),
    z
      .object({
        ...base,
        type: z.literal('writing'),
        prompt: text,
        reference: text,
        explanation: text,
        minWords: z.number().int().min(1).max(1000),
        maxWords: z.number().int().min(1).max(2000),
      })
      .strict(),
  ])
  .superRefine((task, ctx) => {
    if (task.type === 'writing' && task.minWords > task.maxWords)
      ctx.addIssue({ code: 'custom', message: '作文字数范围无效' });
    if (task.type !== 'word-bank' && task.type !== 'matching') return;
    const options = task.type === 'word-bank' ? task.options : task.paragraphs;
    const ids = options.map((o) => o.id);
    if (
      new Set(ids).size !== ids.length ||
      new Set(task.questions.map((q) => q.id)).size !== task.questions.length ||
      task.questions.some((q) => !ids.includes(q.answerId))
    )
      ctx.addIssue({ code: 'custom', message: '题目与选项 ID 必须唯一，答案必须引用有效选项' });
    if (task.type === 'word-bank') {
      const markers = [...task.passage.matchAll(/\[\[([a-zA-Z0-9_-]+)\]\]/g)].map((m) => m[1]);
      if (
        markers.length !== task.questions.length ||
        new Set(markers).size !== markers.length ||
        task.questions.some((q) => !markers.includes(q.id))
      )
        ctx.addIssue({ code: 'custom', message: '选词填空原文必须为每题包含一个 [[题目ID]] 标记' });
      if (new Set(task.questions.map((q) => q.answerId)).size !== task.questions.length)
        ctx.addIssue({ code: 'custom', message: '选词填空的标准答案不可重复用词' });
    }
  });
export type WrittenTask = z.infer<typeof writtenTaskSchema>;
export const writtenAnswersSchema = z.record(id, z.string().max(10000));
export type WrittenAnswers = z.infer<typeof writtenAnswersSchema>;
export const writtenKey = (packId: string, taskId: string) =>
  JSON.stringify([packId, 'written', taskId]);
export function gradeWritten(task: WrittenTask, input: WrittenAnswers) {
  const answers = writtenAnswersSchema.parse(input);
  const keys =
    task.type === 'word-bank' || task.type === 'matching'
      ? task.questions.map((q) => q.id)
      : ['response'];
  if (Object.keys(answers).some((key) => !keys.includes(key))) throw new Error('作答包含未知题号');
  if (task.type === 'translation' || task.type === 'writing') {
    if (!answers.response?.trim()) throw new Error('请先填写作答');
    return { correct: null, earned: null, total: null };
  }
  const options = task.type === 'word-bank' ? task.options : task.paragraphs;
  if (Object.values(answers).some((a) => a !== '' && !options.some((o) => o.id === a)))
    throw new Error('作答选项无效');
  const selected = Object.values(answers).filter(Boolean);
  if (task.type === 'word-bank' && new Set(selected).size !== selected.length)
    throw new Error('每个词只能使用一次');
  const earned = task.questions.filter((q) => answers[q.id] === q.answerId).length;
  return { correct: earned === task.questions.length, earned, total: task.questions.length };
}
const identity = { key: z.string(), packId: id, taskId: id };
export const writtenDraftSchema = z.object({ ...identity, answers: writtenAnswersSchema }).strict();
export const writtenAttemptSchema = z
  .object({
    ...identity,
    id: z.string().min(1),
    answers: writtenAnswersSchema,
    correct: z.boolean().nullable(),
    earned: z.number().int().nonnegative().nullable(),
    total: z.number().int().positive().nullable(),
    createdAt: z.string().datetime(),
  })
  .strict();
export const writtenProgressSchema = z
  .object({
    ...identity,
    stage: z.number().int().min(0).max(12),
    due: z.string().datetime(),
    reviews: z.number().int().nonnegative(),
    errors: z.number().int().nonnegative(),
    lastReviewedAt: z.string().datetime(),
  })
  .strict();
export type WrittenDraft = z.infer<typeof writtenDraftSchema>;
export type WrittenAttempt = z.infer<typeof writtenAttemptSchema>;
export type WrittenProgress = z.infer<typeof writtenProgressSchema>;
export const wordCount = (text: string) =>
  (text.match(/[A-Za-z]+(?:['’-][A-Za-z]+)*/g) ?? []).length;
