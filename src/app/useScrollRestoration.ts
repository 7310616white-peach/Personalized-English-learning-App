import { useLayoutEffect, useRef, type RefObject } from 'react';

/** Remember each screen in memory, including parents replaced by a lazy-loaded child. */
export function useScrollRestoration(
  key: string,
  content: RefObject<HTMLElement | null>,
  restorePosition = true,
) {
  const positions = useRef(new Map<string, number>());
  const active = useRef(key);
  const restoring = useRef(false);

  useLayoutEffect(() => {
    const save = () => {
      if (!restoring.current) positions.current.set(active.current, window.scrollY);
    };
    window.addEventListener('scroll', save, { passive: true });
    return () => window.removeEventListener('scroll', save);
  }, []);

  useLayoutEffect(() => {
    active.current = key;
    restoring.current = true;
    const target = restorePosition ? (positions.current.get(key) ?? 0) : 0;
    let frame = 0;
    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      restoring.current = false;
      observer.disconnect();
      clearTimeout(timeout);
      cancelAnimationFrame(frame);
      positions.current.set(key, window.scrollY);
    };
    const restore = () => {
      if (finished) return;
      window.scrollTo({ top: target, behavior: 'instant' });
      if (Math.abs(window.scrollY - target) < 1) finish();
    };
    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(restore);
    };
    const observer = new ResizeObserver(schedule);
    const timeout = window.setTimeout(finish, 2000);
    if (content.current) observer.observe(content.current);
    window.addEventListener('touchstart', finish, { passive: true });
    window.addEventListener('wheel', finish, { passive: true });
    schedule();
    return () => {
      observer.disconnect();
      clearTimeout(timeout);
      cancelAnimationFrame(frame);
      window.removeEventListener('touchstart', finish);
      window.removeEventListener('wheel', finish);
    };
  }, [key, content, restorePosition]);
}
