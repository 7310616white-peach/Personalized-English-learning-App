import { db, type LearningDB } from '../db';
import { importPack } from '../learning';
import { packSchema } from '../../domain/models';
import { listeningLibrarySchema } from '../../domain/listening';
import { importListeningLibrary, prepareAudio } from './materials';

/** Explicit opt-in sample import. Never restores or replaces the learning database. */
export async function loadListeningDemo(store: LearningDB = db, fetcher = fetch) {
  const base = '/examples/listening-demo/';
  const get = async (name: string) => {
    const response = await fetcher(base + name);
    if (!response.ok) throw new Error('体验素材读取失败，请联网打开一次后重试');
    return response;
  };
  const [libraryResponse, packResponse] = await Promise.all([
    get('library.json'),
    get('daily.json'),
  ]);
  const library = listeningLibrarySchema.parse(await libraryResponse.json());
  const pack = packSchema.parse(await packResponse.json());
  const previous = await store.packs.get(pack.id);
  if (previous && JSON.stringify(previous) !== JSON.stringify(pack))
    throw new Error('体验题包 ID 与已有内容冲突，原有记录未修改');
  const files = await Promise.all(
    library.tracks.map(async (track) => {
      const response = await get(track.audioFile);
      const file = new File([await response.arrayBuffer()], track.audioFile, { type: 'audio/wav' });
      await prepareAudio(file);
      return [track.id, file] as const;
    }),
  );
  await importListeningLibrary(library, Object.fromEntries(files), store);
  // Reusing the same sample must retain attempts, drafts and review progress.
  if (!previous) await importPack(pack, store);
  return pack;
}
