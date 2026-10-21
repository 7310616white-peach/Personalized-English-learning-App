import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../data/db';

export function ListeningSummary({
  onOpen,
  mistakes = false,
}: {
  onOpen: () => void;
  mistakes?: boolean;
}) {
  const rows = useLiveQuery(() => db.listeningProgress.toArray(), []);
  const relevant =
    rows?.filter((p) => (mistakes ? p.errors > 0 : p.due <= new Date().toISOString())) ?? [];
  return (
    <section className="card listening-summary">
      <div>
        <h3>{mistakes ? '听力错题与错因' : '校内考试与四六级听力'}</h3>
        <p>
          {mistakes ? `历史错题 ${relevant.length} 题` : `到期复习 ${relevant.length} 题`} ·
          按音轨整组训练
        </p>
      </div>
      <button className="secondary" onClick={onOpen}>
        进入听力训练 →
      </button>
    </section>
  );
}
