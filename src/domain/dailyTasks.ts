import { exercises, type Pack, type Exercise } from './models';
import { localDate } from './queue';
import { cetLabels, cetTypesForDate } from './daily';
import { writtenKey, type WrittenTask } from './written';
import type { DailyTask, PlanData } from './dailyPlan';

export function missingTask(id: DailyTask['id'], title: string, detail: string): DailyTask {
  return {
    id,
    title,
    detail,
    status: 'missing',
    actionLabel: '导入每日题包',
    destination: 'transfer',
  };
}
export function taskBuilder(data: PlanData, pack: Pack | undefined, now: Date) {
  const onDay = (createdAt: string) => localDate(new Date(createdAt)) === localDate(now);
  const todayKeys = new Set(data.attempts.filter((a) => onDay(a.createdAt)).map((a) => a.key));
  const todayWritten = new Set(
    data.writtenAttempts.filter((a) => onDay(a.createdAt)).map((a) => a.key),
  );
  return {
    exercise(
      id: DailyTask['id'],
      title: string,
      detail: string,
      queue: Exercise[],
      label: string,
    ): DailyTask {
      if (!queue.length) return missingTask(id, title, '题包还没有这项内容，请在“我的”导入。');
      const pending = queue.filter((e) => !todayKeys.has(e.key));
      return {
        id,
        title,
        detail,
        status: pending.length ? 'ready' : 'done',
        actionLabel: label,
        activity: { type: 'exercise', title, queue: pending.length ? pending : queue },
      };
    },
    written(
      id: DailyTask['id'],
      title: string,
      task: WrittenTask | undefined,
      detail: string,
    ): DailyTask {
      return task && pack
        ? {
            id,
            title,
            detail,
            status: todayWritten.has(writtenKey(pack.id, task.id)) ? 'done' : 'ready',
            actionLabel: '开始' + title,
            activity: { type: 'written', packId: pack.id, task },
          }
        : missingTask(id, title, detail + '；请导入包含这项内容的每日题包。');
    },
  };
}
export function dailyCet(data: PlanData, pack: Pack | undefined, now: Date): DailyTask {
  const types = cetTypesForDate(localDate(now));
  const daily = pack?.schemaVersion === 3 ? pack.daily : undefined;
  const build = taskBuilder(data, pack, now);
  const all = pack ? exercises(pack) : [];
  const parts = types.map((type) => {
    const assignment = daily?.cet.find((c) => c.type === type);
    if (type === 'choice')
      return build.exercise(
        'cet',
        cetLabels[type],
        '一篇阅读，少量单选',
        all.filter(
          (e) =>
            e.kind === 'choice' &&
            (assignment?.type === 'choice' ? assignment.choiceIds.includes(e.item.id) : !daily),
        ),
        '开始仔细阅读',
      );
    const task =
      pack?.schemaVersion === 3
        ? pack.written.find(
            (t) =>
              t.type === type &&
              t.id !== daily?.sentenceTaskId &&
              (assignment && assignment.type !== 'choice' ? assignment.taskId === t.id : !daily),
          )
        : undefined;
    return build.written(
      'cet',
      cetLabels[type],
      task,
      type === 'translation' ? '每三天一次段落翻译' : '今天的阅读搭配',
    );
  });
  const next = parts.find((p) => p.status !== 'done') ?? parts[0];
  return {
    ...next,
    id: 'cet',
    title: '四级习题每日练',
    detail: `今天：${types.map((t) => cetLabels[t]).join('＋')} · 阅读三选二${types.includes('translation') ? '，加一次段落翻译' : ''}`,
    status: parts.every((p) => p.status === 'done') ? 'done' : next.status,
    parts,
  };
}
