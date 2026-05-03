import type { PubMedArticle, AppSettings } from "../types";
import { esummaryPubMed } from "./esummaryPubMed";
import type { NcbiRateLimiter } from "../utils/ncbiRateLimiter";

export async function verifyPmids(
  pmids: string[],
  settings: AppSettings,
  limiter: NcbiRateLimiter
): Promise<PubMedArticle[]> {
  const uniquePmids = Array.from(new Set(pmids));

  if (uniquePmids.length === 0) return [];

  const verifiedArticles = await esummaryPubMed(
    uniquePmids,
    settings,
    limiter
  );

  const verifiedSet = new Set(verifiedArticles.map((a) => a.pmid));

  const missingArticles: PubMedArticle[] = uniquePmids
    .filter((pmid) => !verifiedSet.has(pmid))
    .map((pmid) => ({
      pmid,
      verified: false,
      source: "manual",
    }));

  return [...verifiedArticles, ...missingArticles];
}
