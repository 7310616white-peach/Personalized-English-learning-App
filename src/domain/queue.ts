import { exercises, type Attempt, type Exercise, type Pack, type Progress } from './models';

export function localDate(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
export function makeQueues(
  packs: Pack[],
  progress: Progress[],
  attempts: Attempt[],
  packId: string,
  now: Date,
) {
  const all = packs.flatMap(exercises);
  const learned = new Map(progress.map((p) => [p.key, p]));
  const due = all
    .filter((e) => learned.has(e.key) && learned.get(e.key)!.due <= now.toISOString())
    .sort((a, b) => learned.get(a.key)!.due.localeCompare(learned.get(b.key)!.due));
  const first = new Map<string, Attempt>();
  for (const attempt of [...attempts].sort((a, b) => a.createdAt.localeCompare(b.createdAt))) {
    if (!first.has(attempt.key)) first.set(attempt.key, attempt);
  }
  const newToday = new Set(
    [...first.values()]
      .filter((a) => localDate(new Date(a.createdAt)) === localDate(now))
      .map((a) => a.key),
  );
  const introduced = (research: boolean) =>
    all.filter(
      (e) =>
        e.kind === 'spelling' && (e.item.level === '科研英语') === research && newToday.has(e.key),
    ).length;
  const available = all.filter((e) => e.packId === packId && !learned.has(e.key));
  const words: Exercise[] = [
    ...available
      .filter((e) => e.kind === 'spelling' && e.item.level !== '科研英语')
      .slice(0, Math.max(0, 10 - introduced(false))),
    ...available
      .filter((e) => e.kind === 'spelling' && e.item.level === '科研英语')
      .slice(0, Math.max(0, 2 - introduced(true))),
  ];
  return {
    due,
    words,
    choices: available.filter((e) => e.kind === 'choice'),
    mistakes: all.filter((e) => (learned.get(e.key)?.errors ?? 0) > 0),
    introduced: introduced(false) + introduced(true),
  };
}
