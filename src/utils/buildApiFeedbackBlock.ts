import type { PubMedSearchResult } from "../types";

export function buildApiFeedbackBlock(result?: PubMedSearchResult): string {
  if (!result) {
    return "PubMed API検索結果はありません。";
  }

  const titles = result.articles
    .map((a) => `- ${a.pmid}: ${a.title ?? "No title"}`)
    .join("\n");

  const meshTerms = Array.from(
    new Set(result.articles.flatMap((a) => a.meshTerms ?? []))
  ).join("; ");

  const publicationTypes = Array.from(
    new Set(result.articles.flatMap((a) => a.publicationTypes ?? []))
  ).join("; ");

  return `以下はPubMed APIで取得した検索結果情報です。

検索結果件数：
${result.count}

上位PMID：
${result.idList.join(", ")}

上位文献タイトル：
${titles}

上位文献に付与されていたMeSH Terms：
${meshTerms || "取得なし"}

Publication Types：
${publicationTypes || "取得なし"}

PubMed query translation：
${result.queryTranslation || "取得なし"}

これらの情報を参考に、検索式の網羅性と特異度のバランスを改善してください。`;
}
