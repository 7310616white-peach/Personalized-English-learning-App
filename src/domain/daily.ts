import { z } from 'zod';
import type { Pack } from './models';
const id = z.string().regex(/^[a-zA-Z0-9_-]{1,80}$/);
const text = z.string().trim().min(1).max(30000);
export const readingTypes = ['choice', 'word-bank', 'matching'] as const;
export type CetType = (typeof readingTypes)[number] | 'translation';
export const cetLabels: Record<CetType, string> = {
  choice: '仔细阅读',
  'word-bank': '选词填空',
  matching: '信息匹配',
  translation: '段落翻译',
};
export function rotationDay(date: string) {
  const days = Math.floor((Date.parse(date + 'T00:00:00Z') - Date.UTC(2026, 9, 22)) / 86400000);
  return ((days % 3) + 3) % 3;
}
export function cetTypesForDate(date: string): CetType[] {
  const day = rotationDay(date);
  const pairs: CetType[][] = [
    ['choice', 'word-bank'],
    ['matching', 'choice'],
    ['word-bank', 'matching'],
  ];
  return [...pairs[day], ...(day === 2 ? ['translation' as const] : [])];
}
/** Explicit pack assignments win; older packs fall back to their own local calendar date. */
export function cetTypesForPack(pack: Pack | undefined, today: string): CetType[] {
  if (pack && pack.schemaVersion !== 3) return pack.choices.length ? ['choice'] : [];
  return pack?.schemaVersion === 3 && pack.daily
    ? pack.daily.cet.map((task) => task.type)
    : cetTypesForDate(pack?.date ?? today);
}
export const modelEssaySchema = z
  .object({ id, title: text, topic: text, body: text, notes: text, source: text })
  .strict();
export const dailySchema = z
  .object({
    cet: z
      .array(
        z.discriminatedUnion('type', [
          z.object({ type: z.literal('choice'), choiceIds: z.array(id).min(1).max(20) }).strict(),
          z.object({ type: z.enum(['word-bank', 'matching', 'translation']), taskId: id }).strict(),
        ]),
      )
      .max(3)
      .default([]),
    researchChoiceIds: z.array(id).max(20).default([]),
    sentenceTaskId: id.optional(),
    modelEssays: z.array(modelEssaySchema).max(20).default([]),
  })
  .strict();
export type DailyContent = z.infer<typeof dailySchema>;
export type ModelEssay = z.infer<typeof modelEssaySchema>;
