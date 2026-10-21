import Dexie, { type EntityTable } from 'dexie';
import type {
  LibraryRecord,
  MediaRecord,
  QuestionRecord,
  ListeningAttempt,
  ListeningProgress,
  ListeningDraft,
  ListeningNote,
} from '../domain/listening';
import type { Pack, Progress, Attempt, Draft } from '../domain/models';
export class LearningDB extends Dexie {
  packs!: EntityTable<Pack, 'id'>;
  progress!: EntityTable<Progress, 'key'>;
  attempts!: EntityTable<Attempt, 'id'>;
  drafts!: EntityTable<Draft, 'key'>;
  listeningLibraries!: EntityTable<LibraryRecord, 'id'>;
  media!: EntityTable<MediaRecord, 'id'>;
  listeningQuestions!: EntityTable<QuestionRecord, 'key'>;
  listeningAttempts!: EntityTable<ListeningAttempt, 'id'>;
  listeningProgress!: EntityTable<ListeningProgress, 'key'>;
  listeningDrafts!: EntityTable<ListeningDraft, 'key'>;
  listeningNotes!: EntityTable<ListeningNote, 'key'>;
  constructor(name = 'english-pocket-v1') {
    super(name);
    this.version(1).stores({
      packs: 'id,date',
      progress: 'key,packId,due',
      attempts: 'id,key,createdAt',
      drafts: 'key',
    });
    this.version(2).stores({
      listeningLibraries: 'id',
      media: 'id',
      listeningQuestions: 'key,libraryId,trackId',
      listeningAttempts: 'id,libraryId,trackId,createdAt',
      listeningProgress: 'key,libraryId,due',
      listeningDrafts: 'key',
      listeningNotes: 'key,attemptId',
    });
  }
}
export const db = new LearningDB();
