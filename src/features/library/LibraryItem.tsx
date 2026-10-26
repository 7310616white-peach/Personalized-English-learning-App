import { WordDetails } from '../../shared/components/WordDetails';
import type { Exercise, Progress } from '../../domain/models';
import { ReadableText } from '../reading/ReadableText';

export function LibraryItem({
  exercise: e,
  progress: p,
}: {
  exercise: Exercise;
  progress?: Progress;
}) {
  return (
    <details className="card library-item">
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
}
