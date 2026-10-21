import Dexie, { type EntityTable } from 'dexie';
import type { Pack, Progress, Attempt, Draft } from '../domain/models';
export class LearningDB extends Dexie {
  packs!: EntityTable<Pack, 'id'>;
  progress!: EntityTable<Progress, 'key'>;
  attempts!: EntityTable<Attempt, 'id'>;
  drafts!: EntityTable<Draft, 'key'>;
  constructor(name = 'english-pocket-v1') {
    super(name);
    this.version(1).stores({
      packs: 'id,date',
      progress: 'key,packId,due',
      attempts: 'id,key,createdAt',
      drafts: 'key',
    });
  }
}
export const db = new LearningDB();
