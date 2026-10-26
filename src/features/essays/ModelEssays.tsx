import type { Pack } from '../../domain/models';
import type { WrittenAttempt } from '../../domain/written';
import { essayEntries } from '../../domain/essays';
import { useExitGestures } from '../../shared/useBackAction';
import './essays.css';

export function ModelEssays({
  packs,
  attempts,
  onBack,
  onOpen,
}: {
  packs: Pack[];
  attempts: WrittenAttempt[];
  onBack: () => void;
  onOpen: (key: string) => void;
}) {
  const essays = essayEntries(packs, attempts);
  useExitGestures(true, onBack, '.essay-list-item');
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
      <p>选一篇，安静读一会儿。</p>
      {!essays.length && (
        <section className="card empty">
          <h3>还没有范文</h3>
          <p>在“我的”导入带 daily.modelEssays 的题包。已完成作文练习的参考范文也会收在这里。</p>
        </section>
      )}
      <div className="essay-list">
        {essays.map((e) => (
          <button
            className="essay-list-item"
            key={e.key}
            aria-label={'阅读范文：' + e.title}
            onClick={() => onOpen(e.key)}
          >
            <span className="essay-date">{e.date}</span>
            <strong>{e.title}</strong>
            <span className="essay-topic">{e.topic}</span>
            <span className="essay-open" aria-hidden="true">
              阅读 →
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}
