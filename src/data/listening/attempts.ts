import { db, type LearningDB } from '../db';
import { gradeListening } from '../../domain/listeningGrading';
import { nextSchedule } from '../../domain/scheduler';
import {
  listeningKey,
  setDraftKey,
  listeningNoteSchema,
  type ListeningAnswers,
  type ListeningSet,
  type ListeningNote,
} from '../../domain/listening';

export async function submitListening(
  packId: string,
  set: ListeningSet,
  answers: ListeningAnswers,
  playback: { playCount: number; lastPlaybackRate: number },
  id: string,
  store: LearningDB = db,
  now = new Date(),
) {
  return store.transaction(
    'rw',
    store.packs,
    store.listeningLibraries,
    store.listeningAttempts,
    store.listeningProgress,
    store.listeningDrafts,
    async () => {
      const existing = await store.listeningAttempts.get(id);
      if (existing) {
        if (
          existing.packId !== packId ||
          existing.setId !== set.id ||
          JSON.stringify(existing.answers) !== JSON.stringify(answers)
        )
          throw new Error('提交 ID 冲突');
        return existing;
      }
      const pack = await store.packs.get(packId);
      const current =
        pack && pack.schemaVersion !== 1 ? pack.listening.find((s) => s.id === set.id) : undefined;
      if (!current || JSON.stringify(current) !== JSON.stringify(set))
        throw new Error('题包已变化，请重新进入听力');
      const library = await store.listeningLibraries.get(set.libraryId);
      const track = library?.manifest.tracks.find((t) => t.id === set.trackId);
      if (!track) throw new Error('听力材料已变化');
      if (Object.keys(answers).some((id) => !set.questions.some((q) => q.id === id)))
        throw new Error('作答包含未知题目');
      for (const q of set.questions) {
        const answer = answers[q.id];
        if (q.type === 'listening-choice') {
          if (
            answer !== undefined &&
            (typeof answer !== 'string' ||
              (answer !== '' && !q.options.some((o) => o.id === answer)))
          )
            throw new Error('选择题答案无效');
        } else if (
          answer !== undefined &&
          (typeof answer !== 'object' || Object.keys(answer).some((b) => !q.blankIds.includes(b)))
        )
          throw new Error('听写答案无效');
      }
      const grades = set.questions.map((q) => gradeListening(q, answers[q.id]));
      const attempt = {
        id,
        packId,
        setId: set.id,
        libraryId: set.libraryId,
        trackId: set.trackId,
        createdAt: now.toISOString(),
        questions: set.questions,
        answers,
        grades,
        playback,
        transcriptSnapshot: track.transcript,
      };
      await store.listeningAttempts.add(attempt);
      for (const g of grades) {
        if (g.correct === null) continue;
        const key = listeningKey(set.libraryId, g.questionId);
        const previous = await store.listeningProgress.get(key);
        await store.listeningProgress.put({
          key,
          libraryId: set.libraryId,
          trackId: set.trackId,
          questionId: g.questionId,
          gradeStatus: g.status === 'verified' ? 'verified' : 'provisional',
          ...nextSchedule(previous, g.correct, now),
        });
      }
      const key = setDraftKey(packId, set);
      const draft = await store.listeningDrafts.get(key);
      if (draft && JSON.stringify(draft.answers) === JSON.stringify(answers))
        await store.listeningDrafts.delete(key);
      return attempt;
    },
  );
}
export async function saveListeningNote(note: ListeningNote, store: LearningDB = db) {
  const clean = listeningNoteSchema.parse(note);
  await store.transaction('rw', store.listeningAttempts, store.listeningNotes, async () => {
    const attempt = await store.listeningAttempts.get(clean.attemptId);
    if (
      !attempt?.grades.some((g) => g.questionId === clean.questionId && g.correct === false) ||
      clean.key !== JSON.stringify([clean.attemptId, clean.questionId])
    )
      throw new Error('错因备注不对应这次错题');
    await store.listeningNotes.put(clean);
  });
}
