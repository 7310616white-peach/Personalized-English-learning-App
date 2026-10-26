import { expect, it, vi, afterEach } from 'vitest';
import { vocabularyGroups } from '../src/domain/vocabularyGroups';
import { essayEntries } from '../src/domain/essays';
import { exercises, packSchema, type Attempt, type Progress } from '../src/domain/models';
import { writtenKey } from '../src/domain/written';
import sample from '../public/examples/day-001.json';
import formats from '../public/examples/cet4-formats.json';
import { historyPack } from './helpers/historyFixtures';

afterEach(() => vi.unstubAllEnvs());
const words = exercises(packSchema.parse(sample)).filter((e) => e.kind === 'spelling');
function attempt(index: number, createdAt: string): Attempt {
  const e = words[index];
  return {
    id: crypto.randomUUID(),
    key: e.key,
    packId: e.packId,
    itemId: e.item.id,
    kind: 'spelling',
    answer: 'x',
    correct: false,
    createdAt,
  };
}
function progress(index: number): Progress {
  const e = words[index];
  return {
    key: e.key,
    packId: e.packId,
    itemId: e.item.id,
    kind: 'spelling',
    stage: 1,
    due: '2026-10-29T00:00:00Z',
    reviews: 3,
    errors: 1,
    lastReviewedAt: '2026-10-27T00:00:00Z',
  };
}
it('词汇按首次实际作答的本地日期分组，之后复习和题包日期不改变分组', () => {
  vi.stubEnv('TZ', 'Asia/Shanghai');
  const attempts = [
    attempt(0, '2026-10-24T02:00:00Z'),
    attempt(1, '2026-10-22T16:10:00Z'),
    attempt(0, '2026-10-22T15:50:00Z'),
  ];
  const original = JSON.stringify(attempts);
  const groups = vocabularyGroups(words.slice(0, 3), attempts, [progress(0), progress(1)]);
  expect(groups.map((g) => [g.key, g.items.map((e) => e.key)])).toEqual([
    ['2026-10-23', [words[1].key]],
    ['2026-10-22', [words[0].key]],
    ['unlearned', [words[2].key]],
  ]);
  expect(JSON.stringify(attempts)).toBe(original);
});
it('无首次作答的旧进度标记日期未记录，未学习单独收起，不伪造学习日期', () => {
  const groups = vocabularyGroups(words.slice(0, 2), [], [progress(0)]);
  expect(groups.map((g) => [g.key, g.items.length])).toEqual([
    ['unknown', 1],
    ['unlearned', 1],
  ]);
});
it('范文列表不泄露未提交作文参考，提交后可阅读，身份不与每日范文相撞', () => {
  const p = historyPack();
  const f = packSchema.parse(formats);
  if (p.schemaVersion !== 3 || !p.daily || f.schemaVersion !== 3) throw new Error('fixture');
  const writing = f.written.find((t) => t.type === 'writing')!;
  const pack = packSchema.parse({
    ...p,
    written: [...p.written, writing],
    daily: { ...p.daily, modelEssays: [{ ...p.daily.modelEssays[0], id: writing.id }] },
  });
  expect(essayEntries([pack], [])).toHaveLength(1);
  const entries = essayEntries([pack], [{ key: writtenKey(pack.id, writing.id) }]);
  expect(entries).toHaveLength(2);
  expect(new Set(entries.map((e) => e.key)).size).toBe(2);
  expect(entries[1].body).toBe(writing.type === 'writing' ? writing.reference : '');
  expect(essayEntries([pack], [{ key: writtenKey('another-pack', writing.id) }])).toHaveLength(1);
});
