import { WordDetails } from '../../shared/components/WordDetails';
import { exercises, type Pack, type Progress } from '../../domain/models';
import { ReadableText } from '../reading/ReadableText';

export function Library({
  packs,
  progress,
  mistakes = false,
}: {
  packs: Pack[];
  progress: Progress[];
  mistakes?: boolean;
}) {
  const index = new Map(progress.map((p) => [p.key, p]));
  const items = packs
    .flatMap(exercises)
    .filter((e) => (mistakes ? (index.get(e.key)?.errors ?? 0) > 0 : e.kind === 'spelling'));
  return (
    <section>
      <div className="section-heading">
        <div>
          <p className="eyebrow">{mistakes ? '在错误里，找到下一步' : '把词汇放回语境'}</p>
          <h2>{mistakes ? '错题本' : '词汇手册'}</h2>
        </div>
        <span>{items.length} 项</span>
      </div>
      {items.length === 0 && (
        <div className="card empty">
          <h3>{mistakes ? '这里还没有错题' : '还没有词汇'}</h3>
          <p>{mistakes ? '练习中答错的题目会自动出现在这里。' : '先在数据管理中导入一个题包。'}</p>
        </div>
      )}
      <div className="library-list">
        {items.map((e) => {
          const p = index.get(e.key);
          return (
            <details className="card library-item" key={e.key}>
              <summary>
                <span>
                  <b>{e.kind === 'spelling' ? e.item.term : e.item.prompt}</b>
                  <small>{e.kind === 'spelling' ? e.item.meaning : '选择题'}</small>
                </span>
                <span className="tag">{p ? `练习 ${p.reviews} 次` : '未学习'}</span>
              </summary>
              {e.kind === 'spelling' ? (
                <WordDetails word={e.item} />
              ) : (
                <div className="word-details">
                  {e.item.passage && (
                    <p lang="en">
                      <ReadableText text={e.item.passage} packId={e.packId} />
                    </p>
                  )}
                  {e.item.options.map((o) => (
                    <p key={o.id}>
                      {o.id} · <ReadableText text={o.text} packId={e.packId} />
                    </p>
                  ))}
                  <p>
                    <b>正确答案：{e.item.answerId}</b>
                  </p>
                  <p>{e.item.explanation}</p>
                </div>
              )}
              {p && (
                <p className="review-meta">
                  累计错误 {p.errors} 次 ·{' '}
                  {p.stage >= 4 ? '逐渐巩固' : p.stage === 0 ? '需要复习' : '正在熟悉'} · 下次复习{' '}
                  {new Date(p.due).toLocaleString('zh-CN')}
                </p>
              )}
            </details>
          );
        })}
      </div>
    </section>
  );
}
