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
    const refresh = () => setNow(new Date());
    const visible = () => {
      if (document.visibilityState === 'visible') refresh();
    };
    const timer = setInterval(refresh, 30000);
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', visible);
    return () => {
      clearInterval(timer);
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', visible);
    };
  }, []);
  return { now, refresh: () => setNow(new Date()) };
}
