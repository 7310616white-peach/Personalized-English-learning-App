import { lazy, Suspense, useEffect, useState } from 'react';
import { makeQueues } from '../domain/queue';
import type { Exercise } from '../domain/models';

import { ListeningSummary } from '../features/listening/ListeningSummary';
import { Practice } from '../features/practice/Practice';
import { Library } from '../features/library/Library';

import { Dashboard } from '../features/dashboard/Dashboard';
import { Lookup } from '../features/lookup/Lookup';
import { StorageBoundary } from '../shared/components/StorageBoundary';
import { listenForSelectedText } from '../platform/lookup';
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
  const [nativeError, setNativeError] = useState('');
  const { now, refresh } = useClock();
  const data = useLearningData();
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
        if (!cancelled) setNativeError('外部选词入口暂不可用，仍可在“阅读查词”中粘贴查询。');
      });
    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, []);
  useEffect(() => {
    if (pendingLookup && !session && !listeningActive) {
      setPage('lookup');
      setPendingLookup(false);
    }
  }, [pendingLookup, session, listeningActive]);
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
    <AppShell page={page} practicing={!!session || listeningActive} onNavigate={setPage}>
      {nativeError && (
        <p className="notice" role="status">
          {nativeError}
        </p>
      )}
      {session ? (
        <>
          {pendingLookup && (
            <p className="notice">
              已收到选中词「{incoming}」，退出练习后打开查词；当前答案会先保存。
            </p>
          )}
          <Practice queue={session.queue} title={session.title} onExit={exitPractice} />
        </>
      ) : (
        <>
          {page === 'home' && (
            <>
              <ListeningSummary onOpen={() => setPage('listening')} />
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
          {page === 'lookup' && (
            <Lookup packs={packs} progress={progress} incoming={incoming} onPractice={start} />
          )}
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
  );
}
