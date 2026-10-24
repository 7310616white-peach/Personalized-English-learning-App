import type { Pack } from '../../domain/models';
import type { WrittenTask } from '../../domain/written';
/** Real imported tasks remain accessible when development demo tools are disabled. */
export function WrittenLibrary({
  packs,
  onStart,
  onBack,
  selectedPackId,
  onPackChange,
}: {
  packs: Pack[];
  onStart: (packId: string, task: WrittenTask) => void;
  onBack: () => void;
  selectedPackId?: string;
  onPackChange: (id: string) => void;
}) {
  const available = packs.filter((p) => p.schemaVersion === 3 && p.written.length);
  const selected = available.some((p) => p.id === selectedPackId) ? selectedPackId : '';
  const tasks = available
    .filter((p) => !selected || p.id === selected)
    .flatMap((pack) =>
      pack.schemaVersion === 3 ? pack.written.map((task) => ({ pack, task })) : [],
    );
  return (
    <section>
      <div className="section-heading">
        <h2>拓展练习</h2>
        <button className="secondary" onClick={onBack}>
          返回错题本
        </button>
      </div>
      <p>继续练习已经导入的选词、匹配、翻译或写作题，所有作答仍保存在原来的学习库。</p>
      {available.length > 0 && (
        <label className="pack-select">
          选择拓展题包
          <select
            aria-label="选择拓展题包"
            value={selected}
            onChange={(e) => onPackChange(e.target.value)}
          >
            <option value="">全部题包</option>
            {available.map((p) => (
              <option key={p.id} value={p.id}>
                {p.date} · {p.title}
              </option>
            ))}
          </select>
        </label>
      )}
      {!tasks.length && <p>还没有可练习的拓展题，请在“我的”导入题包。</p>}
      <div className="task-grid">
        {tasks.map(({ pack, task }) => (
          <article className="card" key={JSON.stringify([pack.id, task.id])}>
            <p className="eyebrow">
              {pack.date} · {pack.title}
            </p>
            <h3>{task.title}</h3>
            <p>{task.instructions}</p>
            <button className="secondary" onClick={() => onStart(pack.id, task)}>
              开始练习
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}
