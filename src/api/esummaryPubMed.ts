import type { AppSettings, PubMedArticle } from "../types";
import { buildNcbiUrl } from "../utils/buildNcbiUrl";
import type { NcbiRateLimiter } from "../utils/ncbiRateLimiter";
import { ncbiFetch } from "./ncbiFetch";

export async function esummaryPubMed(
  pmids: string[],
  settings: AppSettings,
  limiter: NcbiRateLimiter,
  signal?: AbortSignal
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

    const res = await ncbiFetch(url, limiter, { signal });
    const json: unknown = await res.json();
    if (!json || typeof json !== "object") throw new Error("ESummary returned malformed JSON");
    const root = json as { result?: Record<string, unknown> & { uids?: unknown } };
    const result = root.result;
    if (!result || !Array.isArray(result.uids)) throw new Error("ESummary result is missing");
    const uids = result.uids.filter((uid): uid is string => typeof uid === "string");

    return uids.map((uid) => {
      const item = result[uid] as Record<string, unknown> | undefined;

      return {
        pmid: uid,
        pmcid: extractPmcid(
          Array.isArray(item?.articleids)
            ? item.articleids as ArticleIdEntry[]
            : undefined
        ),
        title: typeof item?.title === "string" ? item.title : undefined,
        journal:
          typeof item?.fulljournalname === "string"
            ? item.fulljournalname
            : typeof item?.source === "string" ? item.source : undefined,
        pubDate: typeof item?.pubdate === "string" ? item.pubdate : undefined,
        year: extractYear(typeof item?.pubdate === "string" ? item.pubdate : undefined),
        authors: Array.isArray(item?.authors)
          ? item.authors.flatMap((author) => {
              if (!author || typeof author !== "object") return [];
              const name = (author as { name?: unknown }).name;
              return typeof name === "string" ? [name] : [];
            })
          : [],
        doi:
          extractDoi(typeof item?.elocationid === "string" ? item.elocationid : undefined) ??
          extractDoiFromArticleIds(Array.isArray(item?.articleids) ? item.articleids as ArticleIdEntry[] : undefined),
        bibliographicStatus: "confirmed",
        contentVerificationStatus: "unverified",
        verified: true,
        source: "esummary",
      } satisfies PubMedArticle;
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
