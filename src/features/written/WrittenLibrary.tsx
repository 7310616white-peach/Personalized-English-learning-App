import type { Pack } from '../../domain/models';
import type { WrittenTask } from '../../domain/written';
/** Real imported tasks remain accessible when development demo tools are disabled. */
export function WrittenLibrary({
  packs,
  onStart,
  onBack,
}: {
  packs: Pack[];
  onStart: (packId: string, task: WrittenTask) => void;
  onBack: () => void;
}) {
  const tasks = packs.flatMap((pack) =>
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
      {!tasks.length && <p>还没有可练习的拓展题，请在“我的”导入题包。</p>}
      <div className="task-grid">
        {tasks.map(({ pack, task }) => (
          <article className="card" key={JSON.stringify([pack.id, task.id])}>
            <p className="eyebrow">{pack.title}</p>
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
