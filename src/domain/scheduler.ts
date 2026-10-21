import type { Progress } from './models';
const intervals = [1, 3, 7, 14];
export function nextSchedule(
  previous: Pick<Progress, 'stage' | 'due' | 'reviews' | 'errors'> | undefined,
  correct: boolean,
  now: Date,
) {
  if (previous && correct && previous.due > now.toISOString())
    return {
      stage: previous.stage,
      due: previous.due,
      reviews: previous.reviews + 1,
      errors: previous.errors,
      lastReviewedAt: now.toISOString(),
    };
  const stage = correct ? Math.min((previous?.stage ?? 0) + 1, 12) : 0;
  const days = correct
    ? (intervals[stage - 1] ?? Math.min(90, Math.round(14 * 1.7 ** (stage - 4))))
    : 1;
  const due = new Date(now);
  due.setDate(due.getDate() + days);
  return {
    stage,
    due: due.toISOString(),
    reviews: (previous?.reviews ?? 0) + 1,
    errors: (previous?.errors ?? 0) + (correct ? 0 : 1),
    lastReviewedAt: now.toISOString(),
  };
}
