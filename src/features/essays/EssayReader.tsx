import type { Pack } from '../../domain/models';
import type { WrittenAttempt } from '../../domain/written';
import { essayEntries } from '../../domain/essays';
import { useExitGestures } from '../../shared/useBackAction';
import { ReadableText } from '../reading/ReadableText';
import './essays.css';

export function EssayReader({
  packs,
  attempts,
  essayKey,
  onBack,
}: {
  packs: Pack[];
  attempts: WrittenAttempt[];
  essayKey: string;
  onBack: () => void;
}) {
  const essay = essayEntries(packs, attempts).find((e) => e.key === essayKey);
  useExitGestures(true, onBack);
  return (
    <article className="essay-reader">
      <button className="text-button" onClick={onBack}>
        ← 返回范文栏
      </button>
      {essay ? (
        <>
          <p className="eyebrow">{essay.date} · 范文阅读</p>
          <h1>{essay.title}</h1>
          <p className="essay-topic">{essay.topic}</p>
          <p className="footnote">{essay.source} · 点英文词可查义</p>
          <div className="essay-body" lang="en">
            <ReadableText text={essay.body} packId={essay.packId} />
          </div>
          <section className="essay-notes">
            <h2>表达与思路</h2>
            <ReadableText text={essay.notes} packId={essay.packId} />
          </section>
        </>
      ) : (
        <p role="status">这篇范文暂不可用，请返回列表重新选择。</p>
      )}
    </article>
  );
}
