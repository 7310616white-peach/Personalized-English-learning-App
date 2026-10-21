import { lazy, Suspense, useEffect, useState } from 'react';
import { makeQueues } from '../domain/queue';
import type { Exercise } from '../domain/models';

import { ListeningSummary } from '../features/listening/ListeningSummary';
import { Practice } from '../features/practice/Practice';
import { Library } from '../features/library/Library';

import { Dashboard } from '../features/dashboard/Dashboard';
import { ReadingProvider } from '../features/reading/ReadingProvider';
import { StorageBoundary } from '../shared/components/StorageBoundary';
import { listenForSelectedText } from '../platform/lookup';
import { startBackNavigation } from '../platform/backNavigation';
import { useBackAction } from '../shared/useBackAction';
import { listenForIncomingFiles, type IncomingFile } from '../platform/incomingFiles';
import { vocabularyPackId } from '../data/vocabulary';
import { AppShell } from './AppShell';
import { useClock, useLearningData } from './useLearningData';
import type { Page } from './navigation';

const ListeningPage = lazy(() =>
  import('../features/listening/ListeningPage').then((m) => ({ default: m.ListeningPage })),
);
const Transfer = lazy(() =>
  import('../features/transfer/Transfer').then((m) => ({ default: m.Transfer })),
);
const IncomingImport = lazy(() =>
  import('../features/transfer/IncomingImport').then((m) => ({ default: m.IncomingImport })),
);

type Session = { title: string; queue: Exercise[] };
export function App() {
  return (
    <StorageBoundary>
      <LearningApp />
    </StorageBoundary>
  );
}

function LearningApp() {
  const [listeningActive, setListeningActive] = useState(false);
  const [page, setPage] = useState<Page>('home');
  const [packId, setPackId] = useState('');
  const [session, setSession] = useState<Session>();
  const [incoming, setIncoming] = useState('');
  const [pendingLookup, setPendingLookup] = useState(false);
  const [externalLookup, setExternalLookup] = useState<{ text: string; token: number }>();
  const [nativeError, setNativeError] = useState('');
  const [files, setFiles] = useState<IncomingFile[]>([]);
  const { now, refresh } = useClock();
  const data = useLearningData();
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
        if (!cancelled) setNativeError('文件打开入口暂不可用，可在“题包与数据”内选择 JSON。');
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
    if (pendingLookup && !session && !listeningActive) {
      setExternalLookup({ text: incoming, token: Date.now() });
      setPendingLookup(false);
    }
  }, [pendingLookup, incoming, session, listeningActive]);
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
  useBackAction(page !== 'home' && !session && !listeningActive, () => setPage('home'));
  if (!data)
    return (
      <div className="loading" role="status">
        正在打开本地学习库…
      </div>
    );
  const { packs, progress, attempts } = data;
  const currentPack =
    packs.find((p) => p.id === packId) ?? packs.find((p) => p.id !== vocabularyPackId) ?? packs[0];
  const queues = makeQueues(packs, progress, attempts, currentPack?.id ?? '', now);
  function start(title: string, queue: Exercise[]) {
    if (queue.length) setSession({ title, queue });
  }
  function exitPractice() {
    setSession(undefined);
    refresh();
  }
  return (
    <ReadingProvider packs={packs} external={externalLookup}>
      <AppShell page={page} practicing={!!session || listeningActive} onNavigate={setPage}>
        {nativeError && (
          <p className="notice" role="status">
            {nativeError}
          </p>
        )}
        {files.length > 0 && (session || listeningActive) && (
          <p className="notice">已收到题包文件，保存退出本组后再确认导入。</p>
        )}
        {files[0] && !session && !listeningActive && (
          <Suspense fallback={<p role="status">正在检查分享的文件…</p>}>
            <IncomingImport
              key={files[0].token}
              file={files[0]}
              onClose={() => setFiles((list) => list.slice(1))}
            />
          </Suspense>
        )}
        {session ? (
          <>
            {pendingLookup && (
              <p className="notice">已收到选中词「{incoming}」，保存退出练习后显示释义。</p>
            )}
            <Practice queue={session.queue} title={session.title} onExit={exitPractice} />
          </>
        ) : (
          <>
            {page === 'home' && (
              <>
                <Dashboard
                  packs={packs}
                  progress={progress}
                  attempts={attempts}
                  now={now}
                  currentPack={currentPack}
                  queues={queues}
                  onPackChange={setPackId}
                  onNavigate={setPage}
                  onStart={start}
                />
              </>
            )}
            {page === 'listening' && (
              <Suspense fallback={<p role="status">正在打开听力训练…</p>}>
                <ListeningPage onActiveChange={setListeningActive} />
              </Suspense>
            )}
            {page === 'words' && <Library packs={packs} progress={progress} />}
            {page === 'mistakes' && (
              <>
                <div className="mistake-action">
                  <p>保留每次错误，也记录你的进步。</p>
                  <button
                    className="secondary"
                    disabled={!queues.mistakes.length}
                    onClick={() => start('错题再练', queues.mistakes)}
                  >
                    再练一组错题 →
                  </button>
                </div>
                <ListeningSummary onOpen={() => setPage('listening')} mistakes />
                <Library packs={packs} progress={progress} mistakes />
              </>
            )}
            {page === 'transfer' && (
              <Suspense fallback={<p role="status">正在打开题包与数据…</p>}>
                <Transfer
                  onRestored={() => {
                    setPackId('');
                    refresh();
                  }}
                />
              </Suspense>
            )}
          </>
        )}
      </AppShell>
    </ReadingProvider>
  );
}
