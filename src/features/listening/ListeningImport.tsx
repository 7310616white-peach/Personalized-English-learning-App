import { useState } from 'react';
import { listeningLibrarySchema, type ListeningLibrary } from '../../domain/listening';
import { importListeningLibrary, matchAudio } from '../../data/listening/materials';
import { readJson } from '../../data/transfer';

export function ListeningImport() {
  const [library, setLibrary] = useState<ListeningLibrary>();
  const [files, setFiles] = useState<File[]>([]);
  const [mapping, setMapping] = useState<Record<string, File | undefined>>({});
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  async function read(file: File) {
    setError('');
    try {
      const parsed = listeningLibrarySchema.parse(await readJson(file));
      setLibrary(parsed);
      setMapping(matchAudio(parsed, files));
      setMessage('已读取清单，请核对每段音频绑定。');
    } catch {
      setError('材料清单格式不正确，请使用听力材料清单 v1；每日题包请在题包与数据中导入。');
    }
  }
  async function submit() {
    if (!library) return;
    setBusy(true);
    setError('');
    try {
      const saved = await importListeningLibrary(library, mapping);
      setMessage(
        `材料清单已保存：${saved.bound} 段已绑定，${saved.missing} 段待绑定。${saved.missing ? '待绑定音轨暂不可播放。' : '可开始离线练习。'}`,
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : '保存失败');
    } finally {
      setBusy(false);
    }
  }
  return (
    <details className="card listening-import">
      <summary>导入 / 补绑听力材料</summary>
      <p>
        首次选择材料清单 JSON 和 WAV；以后补绑可再次选择相同清单与原
        WAV。文件复制到本机后，不依赖原下载位置。每段上限 128 MB。
      </p>
      <fieldset disabled={busy}>
        <div className="listening-file-row">
          <label className="file-button">
            选择材料清单 JSON
            <input
              type="file"
              accept=".json,application/json"
              aria-label="听力材料清单 JSON"
              onChange={(e) => {
                const f = e.target.files?.[0];
                e.target.value = '';
                if (f) void read(f);
              }}
            />
          </label>
          <label className="file-button subtle">
            选择 WAV，可多选
            <input
              type="file"
              accept=".wav,audio/wav,audio/x-wav"
              multiple
              aria-label="听力 WAV 文件"
              onChange={(e) => {
                const selected = Array.from(e.target.files ?? []);
                e.target.value = '';
                setFiles(selected);
                if (library) setMapping(matchAudio(library, selected));
                setMessage(`已选择 ${selected.length} 个 WAV，请核对绑定。`);
              }}
            />
          </label>
        </div>
        {library && (
          <>
            <h3>{library.title}</h3>
            <div className="audio-bindings">
              {library.tracks.map((t) => (
                <label key={t.id}>
                  <span>
                    {t.title}
                    <small>预期文件：{t.audioFile}</small>
                  </span>
                  <select
                    aria-label={`${t.title} 音频绑定`}
                    value={files.indexOf(mapping[t.id]!)}
                    onChange={(e) =>
                      setMapping((m) => ({ ...m, [t.id]: files[Number(e.target.value)] }))
                    }
                  >
                    <option value={-1}>暂不绑定 / 保留已存音频</option>
                    {files.map((f, i) => (
                      <option key={i} value={i}>
                        {f.name}（{(f.size / 1048576).toFixed(1)} MB）
                      </option>
                    ))}
                  </select>
                </label>
              ))}
            </div>
            <button className="primary" onClick={submit}>
              {busy ? '正在核验并保存…' : '确认保存清单与选中音频'}
            </button>
          </>
        )}
      </fieldset>
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
        课程材料仅保存在本机。缺少标准答案或原文时，题包应明确标记为待补充。
      </p>
    </details>
  );
}
