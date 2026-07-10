import { afterEach, describe, expect, it, vi } from 'vitest';
import { defaultSettings } from '../types';
import type { NcbiRateLimiter } from '../utils/ncbiRateLimiter';
import { retrieveAllPubMedIds } from './retrieveAllPubMedIds';

const immediateLimiter = {
  schedule: <T>(task: () => Promise<T>) => task(),
} as NcbiRateLimiter;

afterEach(() => vi.unstubAllGlobals());

describe('retrieveAllPubMedIds', () => {
  it('uses Entrez History and verifies that no PMID was truncated', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({
        esearchresult: {
          count: '3', idlist: [], querykey: '1', webenv: 'history-token',
        },
      }), { status: 200 }))
      .mockResolvedValueOnce(new Response('1\n2\n3\n', { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    await expect(
      retrieveAllPubMedIds('asthma[tiab]', defaultSettings, immediateLimiter)
    ).resolves.toEqual(['1', '2', '3']);
    const [, historyInit] = fetchMock.mock.calls[1] as unknown as [string, RequestInit];
    const historyBody = new URLSearchParams(historyInit.body as string);
    expect(historyBody.get('query_key')).toBe('1');
    expect(historyBody.get('WebEnv')).toBe('history-token');
  });

  it('fails rather than silently exporting a partial set', async () => {
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({
        esearchresult: { count: '3', idlist: [], querykey: '1', webenv: 'w' },
      }), { status: 200 }))
      .mockResolvedValueOnce(new Response('1\n2\n', { status: 200 })));
    await expect(
      retrieveAllPubMedIds('asthma[tiab]', defaultSettings, immediateLimiter)
    ).rejects.toThrow(/不完全/);
  });
});

