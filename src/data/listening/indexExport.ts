import { db, type LearningDB } from '../db';
export async function listeningIndex(store: LearningDB = db) {
  return store.transaction(
    'r',
    [store.listeningLibraries, store.listeningQuestions, store.media],
    async () => {
      const media = new Map((await store.media.toArray()).map((m) => [m.id, m]));
      return {
        format: 'english-pocket-listening-index',
        schemaVersion: 1,
        libraries: (await store.listeningLibraries.toArray()).map((library) => ({
          libraryId: library.id,
          title: library.manifest.title,
          target: library.manifest.target,
          tracks: library.manifest.tracks.map((track) => {
            const record = media.get(library.bindings[track.id]);
            return {
              trackId: track.id,
              unit: track.unit,
              section: track.section,
              title: track.title,
              audioFile: track.audioFile,
              bound:
                !!record &&
                record.storage !== 'missing' &&
                (record.storage === 'native' || !!record.blob),
              transcriptStatus: track.transcript.status,
            };
          }),
        })),
        questions: await store.listeningQuestions.toArray(),
      };
    },
  );
}
