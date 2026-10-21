import { type WrittenTask, wordCount } from '../../domain/written';
import { useExitGestures } from '../../shared/useBackAction';
import { ReadableText } from '../reading/ReadableText';
import { useWrittenSession } from './useWrittenSession';
import './written.css';

export function WrittenSession({
  packId,
  task,
  onExit,
  returnLabel = '返回题型列表',
}: {
  packId: string;
  task: WrittenTask;
  onExit: () => void;
  returnLabel?: string;
}) {
  const s = useWrittenSession(packId, task, onExit);
  useExitGestures(true, s.exit);
  const objective = task.type === 'word-bank' || task.type === 'matching';
  const read = (text: string) => <ReadableText text={text} enabled={!!s.result} packId={packId} />;
  return (
    <section className="written-session">
      <div className="section-heading">
        <h2>{task.title}</h2>
        <button className="secondary" disabled={s.busy} onClick={s.exit}>
          {s.result ? returnLabel : '保存退出'}
        </button>
      </div>
      <p className="tag">{task.source}</p>
      <p>{task.instructions}</p>
      <p className="footnote">
        {s.result
          ? '已提交，可点英文词查看释义。'
          : objective
            ? '未选的客观题提交后按错误记录；页面空白处左右滑均保存退出。'
            : '页面空白处左右滑均保存退出；提交后可看参考内容。'}
      </p>
      <div className="card written-material">
        {task.type === 'word-bank' && (
          <>
            <h3>阅读原文</h3>
            <div className="written-passage">
              {task.passage.split(/(\[\[[a-zA-Z0-9_-]+\]\])/g).map((part, i) => {
                if (!part.startsWith('[[')) return <span key={i}>{read(part)}</span>;
                const id = part.slice(2, -2);
                const q = task.questions.find((q) => q.id === id)!;
                const selected = task.options.find((o) => o.id === s.answers[id]);
                return (
                  <button
                    type="button"
                    className="gap-link"
                    key={i}
                    onClick={() => document.getElementById('written-' + id)?.focus()}
                  >
                    {q.prompt}：{selected?.text ?? '____'}
                  </button>
                );
              })}
            </div>
            <div className="word-bank" aria-label="备选词库">
              {task.options.map((o) => (
                <span key={o.id}>
                  {o.id}. {read(o.text)}
                </span>
              ))}
            </div>
          </>
        )}
        {task.type === 'matching' && (
          <>
            <h3>阅读段落</h3>
            {task.paragraphs.map((p) => (
              <p className="written-passage" key={p.id}>
                <b>[{p.id}] </b>
                {read(p.text)}
              </p>
            ))}
          </>
        )}
        {(task.type === 'writing' || task.type === 'translation') && (
          <p className="written-passage">{read(task.prompt)}</p>
        )}
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void s.submit();
        }}
      >
        <fieldset className="card written-answers" disabled={!s.loaded || s.busy || !!s.result}>
          <legend>你的作答</legend>
          {objective &&
            task.questions.map((q) => {
              const options = task.type === 'word-bank' ? task.options : task.paragraphs;
              return (
                <label key={q.id} htmlFor={'written-' + q.id}>
                  <span>{q.prompt}</span>
                  <select
                    aria-label={q.prompt}
                    id={'written-' + q.id}
                    value={s.answers[q.id] ?? ''}
                    onChange={(e) => s.change(q.id, e.target.value)}
                  >
                    <option value="">请选择</option>
                    {options.map((o) => (
                      <option
                        key={o.id}
                        value={o.id}
                        disabled={
                          task.type === 'word-bank' &&
                          Object.entries(s.answers).some(
                            ([key, value]) => key !== q.id && value === o.id,
                          )
                        }
                      >
                        {o.id}
                        {task.type === 'word-bank' ? '. ' + o.text : ' 段'}
                      </option>
                    ))}
                  </select>
                </label>
              );
            })}
          {!objective && (
            <label>
              英文作答
              <textarea
                aria-label="英文作答"
                lang="en"
                autoCapitalize="sentences"
                spellCheck={false}
                autoCorrect="off"
                rows={12}
                maxLength={10000}
                value={s.answers.response ?? ''}
                onChange={(e) => s.change('response', e.target.value)}
                placeholder="在这里输入英文，内容会自动保存…"
              />
            </label>
          )}
        </fieldset>
        {!objective && (
          <p role="status">
            已写 {wordCount(s.answers.response ?? '')} 词
            {task.type === 'writing' ? ` · 建议 ${task.minWords}–${task.maxWords} 词` : ''} ·
            仅记录，不自动评分
          </p>
        )}
        <p role="status">{s.status}</p>
        {s.error && (
          <p role="alert" className="error">
            {s.error}
          </p>
        )}
        {!s.result && (
          <button
            className="primary"
            disabled={!s.loaded || s.busy || (!objective && !s.answers.response?.trim())}
          >
            {s.busy ? '正在保存…' : '提交本篇答案'}
          </button>
        )}
      </form>
      {s.result && (
        <section className="card written-result" aria-label="本篇结果">
          <h3>
            {s.result.correct === null
              ? '已保存 · 待批改'
              : `本篇正确率 ${Math.round((s.result.earned! / s.result.total!) * 100)}%（${s.result.earned}/${s.result.total}）`}
          </h3>
          {objective &&
            task.questions.map((q) => (
              <div key={q.id}>
                <b>
                  {q.prompt} · {s.answers[q.id] === q.answerId ? '正确' : '错误'}
                </b>
                <p>
                  你的答案：{s.answers[q.id] || '未作答'}；正确答案：{q.answerId}
                </p>
                <p>{read(q.explanation)}</p>
              </div>
            ))}
          {!objective && (
            <>
              <h4>{task.type === 'writing' ? '参考范文' : '参考译文'}</h4>
              <p className="written-passage">{read(task.reference)}</p>
              <p>{read(task.explanation)}</p>
              <p>你的作答已保存，可在“我的”中导出全文交给 ChatGPT 批改。</p>
            </>
          )}
          {objective && <p>已记录本篇练习次数与复习计划。错题可在“错题本”继续练习。</p>}
          <button className="secondary" onClick={s.exit}>
            {returnLabel}
          </button>
        </section>
      )}
    </section>
  );
}
