import { lazy, Suspense, useState } from 'react';
import { demoFeaturesEnabled } from './buildOptions';
import { makeDailyPlan, type DailyTask } from '../domain/dailyPlan';
import { localDate } from '../domain/queue';
import type { StudyActivity } from '../domain/studyActivity';
import { StudySessionView } from './StudySessionView';
import type { Exercise } from '../domain/models';

import { WrittenSummary } from '../features/written/WrittenSummary';
import { ListeningSummary } from '../features/listening/ListeningSummary';
import { Library } from '../features/library/Library';

import { Dashboard } from '../features/dashboard/Dashboard';
import { ReadingProvider } from '../features/reading/ReadingProvider';
import { AppBoundary } from '../shared/components/AppBoundary';
import { useBackAction } from '../shared/useBackAction';
import { vocabularyPackId } from '../data/vocabulary';
import { usePlatformInbox } from './usePlatformInbox';
import { AppShell } from './AppShell';
import { useClock, useLearningData } from './useLearningData';
import type { Page } from './navigation';

const ListeningPage = lazy(() =>
  import('../features/listening/ListeningPage').then((m) => ({ default: m.ListeningPage })),
);
const Transfer = lazy(() =>
  import('../features/transfer/Transfer').then((m) => ({ default: m.Transfer })),
);
const WrittenLibrary = lazy(() =>
  import('../features/written/WrittenLibrary').then((m) => ({ default: m.WrittenLibrary })),
);
const ModelEssays = lazy(() =>
  import('../features/essays/ModelEssays').then((m) => ({ default: m.ModelEssays })),
);
const EssayReader = lazy(() =>
  import('../features/essays/EssayReader').then((m) => ({ default: m.EssayReader })),
);
const MyProgress = lazy(() =>
  import('../features/profile/MyProgress').then((m) => ({ default: m.MyProgress })),
);
const IncomingImport = lazy(() =>
  import('../features/transfer/IncomingImport').then((m) => ({ default: m.IncomingImport })),
);

const CetExperience = lazy(() =>
  import('../features/written/CetExperience').then((m) => ({ default: m.CetExperience })),
);

export function App() {
  return (
    <AppBoundary>
      <LearningApp />
    </AppBoundary>
  );
}

function LearningApp() {
  const [experience, setExperience] = useState(false);
  const [listeningActive, setListeningActive] = useState(false);
  const [page, setPage] = useState<Page>('home');
  const [packId, setPackId] = useState('');
  const [essayKey, setEssayKey] = useState('');
  const [session, setSession] = useState<StudyActivity>();
  const { now, refresh } = useClock();
  const data = useLearningData();
  const { incoming, pendingLookup, externalLookup, nativeError, files, dismissFile } =
    usePlatformInbox(!!session || listeningActive || experience);
  useBackAction(page !== 'home' && !session && !listeningActive && !experience, () =>
    setPage(page === 'essay' ? 'essays' : page === 'written' ? 'mistakes' : 'home'),
  );
  if (!data)
    return (
      <div className="loading" role="status">
        正在打开本地学习库…
      </div>
    );
  const { packs, progress } = data;
  const currentPack =
    packs.find((p) => p.id === packId) ??
    packs.find((p) => p.date === localDate(now) && p.schemaVersion === 3 && p.daily) ??
    packs.find((p) => p.id !== vocabularyPackId && p.date <= localDate(now)) ??
    packs[0];
  const plan = makeDailyPlan(data, currentPack, now);
  const queues = plan.queues;
  function startTask(task: DailyTask) {
    if (task.activity) setSession(task.activity);
    else setPage(task.destination ?? 'transfer');
  }
  function start(title: string, queue: Exercise[]) {
    if (queue.length) setSession({ type: 'exercise', title, queue });
  }
  function exitPractice() {
    setSession(undefined);
    refresh();
  }
  function openPack(id: string) {
    setPackId(id);
    setPage('home');
    refresh();
  }
  return (
    <ReadingProvider packs={packs} external={externalLookup}>
      <AppShell
        page={page}
        viewKey={page === 'essay' ? 'essay:' + essayKey : page}
        practicing={!!session || listeningActive || experience}
        onNavigate={setPage}
      >
        {nativeError && (
          <p className="notice" role="status">
            {nativeError}
          </p>
        )}
        {files.length > 0 && (session || listeningActive || experience) && (
          <p className="notice">已收到题包文件，保存退出本组后再确认导入。</p>
        )}
        {files[0] && !session && !listeningActive && !experience && (
          <Suspense fallback={<p role="status">正在检查分享的文件…</p>}>
            <IncomingImport
              key={files[0].token}
              file={files[0]}
              onClose={dismissFile}
              onOpenPack={(id) => {
                openPack(id);
                dismissFile();
              }}
            />
          </Suspense>
        )}
        {session ? (
          <>
            {pendingLookup && (
              <p className="notice">已收到选中词「{incoming}」，保存退出练习后显示释义。</p>
            )}
            <StudySessionView
              activity={session}
              onExit={exitPractice}
              returnLabel={page === 'written' ? '返回题目列表' : '返回学习台'}
            />
          </>
        ) : demoFeaturesEnabled && experience ? (
          <Suspense fallback={<p role="status">正在打开题型体验…</p>}>
            <CetExperience onExit={() => setExperience(false)} onChoice={start} />
          </Suspense>
        ) : (
          <>
            {page === 'home' && (
              <>
                <Dashboard
                  packs={packs}
                  now={now}
                  currentPack={currentPack}
                  plan={plan}
                  onPackChange={setPackId}
                  onNavigate={setPage}
                  onTask={startTask}
                  onExperience={() => setExperience(true)}
                />
              </>
            )}
            {page === 'listening' && (
              <Suspense fallback={<p role="status">正在打开听力训练…</p>}>
                <ListeningPage onActiveChange={setListeningActive} />
              </Suspense>
            )}
            {page === 'words' && (
              <Library packs={packs} progress={progress} attempts={data.attempts} />
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
                <WrittenSummary onOpen={() => setPage('written')} />
                <Library packs={packs} progress={progress} mistakes />
              </>
            )}
            {page === 'written' && (
              <Suspense fallback={<p role="status">正在打开拓展练习…</p>}>
                <WrittenLibrary
                  packs={packs}
                  selectedPackId={packId}
                  onPackChange={setPackId}
                  onStart={(packId, task) => setSession({ type: 'written', packId, task })}
                  onBack={() => setPage('mistakes')}
                />
              </Suspense>
            )}
            {page === 'essays' && (
              <Suspense fallback={<p role="status">正在打开范文栏…</p>}>
                <ModelEssays
                  packs={packs}
                  attempts={data.writtenAttempts}
                  onOpen={(key) => {
                    setEssayKey(key);
                    setPage('essay');
                  }}
                  onBack={() => setPage('home')}
                />
              </Suspense>
            )}
            {page === 'essay' && (
              <Suspense fallback={<p role="status">正在打开范文…</p>}>
                <EssayReader
                  packs={packs}
                  attempts={data.writtenAttempts}
                  essayKey={essayKey}
                  onBack={() => setPage('essays')}
                />
              </Suspense>
            )}
            {page === 'transfer' && (
              <Suspense fallback={<p role="status">正在打开我的…</p>}>
                <MyProgress data={data} onMistakes={() => setPage('mistakes')} />
                <Transfer
                  onOpenPack={openPack}
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
