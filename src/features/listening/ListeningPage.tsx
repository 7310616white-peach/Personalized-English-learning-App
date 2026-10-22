import { lazy, Suspense, useState } from 'react';
import { demoFeaturesEnabled } from '../../app/buildOptions';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../data/db';
import { listeningKey, type ListeningSet, type MediaRecord } from '../../domain/listening';
import { ListeningHistory } from './ListeningHistory';
import { ListeningImport } from './ListeningImport';
import { ListeningSession } from './ListeningSession';
const ListeningDemo = lazy(() =>
  import('./ListeningDemo').then((m) => ({ default: m.ListeningDemo })),
);

export function ListeningPage({ onActiveChange }: { onActiveChange: (active: boolean) => void }) {
  const data = useLiveQuery(
    () =>
      db.transaction(
        'r',
        [db.packs, db.listeningLibraries, db.media, db.listeningProgress, db.listeningAttempts],
        async () => ({
          packs: await db.packs.orderBy('date').reverse().toArray(),
          libraries: await db.listeningLibraries.toArray(),
          media: await db.media.toArray(),
          progress: await db.listeningProgress.toArray(),
          attempts: await db.listeningAttempts.toArray(),
        }),
      ),
    [],
  );
  const [session, setSession] = useState<{
    packId: string;
    set: ListeningSet;
    title: string;
    media: MediaRecord;
  }>();
  const [filter, setFilter] = useState<'all' | 'due' | 'mistakes'>('all');
  if (!data) return <p role="status">正在读取听力材料…</p>;
  if (session)
    return (
      <ListeningSession
        {...session}
        onExit={() => {
          setSession(undefined);
          onActiveChange(false);
        }}
      />
    );
  const questions = data.progress;
  const due = questions.filter((p) => p.due <= new Date().toISOString());
  const groups = data.packs
    .flatMap((p) => (p.schemaVersion !== 1 ? p.listening.map((set) => ({ pack: p, set })) : []))
    .filter(
      ({ set }) =>
        filter === 'all' ||
        set.questions.some((q) =>
          questions.some(
            (p) =>
              p.key === listeningKey(set.libraryId, q.id) &&
              (filter === 'due' ? p.due <= new Date().toISOString() : p.errors > 0),
          ),
        ),
    );
  function start(packId: string, set: ListeningSet, title: string, media: MediaRecord) {
    setSession({ packId, set, title, media });
    onActiveChange(true);
  }
  return (
    <section className="listening-page">
      <div className="section-heading">
        <div>
          <p className="eyebrow">校内考试 · CET-4 · CET-6</p>
          <h2>听力训练</h2>
        </div>
        <span className="tag">到期 {due.length} 题</span>
      </div>
      <p>选择一组开始练习。自己的音频可在页面底部导入，每日学习包在“我的”中导入。</p>
      {demoFeaturesEnabled && (
        <Suspense fallback={null}>
          <ListeningDemo />
        </Suspense>
      )}
      <ListeningHistory />
      <div className="listening-filters" role="group" aria-label="听力练习筛选">
        {(
          [
            ['all', '全部任务'],
            ['due', '到期复习'],
            ['mistakes', '历史错题'],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            aria-pressed={filter === id}
            className={filter === id ? 'primary' : 'secondary'}
            onClick={() => setFilter(id)}
          >
            {label}
          </button>
        ))}
      </div>
      {groups.length === 0 && (
        <div className="card empty">
          <h3>{filter === 'all' ? '还没有听力题包' : '这里暂时没有题目'}</h3>
          <p>音频与题包分开导入；缺少素材时不会显示虚构课程。</p>
        </div>
      )}
      <div className="listening-groups">
        {groups.map(({ pack, set }) => {
          const library = data.libraries.find((l) => l.id === set.libraryId);
          const track = library?.manifest.tracks.find((t) => t.id === set.trackId);
          const media = data.media.find((m) => m.id === library?.bindings[set.trackId]);
          const count = data.attempts.filter(
            (a) => a.libraryId === set.libraryId && a.trackId === set.trackId,
          ).length;
          return (
            <article className="card" key={JSON.stringify([pack.id, set.id])}>
              <p className="eyebrow">
                {library?.manifest.target ?? '听力'} · {track?.unit}
              </p>
              <h3>{track?.title ?? set.trackId}</h3>
              <p>
                {pack.title} · {set.questions.length} 题 · 本音轨已练 {count} 次
              </p>
              <p>
                {set.questions.some((q) => q.grading.status === 'missing')
                  ? '含待批改原题；不会自动计为错误。'
                  : '整组提交后显示结果。'}
              </p>
              <details>
                <summary>逐题练习次数与进度</summary>
                {set.questions.map((q) => {
                  const p = questions.find((p) => p.key === listeningKey(set.libraryId, q.id));
                  const times = data.attempts.filter(
                    (a) => a.libraryId === set.libraryId && a.questions.some((x) => x.id === q.id),
                  ).length;
                  return (
                    <p key={q.id}>
                      {q.id} · 已练 {times} 次 · 累计错误 {p?.errors ?? 0} 次 ·{' '}
                      {p
                        ? `下次 ${new Date(p.due).toLocaleString('zh-CN')}${p.gradeStatus === 'provisional' ? '（暂评）' : ''}`
                        : '尚无已评分记录'}
                    </p>
                  );
                })}
              </details>
              <button
                className="primary"
                disabled={!media || media.storage === 'missing'}
                onClick={() => media && start(pack.id, set, track?.title ?? set.trackId, media)}
              >
                开始本组听力
              </button>
              {(!media || media.storage === 'missing') && (
                <small className="missing-audio">请先补绑对应 WAV</small>
              )}
            </article>
          );
        })}
      </div>
      <ListeningImport />
      {data.libraries.length > 0 && (
        <details className="card material-status">
          <summary>已导入材料与音频状态</summary>
          {data.libraries.map((l) => (
            <div key={l.id}>
              <h3>{l.manifest.title}</h3>
              {l.manifest.tracks.map((t) => {
                const m = data.media.find((m) => m.id === l.bindings[t.id]);
                return (
                  <p key={t.id}>
                    {t.title} · {m && m.storage !== 'missing' ? '已绑定' : '待补绑'} · 原文
                    {t.transcript.status === 'missing'
                      ? '缺失'
                      : t.transcript.status === 'draft'
                        ? '未核对'
                        : '已核对'}
                  </p>
                );
              })}
            </div>
          ))}
        </details>
      )}
      <p className="footnote">
        到期与错题按音轨整组练习；提前答对不会推进复习阶段。真实手机播放与文件分享仍须真机验证。
      </p>
    </section>
  );
}
