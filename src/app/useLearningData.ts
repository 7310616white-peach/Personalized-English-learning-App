import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../data/db';

export function useLearningData() {
  return useLiveQuery(
    () =>
      db.transaction(
        'r',
        [
          db.packs,
          db.progress,
          db.attempts,
          db.writtenAttempts,
          db.writtenProgress,
          db.listeningLibraries,
          db.listeningAttempts,
          db.listeningProgress,
          db.media,
        ],
        async () => ({
          packs: await db.packs.orderBy('date').reverse().toArray(),
          progress: await db.progress.toArray(),
          attempts: await db.attempts.toArray(),
          writtenAttempts: await db.writtenAttempts.toArray(),
          writtenProgress: await db.writtenProgress.toArray(),
          libraries: await db.listeningLibraries.toArray(),
          listeningAttempts: await db.listeningAttempts.toArray(),
          listeningProgress: await db.listeningProgress.toArray(),
          media: await db.media.toArray(),
        }),
      ),
    [],
  );
}
export function useClock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(timer);
  }, []);
  return { now, refresh: () => setNow(new Date()) };
}
