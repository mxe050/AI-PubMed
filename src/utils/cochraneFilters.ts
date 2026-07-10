// PubMed 用の研究デザインフィルター。
// 出典：Cochrane Handbook for Systematic Reviews of Interventions, Version 6.5.1
//   (Chapter 4 updated March 2025), Chapter 4 "Searching for and selecting studies"
//   Section 4.4.7 "Search filters", Box 4.4.a（RCT・PubMed 形式）
//   Editors: Higgins JPT, Thomas J, Chandler J, Cumpston M, Li T,
//            Page MJ, Welch VA. Cochrane, 2025.
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
  /** Short, visible description of validation/provenance. */
  evidenceBadge: string;
}

export const COCHRANE_CHAPTER_4_URL =
  "https://www.cochrane.org/authors/handbooks-and-manuals/handbook/current/chapter-04";
export const COCHRANE_CHAPTER_24_URL =
  "https://www.cochrane.org/authors/handbooks-and-manuals/handbook/current/chapter-24";
export const PUBMED_SYSTEMATIC_REVIEW_HELP_URL =
  "https://pubmed.ncbi.nlm.nih.gov/help/#systematic-reviews";
export const GUIDELINE_FILTER_VALIDATION_URL =
  "https://pubmed.ncbi.nlm.nih.gov/31610216/";
export const ANIMAL_ONLY_EXCLUSION = "(animals[mh] NOT humans[mh])";
export const COCHRANE_RCT_SENSITIVITY_MAX_EXPRESSION =
  "(randomized controlled trial[pt] OR controlled clinical trial[pt] OR randomized[tiab] OR placebo[tiab] OR drug therapy[sh] OR randomly[tiab] OR trial[tiab] OR groups[tiab])";

// CADTH broad (sensitive) PubMed guideline filter. Lunny et al. validated this
// family of filters and reported the broad CADTH strategy as the most sensitive
// (98%) with very low precision (<1%). The current-PubMed adaptation removes two
// terms that NCBI now reports as quoted phrases not found and adds the replacement
// `consensus statement[pt]`. Its performance has therefore not been revalidated.
const GUIDELINE_SENSITIVITY_TERMS = [
  '"Clinical protocols"[mh]',
  '"Consensus"[mh]',
  '"Critical pathways"[mh]',
  '"Guidelines as topic"[mh:noexp]',
  '"Practice guidelines as topic"[mh]',
  '"Health planning guidelines"[mh]',
  '"Clinical Decision Rules"[mh]',
  'guideline[pt]',
  '"practice guideline"[pt]',
  '"consensus development conference, NIH"[pt]',
  '"consensus statement"[pt]',
  '"position statement*"[tiab]',
  '"policy statement*"[tiab]',
  '"practice parameter*"[tiab]',
  '"best practice*"[tiab]',
  'standards[ti]',
  'guideline[ti]',
  'guidelines[ti]',
  'standards[ot]',
  'guideline[ot]',
  'guidelines[ot]',
  'guideline*[cn]',
  'standards[cn]',
  'consensus*[cn]',
  'recommendat*[cn]',
  '"practice guideline*"[tiab]',
  '"treatment guideline*"[tiab]',
  'CPG[tiab]',
  'CPGs[tiab]',
  '"clinical guideline*"[tiab]',
  '"guideline recommendation*"[tiab]',
  'consensus*[tiab]',
  '((critical[tiab] OR clinical[tiab] OR practice[tiab]) AND (path[tiab] OR paths[tiab] OR pathway[tiab] OR pathways[tiab] OR protocol*[tiab] OR bulletin[tiab] OR bulletins[tiab]))',
  'recommendat*[ti]',
  'recommendat*[ot]',
  '(care[tiab] AND (standard[tiab] OR path[tiab] OR paths[tiab] OR pathway[tiab] OR pathways[tiab] OR map[tiab] OR maps[tiab] OR plan[tiab] OR plans[tiab]))',
  '(algorithm*[tiab] AND (screening[tiab] OR examination[tiab] OR test[tiab] OR tested[tiab] OR testing[tiab] OR assessment*[tiab] OR diagnosis[tiab] OR diagnoses[tiab] OR diagnosed[tiab] OR diagnosing[tiab]))',
  '(algorithm*[tiab] AND (pharmacotherap*[tiab] OR chemotherap*[tiab] OR chemotreatment*[tiab] OR therap*[tiab] OR treatment*[tiab] OR intervention*[tiab]))',
];

export const GUIDELINE_SENSITIVITY_MAX_EXPRESSION =
  `(${GUIDELINE_SENSITIVITY_TERMS.join(" OR ")})`;
export const SYSTEMATIC_REVIEW_SENSITIVITY_EXPRESSION = "systematic[sb]";
export const GUIDELINE_OR_SR_SENSITIVITY_EXPRESSION =
  `(${GUIDELINE_SENSITIVITY_MAX_EXPRESSION} OR ${SYSTEMATIC_REVIEW_SENSITIVITY_EXPRESSION})`;

export const studyDesignFilters: StudyDesignFilter[] = [
  {
    key: "none",
    label: "フィルターなし（最も広い）",
    description:
      "研究デザインでは絞り込みません。未索引・デザイン表記が不明確な文献も残すため、検索漏れを最小化できます。",
    expression: "",
    source: "",
    evidenceBadge: "感度最大：制限なし",
  },
  {
    key: "guideline",
    label: "診療ガイドライン（CADTH 感度最大）",
    description:
      "検証研究で最高感度だった CADTH broad PubMed filter を現行PubMed語彙に適合させた式です。廃止語を除き Consensus Statement publication type を補い、MeSH・出版タイプ・自由語を広く検索します。",
    expression: GUIDELINE_SENSITIVITY_MAX_EXPRESSION,
    source:
      "Lunny et al., J Clin Epidemiol 2020;117:109-116（CADTH broad: 感度98%、精度1%未満）",
    sourceUrl: GUIDELINE_FILTER_VALIDATION_URL,
    caution:
      "非常に低精度で大量のノイズが出ます。現行語彙への改訂後は未再検証です。TRIP等のガイドライン専用情報源も併用してください。",
    evidenceBadge: "外部検証：感度98%・精度<1%",
  },
  {
    key: "systematic_review",
    label: "システマティックレビュー / メタ解析（PubMed公式）",
    description:
      "PubMed 公式の Systematic Review subset を使います。Publication Type だけでなく、未索引レコードを補う検索戦略も含まれます。",
    expression: SYSTEMATIC_REVIEW_SENSITIVITY_EXPRESSION,
    source:
      "U.S. National Library of Medicine, PubMed systematic[sb]",
    sourceUrl: PUBMED_SYSTEMATIC_REVIEW_HELP_URL,
    caution:
      "PubMed公式フィルターですが、他データベースや灰色文献を代替するものではありません。",
    evidenceBadge: "PubMed公式 subset",
  },
  {
    key: "guideline_or_sr",
    label: "診療ガイドライン＋SR/メタ解析（感度最大）",
    description:
      "上のガイドライン補助式と PubMed 公式 systematic[sb] を OR で結合した、本アプリの便宜的フィルターです。",
    expression: GUIDELINE_OR_SR_SENSITIVITY_EXPRESSION,
    source:
      "CADTH broad改訂版とNLM systematic[sb]を本アプリ内でOR結合",
    sourceUrl: GUIDELINE_FILTER_VALIDATION_URL,
    caution:
      "OR結合後の性能は独立検証されておらず、ガイドライン側の低精度によりノイズが多くなります。",
    evidenceBadge: "構成式：結合後は未検証",
  },
  {
    key: "rct",
    label: "RCT（Cochrane 感度最大）",
    description:
      "Cochrane Handbook v6.5.1 に掲載された PubMed 用 Highly Sensitive Search Strategy の感度最大版を原文どおり使用します。",
    expression: COCHRANE_RCT_SENSITIVITY_MAX_EXPRESSION,
    source:
      "Cochrane Handbook v6.5.1, Chapter 4 §4.4.7, Box 4.4.a（2008 revision; PubMed format）",
    sourceUrl: COCHRANE_CHAPTER_4_URL,
    caution:
      "感度を優先するためノイズは増えます。動物のみの研究は最終検索式で除外します。",
    evidenceBadge: "Cochrane検証済み・感度最大",
  },
  {
    key: "non_rct",
    label: "非RCT（感度最大：デザインで絞らない）",
    description:
      "非ランダム化研究はデザイン名と索引が一貫せず、一般的な方法論フィルターで漏れやすいため、研究デザインでは絞り込みません。",
    expression: "",
    source:
      "Cochrane Handbook v6.5.1, Chapter 24 §24.3.1.1（NRSI フィルターの限界）",
    sourceUrl: COCHRANE_CHAPTER_24_URL,
    caution:
      "検索件数は増えますが、スクリーニング段階で研究デザインを判定する方が高感度です。",
    evidenceBadge: "Cochrane推奨：広い検索",
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
