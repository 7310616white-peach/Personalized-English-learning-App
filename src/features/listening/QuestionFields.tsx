import type { ListeningAnswer, ListeningQuestion } from '../../domain/listening';

export function QuestionFields({
  question: q,
  answer,
  disabled,
  onChange,
  index,
}: {
  question: ListeningQuestion;
  answer: ListeningAnswer | undefined;
  disabled: boolean;
  onChange: (answer: ListeningAnswer) => void;
  index: number;
}) {
  return (
    <fieldset className="listening-question" disabled={disabled}>
      <legend>
        {index + 1}. {q.origin === 'course-original' ? 'PPT 原题' : '额外模拟题'} ·{' '}
        {q.type === 'listening-choice' ? '单项选择' : '听写填空'}
      </legend>
      {q.type === 'listening-choice' ? (
        <>
          <p lang="en">{q.prompt}</p>
          <div className="options">
            {q.options.map((o) => (
              <label className={'option ' + (answer === o.id ? 'selected' : '')} key={o.id}>
                <input
                  type="radio"
                  name={q.id}
                  value={o.id}
                  checked={answer === o.id}
                  onChange={() => onChange(o.id)}
                />
                <span className="option-id">{o.id}</span>
                <span lang="en">{o.text}</span>
              </label>
            ))}
          </div>
        </>
      ) : (
        <>
          <p lang="en">{q.prompt.replace(/\{\{([a-zA-Z0-9_-]+)\}\}/g, '____')}</p>
          <div className="cloze-inputs">
            {q.blankIds.map((id, i) => (
              <label key={id}>
                第 {i + 1} 空
                <input
                  lang="en"
                  aria-label={`题 ${index + 1} 第 ${i + 1} 空`}
                  value={typeof answer === 'object' ? (answer[id] ?? '') : ''}
                  onChange={(e) =>
                    onChange({
                      ...(typeof answer === 'object' ? answer : {}),
                      [id]: e.target.value,
                    })
                  }
                  autoCapitalize="none"
                  autoCorrect="off"
                  autoComplete="off"
                  spellCheck={false}
                  maxLength={10000}
                />
              </label>
            ))}
          </div>
        </>
      )}
    </fieldset>
  );
}
