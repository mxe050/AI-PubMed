export class NcbiRateLimiter {
  private lastRequestTime = 0;
  private queue: Promise<unknown> = Promise.resolve();
  private minIntervalMs: number;

  constructor(minIntervalMs: number) {
    this.minIntervalMs = minIntervalMs;
  }

  schedule<T>(task: () => Promise<T>): Promise<T> {
    const run = async () => {
      const now = Date.now();
      const elapsed = now - this.lastRequestTime;
      const waitMs = Math.max(0, this.minIntervalMs - elapsed);

      if (waitMs > 0) {
        await new Promise((resolve) => setTimeout(resolve, waitMs));
      }

      this.lastRequestTime = Date.now();
      return task();
    };

    const result = this.queue.then(run, run);
    this.queue = result.catch(() => undefined);

    return result;
  }
}
