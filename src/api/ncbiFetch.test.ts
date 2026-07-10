import { afterEach, describe, expect, it, vi } from 'vitest';
import type { NcbiRateLimiter } from '../utils/ncbiRateLimiter';
import { ncbiFetch } from './ncbiFetch';

const immediateLimiter = {
  schedule: <T>(task: () => Promise<T>) => task(),
} as NcbiRateLimiter;

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('ncbiFetch', () => {
  it('retries 429 and succeeds', async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response('', { status: 429 }))
      .mockResolvedValueOnce(new Response('{}', { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    const promise = ncbiFetch('https://example.test', immediateLimiter, { maxAttempts: 2 });
    await vi.runAllTimersAsync();
    await expect(promise).resolves.toBeInstanceOf(Response);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('does not expose an API key in errors', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(
      new Error('failed https://x.test?api_key=SECRET123&db=pubmed')
    ));
    await expect(ncbiFetch('https://x.test', immediateLimiter, { maxAttempts: 1 }))
      .rejects.not.toThrow(/SECRET123/);
  });

  it('supports AbortController', async () => {
    const controller = new AbortController();
    controller.abort();
    await expect(ncbiFetch('https://x.test', immediateLimiter, { signal: controller.signal }))
      .rejects.toMatchObject({ name: 'AbortError' });
  });
});
