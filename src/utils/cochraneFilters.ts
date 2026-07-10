// PubMed 用の研究デザインフィルター。
// 出典：Cochrane Handbook for Systematic Reviews of Interventions, Version 6.5
//   (updated August 2024), Chapter 4 "Searching for and selecting studies"
//   Section 4.4.7 "Search filters", Box 4.4.a（RCT・PubMed 形式）
//   Editors: Higgins JPT, Thomas J, Chandler J, Cumpston M, Li T,
//            Page MJ, Welch VA. Cochrane, 2024.
//   Available from: https://training.cochrane.org/handbook
//
// 注意：Cochrane の検証済みフィルターは RCT のみです。その他は
// NLM/PubMed の公式仕様またはアプリ内で構成した補助式です。

export type StudyDesignFilterKey =
  | "none"
  | "guideline"
  | "systematic_review"
  | "guideline_or_sr"
  | "rct"
  | "non_rct";

export interface StudyDesignFilter {
  key: StudyDesignFilterKey;
  label: string;
  description: string;
  /** PubMed search expression filter; appended after AND to the base query. */
  expression: string;
  /** Source citation (shown in UI, not embedded in AI prompt). */
  source: string;
  /** Primary source URL shown in the UI. */
  sourceUrl?: string;
  /** Important limitations that must not be hidden in a title tooltip. */
  caution?: string;
}

export const COCHRANE_CHAPTER_4_URL =
  "https://www.cochrane.org/authors/handbooks-and-manuals/handbook/current/chapter-04";
export const COCHRANE_CHAPTER_24_URL =
  "https://www.cochrane.org/authors/handbooks-and-manuals/handbook/current/chapter-24";
export const PUBMED_HELP_URL = "https://pubmed.ncbi.nlm.nih.gov/help/";
export const ANIMAL_ONLY_EXCLUSION = "(animals[mh] NOT humans[mh])";
export const COCHRANE_RCT_SENSITIVITY_MAX_EXPRESSION =
  "(randomized controlled trial[pt] OR controlled clinical trial[pt] OR randomized[tiab] OR placebo[tiab] OR drug therapy[sh] OR randomly[tiab] OR trial[tiab] OR groups[tiab])";

export const studyDesignFilters: StudyDesignFilter[] = [
  {
    key: "none",
    label: "フィルターなし（最も広い）",
    description:
      "研究デザインでは絞り込みません。未索引・デザイン表記が不明確な文献も残すため、検索漏れを最小化できます。",
    expression: "",
    source: "",
  },
  {
    key: "guideline",
    label: "診療ガイドライン（感度優先）",
    description:
      "NLM の Publication Type に、未索引レコードを補うタイトル語を加えた感度優先の補助式です。検証済み Cochrane フィルターではありません。",
    expression:
      "(guideline[pt] OR consensus statement[pt] OR \"clinical practice guideline\"[ti] OR \"practice guideline\"[ti] OR \"consensus statement\"[ti] OR \"consensus guideline\"[ti])",
    source:
      "NLM PubMed Publication Types / MeSH（タイトル語は本アプリによる補助）",
    sourceUrl: PUBMED_HELP_URL,
    caution:
      "未索引文献の取りこぼしを減らす一方、独立して検証された検索フィルターではありません。",
  },
  {
    key: "systematic_review",
    label: "システマティックレビュー（PubMed公式）",
    description:
      "PubMed 公式の Systematic Review subset を使います。Publication Type だけでなく、未索引レコードを補う検索戦略も含まれます。",
    expression: "systematic[sb]",
    source:
      "U.S. National Library of Medicine, PubMed systematic[sb]",
    sourceUrl: PUBMED_HELP_URL,
  },
  {
    key: "guideline_or_sr",
    label: "ガイドライン＋システマティックレビュー",
    description:
      "上のガイドライン補助式と PubMed 公式 systematic[sb] を OR で結合した、本アプリの便宜的フィルターです。",
    expression:
      "(guideline[pt] OR consensus statement[pt] OR \"clinical practice guideline\"[ti] OR \"practice guideline\"[ti] OR \"consensus statement\"[ti] OR \"consensus guideline\"[ti] OR systematic[sb])",
    source:
      "NLM 由来の2つの式を本アプリ内で OR 結合",
    sourceUrl: PUBMED_HELP_URL,
    caution: "独立して検証された Cochrane フィルターではありません。",
  },
  {
    key: "rct",
    label: "RCT（Cochrane 感度最大）",
    description:
      "Cochrane Handbook v6.5 に掲載された PubMed 用 Highly Sensitive Search Strategy の感度最大版を原文どおり使用します。",
    expression: COCHRANE_RCT_SENSITIVITY_MAX_EXPRESSION,
    source:
      "Cochrane Handbook v6.5, Chapter 4 §4.4.7, Box 4.4.a（2008 revision; PubMed format）",
    sourceUrl: COCHRANE_CHAPTER_4_URL,
    caution:
      "感度を優先するためノイズは増えます。動物のみの研究は最終検索式で除外します。",
  },
  {
    key: "non_rct",
    label: "非RCTも含む（絞り込みなし・推奨）",
    description:
      "非ランダム化研究はデザイン名と索引が一貫せず、一般的な方法論フィルターで漏れやすいため、研究デザインでは絞り込みません。",
    expression: "",
    source:
      "Cochrane Handbook v6.5, Chapter 24（NRSI の検索ではデザインフィルターの限界に注意）",
    sourceUrl: COCHRANE_CHAPTER_24_URL,
    caution:
      "検索件数は増えますが、スクリーニング段階で研究デザインを判定する方が高感度です。",
  },
];

const TRAILING_ANIMAL_EXCLUSION =
  /\s+NOT\s+\(\s*animals\s*\[\s*mh\s*\]\s+NOT\s+humans\s*\[\s*mh\s*\]\s*\)\s*$/i;

function splitTrailingAnimalExclusion(query: string): {
  core: string;
  hadExclusion: boolean;
} {
  const trimmed = query.trim();
  return {
    core: trimmed.replace(TRAILING_ANIMAL_EXCLUSION, "").trim(),
    hadExclusion: TRAILING_ANIMAL_EXCLUSION.test(trimmed),
  };
}

/** Add the standard animal-only exclusion once, tolerating tag whitespace. */
export function appendAnimalOnlyExclusion(query: string): string {
  const { core, hadExclusion } = splitTrailingAnimalExclusion(query);
  if (!core) return "";
  if (hadExclusion) return `${core} NOT ${ANIMAL_ONLY_EXCLUSION}`;
  return `(${core}) NOT ${ANIMAL_ONLY_EXCLUSION}`;
}

/** Apply the filter to a base query as `(base) AND (filter)`. */
export function applyStudyDesignFilter(
  baseQuery: string,
  filter: StudyDesignFilter
): string {
  const { core, hadExclusion } = splitTrailingAnimalExclusion(baseQuery);
  if (!core) return "";
  const filtered = filter.expression
    ? `(${core}) AND (${filter.expression})`
    : core;
  return hadExclusion
    ? `${filtered} NOT ${ANIMAL_ONLY_EXCLUSION}`
    : filtered;
}
