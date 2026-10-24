import 'fake-indexeddb/auto';
import { expect, it } from 'vitest';
import { BackActions, isExitSwipe } from '../src/domain/backActions';
import { LearningDB } from '../src/data/db';
import { previewIncoming, commitIncoming } from '../src/data/intake';
import { listeningIndex } from '../src/data/listening/indexExport';
import { dictionaryWords } from '../src/domain/lookup';
import { backup, restore } from '../src/data/transfer';
import sample from '../public/examples/day-001.json';
import { library } from './helpers/listeningFixtures';

it('左右水平手势可退出，垂直滚动、小幅拖动和长拖不退出', () => {
  expect(isExitSwipe(-140, 5, 200)).toBe(true);
  expect(isExitSwipe(140, -5, 200)).toBe(true);
  expect(isExitSwipe(40, 2, 200)).toBe(false);
  expect(isExitSwipe(100, 130, 200)).toBe(false);
  expect(isExitSwipe(140, 2, 2000)).toBe(false);
});
it('返回先关闭弹层，提交期间重复返回不越过保存边界', async () => {
  const actions = new BackActions();
  const calls: string[] = [];
  const exit = actions.register(() => {
    calls.push('exit');
  }, 10);
  const modal = actions.register(() => {
    calls.push('modal');
  }, 30);
  await actions.run();
  expect(calls).toEqual(['modal']);
  modal();
  let resolve!: () => void;
  const stop = actions.register(
    () =>
      new Promise<void>((r) => {
        resolve = r;
      }),
    20,
  );
  const saving = actions.run();
  await actions.run();
  expect(calls).toEqual(['modal']);
  resolve();
  await saving;
  stop();
  await actions.run();
  expect(calls).toEqual(['modal', 'exit']);
  exit();
  expect(actions.enabled).toBe(false);
});
it('无效分享文件、超大JSON和备份不冒充学习题包，解析阶段不写数据', () => {
  expect(() => previewIncoming('```json\n{}\n```')).toThrow('有效 JSON');
  expect(() => previewIncoming('{"format":"english-pocket-backup"}')).toThrow();
  expect(() => previewIncoming(' '.repeat(10 * 1024 * 1024 + 1))).toThrow('10 MB');
});
it('v2语境词释义可查询、备份恢复；旧v1和旧词汇记录仍可读取', async () => {
  const store = new LearningDB('mobile-' + crypto.randomUUID());
  const target = new LearningDB('mobile-' + crypto.randomUUID());
  try {
    const preview = previewIncoming(
      JSON.stringify({
        ...sample,
        schemaVersion: 2,
        listening: [],
        glossary: [{ id: 'g1', term: 'findings', meaning: 'n. 研究发现', level: '科研英语' }],
      }),
    );
    expect(await store.packs.count()).toBe(0);
    await commitIncoming(preview, store);
    const pack = (await store.packs.toArray())[0];
    expect(dictionaryWords([pack], []).some((w) => w.term === 'findings')).toBe(true);
    await restore(await backup(store), target);
    expect(
      dictionaryWords(await target.packs.toArray(), []).find((w) => w.term === 'findings')?.meaning,
    ).toBe('n. 研究发现');
    expect(previewIncoming(JSON.stringify(sample)).kind).toBe('pack');
    expect((await commitIncoming(preview, store)).message).toContain('该题包已导入');
    expect(await store.packs.count()).toBe(1);
  } finally {
    await store.delete();
    await target.delete();
  }
});
it('分享材料清单仅建立待绑定音轨；导出索引保留ID，不携带答题记录或音频', async () => {
  const store = new LearningDB('index-' + crypto.randomUUID());
  try {
    const preview = previewIncoming(JSON.stringify(library));
    expect(preview.kind).toBe('library');
    await commitIncoming(preview, store);
    const index = await listeningIndex(store);
    expect(index.libraries[0].tracks[0].trackId).toBe(library.tracks[0].id);
    expect(index.libraries[0].tracks[0].bound).toBe(false);
    expect(index).not.toHaveProperty('attempts');
    expect(await store.media.count()).toBe(0);
  } finally {
    await store.delete();
  }
});
