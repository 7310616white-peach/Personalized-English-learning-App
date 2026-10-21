import { useState } from 'react';
import { useAnswerSession } from './useAnswerSession';
import type { Exercise } from '../../domain/models';
import { WordDetails } from '../../shared/components/WordDetails';
import { useExitGestures } from '../../shared/useBackAction';
import { ReadableText } from '../reading/ReadableText';

export function Practice({
  queue,
  title,
  onExit,
}: {
  queue: Exercise[];
  title: string;
  onExit: () => void;
}) {
  const [index, setIndex] = useState(0);
  useExitGestures(index >= queue.length, onExit);
  if (index >= queue.length)
    return (
      <section className="completion card">
        <span className="completion-mark">✓</span>
        <p className="eyebrow">一点一滴，积累成章</p>
        <h2>这一组练习完成了</h2>
        <p>已保存 {queue.length} 道答题记录，并安排下次复习。</p>
        <button className="primary" onClick={onExit}>
          返回学习台
        </button>
      </section>
    );
  return (
    <div className="practice-wrap">
      <div className="section-heading">
        <div>
          <p className="eyebrow">专注此刻</p>
          <h2>{title}</h2>
        </div>
        <span>
          {index + 1} / {queue.length}
        </span>
      </div>
      <progress max={queue.length} value={index} aria-label="本组练习进度" />
      <AnswerCard
        key={queue[index].key}
        exercise={queue[index]}
        onNext={() => setIndex((n) => n + 1)}
        onExit={onExit}
      />
    </div>
  );
}

function AnswerCard({
  exercise,
  onNext,
  onExit,
}: {
  exercise: Exercise;
  onNext: () => void;
  onExit: () => void;
}) {
  const { answer, loaded, saving, saveStatus, result, error, input, change, submit, exit } =
    useAnswerSession(exercise, onNext, onExit);
  useExitGestures(true, exit);

  return (
    <section className="card answer-card">
      <div className="card-top">
        <span className="tag">
          {exercise.kind === 'spelling' ? exercise.item.level + ' · 单词拼写' : '阅读与选择'}
        </span>
        <button className="text-button" disabled={saving} onClick={exit}>
          暂时退出
        </button>
      </div>
      <p className="input-hint">页面空白处向左或向右滑动，可保存并退出。</p>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
      >
        {exercise.kind === 'spelling' ? (
          <>
            <p className="muted">根据中文释义，写出英文单词</p>
            <h3 className="question">{exercise.item.meaning}</h3>
            <label htmlFor="spelling-answer" className="input-label">
              你的拼写
            </label>
            <input
              id="spelling-answer"
              ref={input}
              className="spelling-input"
              lang="en"
              inputMode="text"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              autoComplete="off"
              enterKeyHint={result ? 'next' : 'done'}
              placeholder="在这里输入英文"
              value={answer}
              maxLength={10000}
              readOnly={!!result || saving}
              disabled={!loaded}
              onChange={(e) => change(e.target.value)}
            />
            <p className="input-hint">
              忽略大小写和首尾空格 · 回车{result ? '继续下一题' : '提交'}
            </p>
          </>
        ) : (
          <>
            {exercise.item.passage && (
              <div className="passage" lang="en">
                <ReadableText
                  text={exercise.item.passage}
                  enabled={!!result}
                  packId={exercise.packId}
                />
              </div>
            )}
            <h3 className="question" lang="en">
              <ReadableText
                text={exercise.item.prompt}
                enabled={!!result}
                packId={exercise.packId}
              />
            </h3>
            <fieldset className="options" disabled={saving || !loaded}>
              <legend className="sr-only">选择答案</legend>
              {exercise.item.options.map((option) => (
                <label
                  key={option.id}
                  className={'option ' + (answer === option.id ? 'selected' : '')}
                >
                  <input
                    type="radio"
                    name="answer"
                    value={option.id}
                    checked={answer === option.id}
                    disabled={!!result}
                    onChange={() => change(option.id)}
                  />
                  <span className="option-id">{option.id}</span>
                  <span lang="en">
                    <ReadableText text={option.text} enabled={!!result} packId={exercise.packId} />
                  </span>
                </label>
              ))}
            </fieldset>
          </>
        )}
        {result && (
          <div className={'feedback ' + (result.correct ? 'correct' : 'incorrect')} role="status">
            <strong>{result.correct ? '✓ 回答正确' : '再记一次，下次会更熟悉'}</strong>
            {!result.correct && (
              <p>
                你的答案：
                {exercise.kind === 'choice'
                  ? exercise.item.options.find((o) => o.id === result.answer)?.text
                  : result.answer}
              </p>
            )}
            {exercise.kind === 'spelling' ? (
              <WordDetails word={exercise.item} />
            ) : (
              <>
                <p>
                  正确答案：{exercise.item.answerId} ·{' '}
                  {exercise.item.options.find((o) => o.id === exercise.item.answerId)?.text}
                </p>
                <p>
                  <ReadableText text={exercise.item.explanation} packId={exercise.packId} />
                </p>
              </>
            )}
          </div>
        )}
        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}
        <div className="answer-actions">
          <span className="save-status" role="status">
            {saveStatus}
          </span>
          <button
            type="submit"
            className="primary"
            disabled={!loaded || saving || !answer.trim()}
            onMouseDown={(e) => e.preventDefault()}
          >
            {saving ? '正在保存…' : result ? '下一题 →' : '检查答案'}
          </button>
        </div>
      </form>
    </section>
  );
}
