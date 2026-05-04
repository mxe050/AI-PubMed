import type { PubMedSearchResult } from "../types";

export function buildArticleListForClassification(
  result: PubMedSearchResult,
  max = 100
): string {
  const articles = result.articles.slice(0, max);
  return articles
    .map((a, i) => {
      const pubTypes =
        a.publicationTypes && a.publicationTypes.length > 0
          ? a.publicationTypes.join(", ")
          : "-";
      const mesh =
        a.meshTerms && a.meshTerms.length > 0
          ? a.meshTerms.slice(0, 8).join("; ")
          : "-";
      const journalYear = [a.journal ?? "?", a.year ?? "?"]
        .filter(Boolean)
        .join(", ");
      return `[${i + 1}] PMID ${a.pmid} | "${a.title ?? "(no title)"}" | ${journalYear} | PubType: ${pubTypes} | MeSH: ${mesh}`;
    })
    .join("\n");
}
