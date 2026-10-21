import { Capacitor } from '@capacitor/core';
import { Directory, Filesystem } from '@capacitor/filesystem';
import type { MediaMeta, MediaRecord } from '../domain/listening';

const pathFor = (id: string) => `listening-audio/${id}.wav`;
function base64(bytes: Uint8Array) {
  let raw = '';
  for (let i = 0; i < bytes.length; i += 32768)
    raw += String.fromCharCode(...bytes.subarray(i, i + 32768));
  return btoa(raw);
}
export async function storeAudio(meta: MediaMeta, bytes: ArrayBuffer): Promise<MediaRecord> {
  if (!Capacitor.isNativePlatform())
    return { ...meta, storage: 'indexeddb', blob: new Blob([bytes], { type: 'audio/wav' }) };
  const path = pathFor(meta.id);
  let existing = false;
  try {
    const stat = await Filesystem.stat({ path, directory: Directory.Data });
    if (stat.size !== meta.byteLength) throw new Error('已存音频体积异常，请保留原文件并检查');
    existing = true;
  } catch (e) {
    if (e instanceof Error && e.message.includes('体积异常')) throw e;
  }
  if (!existing) {
    const temp = `${path}.${crypto.randomUUID()}.part`;
    try {
      const data = new Uint8Array(bytes);
      for (let i = 0; i < data.length; i += 1024 * 1024) {
        const part = base64(data.subarray(i, i + 1024 * 1024));
        if (i === 0)
          await Filesystem.writeFile({
            path: temp,
            directory: Directory.Data,
            data: part,
            recursive: true,
          });
        else await Filesystem.appendFile({ path: temp, directory: Directory.Data, data: part });
      }
      const stat = await Filesystem.stat({ path: temp, directory: Directory.Data });
      if (stat.size !== meta.byteLength) throw new Error('音频写入不完整');
      await Filesystem.rename({ from: temp, to: path, directory: Directory.Data });
    } catch (e) {
      await Filesystem.deleteFile({ path: temp, directory: Directory.Data }).catch(() => undefined);
      throw e;
    }
  }
  return { ...meta, storage: 'native' };
}
export async function audioAvailable(media: MediaRecord) {
  if (media.storage === 'indexeddb') return !!media.blob;
  if (media.storage === 'missing') return false;
  try {
    return (
      (await Filesystem.stat({ path: pathFor(media.id), directory: Directory.Data })).size ===
      media.byteLength
    );
  } catch {
    return false;
  }
}
export async function audioURL(media: MediaRecord) {
  if (!(await audioAvailable(media)))
    throw new Error('音频尚未绑定或已丢失，请在听力材料中补选原 WAV');
  if (media.storage === 'indexeddb') {
    const url = URL.createObjectURL(media.blob!);
    return { url, release: () => URL.revokeObjectURL(url) };
  }
  const { uri } = await Filesystem.getUri({ path: pathFor(media.id), directory: Directory.Data });
  return { url: Capacitor.convertFileSrc(uri), release: () => {} };
}
export async function audioBytes(media: MediaRecord) {
  if (!(await audioAvailable(media)))
    throw new Error(`缺少音频 ${media.fileName}，无法生成完整备份`);
  if (media.storage === 'indexeddb') return new Uint8Array(await media.blob!.arrayBuffer());
  const result = await Filesystem.readFile({ path: pathFor(media.id), directory: Directory.Data });
  if (typeof result.data !== 'string') return new Uint8Array(await result.data.arrayBuffer());
  return Uint8Array.from(atob(result.data), (c) => c.charCodeAt(0));
}
export async function sha256(bytes: ArrayBuffer) {
  return [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))]
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}
