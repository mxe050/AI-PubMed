import type { AppSettings } from "../types";
import { buildNcbiUrl } from "../utils/buildNcbiUrl";
import type { NcbiRateLimiter } from "../utils/ncbiRateLimiter";

export interface ESearchResult {
  count: number;
  idList: string[];
  queryTranslation?: string;
}

export async function esearchPubMed(
  term: string,
  settings: AppSettings,
  limiter: NcbiRateLimiter,
  retmax = 20
): Promise<ESearchResult> {
  const url = buildNcbiUrl(
    "esearch.fcgi",
    {
      db: "pubmed",
      term,
      retmode: "json",
      retmax,
      sort: "relevance",
    },
    settings
  );

  return limiter.schedule(async () => {
    const res = await fetch(url);

    if (!res.ok) {
      throw new Error(`ESearch failed: ${res.status}`);
    }

    const json = await res.json();

    if (json.error) {
      throw new Error(json.error);
    }

    const result = json.esearchresult;

    return {
      count: Number(result.count ?? 0),
      idList: result.idlist ?? [],
      queryTranslation: result.querytranslation,
    };
  });
}
