import type { Pack, Progress, Attempt } from './models';
import { localDate, makeQueues } from './queue';
import type { WrittenAttempt, WrittenProgress } from './written';
import type { LibraryRecord, MediaRecord, ListeningAttempt, ListeningProgress } from './listening';
import type { StudyActivity } from './studyActivity';
import { dailyListening, listeningReview } from './dailyListening';
import { dailyCet, missingTask, taskBuilder } from './dailyTasks';
import { exercises } from './models';
import { cetTypesForPack } from './daily';

export type DailyTask = {
  id: 'words' | 'review' | 'listening' | 'cet' | 'research' | 'sentence';
  title: string;
  detail: string;
  actionLabel: string;
  status: 'ready' | 'done' | 'missing';
  activity?: StudyActivity;
  destination?: 'transfer' | 'listening' | 'words';
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
  const build = taskBuilder(data, pack);
  const assignedWords = pack ? exercises(pack).filter((e) => e.kind === 'spelling') : [];
  const learned = new Set([
    ...data.progress.map((p) => p.key),
    ...data.attempts.filter((a) => a.kind === 'spelling').map((a) => a.key),
  ]);
  const remaining = assignedWords.filter((e) => !learned.has(e.key));
  const words: DailyTask = queues.words.length
    ? {
        id: 'words',
        title: '今日词汇',
        detail: `先学中文释义，再拼写巩固 · 还有 ${queues.words.length} 个新词（10＋2）`,
        status: 'ready',
        actionLabel: '开始学习',
        activity: { type: 'word-study', queue: queues.words },
      }
    : assignedWords.length && !remaining.length
      ? {
          id: 'words',
          title: '今日词汇',
          detail: `本题包 ${assignedWords.length} 个词已完成拼写`,
          status: 'done',
          actionLabel: '已完成',
        }
      : remaining.length
        ? {
            id: 'words',
            title: '今日词汇',
            status: 'missing',
            detail: `本题包还有 ${remaining.length} 个未学词；今日对应的新词额度已用完，可改日继续。`,
            actionLabel: '查看词汇',
            destination: 'words',
          }
        : missingTask('words', '今日词汇', '本题包还没有可学的新词，请导入10＋2词包。');
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
    taskDay: pack?.date ?? localDate(now),
    cetTypes: cetTypesForPack(pack, localDate(now)),
  };
}
