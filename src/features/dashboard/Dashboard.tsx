import { localDate, type makeQueues } from '../../domain/queue';
import type { Pack, Progress, Attempt, Exercise } from '../../domain/models';
import type { Page } from '../../app/navigation';

type DashboardProps = {
  packs: Pack[];
  progress: Progress[];
  attempts: Attempt[];
  now: Date;
  currentPack?: Pack;
  queues: ReturnType<typeof makeQueues>;
  onPackChange: (id: string) => void;
  onNavigate: (page: Page) => void;
  onExperience: () => void;
  onStart: (title: string, queue: Exercise[]) => void;
};
export function Dashboard({
  packs,
  progress,
  attempts,
  now,
  currentPack,
  queues,
  onPackChange,
  onNavigate,
  onStart,
  onExperience,
}: DashboardProps) {
  const today = attempts.filter((a) => localDate(new Date(a.createdAt)) === localDate(now));
  const todayCorrect = today.filter((a) => a.correct).length;
  return (
    <>
      <div className="welcome">
        <p className="eyebrow">
          {now.toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', weekday: 'long' })} ·
          一次专注，一点进步
        </p>
        <h1>今天，也和英语见一面。</h1>
        <p>从 10 个单词开始，为阅读更远的世界做准备。</p>
      </div>
      <div className="stats">
        <div>
          <span>今日新学单词</span>
          <strong>
            {queues.introduced}
            <small> / 12</small>
          </strong>
        </div>
        <div>
          <span>待复习题目</span>
          <strong>
            {queues.due.length}
            <small> 项</small>
          </strong>
        </div>
        <div>
          <span>今日答题正确率</span>
          <strong>
            {today.length ? Math.round((todayCorrect / today.length) * 100) : '—'}
            <small>{today.length ? '%' : ''}</small>
          </strong>
        </div>
      </div>
      {packs.length > 0 && (
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
      )}
      {packs.length === 0 ? (
        <section className="card onboarding">
          <span className="eyebrow">从第一份题包开始</span>
          <h2>把今天的英语，装进口袋。</h2>
          <p>导入 ChatGPT 生成的 JSON 题包，或者先用示例体验一次完整练习。</p>
          <button className="primary" onClick={() => onNavigate('transfer')}>
            导入或载入示例 →
          </button>
          <span className="onboarding-art" aria-hidden="true">
            Aa<span>每天 10 + 2</span>
          </span>
        </section>
      ) : (
        <div className="task-grid">
          <section className="card main-task">
            <p className="eyebrow">01 / 今日词汇</p>
            <div className="task-symbol" aria-hidden="true">
              Aa
            </div>
            <h2>让单词成为自己的</h2>
            <p>
              四级 / 六级词汇 + 科研英语
              <br />
              看释义、写拼写，再回到例句里理解。
            </p>
            <div className="task-bottom">
              <span>{queues.words.length} 个新词待学</span>
              <button
                className="primary"
                disabled={!queues.words.length}
                onClick={() => onStart('今日单词拼写', queues.words)}
              >
                {queues.words.length ? '开始拼写 →' : '今日新词已完成'}
              </button>
            </div>
          </section>
          <section className="card">
            <p className="eyebrow">02 / 间隔复习</p>
            <h2>在遗忘前，再见一面</h2>
            <p>根据每次答题结果，安排下一次复习。</p>
            <strong className="task-count">
              {queues.due.length}
              <small> 项到期</small>
            </strong>
            <button
              className="secondary"
              disabled={!queues.due.length}
              onClick={() => onStart('到期复习', queues.due)}
            >
              开始复习 →
            </button>
          </section>
          <section className="card">
            <p className="eyebrow">03 / 阅读与选择</p>
            <h2>在语境中做出判断</h2>
            <p>练习选择题，读懂答案背后的原因。</p>
            <strong className="task-count">
              {queues.choices.length}
              <small> 题待练</small>
            </strong>
            <button
              className="secondary"
              disabled={!queues.choices.length}
              onClick={() => onStart('选择题练习', queues.choices)}
            >
              开始练题 →
            </button>
          </section>
        </div>
      )}
      <section className="card cet-entry">
        <p className="eyebrow">试一试不同的答题方式</p>
        <h2>四级全题型体验</h2>
        <p>新闻、对话、篇章听力，以及选词、匹配、阅读、翻译和写作。原创仿真，提交后看答案。</p>
        <button className="secondary" onClick={onExperience}>
          打开四级题型体验 →
        </button>
      </section>
      <div className="section-heading lower-heading">
        <h2>每一次练习，都有迹可循</h2>
        <button className="text-button" onClick={() => onNavigate('mistakes')}>
          查看错题本 ↗
        </button>
      </div>
      <div className="card progress-card">
        <div>
          <b>已练习 {progress.length} 道题</b>
          <p>
            累计答题 {attempts.length} 次 · 共收录 {packs.reduce((n, p) => n + p.words.length, 0)}{' '}
            个单词
          </p>
        </div>
        <span className="tag">自动保存到本机</span>
      </div>
      <p className="footnote">今天只需完成今天的量。记得定期在“题包与数据”中导出完整备份。</p>
    </>
  );
}
