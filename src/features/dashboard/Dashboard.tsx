import type { Pack } from '../../domain/models';
import type { DailyTask, makeDailyPlan } from '../../domain/dailyPlan';
import { cetLabels, cetTypesForDate } from '../../domain/daily';
import type { Page } from '../../app/navigation';
import { DailyTaskCard } from './DailyTaskCard';
type Props = {
  packs: Pack[];
  now: Date;
  currentPack?: Pack;
  plan: ReturnType<typeof makeDailyPlan>;
  onPackChange: (id: string) => void;
  onNavigate: (page: Page) => void;
  onExperience: () => void;
  onTask: (task: DailyTask) => void;
};
export function Dashboard({
  packs,
  now,
  currentPack,
  plan,
  onPackChange,
  onNavigate,
  onExperience,
  onTask,
}: Props) {
  return (
    <>
      <div className="welcome">
        <p className="eyebrow">
          {now.toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', weekday: 'long' })} ·
          一次专注，一点进步
        </p>
        <h1>今天，也和英语见一面。</h1>
        <p>听力每天见，阅读换着练。按自己的节奏完成这六件小事。</p>
      </div>
      <div className="stats">
        <div>
          <span>今日新学单词</span>
          <strong>
            {plan.queues.introduced}
            <small> / 12</small>
          </strong>
        </div>
        <div>
          <span>今日流程</span>
          <strong>
            {plan.completed}
            <small> / 6</small>
          </strong>
        </div>
        <div>
          <span>今天的阅读搭配</span>
          <b className="rotation-label">
            {cetTypesForDate(plan.day)
              .filter((t) => t !== 'translation')
              .map((t) => cetLabels[t])
              .join('＋')}
          </b>
        </div>
      </div>
      {packs.length > 0 ? (
        <label className="pack-select">
          当前题包
          <select
            aria-label="当前题包"
            value={currentPack?.id}
            onChange={(e) => onPackChange(e.target.value)}
          >
            {packs.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title}
              </option>
            ))}
          </select>
        </label>
      ) : (
        <section className="card onboarding">
          <h2>把今天的英语，装进口袋。</h2>
          <p>在“我的”导入每日英语生成的题包，或者先载入预览，试一遍这六项流程。</p>
          <button className="primary" onClick={() => onNavigate('transfer')}>
            导入或载入示例 →
          </button>
        </section>
      )}
      {currentPack && currentPack.date !== plan.day && (
        <p className="notice">
          正在使用 {currentPack.date} 的题包。今天的内容请在“我的”导入；提交记录按实际练习日期保存。
        </p>
      )}
      <div className="task-grid daily-grid">
        {plan.tasks.map((task, i) => (
          <DailyTaskCard
            key={task.id}
            task={task}
            index={i}
            recommended={i === plan.recommended}
            onStart={onTask}
          />
        ))}
      </div>
      {plan.recommended === -1 && (
        <p className="notice" role="status">
          今天的六项流程已完成，休息一下，也可以读一篇范文。
        </p>
      )}
      <section className="card essay-entry">
        <div>
          <p className="eyebrow">读一篇，积累一点表达</p>
          <h2>范文栏</h2>
          <p>范文、常用表达和写作思路，单独收好。写作文由你主动安排。</p>
        </div>
        <button className="secondary" onClick={() => onNavigate('essays')}>
          打开范文栏 →
        </button>
      </section>
      <details className="card preview-entry">
        <summary>预览与题型演示（验收后移除入口）</summary>
        <p>正式每日任务按上方安排。这里保留全题型演示，方便本轮检查。</p>
        <button className="secondary" onClick={onExperience}>
          打开四级题型体验 →
        </button>
      </details>
      <p className="footnote">
        开始按钮会顺着已保存的完成记录往下走。学习统计、每日提示词和备份都在“我的”。
      </p>
    </>
  );
}
