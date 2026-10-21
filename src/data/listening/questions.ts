import type { Pack } from '../../domain/models';
import { listeningKey } from '../../domain/listening';
import type { LearningDB } from '../db';

/** Must run inside the importing pack's database transaction. */
export async function registerListeningQuestions(pack: Pack, store: LearningDB) {
  if (pack.schemaVersion === 1) return;
  for (const set of pack.listening) {
    const library = await store.listeningLibraries.get(set.libraryId);
    if (!library?.manifest.tracks.some((t) => t.id === set.trackId))
      throw new Error('请先导入对应听力材料清单：' + set.libraryId + ' / ' + set.trackId);
    for (const question of set.questions) {
      const key = listeningKey(set.libraryId, question.id);
      const existing = await store.listeningQuestions.get(key);
      if (
        existing &&
        (existing.trackId !== set.trackId ||
          JSON.stringify(existing.question) !== JSON.stringify(question))
      )
        throw new Error('听力题 ID 已存在且内容不同：' + question.id);
      await store.listeningQuestions.put({
        key,
        libraryId: set.libraryId,
        trackId: set.trackId,
        question,
      });
    }
  }
}
