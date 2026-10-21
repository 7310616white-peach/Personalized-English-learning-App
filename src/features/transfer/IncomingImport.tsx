import { useEffect, useRef, useState } from 'react';
import { ZodError } from 'zod';
import { previewIncoming, commitIncoming } from '../../data/intake';
import type { IncomingFile } from '../../platform/incomingFiles';
import { useBackAction } from '../../shared/useBackAction';

export function IncomingImport({ file, onClose }: { file: IncomingFile; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [preview] = useState(() => {
    try {
      if (file.error) throw new Error(file.error);
      return { data: previewIncoming(file.text ?? '') };
    } catch (e) {
      return {
        error:
          e instanceof ZodError
            ? 'JSON 字段不符合题包或材料清单格式，请让每日英语按拾词协议修正。'
            : e instanceof Error
              ? e.message
              : '格式不正确',
      };
    }
  });
  useEffect(() => {
    dialog.current?.showModal();
  }, []);
  useBackAction(
    true,
    () => {
      if (!busy) onClose();
    },
    25,
  );
  return (
    <dialog
      ref={dialog}
      className="meaning-dialog"
      aria-label="确认导入分享的文件"
      onCancel={(event) => {
        event.preventDefault();
        if (!busy) onClose();
      }}
    >
      <h3>导入到拾词？</h3>
      <p>{file.name}</p>
      {preview.data && (
        <>
          <p>「{preview.data.value.title}」</p>
          <p>
            {preview.data.kind === 'pack'
              ? `${preview.data.value.words.length} 个单词，${preview.data.value.choices.length} 道选择，${preview.data.value.schemaVersion === 2 ? preview.data.value.listening.length : 0} 组听力`
              : `${preview.data.value.tracks.length} 段音轨清单，WAV 需要在听力训练底部另行选择。`}
          </p>
          <p>确认后才写入本机学习库，不替换已有学习记录。</p>
          {!status && (
            <button
              className="primary"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                setError('');
                try {
                  setStatus(await commitIncoming(preview.data!));
                } catch (e) {
                  setError(e instanceof Error ? e.message : '导入失败，请重试');
                } finally {
                  setBusy(false);
                }
              }}
            >
              {busy ? '正在导入…' : '确认导入'}
            </button>
          )}
        </>
      )}
      {(preview.error || error) && (
        <p role="alert" className="error">
          {preview.error || error}
        </p>
      )}
      {status && <p role="status">{status}</p>}
      <button className="secondary" disabled={busy} onClick={onClose}>
        {status ? '完成' : '取消'}
      </button>
    </dialog>
  );
}
