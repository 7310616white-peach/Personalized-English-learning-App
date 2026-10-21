import { useState } from 'react';
import { ZodError } from 'zod';
import { backup, readJson, results } from '../../data/transfer';
import { importPack } from '../../data/learning';
import {
  completeBackup,
  readBackupFile,
  restoreBackup,
  type PendingBackup,
} from '../../data/listening/archive';
import { saveBinaryFile } from '../../platform/binaryFiles';
import { saveFile } from '../../platform/files';
import example from '../../../public/examples/day-001.json';

export function Transfer({ onRestored }: { onRestored: () => void }) {
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState<PendingBackup>();
  async function run(action: () => Promise<void>) {
    setBusy(true);
    setMessage('');
    setError('');
    try {
      await action();
    } catch (e) {
      setError(
        e instanceof ZodError
          ? '格式校验失败：' +
              e.issues
                .slice(0, 3)
                .map((i) => `${i.path.join('.')} ${i.message}`)
                .join('；')
          : e instanceof Error
            ? e.message
            : '操作失败，请重试',
      );
    } finally {
      setBusy(false);
    }
  }
  async function exportData(kind: 'backup' | 'json' | 'text') {
    if (kind === 'backup') {
      const snapshot = await backup();
      if (snapshot.version === 1)
        await saveFile(`english-${Date.now()}.backup.json`, JSON.stringify(snapshot, null, 2));
      else
        await saveBinaryFile(
          `english-${Date.now()}.backup.zip`,
          await completeBackup(),
          'application/zip',
        );
      setMessage('已发起完整备份导出。请确认文件已保存到 App 以外的位置。');
      return;
    }
    const data = await results();
    const content =
      kind === 'json'
        ? JSON.stringify(data, null, 2)
        : [
            '英语学习答题记录',
            '请根据题目、我的答案与参考答案逐题批改，并给出简明解释。',
            ...(data.listeningAttempts ?? []).map(
              (a) => `\n听力 ${a.libraryId} / ${a.trackId}\n${JSON.stringify(a, null, 2)}`,
            ),
            ...data.attempts.map(
              (a, i) =>
                `\n${i + 1}. ${a.prompt}\n${a.passage ?? ''}\n${a.options?.map((o) => `${o.id}. ${o.text}`).join('\n') ?? ''}\n我的答案：${a.answer}\n参考答案：${a.expected}\n${a.explanation ?? ''}\n本地判定：${a.correct ? '正确' : '错误'}；作答时间：${a.createdAt}`,
            ),
          ].join('\n');
    await saveFile(
      `english-${Date.now()}.${kind === 'json' ? 'results.json' : 'txt'}`,
      content,
      kind === 'text' ? 'text/plain;charset=utf-8' : 'application/json',
    );
    setMessage('已发起答题结果导出，可将文件交给 ChatGPT 批改。');
  }
  return (
    <section>
      <div className="section-heading">
        <div>
          <p className="eyebrow">你的数据，由你保管</p>
          <h2>题包与数据</h2>
        </div>
        <span className="tag">仅存本机</span>
      </div>
      <fieldset className="transfer-grid" disabled={busy}>
        <div className="card">
          <span className="step-number">01</span>
          <h3>导入每日题包</h3>
          <p>让 ChatGPT 按约定格式生成 JSON，再将文件导入这里。单个文件不超过 10 MB。</p>
          <label className="file-button">
            选择题包 JSON
            <input
              type="file"
              accept="application/json,.json"
              aria-label="选择题包 JSON"
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = '';
                if (file)
                  void run(async () => {
                    const pack = await importPack(await readJson(file));
                    setMessage(
                      `已导入「${pack.title}」：${pack.words.length} 个单词，${pack.choices.length} 道选择题。`,
                    );
                  });
              }}
            />
          </label>
          <button
            className="secondary"
            onClick={() =>
              run(async () => {
                await importPack(example);
                setMessage('示例题包已导入，可以开始练习。');
              })
            }
          >
            载入示例：10 个四级词 + 2 个科研词
          </button>
          <a href="/examples/day-001.json" download>
            下载题包格式示例 ↗
          </a>
        </div>
        <div className="card">
          <span className="step-number">02</span>
          <h3>导出答题结果</h3>
          <p>包含题目、作答、参考答案与时间。适合交给 ChatGPT 继续分析和讲解。</p>
          <button className="secondary" onClick={() => run(() => exportData('text'))}>
            导出为文本
          </button>
          <button className="secondary" onClick={() => run(() => exportData('json'))}>
            导出为 JSON
          </button>
          <small>答题结果文件不能用于恢复学习进度。</small>
        </div>
        <div className="card">
          <span className="step-number">03</span>
          <h3>完整备份与恢复</h3>
          <p>
            完整备份包含全部题包、记录、复习计划、草稿及已绑定音频；有听力材料时导出
            ZIP。缺少音频时请先补绑，或导出轻量进度并保留原 WAV。
          </p>
          <button className="secondary" onClick={() => run(() => exportData('backup'))}>
            导出完整备份
          </button>
          <button
            className="secondary"
            onClick={() =>
              run(async () => {
                await saveFile(
                  `english-${Date.now()}.progress.json`,
                  JSON.stringify(await backup(), null, 2),
                );
                setMessage('轻量进度已发起导出：不含音频，换机后需用原 WAV 补绑。');
              })
            }
          >
            导出轻量进度（不含音频）
          </button>
          <label className="file-button subtle">
            选择备份文件（JSON / ZIP）
            <input
              type="file"
              accept="application/json,.json,application/zip,.zip"
              aria-label="选择备份文件"
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = '';
                if (file) void run(async () => setPending(await readBackupFile(file)));
              }}
            />
          </label>
          <small>恢复会替换本机数据。你可以先备份，再确认恢复。</small>
        </div>
      </fieldset>
      {pending && (
        <div role="region" aria-labelledby="restore-title" className="restore-panel card">
          <h3 id="restore-title">确认恢复这份备份？</h3>
          <p>
            备份时间：{new Date(pending.snapshot.exportedAt).toLocaleString('zh-CN')}；
            {pending.snapshot.packs.length} 个题包，
            {pending.snapshot.attempts.length +
              (pending.snapshot.version === 2 ? pending.snapshot.listeningAttempts.length : 0)}{' '}
            条答题记录。恢复后，本机当前数据会被替换。
            {pending.snapshot.version === 2 &&
              !Object.keys(pending.audio).length &&
              '这份 JSON 不含 WAV，缺少的音频需补绑。'}
          </p>
          <div className="button-row">
            <button disabled={busy} onClick={() => setPending(undefined)}>
              取消
            </button>
            <button
              disabled={busy}
              className="primary"
              onClick={() =>
                run(async () => {
                  await restoreBackup(pending);
                  setPending(undefined);
                  setMessage('恢复完成。题包、记录、复习计划和草稿均已恢复。');
                  onRestored();
                })
              }
            >
              确认替换并恢复
            </button>
          </div>
        </div>
      )}
      {busy && <p role="status">正在处理，请稍候…</p>}
      {message && (
        <p className="notice" role="status">
          {message}
        </p>
      )}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <p className="footnote">
        无需登录，无云端同步。浏览器存储、App 内数据与外部备份是不同的：换浏览器或卸载 App
        后，需要使用完整备份恢复。
      </p>
    </section>
  );
}
