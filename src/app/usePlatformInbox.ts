import { useEffect, useState } from 'react';
import { listenForSelectedText } from '../platform/lookup';
import { startBackNavigation } from '../platform/backNavigation';
import { listenForIncomingFiles, type IncomingFile } from '../platform/incomingFiles';

/** Queues platform messages while any exercise is active; never interrupts draft persistence. */
export function usePlatformInbox(practicing: boolean) {
  const [incoming, setIncoming] = useState('');
  const [pendingLookup, setPendingLookup] = useState(false);
  const [externalLookup, setExternalLookup] = useState<{ text: string; token: number }>();
  const [nativeError, setNativeError] = useState('');
  const [files, setFiles] = useState<IncomingFile[]>([]);
  useEffect(() => {
    let cancelled = false;
    let remove: (() => void) | undefined;
    listenForIncomingFiles((file) => {
      if (!cancelled) setFiles((list) => [...list, file]);
    })
      .then((cleanup) => {
        if (cancelled) cleanup();
        else remove = cleanup;
      })
      .catch(() => {
        if (!cancelled) setNativeError('文件打开入口暂不可用，可在“我的”内选择 JSON。');
      });
    return () => {
      cancelled = true;
      remove?.();
    };
  }, []);
  useEffect(() => {
    let cancelled = false;
    let cleanup: (() => void) | undefined;
    listenForSelectedText((text) => {
      if (!cancelled) {
        setIncoming(text);
        setPendingLookup(true);
      }
    })
      .then((remove) => {
        if (cancelled) remove();
        else cleanup = remove;
      })
      .catch(() => {
        if (!cancelled) setNativeError('外部选词入口暂不可用；仍可在提交后的原文中点词查询。');
      });
    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, []);
  useEffect(() => {
    if (pendingLookup && !practicing) {
      setExternalLookup({ text: incoming, token: Date.now() });
      setPendingLookup(false);
    }
  }, [pendingLookup, incoming, practicing]);
  useEffect(() => {
    let cancelled = false;
    let remove: (() => void) | undefined;
    startBackNavigation(() => setNativeError('系统返回入口暂不可用，请使用页面内的退出按钮。'))
      .then((cleanup) => {
        if (cancelled) cleanup();
        else remove = cleanup;
      })
      .catch(() => setNativeError('系统返回入口暂不可用，请使用页面内的退出按钮。'));
    return () => {
      cancelled = true;
      remove?.();
    };
  }, []);
  return {
    incoming,
    pendingLookup,
    externalLookup,
    nativeError,
    files,
    dismissFile: () => setFiles((list) => list.slice(1)),
  };
}
