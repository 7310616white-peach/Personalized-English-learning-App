import type { PlanData, DailyTask } from './dailyPlan';
import type { StudyActivity } from './studyActivity';
import { localDate } from './queue';
import { listeningKey } from './listening';

/** Prefer actual campus material; missing audio is an explicit prerequisite, never a fake completion. */
export function dailyListening(data: PlanData, packId: string, now: Date): DailyTask {
  const day = localDate(now);
  const candidates = data.packs
    .filter((p) => p.date <= day)
    .flatMap((p) =>
      p.schemaVersion !== 1
        ? p.listening.map((set) => {
            const library = data.libraries.find((l) => l.id === set.libraryId);
            const track = library?.manifest.tracks.find((t) => t.id === set.trackId);
            const media = data.media.find(
              (m) => m.id === library?.bindings[set.trackId] && m.storage !== 'missing',
            );
            return {
              packId: p.id,
              date: p.date,
              set,
              library,
              title: track?.title ?? '听力训练',
              media,
            };
          })
        : [],
    )
    .filter((c) => c.library);
  const actual = candidates.filter((c) => c.set.libraryId !== 'original-campus-demo-v1');
  const campus = actual.filter((c) => c.library!.manifest.target === 'campus');
  const pool = (campus.length ? campus : actual.length ? actual : candidates).sort(
    (a, b) =>
      Number(b.packId === packId) - Number(a.packId === packId) ||
      b.date.localeCompare(a.date) ||
      a.set.id.localeCompare(b.set.id),
  );
  const seen = new Set<string>();
  const unique = pool.filter((c) => {
    const key = JSON.stringify([c.set.libraryId, c.set.trackId]);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  const preferred = unique.filter((c) => c.packId === packId);
  const selected = preferred.length ? preferred : unique;
  const n = Math.floor(Date.parse(day + 'T00:00:00Z') / 86400000);
  const chosen = selected[n % (selected.length || 1)];
  const listened =
    chosen &&
    data.listeningAttempts.some(
      (a) =>
        localDate(new Date(a.createdAt)) === day &&
        a.libraryId === chosen.set.libraryId &&
        a.trackId === chosen.set.trackId &&
        chosen.set.questions.every((q) => a.questions.some((x) => x.id === q.id)),
    );
  return chosen?.media
    ? {
        id: 'listening',
        title: '听力训练',
        detail: `${campus.length ? '校考优先' : chosen.set.libraryId === 'original-campus-demo-v1' ? '演示音频' : '四级 / 六级'} · ${chosen.title}`,
        status: listened ? 'done' : 'ready',
        actionLabel: '开始听力',
        activity: {
          type: 'listening',
          packId: chosen.packId,
          title: chosen.title,
          set: chosen.set,
          media: chosen.media,
        },
      }
    : {
        id: 'listening',
        title: '听力训练',
        detail: chosen
          ? '听力题已准备，请先补绑对应 WAV。'
          : '每天保留听力训练；先导入音频和关联题目，有校考时优先校考。',
        status: 'missing',
        actionLabel: '补充听力材料',
        destination: 'listening',
      };
}
export function listeningReview(data: PlanData, now: Date): StudyActivity | undefined {
  const due = new Set(
    data.listeningProgress.filter((p) => p.due <= now.toISOString()).map((p) => p.key),
  );
  for (const p of data.packs) {
    if (p.schemaVersion === 1) continue;
    const set = p.listening.find((s) =>
      s.questions.some((q) => due.has(listeningKey(s.libraryId, q.id))),
    );
    if (!set) continue;
    const library = data.libraries.find((l) => l.id === set.libraryId);
    const media = data.media.find(
      (m) => m.id === library?.bindings[set.trackId] && m.storage !== 'missing',
    );
    if (media) return { type: 'listening', packId: p.id, set, title: '到期听力复习', media };
  }
}
