import 'fake-indexeddb/auto';
import Dexie from 'dexie';
import { afterEach, expect, it } from 'vitest';
import { LearningDB } from '../src/data/db';
import { importPack } from '../src/data/learning';
import { importListeningLibrary } from '../src/data/listening/materials';
import { submitListening, saveListeningNote } from '../src/data/listening/attempts';
import {
  listeningKey,
  listeningQuestionSchema,
  listeningLibrarySchema,
} from '../src/domain/listening';
import { packSchema } from '../src/domain/models';
import { gradeListening, scoreListening } from '../src/domain/listeningGrading';
import { inspectWav } from '../src/domain/wav';
import { backup, restore, validateBackup, results } from '../src/data/transfer';
import { completeBackup, readBackupFile, restoreBackup } from '../src/data/listening/archive';
import { zipBackup, unzipBackup } from '../src/domain/backupZip';
import { library, set, daily, wavBytes } from './helpers/listeningFixtures';
import oldPack from '../public/examples/day-001.json';

const stores: LearningDB[] = [];
const store = () => {
  const s = new LearningDB('listening-' + crypto.randomUUID());
  stores.push(s);
  return s;
};
const file = () => new File([wavBytes().buffer], 'test.wav', { type: 'audio/wav' });
async function setup(s: LearningDB) {
  await importListeningLibrary(library, { 'u1-news': file() }, s);
  await importPack(daily, s);
}
afterEach(async () => {
  for (const s of stores.splice(0)) await s.delete();
});

it('在原数据库从 schema 1 升级，保留旧题包/草稿/记录与库名', async () => {
  const name = 'migration-' + crypto.randomUUID();
  const old = new Dexie(name);
  old.version(1).stores({
    packs: 'id,date',
    progress: 'key,packId,due',
    attempts: 'id,key,createdAt',
    drafts: 'key',
  });
  await old.table('packs').add(oldPack);
  await old.table('drafts').put({ key: 'existing', answer: 'keep' });
  old.close();
  const upgraded = new LearningDB(name);
  stores.push(upgraded);
  await upgraded.open();
  expect(await upgraded.packs.count()).toBe(1);
  expect((await upgraded.drafts.get('existing'))?.answer).toBe('keep');
  expect(await upgraded.listeningAttempts.count()).toBe(0);
});
it('验证 v2 / 缺少答案 / 空位对应关系，不接受假选项或重复空位', () => {
  expect(packSchema.parse(daily).schemaVersion).toBe(2);
  expect(listeningQuestionSchema.parse(set.questions[0]).grading.status).toBe('missing');
  const q = set.questions[2];
  expect(() => listeningQuestionSchema.parse({ ...q, blankIds: ['b1', 'b1'] })).toThrow();
  expect(() =>
    listeningQuestionSchema.parse({
      ...set.questions[1],
      grading: { status: 'draft', answerId: 'Z', explanation: 'x' },
    }),
  ).toThrow();
  expect(() =>
    listeningLibrarySchema.parse({ ...library, tracks: [...library.tracks, ...library.tracks] }),
  ).toThrow();
});
it('WAV 实际头、长度和编码检查；损坏文件不写入材料库', async () => {
  const s = store();
  expect(inspectWav(wavBytes().buffer).durationSec).toBe(1);
  const bad = wavBytes();
  new DataView(bad.buffer).setUint16(20, 99, true);
  await expect(
    importListeningLibrary(library, { 'u1-news': new File([bad.buffer], 'test.wav') }, s),
  ).rejects.toThrow('编码');
  expect(await s.listeningLibraries.count()).toBe(0);
  expect(await s.media.count()).toBe(0);
  expect(() => inspectWav(wavBytes().buffer.slice(0, 60))).toThrow();
});
it('同字节 WAV 去重；同轨不同内容拒绝覆盖；先有清单才能导入题包', async () => {
  const s = store();
  await expect(importPack(daily, s)).rejects.toThrow('清单');
  await setup(s);
  await importListeningLibrary(library, { 'u1-news': file() }, s);
  expect(await s.media.count()).toBe(1);
  await expect(
    importListeningLibrary(library, { 'u1-news': new File([wavBytes(500).buffer], 'test.wav') }, s),
  ).rejects.toThrow('指纹');
  expect(await s.media.count()).toBe(1);
  expect(await s.packs.count()).toBe(1);
});
it('每日包原题共享身份，内容冲突拒绝并回滚此前新增题目', async () => {
  const s = store();
  await setup(s);
  await importPack({ ...daily, id: 'day2' }, s);
  expect(await s.listeningQuestions.count()).toBe(3);
  const changed = {
    ...set,
    questions: [
      { ...set.questions[1], id: 'brand-new' },
      { ...set.questions[0], prompt: 'changed' },
    ],
  };
  await expect(importPack({ ...daily, id: 'conflict', listening: [changed] }, s)).rejects.toThrow(
    '内容不同',
  );
  expect(await s.listeningQuestions.get(listeningKey(library.id, 'brand-new'))).toBeUndefined();
  expect(await s.packs.get('conflict')).toBeUndefined();
});
it('缺失答案不计错，draft 暂评，按空判定且不把待批改计入分母', () => {
  const grades = set.questions.map((q) =>
    gradeListening(q, { 'original-1': 'A', 'extra-1': 'B', 'cloze-1': { b1: '  ONLINE ' } }[q.id]),
  );
  expect(grades[0].correct).toBeNull();
  expect(grades[1].status).toBe('provisional');
  expect(scoreListening(grades)).toEqual({
    correctUnits: 2,
    gradedUnits: 2,
    ungradedUnits: 1,
    accuracy: 1,
  });
  expect(scoreListening([grades[0]]).accuracy).toBeNull();
});
it('整组幂等提交、逐题复习与跨题包复用，附加错因不改原始作答', async () => {
  const s = store();
  await setup(s);
  const answers = { 'original-1': 'A', 'extra-1': 'A', 'cloze-1': { b1: 'online' } };
  const playback = { playCount: 2, lastPlaybackRate: 0.85 };
  const now = new Date('2026-10-21T12:00:00Z');
  await Promise.all([
    submitListening(daily.id, set, answers, playback, 'once', s, now),
    submitListening(daily.id, set, answers, playback, 'once', s, now),
  ]);
  expect(await s.listeningAttempts.count()).toBe(1);
  await expect(
    submitListening(daily.id, set, { ...answers, 'extra-1': 'B' }, playback, 'once', s, now),
  ).rejects.toThrow('冲突');
  expect(await s.listeningProgress.count()).toBe(2);
  expect((await s.listeningProgress.get(listeningKey(library.id, 'extra-1')))?.errors).toBe(1);
  expect(await s.listeningProgress.get(listeningKey(library.id, 'original-1'))).toBeUndefined();
  await saveListeningNote(
    {
      key: JSON.stringify(['once', 'extra-1']),
      attemptId: 'once',
      questionId: 'extra-1',
      reasons: ['speed'],
      note: '跟不上',
    },
    s,
  );
  expect((await s.listeningAttempts.get('once'))?.answers).toEqual(answers);
  await importPack({ ...daily, id: 'day2' }, s);
  await submitListening('day2', set, { ...answers, 'extra-1': 'B' }, playback, 'twice', s, now);
  expect(await s.listeningProgress.count()).toBe(2);
  expect((await s.listeningProgress.get(listeningKey(library.id, 'cloze-1')))?.stage).toBe(1);
  const exported = await results(s);
  expect(exported.listeningAttempts?.[0].annotations[0].note).toBe('跟不上');
  expect(exported.listeningAttempts?.[1].practiceCounts['extra-1']).toBe(2);
});
it('轻量恢复保留引用并明确缺失音频；完整 ZIP 在新库恢复媒体与草稿', async () => {
  const source = store(),
    light = store(),
    full = store();
  await setup(source);
  const snapshot = await backup(source);
  expect(snapshot.version).toBe(2);
  validateBackup(snapshot);
  await restore(JSON.parse(JSON.stringify(snapshot)), light);
  expect((await light.media.toArray())[0].storage).toBe('missing');
  const bytes = await completeBackup(source);
  const pending = await readBackupFile(new File([bytes.buffer], 'backup.zip'));
  await restoreBackup(pending, full);
  expect((await full.media.toArray())[0].storage).toBe('indexeddb');
  expect(await full.listeningQuestions.count()).toBe(3);
  const again = await backup(full);
  expect({ ...again, exportedAt: '' }).toEqual({ ...snapshot, exportedAt: '' });
  await importListeningLibrary(library, { 'u1-news': file() }, light);
  expect((await light.media.toArray())[0].storage).toBe('indexeddb');
});
it('有提交记录的 v2 备份完整往返；无效引用/篡改 ZIP 不影响旧数据', async () => {
  const s = store(),
    target = store();
  await setup(s);
  await submitListening(
    daily.id,
    set,
    { 'extra-1': 'B', 'cloze-1': { b1: 'wrong' } },
    { playCount: 1, lastPlaybackRate: 1 },
    'a1',
    s,
  );
  const snap = await backup(s);
  validateBackup(snap);
  await restore(snap, target);
  expect(await target.listeningAttempts.count()).toBe(1);
  if (snap.version === 2)
    await expect(restore({ ...snap, media: [] }, target)).rejects.toThrow('绑定');
  const zip = await completeBackup(s);
  zip[50] ^= 1;
  await expect(readBackupFile(new File([zip.buffer], 'bad.zip'))).rejects.toThrow();
  expect(await target.listeningAttempts.count()).toBe(1);
});
it('ZIP STORE round trip, CRC 与路径/压缩/重复记录保护', () => {
  const contents = { 'data.json': new TextEncoder().encode('{"test":true}') };
  const zip = zipBackup(contents);
  expect(new TextDecoder().decode(unzipBackup(zip)['data.json'])).toBe('{"test":true}');
  expect(() => zipBackup({ '../bad': new Uint8Array([1]) })).toThrow('路径');
  const changed = zip.slice();
  new DataView(changed.buffer).setUint16(8, 8, true);
  expect(() => unzipBackup(changed)).toThrow();
});
