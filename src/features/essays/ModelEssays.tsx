import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../data/db';
import type { Pack } from '../../domain/models';
import { writtenKey } from '../../domain/written';
import { ReadableText } from '../reading/ReadableText';
export function ModelEssays({ packs, onBack }: { packs: Pack[]; onBack: () => void }) {
  const attempts = useLiveQuery(() => db.writtenAttempts.toArray(), []);
  const completed = new Set(attempts?.map((a) => a.key));
  const essays = packs.flatMap((p) =>
    p.schemaVersion === 3
      ? [
          ...(p.daily?.modelEssays ?? []).map((e) => ({ ...e, packId: p.id, date: p.date })),
          ...p.written
            .filter((t) => t.type === 'writing' && completed.has(writtenKey(p.id, t.id)))
            .map((t) => {
              if (t.type !== 'writing') throw new Error('Invalid essay');
              return {
                id: t.id,
                title: t.title,
                topic: t.prompt,
                body: t.reference,
                notes: t.explanation,
                source: t.source,
                packId: p.id,
                date: p.date,
              };
            }),
        ]
      : [],
  );
  return (
    <section>
      <div className="section-heading">
        <div>
          <p className="eyebrow">读一篇，积累一点表达</p>
          <h2>范文栏</h2>
        </div>
        <button className="secondary" onClick={onBack}>
          返回学习台
        </button>
      </div>
      <p>范文按题包收好，想读时再打开。日常任务不安排作文；写作练习由你另外提出。</p>
      {!essays.length && (
        <section className="card empty">
          <h3>还没有范文</h3>
          <p>
            请让每日英语在题包的 daily.modelEssays
            中附一篇范文，再到“我的”导入。已完成作文练习的参考范文也会收在这里。
          </p>
        </section>
      )}
      {essays.map((e) => (
        <details className="card model-essay" key={JSON.stringify([e.packId, e.id])}>
          <summary>
            <b>{e.title}</b>
            <span className="tag">{e.date}</span>
          </summary>
          <p className="footnote">{e.source}</p>
          <h3>主题</h3>
          <p>{e.topic}</p>
          <div className="passage">
            <ReadableText text={e.body} packId={e.packId} />
          </div>
          <h3>表达与思路</h3>
          <p>
            <ReadableText text={e.notes} packId={e.packId} />
          </p>
        </details>
      ))}
    </section>
  );
}
