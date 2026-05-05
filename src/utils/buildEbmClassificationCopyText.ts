// 「AIで研究デザイン別に分類する」ボタンでクリップボードにコピーするテキスト
// プロンプト指示＋検索結果のフルデータを1つの文字列にまとめる

import type { PubMedSearchResult } from "../types";

export function buildEbmClassificationCopyText(
  result: PubMedSearchResult
): string {
  const articleBlocks = result.articles
    .map((a, i) => {
      const authors =
        a.authors && a.authors.length > 0 ? a.authors.join(", ") : "-";
      const pubTypes =
        a.publicationTypes && a.publicationTypes.length > 0
          ? a.publicationTypes.join(", ")
          : "-";
      const mesh =
        a.meshTerms && a.meshTerms.length > 0
          ? a.meshTerms.join("; ")
          : "-";
      const abst = a.abstractText ?? "（抄録未取得）";
      return `[${i + 1}] PMID: ${a.pmid}
Title: ${a.title ?? "(no title)"}
Authors: ${authors}
Journal: ${a.journal ?? "-"}
Year: ${a.year ?? "-"}
DOI: ${a.doi ?? "-"}
Publication Types: ${pubTypes}
MeSH Terms: ${mesh}
Abstract: ${abst}`;
    })
    .join("\n\n---\n\n");

  return `以下はPubMed検索結果の論文リストです。

【あなたへの指示】
1. 各論文をPublication Type、MeSH Terms、タイトル、抄録の内容に基づいて、以下のEBMヒエラルキーで分類してください:
   - 診療ガイドライン (Practice Guideline / Guideline)
   - システマティックレビュー/メタアナリシス (Systematic Review / Meta-Analysis)
   - ランダム化比較試験 (RCT / Randomized Controlled Trial)
   - 非ランダム化比較試験 (Non-RCT)
   - 観察研究 (Cohort / Case-Control / Cross-Sectional 等)
   - 基礎研究 (In Vitro / Animal 等)
   - その他 (Case Report / Letter / Editorial / Review 等)

2. 分類後、以下のフォーマットで出力してください。このフォーマットは機械的に読み取るため、正確に守ってください:

===CLASSIFICATION_START===
[カテゴリ名]
PMID: [PMID] | 著者年: [第一著者の姓]_[出版年] | タイトル: [タイトル] | 雑誌: [雑誌名] | 要約: [抄録を2-3文で日本語要約] | 評判: [この論文がその分野・学会でどの程度引用・言及されているか、有名論文かどうか、ランドマーク試験かどうかを調べて記載。わからなければ「情報なし」]

[次のカテゴリ名]
PMID: [PMID] | 著者年: ...
（以下同様）
===CLASSIFICATION_END===

3. 注意事項:
- 必ず全論文を分類してください（漏れなく）
- 各カテゴリ内では出版年の新しい順に並べてください
- 「要約」は抄録がない場合は「抄録なし」としてください
- 「評判」はあなたの知識の範囲で回答し、確信がない場合は「AI記憶・未確認」と明記してください
- 各論文情報は1行で、フィールドを「 | 」（スペース＋パイプ＋スペース）で区切ってください
- カテゴリ名は単独の行として書いてください

【検索式】
${result.query}

【ヒット件数】
${result.count.toLocaleString()} 件中の上位 ${result.articles.length} 件

【論文リスト】
${articleBlocks}
`;
}
