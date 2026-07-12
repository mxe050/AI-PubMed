import type { AppSettings } from "../types";
import { buildNcbiUrl } from "../utils/buildNcbiUrl";
import type { NcbiRateLimiter } from "../utils/ncbiRateLimiter";
import { ncbiFetch } from "./ncbiFetch";

export interface ESearchResult {
  count: number;
  idList: string[];
  queryTranslation?: string;
  warningList: string[];
  errorList: string[];
  webEnv?: string;
  queryKey?: string;
}

export interface ESearchOptions {
  /**
   * Store the result set on NCBI's History server.
   * Keep this enabled for follow-up record requests, but disable it for
   * translation/count-only checks.
   */
  useHistory?: boolean;
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
  retstart = 0,
  signal?: AbortSignal,
  options: ESearchOptions = {}
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
  if (options.useHistory !== false) {
    body.set("usehistory", "y");
  }

  const res = await ncbiFetch(url, limiter, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
      signal,
    });
    const json: unknown = await res.json();
    if (!json || typeof json !== "object") throw new Error("ESearch returned malformed JSON");
    const root = json as Record<string, unknown>;
    if (typeof root.error === "string") throw new Error(root.error);
    if (!root.esearchresult || typeof root.esearchresult !== "object") {
      throw new Error("ESearch result is missing");
    }
    const result = root.esearchresult as Record<string, unknown>;
    const warningList = collectMessages(result.warninglist);
    const errorList = collectMessages(result.errorlist);

    return {
      count: Number(result.count ?? 0),
      idList: Array.isArray(result.idlist)
        ? result.idlist.filter((item): item is string => typeof item === "string")
        : [],
      queryTranslation:
        typeof result.querytranslation === "string" ? result.querytranslation : undefined,
      warningList,
      errorList,
      webEnv: typeof result.webenv === "string" ? result.webenv : undefined,
      queryKey: typeof result.querykey === "string" ? result.querykey : undefined,
    };
}
