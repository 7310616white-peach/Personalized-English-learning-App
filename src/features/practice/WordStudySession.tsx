import { useState } from 'react';
import type { Exercise } from '../../domain/models';
import { WordDetails } from '../../shared/components/WordDetails';
import { useExitGestures } from '../../shared/useBackAction';
import { Practice } from './Practice';
import { useWordStudy } from './useWordStudy';

export function WordStudySession({ queue, onExit }: { queue: Exercise[]; onExit: () => void }) {
  const [spelling, setSpelling] = useState(false);
  const study = useWordStudy(queue, onExit);
  useExitGestures(!spelling, study.exit);
  if (spelling) return <Practice queue={queue} title="今日单词拼写" onExit={onExit} />;

  const ready = study.index >= queue.length;
  const exercise = queue[study.index];
  return (
    <div className="practice-wrap word-study">
      <div className="section-heading">
        <div>
          <p className="eyebrow">01 / 今日词汇 · 先学再练</p>
          <h2>先过一遍中文释义</h2>
        </div>
        <button className="text-button" disabled={study.saving} onClick={study.exit}>
          保存退出
        </button>
      </div>
      <p className="word-study-steps">① 学习词义 → ② 拼写巩固</p>
      {study.error && (
        <p className="error" role="alert">
          {study.error}
        </p>
      )}
      {!study.studied ? (
        <section className="card">
          {study.error ? (
            <button className="secondary" onClick={study.retry}>
              重试读取
            </button>
          ) : (
            <p role="status">正在恢复词汇学习进度…</p>
          )}
        </section>
      ) : ready ? (
        <section className="card completion">
          <span className="completion-mark">✓</span>
          <h2>这组词义已经过完了</h2>
          <p>已看完 {queue.length} 个词。接下来根据中文回忆英文，再练一遍拼写。</p>
          <p>学习进度已保存；拼写提交后才计入今日新学和间隔复习。</p>
          <div className="word-study-actions">
            <button className="secondary" onClick={study.revisit}>
              再看一遍释义
            </button>
            <button
              className="primary"
              onClick={() => {
                if (study.studied?.every(Boolean)) setSpelling(true);
              }}
            >
              开始拼写 →
            </button>
          </div>
        </section>
      ) : (
        exercise?.kind === 'spelling' && (
          <>
            <progress aria-label="词义学习进度" max={queue.length} value={study.index} />
            <section className="card">
              <div className="card-top">
                <span className="tag">{exercise.item.level} · 学习词义</span>
                <span>
                  {study.index + 1} / {queue.length}
                </span>
              </div>
              <WordDetails word={exercise.item} />
              <p className="footnote">
                读懂中文释义，结合搭配和例句记忆。空白处左右滑动可保存退出。
              </p>
              <div className="word-study-actions">
                <button
                  className="secondary"
                  disabled={study.saving || study.index === 0}
                  onClick={study.previous}
                >
                  上一个词
                </button>
                <button
                  className="primary"
                  disabled={study.saving}
                  onClick={() => void study.next()}
                >
                  {study.saving
                    ? '正在保存…'
                    : study.index === queue.length - 1
                      ? '学完了，准备拼写 →'
                      : '看过了，下一个词 →'}
                </button>
              </div>
              <p className="save-status" role="status">
                {study.saving
                  ? '正在保存学习进度…'
                  : `已保存 ${study.studied.filter(Boolean).length} / ${queue.length} 个词的学习进度`}
              </p>
            </section>
          </>
        )
      )}
    </div>
  );
}
