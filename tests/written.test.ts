import 'fake-indexeddb/auto';
import Dexie from 'dexie';
import { importListeningLibrary } from '../src/data/listening/materials';
import { completeBackup, readBackupFile, restoreBackup } from '../src/data/listening/archive';
import { library, daily, wavBytes } from './helpers/listeningFixtures';
import { afterEach, expect, it } from 'vitest';
import { LearningDB } from '../src/data/db';
import { loadCetDemo } from '../src/data/cetDemo';
import { importPack } from '../src/data/learning';
import { saveWrittenDraft, submitWritten } from '../src/data/written';
import { backup, restore, results, validateBackup } from '../src/data/transfer';
import { gradeWritten, writtenTaskSchema, writtenKey, wordCount } from '../src/domain/written';
import { packSchema } from '../src/domain/models';
import fixture from '../public/examples/cet4-formats.json';
import oldPack from '../public/examples/day-001.json';
const parsed = packSchema.parse(fixture);
if (parsed.schemaVersion !== 3) throw new Error('fixture version');
const pack = parsed;
const bank = pack.written[0];
const stores: LearningDB[] = [];
const store = () => {
  const s = new LearningDB('written-' + crypto.randomUUID());
  stores.push(s);
  return s;
};
afterEach(async () => {
  for (const s of stores.splice(0)) await s.delete();
});

it('v3 验证空位、选项、引用和唯一ID，不接受损坏题包', async () => {
  expect(bank.type).toBe('word-bank');
  if (bank.type !== 'word-bank') return;
  expect(() => writtenTaskSchema.parse({ ...bank, passage: '[[q1]] [[q1]]' })).toThrow();
  expect(() =>
    writtenTaskSchema.parse({ ...bank, questions: [{ ...bank.questions[0], answerId: 'Z' }] }),
  ).toThrow();
  expect(() => packSchema.parse({ ...fixture, written: [bank, bank] })).toThrow();
  const s = store();
  await expect(
    importPack({ ...fixture, written: [{ ...bank, options: [] }] }, s),
  ).rejects.toThrow();
  expect(await s.packs.count()).toBe(0);
  expect(gradeWritten(bank, {}).earned).toBe(0);
  expect(() => gradeWritten(bank, { q1: 'A', q2: 'A' })).toThrow('一次');
  expect(() => gradeWritten(bank, { unknown: 'A' })).toThrow('未知');
});
it('匹配允许复用段落；主观题不冒充自动评分；字数统计支持缩写', () => {
  const task = pack.written[1];
  expect(gradeWritten(task, { q1: 'E', q2: 'E' }).earned).toBe(1);
  expect(gradeWritten(pack.written[2], { response: 'A possible translation.' }).correct).toBeNull();
  expect(() => gradeWritten(pack.written[3], { response: ' ' })).toThrow('填写');
  expect(wordCount("It's a well-known goal.")).toBe(4);
});
it('客观题提交幂等，写入失败回滚全部记录，保留草稿且不提前推进', async () => {
  const s = store();
  await loadCetDemo(s);
  await saveWrittenDraft(pack.id, bank, { q1: 'A' }, s);
  const fail = () => {
    throw new Error('test quota');
  };
  s.writtenProgress.hook('creating', fail);
  await expect(submitWritten(pack.id, bank, { q1: 'A' }, 'attempt1', s)).rejects.toThrow('quota');
  expect(await s.writtenAttempts.count()).toBe(0);
  expect(await s.writtenDrafts.count()).toBe(1);
  s.writtenProgress.hook('creating').unsubscribe(fail);
  await submitWritten(pack.id, bank, { q1: 'A' }, 'attempt1', s);
  await submitWritten(pack.id, bank, { q1: 'A' }, 'attempt1', s);
  expect(await s.writtenAttempts.count()).toBe(1);
  expect((await s.writtenProgress.toArray())[0].reviews).toBe(1);
  expect((await s.writtenProgress.toArray())[0].errors).toBe(1);
  expect(await s.writtenDrafts.count()).toBe(0);
  await expect(submitWritten(pack.id, bank, { q1: 'B' }, 'attempt1', s)).rejects.toThrow('不一致');
});
it('保存新版草稿后提交旧答案，不删除另一窗口的新草稿；拒绝过时题面', async () => {
  const s = store();
  await loadCetDemo(s);
  await saveWrittenDraft(pack.id, bank, { q1: 'L' }, s);
  await submitWritten(pack.id, bank, { q1: 'A' }, 'old-answer', s);
  expect((await s.writtenDrafts.get(writtenKey(pack.id, bank.id)))?.answers.q1).toBe('L');
  await expect(submitWritten(pack.id, { ...bank, title: 'stale' }, {}, 'stale', s)).rejects.toThrow(
    '变更',
  );
});
it('v3 备份恢复包含主观作答、草稿与复习；校验篡改评分且兼容旧备份', async () => {
  const s = store();
  const target = store();
  await loadCetDemo(s);
  await submitWritten(pack.id, bank, { q1: 'L' }, 'bank', s);
  await submitWritten(pack.id, pack.written[2], { response: 'My translation.' }, 'translation', s);
  await saveWrittenDraft(pack.id, pack.written[3], { response: 'Unfinished essay.' }, s);
  await loadCetDemo(s);
  const snapshot = await backup(s);
  expect(snapshot.version).toBe(3);
  if (snapshot.version !== 3) return;
  expect(() =>
    validateBackup({
      ...snapshot,
      writtenAttempts: snapshot.writtenAttempts.map((a) => ({ ...a, correct: true })),
    }),
  ).toThrow('评分');
  expect(() => validateBackup({ ...snapshot, version: 2 })).toThrow();
  await restore(snapshot, target);
  expect(await target.writtenAttempts.count()).toBe(2);
  expect(await target.writtenProgress.count()).toBe(1);
  expect((await target.writtenDrafts.toArray())[0].answers.response).toBe('Unfinished essay.');
  expect(
    (await results(target)).writtenAttempts?.find((a) => a.id === 'translation')?.task?.type,
  ).toBe('translation');
  const old = store();
  await importPack(oldPack, old);
  await restore(await backup(old), target);
  expect(await target.packs.count()).toBe(1);
  expect(await target.writtenAttempts.count()).toBe(0);
});
it('原地从数据库 v2 升级 v3，保留旧题包、词汇及听力记录', async () => {
  const name = 'migration-' + crypto.randomUUID();
  const old = new Dexie(name);
  old.version(2).stores({
    packs: 'id,date',
    progress: 'key,packId,due',
    attempts: 'id,key,createdAt',
    drafts: 'key',
    listeningLibraries: 'id',
    media: 'id',
    listeningQuestions: 'key,libraryId,trackId',
    listeningAttempts: 'id,libraryId,trackId,createdAt',
    listeningProgress: 'key,libraryId,due',
    listeningDrafts: 'key',
    listeningNotes: 'key,attemptId',
  });
  await old.table('packs').add(oldPack);
  await old.table('listeningDrafts').add({ key: 'preserve', answers: { a: 'keep' } });
  old.close();
  const s = new LearningDB(name);
  stores.push(s);
  await s.open();
  expect(await s.packs.count()).toBe(1);
  expect((await s.listeningDrafts.get('preserve'))?.answers.a).toBe('keep');
  expect(await s.writtenAttempts.count()).toBe(0);
});

it('v3完整ZIP同时恢复拓展草稿、旧听力题和WAV字节', async () => {
  const s = store();
  const target = store();
  await loadCetDemo(s);
  await saveWrittenDraft(pack.id, pack.written[3], { response: 'Keep my draft.' }, s);
  await importListeningLibrary(
    library,
    { 'u1-news': new File([wavBytes().buffer], 'test.wav', { type: 'audio/wav' }) },
    s,
  );
  await importPack(daily, s);
  const bytes = await completeBackup(s);
  const pending = await readBackupFile(new File([bytes], 'test.backup.zip'));
  expect(pending.snapshot.version).toBe(3);
  await restoreBackup(pending, target);
  expect(await target.packs.count()).toBe(2);
  expect((await target.writtenDrafts.toArray())[0].answers.response).toBe('Keep my draft.');
  expect(await target.listeningQuestions.count()).toBe(3);
  expect((await target.media.toArray())[0].blob?.size).toBe(wavBytes().length);
});
