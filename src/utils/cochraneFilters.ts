// 研究デザイン高感度フィルター（PubMed用）
// 出典：Cochrane Handbook for Systematic Reviews of Interventions, Version 6.5
//   (updated August 2024), Chapter 4 "Searching for and selecting studies"
//   Section 4.4.7 "Designing search strategies", Box 4.5.a/4.5.b
//   Editors: Higgins JPT, Thomas J, Chandler J, Cumpston M, Li T,
//            Page MJ, Welch VA. Cochrane, 2024.
//   Available from: https://training.cochrane.org/handbook
//
// 注意：以下のフィルターはプロンプトには出典情報を入れず、
// アプリ内のコードコメントとUI上のヒントでのみ出典を明示します。

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
}

export const studyDesignFilters: StudyDesignFilter[] = [
  {
    key: "none",
    label: "フィルターなし（広め検索のまま）",
    description: "研究デザインで絞り込まない。Step 4までの検索式をそのまま使用。",
    expression: "",
    source: "",
  },
  {
    key: "guideline",
    label: "診療ガイドライン",
    description:
      "診療ガイドライン・コンセンサスステートメント・実践ガイドラインを優先的にヒットさせる高感度フィルター。",
    expression:
      "(guideline[pt] OR practice guideline[pt] OR consensus development conference[pt] OR consensus development conference, NIH[pt] OR \"clinical practice guideline\"[tiab] OR \"practice guideline\"[tiab] OR \"consensus statement\"[tiab] OR \"consensus guideline\"[tiab])",
    source:
      "Cochrane Handbook v6.5, Chapter 4 のガイドライン検索戦略（PubMed publication type）に準拠。",
  },
  {
    key: "systematic_review",
    label: "システマティックレビュー / メタ解析",
    description:
      "SR・メタ解析を高感度に拾う。Cochrane Handbook で推奨される SR 同定戦略。",
    expression:
      "(systematic review[pt] OR meta-analysis[pt] OR \"systematic review\"[tiab] OR \"meta-analysis\"[tiab] OR \"meta analysis\"[tiab] OR systematic[sb] OR \"cochrane database syst rev\"[ta])",
    source:
      "Cochrane Handbook v6.5, Chapter 4 Box 4.5.b（SR/MA 同定）に準拠。",
  },
  {
    key: "guideline_or_sr",
    label: "診療ガイドライン ＋ SR/メタ解析（結合）",
    description:
      "上位エビデンス（GL/SR/メタ解析）をまとめて拾う結合フィルター。GL単体・SR単体の expression を OR で結合。",
    expression:
      "(guideline[pt] OR practice guideline[pt] OR consensus development conference[pt] OR consensus development conference, NIH[pt] OR \"clinical practice guideline\"[tiab] OR \"practice guideline\"[tiab] OR \"consensus statement\"[tiab] OR \"consensus guideline\"[tiab] OR systematic review[pt] OR meta-analysis[pt] OR \"systematic review\"[tiab] OR \"meta-analysis\"[tiab] OR \"meta analysis\"[tiab] OR systematic[sb] OR \"cochrane database syst rev\"[ta])",
    source:
      "Cochrane Handbook v6.5, Chapter 4（GL/SR/MA 同定戦略の結合）",
  },
  {
    key: "rct",
    label: "RCT（高感度フィルター）",
    description:
      "Cochrane Handbook v6.5 Box 4.5.a の Highly Sensitive Search Strategy（HSSS）に基づく RCT 高感度フィルター（PubMed版）。",
    expression:
      "(randomized controlled trial[pt] OR controlled clinical trial[pt] OR randomized[tiab] OR placebo[tiab] OR clinical trials as topic[mh:noexp] OR randomly[tiab] OR trial[ti])",
    source:
      "Cochrane Handbook v6.5, Chapter 4 Box 4.5.a（Highly Sensitive Search Strategy for RCTs in PubMed）に準拠。",
  },
  {
    key: "non_rct",
    label: "非RCT（介入研究・観察研究）",
    description:
      "RCT 以外の介入研究・観察研究（コホート / 症例対照 / 横断 / レジストリ等）を拾う高感度フィルター。",
    expression:
      "(controlled clinical trial[pt] OR clinical trial[pt] OR observational study[pt] OR cohort studies[mh] OR case-control studies[mh] OR cross-sectional studies[mh] OR \"cohort study\"[tiab] OR \"case-control\"[tiab] OR \"cross-sectional\"[tiab] OR observational[tiab] OR registry[tiab])",
    source:
      "Cochrane Handbook v6.5, Chapter 24「Including non-randomized studies on intervention effects」を参考に構築。",
  },
];

/** Apply the filter to a base query as `(base) AND (filter)`. */
export function applyStudyDesignFilter(
  baseQuery: string,
  filter: StudyDesignFilter
): string {
  const trimmed = baseQuery.trim();
  if (!trimmed) return "";
  if (!filter.expression) return trimmed;
  // If the base already ends with NOT (animals[mh] NOT humans[mh]), insert filter before it.
  const animalExclusion = /\s+NOT\s+\(animals\[mh\]\s+NOT\s+humans\[mh\]\)\s*$/i;
  if (animalExclusion.test(trimmed)) {
    const stripped = trimmed.replace(animalExclusion, "");
    return `(${stripped}) AND (${filter.expression}) NOT (animals[mh] NOT humans[mh])`;
  }
  return `(${trimmed}) AND (${filter.expression})`;
}
