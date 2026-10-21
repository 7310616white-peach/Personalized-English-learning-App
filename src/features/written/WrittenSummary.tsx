import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../data/db';

export function WrittenSummary({ onOpen }: { onOpen: () => void }) {
  const packs = useLiveQuery(() => db.packs.toArray(), []);
  const titles = new Map(
    packs?.flatMap((p) =>
      p.schemaVersion === 3
        ? p.written.map((t) => [JSON.stringify([p.id, 'written', t.id]), t.title] as const)
        : [],
    ) ?? [],
  );
  const progress = useLiveQuery(() => db.writtenProgress.toArray(), []);
  const attempts = useLiveQuery(() => db.writtenAttempts.toArray(), []);
  const mistakes = progress?.filter((p) => p.errors > 0) ?? [];
  const due = progress?.filter((p) => p.due <= new Date().toISOString()) ?? [];
  const pending = attempts?.filter((a) => a.correct === null).length ?? 0;
  if (!mistakes.length && !pending && !due.length) return null;
  return (
    <section className="card cet-entry">
      <h3>选词、匹配与写作记录</h3>
      <p>
        {mistakes.length} 篇历史错题 · {due.length} 篇到期复习 · {pending} 次翻译/作文待批改
      </p>
      {mistakes.map((p) => (
        <p key={p.key}>
          {titles.get(p.key) ?? '拓展练习'} · 已练 {p.reviews} 次 · 错误 {p.errors} 次 · 下次{' '}
          {new Date(p.due).toLocaleDateString('zh-CN')}
        </p>
      ))}
      <button className="secondary" onClick={onOpen}>
        打开拓展题型继续练习
      </button>
    </section>
  );
}
