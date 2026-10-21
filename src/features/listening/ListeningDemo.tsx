import { useState } from 'react';
import { loadListeningDemo } from '../../data/listening/demo';

export function ListeningDemo() {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  return (
    <div className="card">
      <p className="eyebrow">先体验，再导入自己的材料</p>
      <h3>校园与科研英语 · 模拟体验</h3>
      <p>
        4 段英文合成朗读，配 8 道选择和 4 道双空听写，另含 12 个单词与 2 道阅读选择。
        均为原创模拟内容，不是校内原题或考试真题。载入后可离线练习。
      </p>
      <button
        className="primary"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setMessage('');
          setError('');
          try {
            await loadListeningDemo();
            setMessage('体验题库已就绪，请在下方选择“开始本组听力”。重复载入会保留学习记录。');
          } catch (e) {
            setError(e instanceof Error ? e.message : '载入失败，请重试');
          } finally {
            setBusy(false);
          }
        }}
      >
        {busy ? '正在保存体验题库…' : '载入模拟体验题库（含音频）'}
      </button>
      {message && <p role="status">{message}</p>}
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
    </div>
  );
}
