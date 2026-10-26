import type { Pack } from './models';
import type { ModelEssay } from './daily';
import { writtenKey, type WrittenAttempt } from './written';

export type EssayEntry = ModelEssay & { key: string; packId: string; date: string };
export function essayEntries(packs: Pack[], attempts: Pick<WrittenAttempt, 'key'>[]): EssayEntry[] {
  const completed = new Set(attempts.map((a) => a.key));
  return packs.flatMap((p) =>
    p.schemaVersion === 3
      ? [
          ...(p.daily?.modelEssays ?? []).map((e) => ({
            ...e,
            key: JSON.stringify([p.id, 'daily', e.id]),
            packId: p.id,
            date: p.date,
          })),
          ...p.written.flatMap((t) =>
            t.type === 'writing' && completed.has(writtenKey(p.id, t.id))
              ? [
                  {
                    id: t.id,
                    key: JSON.stringify([p.id, 'writing', t.id]),
                    packId: p.id,
                    date: p.date,
                    title: t.title,
                    topic: t.prompt,
                    body: t.reference,
                    notes: t.explanation,
                    source: t.source,
                  },
                ]
              : [],
          ),
        ]
      : [],
  );
}
