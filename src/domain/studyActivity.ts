import type { Exercise } from './models';
import type { WrittenTask } from './written';
import type { ListeningSet, MediaRecord } from './listening';
/** A single explicit exercise route, shared by daily tasks and existing entry points. */
export type StudyActivity =
  | { type: 'exercise'; title: string; queue: Exercise[] }
  | { type: 'written'; packId: string; task: WrittenTask }
  | { type: 'listening'; packId: string; title: string; set: ListeningSet; media: MediaRecord };
