import type { AppSettings, PubMedArticle } from "../types";
import { buildNcbiUrl } from "../utils/buildNcbiUrl";
import type { NcbiRateLimiter } from "../utils/ncbiRateLimiter";

export async function esummaryPubMed(
  pmids: string[],
  settings: AppSettings,
  limiter: NcbiRateLimiter
): Promise<PubMedArticle[]> {
  if (pmids.length === 0) return [];

  const url = buildNcbiUrl(
    "esummary.fcgi",
    {
      db: "pubmed",
      id: pmids.join(","),
      retmode: "json",
    },
    settings
  );

  return limiter.schedule(async () => {
    const res = await fetch(url);

    if (!res.ok) {
      throw new Error(`ESummary failed: ${res.status}`);
    }

    const json = await res.json();
    const uids: string[] = json.result?.uids ?? [];

    return uids.map((uid) => {
      const item = json.result[uid];

      return {
        pmid: uid,
        pmcid: extractPmcid(item?.articleids),
        title: item?.title,
        journal: item?.fulljournalname || item?.source,
        pubDate: item?.pubdate,
        year: extractYear(item?.pubdate),
        authors: Array.isArray(item?.authors)
          ? item.authors.map((a: { name: string }) => a.name)
          : [],
        doi: extractDoi(item?.elocationid) ?? extractDoiFromArticleIds(item?.articleids),
        verified: true,
        source: "esummary",
      } satisfies PubMedArticle;
    });
  });
}

function extractYear(pubDate?: string): string | undefined {
  if (!pubDate) return undefined;
  const match = pubDate.match(/\d{4}/);
  return match?.[0];
}

function extractDoi(text?: string): string | undefined {
  if (!text) return undefined;
  const match = text.match(/10\.\S+/);
  return match?.[0];
}

interface ArticleIdEntry {
  idtype?: string;
  value?: string;
}

function extractPmcid(ids?: ArticleIdEntry[]): string | undefined {
  if (!Array.isArray(ids)) return undefined;
  const entry = ids.find((a) => a?.idtype?.toLowerCase() === "pmc");
  if (!entry?.value) return undefined;
  // ESummary returns "PMC8228797" form; normalize.
  return entry.value.toUpperCase().startsWith("PMC")
    ? entry.value
    : `PMC${entry.value}`;
}

function extractDoiFromArticleIds(ids?: ArticleIdEntry[]): string | undefined {
  if (!Array.isArray(ids)) return undefined;
  const entry = ids.find((a) => a?.idtype?.toLowerCase() === "doi");
  return entry?.value;
}
