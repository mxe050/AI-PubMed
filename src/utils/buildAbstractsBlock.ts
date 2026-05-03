import type { PubMedSearchResult } from "../types";

export function buildAbstractsBlock(result?: PubMedSearchResult): string {
  if (!result || result.articles.length === 0) {
    return "上位文献の抄録は取得できていません。";
  }

  const blocks = result.articles
    .filter((a) => a.abstractText)
    .slice(0, 20)
    .map((a) => {
      const header = `--- PMID ${a.pmid} ---`;
      const title = `Title: ${a.title ?? "(no title)"}`;
      const journal = a.journal ? `Journal: ${a.journal}` : "";
      const year = a.year ? `Year: ${a.year}` : "";
      const meshLine =
        a.meshTerms && a.meshTerms.length > 0
          ? `MeSH: ${a.meshTerms.join("; ")}`
          : "";
      const pubTypes =
        a.publicationTypes && a.publicationTypes.length > 0
          ? `Publication Types: ${a.publicationTypes.join("; ")}`
          : "";
      const abstract = `Abstract:\n${a.abstractText}`;

      return [header, title, journal, year, meshLine, pubTypes, abstract]
        .filter(Boolean)
        .join("\n");
    });

  if (blocks.length === 0) {
    return "上位文献の抄録は取得できていません（EFetchが失敗した可能性があります）。";
  }

  return blocks.join("\n\n");
}
