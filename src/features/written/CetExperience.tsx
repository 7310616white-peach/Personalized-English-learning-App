import { lazy, Suspense, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../data/db';
import { loadCetDemo } from '../../data/cetDemo';
import { loadListeningDemo } from '../../data/listening/demo';
import { type Exercise, exercises } from '../../domain/models';
import { type WrittenTask, writtenKey } from '../../domain/written';
import type { ListeningSet, MediaRecord } from '../../domain/listening';
import { useBackAction } from '../../shared/useBackAction';
import { WrittenSession } from './WrittenSession';
import './written.css';
const ListeningSession = lazy(() =>
  import('../listening/ListeningSession').then((m) => ({ default: m.ListeningSession })),
);

export function CetExperience({
  onExit,
  onChoice,
}: {
  onExit: () => void;
  onChoice: (title: string, queue: Exercise[]) => void;
}) {
  const packs = useLiveQuery(() => db.packs.orderBy('date').reverse().toArray(), []);
  const records = useLiveQuery(() => db.writtenAttempts.toArray(), []);
  const [session, setSession] = useState<{ packId: string; task: WrittenTask }>();
  const [listening, setListening] = useState<{
    packId: string;
    set: ListeningSet;
    title: string;
    media: MediaRecord;
  }>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useBackAction(
    !session && !listening,
    () => {
      if (!busy) onExit();
    },
    5,
  );
  async function run(action: () => Promise<void>) {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      await action();
    } catch (e) {
      setError(e instanceof Error ? e.message : '素材读取失败，请重试');
    } finally {
      setBusy(false);
    }
  }
  async function startListening(trackId: string, title: string) {
    await run(async () => {
      const pack = await loadListeningDemo();
      const set =
        pack.schemaVersion !== 1 ? pack.listening.find((s) => s.trackId === trackId) : undefined;
      if (!set) throw new Error('缺少对应听力组');
      const library = await db.listeningLibraries.get(set.libraryId);
      const media = library && (await db.media.get(library.bindings[set.trackId]));
      if (!media || media.storage === 'missing') throw new Error('音频尚未保存成功，请重试');
      setListening({ packId: pack.id, set, media, title });
    });
  }
  if (session)
    return (
      <WrittenSession
        key={writtenKey(session.packId, session.task.id)}
        {...session}
        onExit={() => setSession(undefined)}
      />
    );
  if (listening)
    return (
      <Suspense fallback={<p role="status">正在打开离线音频…</p>}>
        <ListeningSession {...listening} onExit={() => setListening(undefined)} />
      </Suspense>
    );
  const demo = packs?.find((p) => p.id === 'cet4-format-demo-v1');
  return (
    <section>
      <div className="section-heading">
        <h2>四级题型体验</h2>
        <button className="secondary" disabled={busy} onClick={onExit}>
          返回学习台
        </button>
      </div>
      <p>原创仿真体验题，非历年真题。用于试用手机答题方式，不是完整模拟考试，也不换算四级总分。</p>
      <p>
        覆盖8类答题形式；听力复用现有合成录音，长度和难度低于正式考试。其他题包的选词、匹配、翻译和作文也会显示在下方。
      </p>
      <a
        href="https://cet.neea.edu.cn/html1/report/16123/196-1.htm"
        target="_blank"
        rel="noreferrer"
      >
        查看官方四级题型说明 ↗
      </a>
      {!demo && (
        <div className="card cet-entry">
          <h3>先装入阅读与写作体验题</h3>
          <p>包含10空选词、10题段落匹配、1篇5题仔细阅读、1段翻译、1篇作文。不会替换现有记录。</p>
          <button
            className="primary"
            disabled={busy}
            onClick={() =>
              run(async () => {
                await loadCetDemo();
              })
            }
          >
            载入四级全题型体验
          </button>
        </div>
      )}
      {busy && <p role="status">正在读取并校验体验材料…</p>}
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      <div className="cet-format-grid">
        {(
          [
            ['news', '短篇新闻'],
            ['conversation', '长对话'],
            ['sleep', '听力篇章'],
          ] as const
        ).map(([id, title]) => (
          <article className="card" key={id}>
            <span className="tag">听力 · 原创合成录音</span>
            <h3>{title}</h3>
            <p>离线播放、重播、倍速、选择与听写，提交后看原文。</p>
            <button
              className="secondary"
              disabled={busy}
              onClick={() => startListening(id, title + ' · 仿真体验')}
            >
              体验{title}
            </button>
          </article>
        ))}
        {demo && (
          <article className="card">
            <span className="tag">阅读 · 原创仿真</span>
            <h3>仔细阅读</h3>
            <p>一篇文章，5道单项选择，提交后点词查义。</p>
            <button
              className="secondary"
              disabled={busy}
              onClick={() =>
                onChoice(
                  '仔细阅读 · 仿真体验',
                  exercises(demo).filter((e) => e.kind === 'choice'),
                )
              }
            >
              体验仔细阅读
            </button>
          </article>
        )}
        {packs?.flatMap((p) =>
          p.schemaVersion === 3
            ? p.written.map((task) => {
                const attempts = records?.filter((a) => a.key === writtenKey(p.id, task.id)) ?? [];
                const names = {
                  'word-bank': '选词填空',
                  matching: '信息匹配',
                  translation: '汉译英',
                  writing: '短文写作',
                };
                return (
                  <article className="card" key={writtenKey(p.id, task.id)}>
                    <span className="tag">
                      {names[task.type]} · {attempts.length} 次练习
                    </span>
                    <h3>{task.title}</h3>
                    <p>{p.title}</p>
                    <p>
                      {task.type === 'writing' || task.type === 'translation'
                        ? '全文自动保存，提交后看参考，导出后批改。'
                        : '提交后显示正确率与解析，错误安排复习。'}
                    </p>
                    <button
                      className="secondary"
                      disabled={busy}
                      onClick={() => setSession({ packId: p.id, task })}
                    >
                      开始{names[task.type]}
                    </button>
                  </article>
                );
              })
            : [],
        )}
      </div>
    </section>
  );
}
