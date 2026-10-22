import { useEffect, useRef, useState } from 'react';
import type { Exercise } from '../../domain/models';
import { confirmWordStudy, readWordStudy } from '../../data/wordStudy';

export function useWordStudy(queue: Exercise[], onExit: () => void) {
  const [studied, setStudied] = useState<boolean[]>();
  const [index, setIndex] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [reload, setReload] = useState(0);
  const lock = useRef(false);

  useEffect(() => {
    let cancelled = false;
    setError('');
    setStudied(undefined);
    readWordStudy(queue)
      .then((saved) => {
        if (cancelled) return;
        setStudied(saved);
        const first = saved.findIndex((seen) => !seen);
        setIndex(first === -1 ? queue.length : first);
      })
      .catch(() => {
        if (!cancelled) setError('无法读取学习进度，请重试；已有记录不会被清空。');
      });
    return () => {
      cancelled = true;
    };
  }, [queue, reload]);

  async function next() {
    if (lock.current || !studied || index >= queue.length) return;
    lock.current = true;
    setSaving(true);
    setError('');
    try {
      await confirmWordStudy(queue[index]);
      setStudied((saved) => saved?.map((seen, i) => seen || i === index));
      setIndex(index + 1);
    } catch {
      setError('学习进度保存失败，仍停留在这个词。请检查存储空间后重试。');
    } finally {
      lock.current = false;
      setSaving(false);
    }
  }

  return {
    studied,
    index,
    saving,
    error,
    next,
    previous: () => {
      if (!lock.current) setIndex((n) => Math.max(0, n - 1));
    },
    revisit: () => setIndex(0),
    retry: () => setReload((n) => n + 1),
    exit: () => {
      if (!lock.current) onExit();
    },
  };
}
