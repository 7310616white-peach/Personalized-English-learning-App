import { db, type LearningDB } from '../db';
import {
  listeningLibrarySchema,
  type ListeningLibrary,
  type MediaRecord,
} from '../../domain/listening';
import { inspectWav } from '../../domain/wav';
import { audioAvailable, sha256, storeAudio } from '../../platform/audioStorage';

export const MAX_AUDIO_BYTES = 128 * 1024 * 1024;
export async function prepareAudio(file: File) {
  if (!file.size || file.size > MAX_AUDIO_BYTES)
    throw new Error('每段 WAV 需大于 0 且不超过 128 MB');
  const bytes = await file.arrayBuffer();
  const info = inspectWav(bytes);
  const id = await sha256(bytes);
  return { meta: { id, fileName: file.name, byteLength: file.size, ...info }, bytes };
}
export function matchAudio(library: ListeningLibrary, files: File[]) {
  const mapping: Record<string, File | undefined> = {};
  for (const track of library.tracks) {
    const matches = files.filter((f) => f.name === track.audioFile);
    mapping[track.id] = matches.length === 1 ? matches[0] : undefined;
  }
  return mapping;
}
/** Media is verified before publishing metadata. Existing bindings cannot change silently. */
export async function importListeningLibrary(
  input: unknown,
  mapping: Record<string, File | undefined>,
  store: LearningDB = db,
) {
  const library = listeningLibrarySchema.parse(input);
  const existing = await store.listeningLibraries.get(library.id);
  if (existing && JSON.stringify(existing.manifest) !== JSON.stringify(library))
    throw new Error('材料库 ID 已存在且内容不同，请使用新的材料库 ID，原记录不会被覆盖');
  const bindings = { ...existing?.bindings };
  const prepared: MediaRecord[] = [];
  const selected = library.tracks.filter((t) => mapping[t.id]);
  const estimate = await globalThis.navigator?.storage?.estimate?.();
  const required = selected.reduce((n, t) => n + mapping[t.id]!.size, 0);
  if (
    estimate?.quota &&
    estimate.usage !== undefined &&
    required * 1.2 > estimate.quota - estimate.usage
  )
    throw new Error('本机可用存储不足，请先释放空间');
  for (const track of selected) {
    const { meta, bytes } = await prepareAudio(mapping[track.id]!);
    if (track.segments.some((s) => s.endSec > meta.durationSec + 0.05))
      throw new Error(`${track.title} 的精听片段超出音频时长`);
    if (bindings[track.id] && bindings[track.id] !== meta.id)
      throw new Error(`${track.title} 与原音频指纹不一致，不能覆盖既有绑定`);
    const saved = await store.media.get(meta.id);
    prepared.push(saved && (await audioAvailable(saved)) ? saved : await storeAudio(meta, bytes));
    bindings[track.id] = meta.id;
  }
  await store.transaction('rw', store.media, store.listeningLibraries, async () => {
    const latest = await store.listeningLibraries.get(library.id);
    if (latest && JSON.stringify(latest.manifest) !== JSON.stringify(library))
      throw new Error('材料库已在另一窗口变更，请重新导入');
    const merged = { ...latest?.bindings };
    for (const [track, id] of Object.entries(bindings)) {
      if (merged[track] && merged[track] !== id) throw new Error('绑定冲突，请重新导入');
      merged[track] = id;
    }
    await store.media.bulkPut(prepared);
    await store.listeningLibraries.put({ id: library.id, manifest: library, bindings: merged });
  });
  return {
    library,
    bound: Object.keys(bindings).length,
    missing: library.tracks.length - Object.keys(bindings).length,
  };
}
