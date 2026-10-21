import { useState } from 'react';
import type { ListeningSet, MediaRecord } from '../../domain/listening';
import { AudioPlayer } from './AudioPlayer';
import { QuestionFields } from './QuestionFields';
import { ListeningFeedback } from './ListeningFeedback';
import { useListeningSession } from './useListeningSession';

export function ListeningSession({
  packId,
  set,
  media,
  title,
  onExit,
}: {
  packId: string;
  set: ListeningSet;
  media: MediaRecord;
  title: string;
  onExit: () => void;
}) {
  const state = useListeningSession(packId, set);
  const [ready, setReady] = useState(false);
  return (
    <section>
      <div className="section-heading">
        <div>
          <p className="eyebrow">离线听力 · 训练模式</p>
          <h2>{title}</h2>
        </div>
        <button className="text-button" disabled={state.busy} onClick={() => state.exit(onExit)}>
          暂存并退出
        </button>
      </div>
      <div className="card">
        <AudioPlayer
          media={media}
          rate={state.playback.lastPlaybackRate}
          onReady={setReady}
          onRate={(rate) =>
            state.change(state.answers, { ...state.playback, lastPlaybackRate: rate })
          }
          onPlay={() => {
            if (state.loaded)
              state.change(state.answers, {
                ...state.playback,
                playCount: state.playback.playCount + 1,
              });
          }}
        />
        {!state.result && (
          <>
            <p className="muted">
              可重复播放。整组提交后显示答案、解析与原文；未答且有参考答案的题按错误计。
            </p>
            {set.questions.map((q, i) => (
              <QuestionFields
                key={q.id}
                question={q}
                index={i}
                answer={state.answers[q.id]}
                disabled={!state.loaded || state.busy}
                onChange={(answer) => state.change({ ...state.answers, [q.id]: answer })}
              />
            ))}
            <button
              className="primary"
              disabled={!state.loaded || !ready || state.busy}
              onClick={state.submit}
            >
              {state.busy ? '正在保存…' : '提交整组答案'}
            </button>
          </>
        )}
        <p className="save-status" role="status">
          {state.status}
        </p>
        {state.error && (
          <p className="error" role="alert">
            {state.error}
          </p>
        )}
      </div>
      {state.result && (
        <>
          <ListeningFeedback attempt={state.result} />
          <button className="primary" onClick={() => state.exit(onExit)} disabled={state.busy}>
            返回听力训练
          </button>
        </>
      )}
    </section>
  );
}
