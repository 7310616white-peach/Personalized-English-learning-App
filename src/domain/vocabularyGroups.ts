import type { Attempt, Exercise, Progress } from './models';
import { localDate } from './queue';

export type VocabularyGroup = { key: string; label: string; items: Exercise[] };
export function vocabularyGroups(
  items: Exercise[],
  attempts: Attempt[],
  progress: Progress[],
): VocabularyGroup[] {
  const first = new Map<string, string>();
  for (const a of attempts) {
    if (a.kind === 'spelling' && (!first.has(a.key) || a.createdAt < first.get(a.key)!))
      first.set(a.key, a.createdAt);
  }
  const practiced = new Set(progress.map((p) => p.key));
  const groups = new Map<string, VocabularyGroup>();
  for (const item of items) {
    const timestamp = first.get(item.key);
    const key = timestamp
      ? localDate(new Date(timestamp))
      : practiced.has(item.key)
        ? 'unknown'
        : 'unlearned';
    if (!groups.has(key))
      groups.set(key, {
        key,
        label: key === 'unlearned' ? '未学习' : key === 'unknown' ? '学习日期未记录' : key,
        items: [],
      });
    groups.get(key)!.items.push(item);
  }
  return [...groups.values()].sort((a, b) => {
    const rank = (key: string) => (key === 'unlearned' ? 2 : key === 'unknown' ? 1 : 0);
    return rank(a.key) - rank(b.key) || b.key.localeCompare(a.key);
  });
}
