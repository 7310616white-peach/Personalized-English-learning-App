import { zipBackup, unzipBackup } from '../../domain/backupZip';
import { backup, readJson, restore } from '../transfer';
import { validateBackup, type Backup } from '../../domain/backup';
import { audioBytes, sha256, storeAudio } from '../../platform/audioStorage';
import { db, type LearningDB } from '../db';
import type { MediaRecord } from '../../domain/listening';

const LIMIT = 256 * 1024 * 1024;
export async function completeBackup(store: LearningDB = db) {
  const snapshot = await backup(store);
  const entries: Record<string, Uint8Array> = {
    'data.json': new TextEncoder().encode(JSON.stringify(snapshot)),
  };
  if (snapshot.version === 2) {
    let total = entries['data.json'].length;
    for (const meta of snapshot.media) {
      total += meta.byteLength;
      if (total > LIMIT)
        throw new Error('完整备份超过初版 256 MB 上限，请先导出轻量进度并另外保留原 WAV');
      const record = await store.media.get(meta.id);
      if (!record) throw new Error('缺少音频');
      const bytes = await audioBytes(record);
      if ((await sha256(bytes.slice().buffer)) !== meta.id)
        throw new Error('音频校验失败，未生成完整备份');
      entries[`media/${meta.id}.wav`] = bytes;
    }
  }
  return zipBackup(entries);
}
export type PendingBackup = { snapshot: Backup; audio: Record<string, Uint8Array> };
export async function readBackupFile(file: File): Promise<PendingBackup> {
  if (!file.name.toLowerCase().endsWith('.zip'))
    return { snapshot: validateBackup(await readJson(file, 50)), audio: {} };
  if (file.size > LIMIT) throw new Error('ZIP 超过初版 256 MB 上限');
  const entries = unzipBackup(new Uint8Array(await file.arrayBuffer()));
  if (!entries['data.json'] || entries['data.json'].length > 50 * 1024 * 1024)
    throw new Error('ZIP 缺少有效数据清单');
  const snapshot = validateBackup(
    JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(entries['data.json'])),
  );
  const audio: Record<string, Uint8Array> = {};
  const media = snapshot.version === 2 ? snapshot.media : [];
  if (Object.keys(entries).length !== media.length + 1) throw new Error('ZIP 媒体数量与清单不一致');
  for (const meta of media) {
    const bytes = entries[`media/${meta.id}.wav`];
    if (
      !bytes ||
      bytes.length !== meta.byteLength ||
      (await sha256(bytes.slice().buffer)) !== meta.id
    )
      throw new Error('ZIP 音频缺失或指纹不符');
    audio[meta.id] = bytes;
  }
  return { snapshot, audio };
}
export async function restoreBackup(pending: PendingBackup, store: LearningDB = db) {
  const data = validateBackup(pending.snapshot);
  const media: MediaRecord[] = [];
  if (data.version === 2)
    for (const meta of data.media) {
      const bytes = pending.audio[meta.id];
      if (bytes) {
        if (bytes.length !== meta.byteLength || (await sha256(bytes.slice().buffer)) !== meta.id)
          throw new Error('恢复前音频校验失败');
        media.push(await storeAudio(meta, bytes.slice().buffer));
      }
    }
  await restore(data, store, media);
}
