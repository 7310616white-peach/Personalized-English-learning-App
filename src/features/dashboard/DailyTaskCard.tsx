import type { DailyTask } from '../../domain/dailyPlan';
export function DailyTaskCard({
  task,
  index,
  recommended,
  onStart,
}: {
  task: DailyTask;
  index: number;
  recommended: boolean;
  onStart: (task: DailyTask) => void;
}) {
  return (
    <section
      className={'card daily-task' + (recommended ? ' main-task' : '')}
      data-task={task.id}
      data-state={task.status}
    >
      <div className="daily-task-heading">
        <p className="eyebrow">
          {String(index + 1).padStart(2, '0')} / {task.title}
        </p>
        <span className={'task-state ' + task.status}>
          {task.status === 'done'
            ? '✓ 已完成'
            : recommended
              ? '接下来做'
              : task.status === 'missing'
                ? '待补充'
                : '待完成'}
        </span>
      </div>
      <h2>{task.title}</h2>
      <p className="daily-detail">{task.detail}</p>
      {task.parts && (
        <div className="daily-parts" aria-label="今日四级安排">
          {task.parts.map((part) => (
            <button className="text-button" key={part.title} onClick={() => onStart(part)}>
              {part.status === 'done' ? '✓ ' : ''}
              {part.title}
              <small>
                {part.status === 'missing' ? '待导入' : part.status === 'done' ? '已提交' : '待练'}
              </small>
            </button>
          ))}
        </div>
      )}
      <button
        className={recommended ? 'primary' : 'secondary'}
        disabled={task.status === 'done' && !task.activity}
        onClick={() => onStart(task)}
      >
        {task.status === 'done' ? (task.activity ? '再练一次' : '已完成') : task.actionLabel}
        {recommended ? ' →' : ''}
      </button>
    </section>
  );
}
