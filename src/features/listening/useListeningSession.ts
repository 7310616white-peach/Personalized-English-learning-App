import { useEffect, useRef, useState } from 'react';
import { db } from '../../data/db';
import { submitListening } from '../../data/listening/attempts';
import {
  setDraftKey,
  type ListeningAnswers,
  type ListeningAttempt,
  type ListeningSet,
} from '../../domain/listening';

export function useListeningSession(packId: string, set: ListeningSet) {
  const key = setDraftKey(packId, set);
  const [answers, setAnswers] = useState<ListeningAnswers>({});
  const [playback, setPlayback] = useState({ playCount: 0, lastPlaybackRate: 1 });
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ListeningAttempt>();
  const [error, setError] = useState('');
  const [status, setStatus] = useState('正在读取听力草稿…');
  const writes = useRef<Promise<unknown>>(Promise.resolve());
  const lock = useRef(false);
  const id = useRef(crypto.randomUUID());
  const revision = useRef(0);
  const alive = useRef(true);
  useEffect(() => {
    let cancelled = false;
    alive.current = true;
    db.listeningDrafts
      .get(key)
      .then((d) => {
        if (cancelled) return;
        setAnswers(d?.answers ?? {});
        setPlayback(d?.playback ?? { playCount: 0, lastPlaybackRate: 1 });
        setLoaded(true);
        setStatus(d ? '已恢复听力草稿' : '整组答案自动保存在本机');
      })
      .catch(() => {
        if (!cancelled) setError('草稿读取失败，请保留当前数据后重试');
      });
    return () => {
      cancelled = true;
      alive.current = false;
    };
  }, [key]);
  function change(next: ListeningAnswers, stats = playback) {
    if (lock.current || !loaded) return;
    if (result) {
      setPlayback(stats);
      return;
    }
    setAnswers(next);
    setPlayback(stats);
    setStatus('正在保存听力草稿…');
    const rev = ++revision.current;
    writes.current = writes.current
      .catch(() => undefined)
      .then(() => db.listeningDrafts.put({ key, answers: next, playback: stats }));
    writes.current
      .then(() => {
        if (alive.current && revision.current === rev) setStatus('听力草稿已保存');
      })
      .catch(() => {
        if (alive.current) {
          setError('草稿保存失败，请保留此页并重试');
          setStatus('未保存');
        }
      });
  }
  async function flush() {
    try {
      await writes.current;
    } catch {
      writes.current = db.listeningDrafts.put({ key, answers, playback });
      await writes.current;
    }
  }
  async function submit() {
    if (lock.current || result || !loaded) return;
    lock.current = true;
    setBusy(true);
    setError('');
    try {
      await flush();
      const saved = await submitListening(packId, set, answers, playback, id.current);
      setResult(saved);
      setStatus('听力作答和复习计划已保存');
    } catch (e) {
      setError(e instanceof Error ? e.message : '保存失败，请重试');
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  async function exit(onExit: () => void) {
    if (lock.current) return;
    if (!loaded) {
      onExit();
      return;
    }
    lock.current = true;
    setBusy(true);
    try {
      await flush();
      onExit();
    } catch {
      setError('草稿尚未保存，请重试后退出');
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  return { answers, playback, loaded, busy, result, error, status, change, submit, exit };
}
