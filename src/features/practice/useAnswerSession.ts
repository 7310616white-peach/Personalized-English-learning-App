import { useEffect, useRef, useState } from 'react';
import type { Attempt, Exercise } from '../../domain/models';
import { db } from '../../data/db';
import { submitAnswer } from '../../data/learning';

/** Coordinates serialized draft writes and idempotent answer submission. */
export function useAnswerSession(exercise: Exercise, onNext: () => void, onExit: () => void) {
  const [answer, setAnswer] = useState('');
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState('正在读取草稿…');
  const [result, setResult] = useState<Attempt>();
  const [error, setError] = useState('');
  const input = useRef<HTMLInputElement>(null);
  const lock = useRef(false);
  const writes = useRef<Promise<unknown>>(Promise.resolve());
  const attemptId = useRef(crypto.randomUUID());
  const revision = useRef(0);
  const alive = useRef(true);

  useEffect(() => {
    alive.current = true;
    let cancelled = false;
    db.drafts
      .get(exercise.key)
      .then((draft) => {
        if (cancelled) return;
        setAnswer(draft?.answer ?? '');
        setLoaded(true);
        setSaveStatus(draft ? '已恢复上次草稿' : '答案自动保存在本机');
      })
      .catch(() => {
        if (alive.current) setError('无法读取本地数据，请检查浏览器存储空间后重新进入。');
      });
    return () => {
      cancelled = true;
      alive.current = false;
    };
  }, [exercise.key]);
  useEffect(() => {
    if (loaded) input.current?.focus();
  }, [loaded]);

  function change(value: string) {
    if (!loaded || lock.current || result) return;
    setAnswer(value);
    setError('');
    setSaveStatus('正在保存草稿…');
    const currentRevision = ++revision.current;
    // Serialize writes: a slower older input must never overwrite a newer draft.
    writes.current = writes.current
      .catch(() => undefined)
      .then(() => db.drafts.put({ key: exercise.key, answer: value }));
    writes.current
      .then(() => {
        if (alive.current && currentRevision === revision.current) setSaveStatus('草稿已保存');
      })
      .catch(() => {
        if (alive.current) {
          setSaveStatus('草稿保存失败');
          setError('本地写入失败，请保留当前页面并重试。');
        }
      });
  }

  async function flushDraft() {
    try {
      await writes.current;
    } catch {
      writes.current = db.drafts.put({ key: exercise.key, answer });
      await writes.current;
    }
  }

  async function submit() {
    if (result) {
      if (!lock.current) {
        lock.current = true;
        onNext();
      }
      return;
    }
    if (lock.current || !loaded || !answer.trim()) return;
    lock.current = true;
    setSaving(true);
    setError('');
    try {
      await flushDraft();
      const saved = await submitAnswer(exercise, answer, attemptId.current);
      setResult(saved);
      setSaveStatus('答题记录与复习计划已保存');
    } catch {
      setError('保存失败，答案仍在此页。请检查存储空间后重试。');
    } finally {
      lock.current = false;
      setSaving(false);
    }
  }
  async function exit() {
    if (lock.current) return;
    if (!loaded) {
      onExit();
      return;
    }
    lock.current = true;
    setSaving(true);
    try {
      await flushDraft();
      onExit();
    } catch {
      setError('草稿尚未保存成功，请重试后再退出。');
    } finally {
      lock.current = false;
      setSaving(false);
    }
  }

  return { answer, loaded, saving, saveStatus, result, error, input, change, submit, exit };
}
