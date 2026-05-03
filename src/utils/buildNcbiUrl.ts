import type { AppSettings } from "../types";

const NCBI_BASE_URL = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils";

export function buildNcbiUrl(
  endpoint: string,
  params: Record<string, string | number | undefined>,
  settings: AppSettings
): string {
  const url = new URL(`${NCBI_BASE_URL}/${endpoint}`);

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== "") {
      url.searchParams.set(key, String(value));
    }
  });

  url.searchParams.set("tool", settings.tool || "pubmed_prompt_tool");

  if (settings.email) {
    url.searchParams.set("email", settings.email);
  }

  if (settings.ncbiApiKey) {
    url.searchParams.set("api_key", settings.ncbiApiKey);
  }

  return url.toString();
}
