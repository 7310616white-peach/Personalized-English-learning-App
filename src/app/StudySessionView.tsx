import { lazy, Suspense } from 'react';
import type { StudyActivity } from '../domain/studyActivity';
import { Practice } from '../features/practice/Practice';
const WrittenSession = lazy(() =>
  import('../features/written/WrittenSession').then((m) => ({ default: m.WrittenSession })),
);
const ListeningSession = lazy(() =>
  import('../features/listening/ListeningSession').then((m) => ({ default: m.ListeningSession })),
);
export function StudySessionView({
  activity,
  onExit,
}: {
  activity: StudyActivity;
  onExit: () => void;
}) {
  if (activity.type === 'exercise')
    return <Practice queue={activity.queue} title={activity.title} onExit={onExit} />;
  return (
    <Suspense fallback={<p role="status">正在打开练习…</p>}>
      {activity.type === 'written' ? (
        <WrittenSession
          packId={activity.packId}
          task={activity.task}
          returnLabel="返回学习台"
          onExit={onExit}
        />
      ) : (
        <ListeningSession {...activity} onExit={onExit} />
      )}
    </Suspense>
  );
}
