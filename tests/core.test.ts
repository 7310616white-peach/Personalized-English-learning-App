import 'fake-indexeddb/auto';
import { afterEach, describe, expect, it } from 'vitest';
import { LearningDB } from '../src/data/db';
import { importPack, submitAnswer } from '../src/data/learning';
import { backup, restore, results, validateBackup } from '../src/data/transfer';
import { exercises, itemKey, packSchema } from '../src/domain/models';
import { grade } from '../src/domain/grading';
import { nextSchedule } from '../src/domain/scheduler';
import { makeQueues } from '../src/domain/queue';
import sample from '../public/examples/day-001.json';

const stores: LearningDB[] = [];
const store = () => {
  const db = new LearningDB('test-' + crypto.randomUUID());
  stores.push(db);
  return db;
};
const pack = packSchema.parse(sample);
const spelling = exercises(pack)[0];
const now = new Date('2026-10-21T12:00:00Z');
afterEach(async () => {
  for (const db of stores.splice(0)) await db.delete();
});

describe('导入边界', () => {
  it('接收 10+2 示例，拒绝同包重复 ID、无效日期、无正确选项', () => {
    expect(pack.words.filter((w) => w.level === '科研英语')).toHaveLength(2);
    expect(() =>
      packSchema.parse({ ...sample, choices: [{ ...sample.choices[0], id: sample.words[0].id }] }),
    ).toThrow();
    expect(() => packSchema.parse({ ...sample, date: '2026-02-30' })).toThrow();
    expect(() =>
      packSchema.parse({ ...sample, choices: [{ ...sample.choices[0], answerId: 'Z' }] }),
    ).toThrow();
  });
  it('重复导入不能覆盖词汇和进度，坏题包不能部分写入', async () => {
    const db = store();
    await importPack(sample, db);
    await submitAnswer(spelling, 'wrong', 'a1', db, now);
    await expect(importPack({ ...sample, title: '覆盖' }, db)).rejects.toThrow('已存在');
    await expect(importPack({ ...sample, id: 'bad', words: [{}] }, db)).rejects.toThrow();
    expect(await db.packs.count()).toBe(1);
    expect((await db.packs.get(pack.id))?.title).toBe(pack.title);
    expect(await db.progress.count()).toBe(1);
  });
  it('组合键不因短横线或词汇复用而冲突', () => {
    expect(itemKey('a-b', 'spelling', 'c')).not.toBe(itemKey('a', 'spelling', 'b-c'));
  });
});

describe('判题和复习', () => {
  it('拼写兼容大小写、首尾空格和全角，但拒绝错拼', () => {
    expect(grade(spelling, '  APPROACH  ')).toBe(true);
    expect(grade(spelling, 'ａｐｐｒｏａｃｈ')).toBe(true);
    expect(grade(spelling, 'aproach')).toBe(false);
    expect(grade(exercises(pack).at(-1)!, 'B')).toBe(true);
  });
  it('按 1/3/7/14 天递增，错误重置，长期上限 90 天', () => {
    let previous;
    let time = new Date(now);
    for (const days of [1, 3, 7, 14]) {
      const next = nextSchedule(previous, true, time);
      expect((Date.parse(next.due) - time.getTime()) / 86400000).toBe(days);
      previous = {
        key: spelling.key,
        packId: pack.id,
        itemId: spelling.item.id,
        kind: spelling.kind,
        ...next,
      };
      time = new Date(next.due);
    }
    const failed = nextSchedule(previous, false, time);
    expect(failed.stage).toBe(0);
    expect(failed.errors).toBe(1);
    const max = nextSchedule({ ...previous!, stage: 12 }, true, time);
    expect((Date.parse(max.due) - time.getTime()) / 86400000).toBe(90);
  });
  it('提前重复练习不推进复习阶段', () => {
    const first = {
      key: spelling.key,
      packId: pack.id,
      itemId: spelling.item.id,
      kind: spelling.kind,
      ...nextSchedule(undefined, true, now),
    };
    const repeat = nextSchedule(first, true, new Date(now.getTime() + 60000));
    expect(repeat.stage).toBe(1);
    expect(repeat.due).toBe(first.due);
    expect(repeat.reviews).toBe(2);
  });
  it('一次提交原子保存记录、错题、复习计划，并移除草稿；重试不重复计分', async () => {
    const db = store();
    await importPack(pack, db);
    await db.drafts.put({ key: spelling.key, answer: 'bad' });
    await Promise.all([
      submitAnswer(spelling, 'bad', 'once', db, now),
      submitAnswer(spelling, 'bad', 'once', db, now),
    ]);
    expect(await db.attempts.count()).toBe(1);
    expect(await db.drafts.count()).toBe(0);
    expect((await db.progress.get(spelling.key))?.errors).toBe(1);
    expect((await db.progress.get(spelling.key))?.reviews).toBe(1);
  });
  it('数据库重新打开仍保留草稿和记录', async () => {
    const db = store();
    await importPack(pack, db);
    await db.drafts.put({ key: spelling.key, answer: 'appr' });
    db.close();
    await db.open();
    expect((await db.drafts.get(spelling.key))?.answer).toBe('appr');
    expect(await db.packs.count()).toBe(1);
  });
  it('到期队列只包含已学且到期的题目；每日新词总额跨题包生效', async () => {
    const db = store();
    await importPack(pack, db);
    for (const e of exercises(pack).filter((e) => e.kind === 'spelling'))
      await submitAnswer(e, 'wrong', crypto.randomUUID(), db, now);
    const progress = await db.progress.toArray();
    const attempts = await db.attempts.toArray();
    const second = packSchema.parse({ ...sample, id: 'second' });
    const queue = makeQueues([pack, second], progress, attempts, second.id, now);
    expect(queue.words).toHaveLength(0);
    expect(queue.due).toHaveLength(0);
    expect(queue.introduced).toBe(12);
    expect(
      makeQueues([pack], progress, attempts, pack.id, new Date('2026-10-22T12:00:01Z')).due,
    ).toHaveLength(12);
  });
});

describe('备份与批改导出', () => {
  it('完整往返恢复题包、草稿、记录和复习计划', async () => {
    const source = store();
    const target = store();
    await importPack(pack, source);
    await submitAnswer(spelling, 'wrong', 'a', source, now);
    await source.drafts.put({ key: exercises(pack)[1].key, answer: 'evi' });
    const snapshot = await backup(source);
    await restore(JSON.parse(JSON.stringify(snapshot)), target);
    const restored = await backup(target);
    expect({ ...restored, exportedAt: '' }).toEqual({ ...snapshot, exportedAt: '' });
    const exported = await results(target);
    expect(exported.attempts[0].answer).toBe('wrong');
    expect(exported.attempts[0].expected).toBe('approach');
  });
  it('拒绝孤立记录、重复条目、未知版本和结果文件；原有数据不受影响', async () => {
    const db = store();
    await importPack(pack, db);
    await submitAnswer(spelling, 'bad', 'a', db, now);
    const snapshot = await backup(db);
    await expect(restore({ ...snapshot, packs: [] }, db)).rejects.toThrow();
    expect(() =>
      validateBackup({ ...snapshot, progress: [...snapshot.progress, ...snapshot.progress] }),
    ).toThrow();
    await expect(restore({ ...snapshot, version: 99 }, db)).rejects.toThrow();
    await expect(restore(await results(db), db)).rejects.toThrow();
    expect(await db.packs.count()).toBe(1);
    expect(await db.attempts.count()).toBe(1);
  });
});

it('提交不会清除另一窗口的新草稿，过期题目拒绝提交', async () => {
  const db = store();
  await importPack(pack, db);
  await db.drafts.put({ key: spelling.key, answer: 'newer-draft' });
  await submitAnswer(spelling, 'approach', 'preserve', db, now);
  expect((await db.drafts.get(spelling.key))?.answer).toBe('newer-draft');
  const changed = { ...spelling, item: { ...spelling.item, meaning: 'changed' } };
  await expect(submitAnswer(changed, 'bad', 'stale', db, now)).rejects.toThrow('已变更');
  expect(await db.attempts.count()).toBe(1);
});
