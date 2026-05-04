import type { AppSettings, PubMedArticle } from "../types";
import type { CitationCandidate } from "../utils/extractCitationCandidates";
import { esearchPubMed } from "./esearchPubMed";
import { esummaryPubMed } from "./esummaryPubMed";
import type { NcbiRateLimiter } from "../utils/ncbiRateLimiter";

export interface CitationVerifyResult {
  candidate: CitationCandidate;
  /** Top hits from PubMed (max 3 ESummary records). */
  hits: PubMedArticle[];
  /** Total ESearch count. */
  totalCount: number;
  error?: string;
}

export async function verifyCitationCandidates(
  candidates: CitationCandidate[],
  settings: AppSettings,
  limiter: NcbiRateLimiter
): Promise<CitationVerifyResult[]> {
  const results: CitationVerifyResult[] = [];

  for (const c of candidates) {
    try {
      const search = await esearchPubMed(c.query, settings, limiter, 3);
      if (search.idList.length > 0) {
        const summaries = await esummaryPubMed(
          search.idList,
          settings,
          limiter
        );
        results.push({
          candidate: c,
          hits: summaries,
          totalCount: search.count,
        });
      } else {
        results.push({
          candidate: c,
          hits: [],
          totalCount: 0,
        });
      }
    } catch (e) {
      results.push({
        candidate: c,
        hits: [],
        totalCount: 0,
        error: e instanceof Error ? e.message : String(e),
      });
    }
  }

  return results;
}
