import { useLiveQuery } from 'dexie-react-hooks';
import { errorReasonLabel } from './labels';
import { db } from '../../data/db';
import { scoreListening } from '../../domain/listeningGrading';
export function ListeningHistory() {
  const data = useLiveQuery(
    async () => ({
      attempts: await db.listeningAttempts.orderBy('createdAt').reverse().limit(20).toArray(),
      notes: await db.listeningNotes.toArray(),
    }),
    [],
  );
  if (!data?.attempts.length) return null;
  return (
    <details className="card material-status">
      <summary>最近听力记录（最多 20 组）</summary>
      {data.attempts.map((a) => {
        const score = scoreListening(a.grades);
        return (
          <article key={a.id}>
            <h3>
              {a.trackId} · {new Date(a.createdAt).toLocaleString('zh-CN')}
            </h3>
            <p>
              {score.accuracy === null ? '待批改' : `${score.correctUnits}/${score.gradedUnits} 分`}
              {a.grades.some((g) => g.status === 'provisional') ? '（暂评）' : ''} · 启动播放{' '}
              {a.playback.playCount} 次 · 最后速度 {a.playback.lastPlaybackRate}×
            </p>
            {data.notes
              .filter((n) => n.attemptId === a.id)
              .map((n) => (
                <p key={n.key}>
                  题目 {n.questionId}：{n.reasons.map(errorReasonLabel).join('、') || '未选择原因'}{' '}
                  {n.note}
                </p>
              ))}
          </article>
        );
      })}
      <p>每次原始答案与题目快照可在“题包与数据”中导出；同一道题的复习进度跨每日题包保留。</p>
    </details>
  );
}
