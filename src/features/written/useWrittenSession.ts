import { useEffect, useRef, useState } from 'react';
import { db } from '../../data/db';
import { saveWrittenDraft, submitWritten } from '../../data/written';
import {
  writtenKey,
  type WrittenAnswers,
  type WrittenAttempt,
  type WrittenTask,
} from '../../domain/written';

/** Serializes immediate drafts; commit and exit wait for durable storage. */
export function useWrittenSession(packId: string, task: WrittenTask, onExit: () => void) {
  const [answers, setAnswers] = useState<WrittenAnswers>({});
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<WrittenAttempt>();
  const [error, setError] = useState('');
  const [status, setStatus] = useState('正在读取草稿…');
  const writes = useRef<Promise<unknown>>(Promise.resolve());
  const lock = useRef(false);
  const attemptId = useRef(crypto.randomUUID());
  const revision = useRef(0);
  useEffect(() => {
    let alive = true;
    db.writtenDrafts
      .get(writtenKey(packId, task.id))
      .then((draft) => {
        if (!alive) return;
        setAnswers(draft?.answers ?? {});
        setLoaded(true);
        setStatus(draft ? '已恢复上次草稿' : '答案自动保存在本机');
      })
      .catch(() => {
        if (alive) setError('草稿读取失败，请退出后重试。');
      });
    return () => {
      alive = false;
    };
  }, [packId, task.id]);
  function change(id: string, value: string) {
    if (!loaded || lock.current || result) return;
    const next = { ...answers, [id]: value };
    setAnswers(next);
    setStatus('正在保存草稿…');
    setError('');
    const current = ++revision.current;
    writes.current = writes.current
      .catch(() => undefined)
      .then(() => saveWrittenDraft(packId, task, next));
    writes.current
      .then(() => {
        if (current === revision.current) setStatus('草稿已保存');
      })
      .catch(() => {
        setStatus('草稿保存失败');
        setError('本地写入失败，请保留本页并重试。');
      });
  }
  async function flush() {
    try {
      await writes.current;
    } catch {
      writes.current = saveWrittenDraft(packId, task, answers);
      await writes.current;
    }
  }
  async function submit() {
    if (!loaded || lock.current || result) return;
    lock.current = true;
    setBusy(true);
    setError('');
    try {
      await flush();
      const saved = await submitWritten(packId, task, answers, attemptId.current);
      setResult(saved);
      setStatus('答题记录已保存');
    } catch (e) {
      setError(e instanceof Error ? e.message : '保存失败，请重试');
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  async function exit() {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    try {
      if (loaded && !result) await flush();
      onExit();
    } catch {
      setError('草稿尚未保存成功，请重试后再退出。');
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  return { answers, loaded, busy, result, error, status, change, submit, exit };
}
