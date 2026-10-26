import { useEffect, useRef } from 'react';
import { backActions } from '../platform/backNavigation';
import { isExitSwipe } from '../domain/backActions';

export function useBackAction(enabled: boolean, action: () => void | Promise<void>, priority = 0) {
  const latest = useRef(action);
  latest.current = action;
  useEffect(() => {
    if (enabled) return backActions.register(() => latest.current(), priority);
  }, [enabled, priority]);
}

export function useExitGestures(
  enabled: boolean,
  exit: () => void | Promise<void>,
  swipeTargets = '',
) {
  useBackAction(enabled, exit, 10);
  useEffect(() => {
    if (!enabled) return;
    let start: { x: number; y: number; time: number } | undefined;
    const cancel = () => {
      start = undefined;
    };
    const begin = (event: TouchEvent) => {
      start = undefined;
      if (event.touches.length !== 1 || !(event.target instanceof Element)) return;
      if (event.target.closest('dialog,[contenteditable],[data-no-swipe]')) return;
      const control = event.target.closest(
        'input,textarea,select,button,a,audio,summary,dialog,[contenteditable],[data-no-swipe]',
      );
      if (control && !(swipeTargets && control.matches(swipeTargets))) return;
      const touch = event.touches[0];
      start = { x: touch.clientX, y: touch.clientY, time: Date.now() };
    };
    const end = (event: TouchEvent) => {
      const first = start;
      start = undefined;
      const last = event.changedTouches[0];
      if (
        first &&
        last &&
        isExitSwipe(last.clientX - first.x, last.clientY - first.y, Date.now() - first.time)
      )
        void backActions.run();
    };
    document.addEventListener('touchstart', begin, { passive: true });
    document.addEventListener('touchend', end, { passive: true });
    document.addEventListener('touchcancel', cancel, { passive: true });
    return () => {
      document.removeEventListener('touchstart', begin);
      document.removeEventListener('touchend', end);
      document.removeEventListener('touchcancel', cancel);
    };
  }, [enabled, swipeTargets]);
}
