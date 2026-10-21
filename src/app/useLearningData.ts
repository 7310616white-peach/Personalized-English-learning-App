import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../data/db';

export function useLearningData() {
  return useLiveQuery(
    () =>
      db.transaction('r', db.packs, db.progress, db.attempts, async () => ({
        packs: await db.packs.orderBy('date').reverse().toArray(),
        progress: await db.progress.toArray(),
        attempts: await db.attempts.toArray(),
      })),
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
