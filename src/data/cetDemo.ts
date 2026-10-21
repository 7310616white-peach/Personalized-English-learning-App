import fixture from '../../public/examples/cet4-formats.json';
import { packSchema } from '../domain/models';
import { db, type LearningDB } from './db';
import { importPack } from './learning';

export async function loadCetDemo(store: LearningDB = db) {
  const pack = packSchema.parse(fixture);
  const existing = await store.packs.get(pack.id);
  if (existing) {
    if (JSON.stringify(existing) !== JSON.stringify(pack))
      throw new Error('体验题包 ID 与已有内容冲突，原记录未修改');
    return existing;
  }
  return importPack(pack, store);
}
