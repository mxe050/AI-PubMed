import type { NcbiRateLimiter } from '../utils/ncbiRateLimiter';

export interface NcbiFetchOptions extends RequestInit {
  signal?: AbortSignal;
  maxAttempts?: number;
}

function abortError(): DOMException {
  return new DOMException('The operation was aborted', 'AbortError');
}

function redactSecrets(message: string): string {
  return message
    .replace(/([?&]api_key=)[^&\s]+/gi, '$1[REDACTED]')
    .replace(/("?api_key"?\s*[:=]\s*)["']?[^&\s"']+/gi, '$1[REDACTED]');
}

function retryDelay(attempt: number): number {
  const exponential = Math.min(8_000, 350 * 2 ** attempt);
  return exponential + Math.floor(Math.random() * 250);
}

async function wait(ms: number, signal?: AbortSignal): Promise<void> {
  if (signal?.aborted) throw abortError();
  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener(
      'abort',
      () => {
        clearTimeout(timer);
        reject(abortError());
      },
      { once: true }
    );
  });
}

/** Rate-limited NCBI request with bounded retry and secret-safe errors. */
export async function ncbiFetch(
  url: string,
  limiter: NcbiRateLimiter,
  options: NcbiFetchOptions = {}
): Promise<Response> {
  const { maxAttempts = 4, ...requestInit } = options;
  let lastError: unknown;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    if (options.signal?.aborted) throw abortError();
    try {
      const response = await limiter.schedule(() => fetch(url, requestInit));
      if (response.ok) return response;
      if (response.status !== 429 && response.status < 500) {
        throw new Error(`NCBI request failed: ${response.status}`);
      }
      lastError = new Error(`NCBI request failed: ${response.status}`);
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') throw error;
      lastError = error;
    }
    if (attempt < maxAttempts - 1) await wait(retryDelay(attempt), options.signal);
  }

  const message = lastError instanceof Error ? lastError.message : 'NCBI request failed';
  throw new Error(redactSecrets(message));
}

