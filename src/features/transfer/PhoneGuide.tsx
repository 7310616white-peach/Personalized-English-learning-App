import { useState } from 'react';
import { dailyPrompt, setupPrompt } from './prompts';
import { saveFile } from '../../platform/files';
import { listeningIndex } from '../../data/listening/indexExport';

export function PhoneGuide() {
  const [text, setText] = useState('');
  const [status, setStatus] = useState('');
  async function copy(value: string) {
    setText(value);
    try {
      await navigator.clipboard.writeText(value);
      setStatus('已复制，切回每日英语粘贴即可。');
    } catch {
      setStatus('请在下方文本框长按全选并复制，再切回每日英语。');
    }
  }
  return (
    <details className="card phone-guide">
      <summary>手机使用流程与每日英语提示词</summary>
      <ol>
        <li>首次：复制“首次设置提示词”，发到手机 ChatGPT 的“每日英语”。</li>
        <li>
          每天：让每日英语生成 JSON
          附件，下载到手机。在拾词选择题包导入；也可从文件的“分享/打开方式”选择拾词。
        </li>
        <li>做题后：导出答题文本或 JSON，发回每日英语批改。另存完整备份用于换机和重装。</li>
      </ol>
      <p>
        听力只需首次准备 library.json 和原
        WAV：在听力训练最下方一起导入，按文件名对应音轨。以后每日题包只引用已导入音轨，不必每天重新导音频。
      </p>
      <p>
        导入后将“听力索引”发给每日英语，让它使用正确的材料库 ID、音轨 ID 和原题 ID。清单和题包是两种
        JSON，均可通过文件分享入口导入。
      </p>
      <div className="button-row">
        <button type="button" className="secondary" onClick={() => copy(setupPrompt)}>
          复制首次设置提示词
        </button>
        <button type="button" className="secondary" onClick={() => copy(dailyPrompt)}>
          复制每日学习提示词
        </button>
        <button
          type="button"
          className="secondary"
          onClick={async () => {
            try {
              await saveFile('每日英语-首次设置.txt', setupPrompt, 'text/plain;charset=utf-8');
              setStatus('提示词文本已发起导出，可发给每日英语。');
            } catch {
              setStatus('导出失败，可使用复制按钮或长按下方文本。');
            }
          }}
        >
          导出首次设置提示词文本
        </button>
        <button
          type="button"
          className="secondary"
          onClick={async () => {
            try {
              await saveFile(
                'listening-index.json',
                JSON.stringify(await listeningIndex(), null, 2),
              );
              setStatus('听力索引已发起导出；不包含 WAV 或个人答题记录。');
            } catch {
              setStatus('索引导出失败，请重试。');
            }
          }}
        >
          导出听力索引给 ChatGPT
        </button>
      </div>
      {text && (
        <label>
          可长按复制的提示词
          <textarea aria-label="可复制的提示词" readOnly value={text} rows={8} />
        </label>
      )}
      {status && <p role="status">{status}</p>}
      <small>
        “用拾词打开”取决于来源 App 是否分享本地 JSON
        文件；若菜单没有出现，使用拾词内的文件选择或粘贴入口。
      </small>
    </details>
  );
}
