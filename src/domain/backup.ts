import { z } from 'zod';
import { packSchema, progressSchema, attemptSchema, draftSchema, exercises } from './models';

export const backupSchema = z
  .object({
    format: z.literal('english-pocket-backup'),
    version: z.literal(1),
    exportedAt: z.string().datetime(),
    packs: z.array(packSchema).max(10000),
    progress: z.array(progressSchema),
    attempts: z.array(attemptSchema),
    drafts: z.array(draftSchema),
  })
  .strict();
export function validateBackup(input: unknown) {
  const data = backupSchema.parse(input);
  const items = new Map(data.packs.flatMap(exercises).map((e) => [e.key, e]));
  for (const rows of [data.packs, data.progress, data.attempts, data.drafts]) {
    const keys = rows.map((r) =>
      'key' in r && !('createdAt' in r) ? r.key : 'id' in r ? r.id : '',
    );
    if (new Set(keys).size !== keys.length) throw new Error('备份含有重复记录');
  }
  for (const row of [...data.progress, ...data.attempts]) {
    const item = items.get(row.key);
    if (
      !item ||
      item.packId !== row.packId ||
      item.item.id !== row.itemId ||
      item.kind !== row.kind
    )
      throw new Error('备份含有无法关联的答题记录');
  }
  if (data.drafts.some((d) => !items.has(d.key))) throw new Error('备份含有无法关联的草稿');
  return data;
}
