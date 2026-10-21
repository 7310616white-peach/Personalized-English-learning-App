import type { Pack, Progress, Attempt } from './models';
import { localDate, makeQueues } from './queue';
import type { WrittenAttempt, WrittenProgress } from './written';
import type { LibraryRecord, MediaRecord, ListeningAttempt, ListeningProgress } from './listening';
import type { StudyActivity } from './studyActivity';
import { dailyListening, listeningReview } from './dailyListening';
import { dailyCet, missingTask, taskBuilder } from './dailyTasks';
import { exercises } from './models';

export type DailyTask = {
  id: 'words' | 'review' | 'listening' | 'cet' | 'research' | 'sentence';
  title: string;
  detail: string;
  actionLabel: string;
  status: 'ready' | 'done' | 'missing';
  activity?: StudyActivity;
  destination?: 'transfer' | 'listening';
  parts?: DailyTask[];
};
export type PlanData = {
  packs: Pack[];
  progress: Progress[];
  attempts: Attempt[];
  writtenAttempts: WrittenAttempt[];
  writtenProgress: WrittenProgress[];
  listeningAttempts: ListeningAttempt[];
  listeningProgress: ListeningProgress[];
  libraries: LibraryRecord[];
  media: MediaRecord[];
};
function reviewTask(
  data: PlanData,
  due: ReturnType<typeof makeQueues>['due'],
  now: Date,
): DailyTask {
  const writtenDue = data.writtenProgress.filter((p) => p.due <= now.toISOString());
  const listeningDue = data.listeningProgress.filter((p) => p.due <= now.toISOString());
  const count = due.length + writtenDue.length + listeningDue.length;
  let activity: StudyActivity | undefined = due.length
    ? { type: 'exercise', title: '到期复习', queue: due }
    : undefined;
  if (!activity)
    for (const row of writtenDue) {
      const pack = data.packs.find((p) => p.id === row.packId);
      const task = pack?.schemaVersion === 3 && pack.written.find((t) => t.id === row.taskId);
      if (task) {
        activity = { type: 'written', packId: pack.id, task };
        break;
      }
    }
  activity ??= listeningReview(data, now);
  return {
    id: 'review',
    title: '间隔复习',
    detail: count
      ? `${count} 项到期 · 单词、阅读和听力一起复习`
      : '暂无到期内容，今天这一项可以轻松跳过。',
    status: !count ? 'done' : activity ? 'ready' : 'missing',
    actionLabel: activity ? '开始复习' : '补充听力材料',
    activity,
    destination: activity ? undefined : 'listening',
  };
}
export function makeDailyPlan(data: PlanData, pack: Pack | undefined, now: Date) {
  const queues = makeQueues(data.packs, data.progress, data.attempts, pack?.id ?? '', now);
  const build = taskBuilder(data, pack, now);
  const words: DailyTask = queues.words.length
    ? {
        id: 'words',
        title: '今日词汇',
        detail: `10个四级词＋2个科研词 · 还有 ${queues.words.length} 个新词`,
        status: 'ready',
        actionLabel: '开始拼写',
        activity: { type: 'exercise', title: '今日单词拼写', queue: queues.words },
      }
    : queues.introduced
      ? {
          id: 'words',
          title: '今日词汇',
          detail: `今日已新学 ${queues.introduced} 个词`,
          status: 'done',
          actionLabel: '已完成',
        }
      : missingTask('words', '今日词汇', '还没有可学的新词，请导入今天的10＋2词包。');
  const daily = pack?.schemaVersion === 3 ? pack.daily : undefined;
  const research = build.exercise(
    'research',
    '每日文献阅读练',
    '一段科研英文＋少量理解题 · 提交后可点词查义',
    pack
      ? exercises(pack).filter(
          (e) => e.kind === 'choice' && daily?.researchChoiceIds.includes(e.item.id),
        )
      : [],
    '开始阅读',
  );
  const sentence = build.written(
    'sentence',
    '每日翻译一句',
    pack?.schemaVersion === 3
      ? pack.written.find((t) => t.id === daily?.sentenceTaskId && t.type === 'translation')
      : undefined,
    '一句科研/日常中文译成英文 · 保存后导出批改',
  );
  const tasks = [
    words,
    reviewTask(data, queues.due, now),
    dailyListening(data, pack?.id ?? '', now),
    dailyCet(data, pack, now),
    research,
    sentence,
  ];
  return {
    tasks,
    recommended: tasks.findIndex((t) => t.status !== 'done'),
    completed: tasks.filter((t) => t.status === 'done').length,
    queues,
    day: localDate(now),
  };
}
