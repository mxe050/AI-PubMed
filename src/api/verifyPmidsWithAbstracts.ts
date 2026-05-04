import type { PubMedArticle, AppSettings } from "../types";
import { esummaryPubMed } from "./esummaryPubMed";
import { efetchPubMed } from "./efetchPubMed";
import type { NcbiRateLimiter } from "../utils/ncbiRateLimiter";

export async function verifyPmidsWithAbstracts(
  pmids: string[],
  settings: AppSettings,
  limiter: NcbiRateLimiter
): Promise<PubMedArticle[]> {
  const uniquePmids = Array.from(new Set(pmids));
  if (uniquePmids.length === 0) return [];

  const summaries = await esummaryPubMed(uniquePmids, settings, limiter);
  const verifiedPmidSet = new Set(summaries.map((a) => a.pmid));

  let detailMap = new Map<string, PubMedArticle>();
  if (summaries.length > 0) {
    try {
      const details = await efetchPubMed(
        summaries.map((s) => s.pmid),
        settings,
        limiter
      );
      detailMap = new Map(details.map((d) => [d.pmid, d]));
    } catch {
      // EFetch failed, continue with summaries only
    }
  }

  const verifiedArticles: PubMedArticle[] = summaries.map((s) => {
    const detail = detailMap.get(s.pmid);
    return {
      ...s,
      pmcid: s.pmcid ?? detail?.pmcid,
      doi: s.doi ?? detail?.doi,
      abstractText: detail?.abstractText,
      abstractSections: detail?.abstractSections,
      meshTerms: detail?.meshTerms,
      publicationTypes: detail?.publicationTypes,
      commentsCorrections: detail?.commentsCorrections,
    };
  });

  const missingArticles: PubMedArticle[] = uniquePmids
    .filter((pmid) => !verifiedPmidSet.has(pmid))
    .map((pmid) => ({
      pmid,
      verified: false,
      source: "manual" as const,
    }));

  return [...verifiedArticles, ...missingArticles];
}
