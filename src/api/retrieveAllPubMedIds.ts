import type { AppSettings } from '../types';
import { buildNcbiUrl } from '../utils/buildNcbiUrl';
import type { NcbiRateLimiter } from '../utils/ncbiRateLimiter';
import { esearchPubMed } from './esearchPubMed';
import { ncbiFetch } from './ncbiFetch';

export interface RetrieveAllProgress {
  retrieved: number;
  total: number;
}

export async function retrieveAllPubMedIds(
  term: string,
  settings: AppSettings,
  limiter: NcbiRateLimiter,
  options: {
    signal?: AbortSignal;
    batchSize?: number;
    onProgress?: (progress: RetrieveAllProgress) => void;
  } = {}
): Promise<string[]> {
  const batchSize = Math.min(5_000, Math.max(100, options.batchSize ?? 1_000));
  const search = await esearchPubMed(term, settings, limiter, 0, 0, options.signal);
  if (search.count === 0) return [];
  if (!search.webEnv || !search.queryKey) {
    throw new Error('Entrez Historyを取得できないため、全件取得を開始できません');
  }

  const ids: string[] = [];
  for (let retstart = 0; retstart < search.count; retstart += batchSize) {
    const url = buildNcbiUrl('efetch.fcgi', {}, settings);
    const body = new URLSearchParams({
      db: 'pubmed', query_key: search.queryKey, WebEnv: search.webEnv,
      retstart: String(retstart), retmax: String(batchSize),
      rettype: 'uilist', retmode: 'text',
    });
    const response = await ncbiFetch(url, limiter, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body,
      signal: options.signal,
    });
    const text = await response.text();
    const batch = text.match(/\b\d{1,9}\b/g) ?? [];
    ids.push(...batch);
    options.onProgress?.({ retrieved: Math.min(ids.length, search.count), total: search.count });
  }

  const unique = [...new Set(ids)];
  if (unique.length !== search.count) {
    throw new Error(
      `全件取得が不完全です（PubMed総数 ${search.count} / 取得PMID ${unique.length}）。切り捨てず、再試行してください。`
    );
  }
  return unique;
}

