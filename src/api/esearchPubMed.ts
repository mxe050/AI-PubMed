import type { AppSettings } from "../types";
import { buildNcbiUrl } from "../utils/buildNcbiUrl";
import type { NcbiRateLimiter } from "../utils/ncbiRateLimiter";

export interface ESearchResult {
  count: number;
  idList: string[];
  queryTranslation?: string;
  warnings?: string[];
}

function collectMessages(value: unknown): string[] {
  if (!value || typeof value !== "object") return [];
  return Object.values(value as Record<string, unknown>).flatMap((item) =>
    Array.isArray(item)
      ? item.filter((entry): entry is string => typeof entry === "string")
      : typeof item === "string"
        ? [item]
        : []
  );
}

export async function esearchPubMed(
  term: string,
  settings: AppSettings,
  limiter: NcbiRateLimiter,
  retmax = 20,
  retstart = 0
): Promise<ESearchResult> {
  const url = buildNcbiUrl(
    "esearch.fcgi",
    {},
    settings
  );

  // Search strategies can be many kilobytes long. NCBI supports POST and it
  // avoids proxy/browser URL limits (HTTP 414) that occur with GET.
  const body = new URLSearchParams({
    db: "pubmed",
    term,
    retmode: "json",
    retmax: String(retmax),
    retstart: String(retstart),
    sort: "relevance",
  });

  return limiter.schedule(async () => {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });

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
      warnings: [
        ...collectMessages(result.warninglist),
        ...collectMessages(result.errorlist),
      ],
    };
  });
}
