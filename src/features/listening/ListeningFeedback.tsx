import { useState } from 'react';
import type { ListeningAttempt } from '../../domain/listening';
import { scoreListening } from '../../domain/listeningGrading';
import { saveListeningNote } from '../../data/listening/attempts';
import { errorReasons as reasons } from './labels';
export function ListeningFeedback({ attempt }: { attempt: ListeningAttempt }) {
  const score = scoreListening(attempt.grades);
  const choice = scoreListening(
    attempt.grades.filter(
      (g) => attempt.questions.find((q) => q.id === g.questionId)?.type === 'listening-choice',
    ),
  );
  const cloze = scoreListening(
    attempt.grades.filter(
      (g) => attempt.questions.find((q) => q.id === g.questionId)?.type === 'listening-cloze',
    ),
  );
  const percent = (n: number | null) => (n === null ? '待批改' : Math.round(n * 100) + '%');
  return (
    <section className="listening-feedback" aria-label="听力结果">
      <h3>本组结果：{percent(score.accuracy)}</h3>
      <p>
        单选 {percent(choice.accuracy)} · 听写空位 {percent(cloze.accuracy)} · 待批改{' '}
        {score.ungradedUnits} 分
      </p>
      {attempt.grades.some((g) => g.status === 'provisional') && (
        <p className="notice">含未核对的参考答案：以下得分与复习状态为暂评，不是学校标准评分。</p>
      )}
      {attempt.questions.map((q) => {
        const grade = attempt.grades.find((g) => g.questionId === q.id)!;
        return (
          <div key={q.id} className="card listening-explanation">
            <strong>
              {grade.correct === null ? '待批改' : grade.correct ? '回答正确' : '需要再练'} ·{' '}
              {q.prompt}
            </strong>
            <p>你的答案：{formatAnswer(attempt.answers[q.id])}</p>
            {q.grading.status === 'missing' ? (
              <p>尚无答案，记录已保存，可导出给 ChatGPT 辅助批改。</p>
            ) : (
              <>
                <p>
                  参考答案：
                  {q.type === 'listening-choice'
                    ? q.grading.answerId
                    : Object.entries(q.grading.acceptedAnswers)
                        .map(([b, a]) => `${b}: ${a.join(' / ')}`)
                        .join('；')}
                </p>
                <p>{q.grading.explanation}</p>
              </>
            )}
            {grade.correct === false && <ErrorNote attemptId={attempt.id} questionId={q.id} />}
          </div>
        );
      })}
      <details className="card transcript" open>
        <summary>
          听力原文{attempt.transcriptSnapshot.status === 'draft' ? '（未核对）' : ''}
        </summary>
        <p lang="en">
          {attempt.transcriptSnapshot.text ?? '原文尚未提供；不会用自动推测替代录音原文。'}
        </p>
      </details>
    </section>
  );
}
function ErrorNote({ attemptId, questionId }: { attemptId: string; questionId: string }) {
  const [selected, setSelected] = useState<string[]>([]);
  const [note, setNote] = useState('');
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);
  async function save() {
    setBusy(true);
    try {
      await saveListeningNote({
        key: JSON.stringify([attemptId, questionId]),
        attemptId,
        questionId,
        reasons: selected as (typeof reasons)[number][0][],
        note,
      });
      setStatus('错误原因已保存');
    } catch {
      setStatus('错误原因保存失败，请重试');
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="error-note">
      <fieldset disabled={busy}>
        <legend>记录这次错误的原因（可多选）</legend>
        <div className="reason-options">
          {reasons.map(([id, label]) => (
            <label key={id}>
              <input
                type="checkbox"
                checked={selected.includes(id)}
                onChange={(e) => {
                  setStatus('尚未保存');
                  setSelected((list) =>
                    e.target.checked ? [...list, id] : list.filter((x) => x !== id),
                  );
                }}
              />
              {label}
            </label>
          ))}
        </div>
        <label>
          补充说明
          <textarea
            value={note}
            maxLength={3000}
            onChange={(e) => {
              setStatus('尚未保存');
              setNote(e.target.value);
            }}
          />
        </label>
        <button className="secondary" onClick={save}>
          保存错误原因
        </button>
      </fieldset>
      {status && <p role="status">{status}</p>}
    </div>
  );
}

function formatAnswer(answer: string | Record<string, string> | undefined) {
  return typeof answer === 'object' ? Object.values(answer).join(' / ') : answer || '未作答';
}
