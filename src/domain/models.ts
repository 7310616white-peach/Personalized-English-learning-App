import { z } from 'zod';
import { listeningSetSchema } from './listening';
import { dailySchema } from './daily';
import { writtenTaskSchema } from './written';
const text = z.string().trim().min(1).max(10000);
const id = z.string().regex(/^[a-zA-Z0-9_-]{1,80}$/, 'ID 仅允许字母、数字、下划线和短横线');
export const wordSchema = z
  .object({
    id,
    term: text,
    level: z.enum(['CET-4', 'CET-6', '科研英语']),
    meaning: text,
    phonetic: z.string().max(200).optional(),
    otherMeanings: z.array(text).max(20).default([]),
    collocations: z.array(text).max(20).default([]),
    example: z.string().max(10000).default(''),
    exampleTranslation: z.string().max(10000).default(''),
    confusion: z.string().max(10000).default(''),
    acceptedAnswers: z.array(text).max(10).default([]),
  })
  .strict();
export const choiceSchema = z
  .object({
    id,
    prompt: text,
    passage: z.string().max(30000).optional(),
    options: z.array(z.object({ id, text }).strict()).min(2).max(8),
    answerId: id,
    explanation: text,
  })
  .strict()
  .superRefine((q, ctx) => {
    if (
      new Set(q.options.map((o) => o.id)).size !== q.options.length ||
      !q.options.some((o) => o.id === q.answerId)
    )
      ctx.addIssue({ code: 'custom', message: '选项 ID 必须唯一且包含正确答案' });
  });
const packFields = {
  id,
  title: text,
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .refine(
      (s) => !Number.isNaN(Date.parse(s)) && new Date(s).toISOString().slice(0, 10) === s,
      '日期无效',
    ),
  words: z.array(wordSchema).max(500),
  choices: z.array(choiceSchema).max(500),
};
export const packSchema = z
  .discriminatedUnion('schemaVersion', [
    z.object({ ...packFields, schemaVersion: z.literal(1) }).strict(),
    z
      .object({
        ...packFields,
        schemaVersion: z.literal(2),
        listening: z.array(listeningSetSchema).max(100),
        glossary: z.array(wordSchema).max(1000).optional(),
      })
      .strict(),
    z
      .object({
        ...packFields,
        schemaVersion: z.literal(3),
        listening: z.array(listeningSetSchema).max(100),
        glossary: z.array(wordSchema).max(1000).optional(),
        written: z.array(writtenTaskSchema).max(100),
        daily: dailySchema.optional(),
      })
      .strict(),
  ])
  .superRefine((p, ctx) => {
    const ids = [
      ...p.words,
      ...p.choices,
      ...(p.schemaVersion !== 1 ? p.listening : []),
      ...(p.schemaVersion === 3 ? p.written : []),
    ].map((i) => i.id);
    if (!ids.length || new Set(ids).size !== ids.length)
      ctx.addIssue({ code: 'custom', message: '题包不能为空，题目/听力组 ID 必须唯一' });
    if (p.schemaVersion === 3 && p.daily) {
      const d = p.daily;
      const choiceIds = [
        ...d.researchChoiceIds,
        ...d.cet.flatMap((c) => (c.type === 'choice' ? c.choiceIds : [])),
      ];
      if (
        new Set(choiceIds).size !== choiceIds.length ||
        choiceIds.some((id) => !p.choices.some((c) => c.id === id))
      )
        ctx.addIssue({
          code: 'custom',
          message: '每日阅读引用不存在或重复；文献与四级题不能使用同一题',
        });
      if (new Set(d.cet.map((c) => c.type)).size !== d.cet.length)
        ctx.addIssue({ code: 'custom', message: '每日四级题型不可重复' });
      for (const cet of d.cet)
        if (
          cet.type !== 'choice' &&
          !p.written.some((t) => t.id === cet.taskId && t.type === cet.type)
        )
          ctx.addIssue({ code: 'custom', message: '每日四级任务类型或引用无效' });
      if (d.researchChoiceIds.some((id) => !p.choices.find((q) => q.id === id)?.passage?.trim()))
        ctx.addIssue({ code: 'custom', message: '文献阅读必须带英文原文' });
      if (
        d.sentenceTaskId &&
        (!p.written.some((t) => t.id === d.sentenceTaskId && t.type === 'translation') ||
          d.cet.some((c) => c.type !== 'choice' && c.taskId === d.sentenceTaskId))
      )
        ctx.addIssue({ code: 'custom', message: '每日一句必须引用独立的翻译任务' });
      if (new Set(d.modelEssays.map((e) => e.id)).size !== d.modelEssays.length)
        ctx.addIssue({ code: 'custom', message: '范文ID不可重复' });
    }
    const keys =
      p.schemaVersion !== 1
        ? p.listening.flatMap((s) => s.questions.map((q) => JSON.stringify([s.libraryId, q.id])))
        : [];
    if (new Set(keys).size !== keys.length)
      ctx.addIssue({ code: 'custom', message: '同一材料库的听力题不能在题包中重复' });
  });
export type Pack = z.infer<typeof packSchema>;
export type Word = Pack['words'][number];
export type Choice = Pack['choices'][number];
export type Kind = 'spelling' | 'choice';
export const progressSchema = z
  .object({
    key: z.string(),
    packId: z.string(),
    itemId: z.string(),
    kind: z.enum(['spelling', 'choice']),
    stage: z.number().int().min(0).max(12),
    due: z.string().datetime(),
    reviews: z.number().int().nonnegative(),
    errors: z.number().int().nonnegative(),
    lastReviewedAt: z.string().datetime(),
  })
  .strict();
export const attemptSchema = z
  .object({
    id: z.string(),
    key: z.string(),
    packId: z.string(),
    itemId: z.string(),
    kind: z.enum(['spelling', 'choice']),
    answer: z.string().max(10000),
    correct: z.boolean(),
    createdAt: z.string().datetime(),
  })
  .strict();
export const draftSchema = z.object({ key: z.string(), answer: z.string().max(10000) }).strict();
export type Progress = z.infer<typeof progressSchema>;
export type Attempt = z.infer<typeof attemptSchema>;
export type Draft = z.infer<typeof draftSchema>;
// JSON tuple encoding avoids composite-key collisions between packs.
export const itemKey = (packId: string, kind: Kind, itemId: string) =>
  JSON.stringify([packId, kind, itemId]);
export type Exercise =
  | { key: string; packId: string; kind: 'spelling'; item: Word }
  | { key: string; packId: string; kind: 'choice'; item: Choice };
export function exercises(p: Pack): Exercise[] {
  return [
    ...p.words.map((item) => ({
      key: itemKey(p.id, 'spelling', item.id),
      packId: p.id,
      kind: 'spelling' as const,
      item,
    })),
    ...p.choices.map((item) => ({
      key: itemKey(p.id, 'choice', item.id),
      packId: p.id,
      kind: 'choice' as const,
      item,
    })),
  ];
}
