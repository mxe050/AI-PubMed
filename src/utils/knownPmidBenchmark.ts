import type { KnownPmidBenchmarkResult } from "../types";

export interface ParsedKnownPmids {
  pmids: string[];
  invalidTokens: string[];
}

/**
 * Parse comma/newline separated PMIDs, `PMID: 123` forms, and PubMed URLs.
 * Invalid fragments are retained so the UI can warn instead of silently
 * pretending that every input was checked.
 */
export function parseKnownPmids(raw: string): ParsedKnownPmids {
  const normalized = raw
    .replace(
      /https?:\/\/pubmed\.ncbi\.nlm\.nih\.gov\/(\d{1,9})\/?/gi,
      "$1"
    )
    .replace(/\bPMID\s*[:：]?\s*(\d{1,9})\b/gi, "$1");

  const tokens = normalized
    .split(/[\s,;、，]+/)
    .map((token) => token.trim())
    .filter(Boolean);
  const pmids: string[] = [];
  const invalidTokens: string[] = [];

  for (const token of tokens) {
    if (/^\d{1,9}$/.test(token)) {
      if (!pmids.includes(token)) pmids.push(token);
    } else if (!invalidTokens.includes(token)) {
      invalidTokens.push(token);
    }
  }

  return { pmids, invalidTokens };
}

export function buildKnownPmidBenchmarkQuery(
  baseQuery: string,
  pmids: string[]
): string {
  const uniquePmids = [
    ...new Set(pmids.filter((pmid) => /^\d{1,9}$/.test(pmid))),
  ];
  const query = baseQuery.trim();
  if (!query || uniquePmids.length === 0) return "";
  const pmidBlock = uniquePmids.map((pmid) => `${pmid}[pmid]`).join(" OR ");
  return `(${query}) AND (${pmidBlock})`;
}

export function summarizeKnownPmidMatches(
  requestedPmids: string[],
  returnedPmids: string[],
  benchmarkQuery: string,
  warnings: string[] = []
): KnownPmidBenchmarkResult {
  const returned = new Set(returnedPmids);
  const matchedPmids = requestedPmids.filter((pmid) => returned.has(pmid));
  const missedPmids = requestedPmids.filter((pmid) => !returned.has(pmid));
  return {
    requestedPmids,
    matchedPmids,
    missedPmids,
    benchmarkQuery,
    warnings,
  };
}
