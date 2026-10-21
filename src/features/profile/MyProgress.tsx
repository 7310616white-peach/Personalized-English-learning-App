import type { PlanData } from '../../domain/dailyPlan';
export function MyProgress({ data, onMistakes }: { data: PlanData; onMistakes: () => void }) {
  const total = data.attempts.length + data.writtenAttempts.length + data.listeningAttempts.length;
  const pending = data.writtenAttempts.filter((a) => a.correct === null).length;
  return (
    <section className="my-progress">
      <div className="section-heading">
        <h2>每一次练习，都有迹可循</h2>
        <button className="text-button" onClick={onMistakes}>
          查看错题本 ↗
        </button>
      </div>
      <div className="card progress-card">
        <div>
          <b>累计提交 {total} 次练习</b>
          <p>
            拼写/阅读 {data.attempts.length} 次 · 听力 {data.listeningAttempts.length} 组 · 拓展{' '}
            {data.writtenAttempts.length} 篇
          </p>
          <p>
            收录 {data.packs.reduce((n, p) => n + p.words.length, 0)} 个词 · {pending}{' '}
            次翻译/作文待批改
          </p>
        </div>
        <span className="tag">自动保存到本机</span>
      </div>
    </section>
  );
}
