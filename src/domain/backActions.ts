/** Back closes the top layer once; asynchronous draft commits cannot be interrupted. */
export class BackActions {
  private entries = new Map<symbol, { priority: number; action: () => void | Promise<void> }>();
  private observers = new Set<(enabled: boolean) => void>();
  private busy = false;
  get enabled() {
    return this.entries.size > 0;
  }
  register(action: () => void | Promise<void>, priority = 0) {
    const key = Symbol();
    this.entries.set(key, { action, priority });
    this.changed();
    return () => {
      this.entries.delete(key);
      this.changed();
    };
  }
  observe(fn: (enabled: boolean) => void) {
    this.observers.add(fn);
    fn(this.enabled);
    return () => {
      this.observers.delete(fn);
    };
  }
  private changed() {
    this.observers.forEach((fn) => fn(this.enabled));
  }
  async run() {
    if (this.busy) return;
    const entry = [...this.entries.values()].sort((a, b) => a.priority - b.priority).at(-1);
    if (!entry) return;
    this.busy = true;
    try {
      await entry.action();
    } finally {
      this.busy = false;
    }
  }
}
export function isExitSwipe(dx: number, dy: number, milliseconds: number) {
  return Math.abs(dx) >= 90 && Math.abs(dx) > Math.abs(dy) * 1.8 && milliseconds < 1200;
}
