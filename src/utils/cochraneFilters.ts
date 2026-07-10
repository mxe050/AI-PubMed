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
  | "guideline_broad"
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
  /** Supporting methods/resources shown as direct links in the evidence card. */
  additionalSources?: Array<{ label: string; url: string }>;
}

export const COCHRANE_CHAPTER_4_URL =
  "https://www.cochrane.org/authors/handbooks-and-manuals/handbook/current/chapter-04";
export const COCHRANE_CHAPTER_24_URL =
  "https://www.cochrane.org/authors/handbooks-and-manuals/handbook/current/chapter-24";
export const PUBMED_SYSTEMATIC_REVIEW_HELP_URL =
  "https://www.nlm.nih.gov/bsd/pubmed_subsets/sysreviews_strategy.html";
export const GUIDELINE_FILTER_VALIDATION_URL =
  "https://pubmed.ncbi.nlm.nih.gov/31610216/";
export const GRADE_ADOLOPMENT_GUIDANCE_URL =
  "https://pubmed.ncbi.nlm.nih.gov/39117011/";
export const GRADE_SOURCE_GUIDELINE_SCOPING_URL =
  "https://africa.cochrane.org/sites/africa.cochrane.org/files/uploads/identifying-appropriate-source-guidelines---recommendations-for-grade-adolopment_ges2024.pdf";
export const IQWIG_GUIDELINE_FILTER_COMPARISON_URL =
  "https://www.iqwig.de/download/ga25-03_aufwandsreduktion-leitlinien_arbeitspapier_v1-0.pdf";
export const EPISTEMONIKOS_GRADE_GUIDELINES_URL =
  "https://www.epistemonikos.org/en/groups/grade_guideline";
export const WHO_GUIDELINES_URL =
  "https://www.who.int/publications/who-guidelines";
export const NLM_MESH_2025_HIGHLIGHTS_URL =
  "https://www.nlm.nih.gov/oet/ed/mesh/2025/mesh_highlights.html";
export const NLM_2026_ARTICLE_TYPES_URL =
  "https://www.nlm.nih.gov/pubs/techbull/ma26/ma26_pubmed_update_MeSH_changes.html";
export const SYSTEMATIC_REVIEW_FILTER_VALIDATION_URL =
  "https://pmc.ncbi.nlm.nih.gov/articles/PMC12482493/";
export const SYSTEMATIC_REVIEW_COMPLEMENT_METHOD_URL =
  "https://pmc.ncbi.nlm.nih.gov/articles/PMC8608217/";
export const ANIMAL_ONLY_EXCLUSION = "(animals[mh] NOT humans[mh])";
export const COCHRANE_RCT_SENSITIVITY_MAX_EXPRESSION =
  "(randomized controlled trial[pt] OR controlled clinical trial[pt] OR randomized[tiab] OR placebo[tiab] OR drug therapy[sh] OR randomly[tiab] OR trial[tiab] OR groups[tiab])";

// The title-focused MD Anderson guideline filter retrieved 96/101 CPGs in
// Lunny et al.'s PubMed validation set (95.0% sensitivity; 0.08% precision),
// while returning 117,614 records versus 686,864 for CADTH broad. This update
// keeps that validated structure and adds the 2026 replacement publication
// type `consensus statement[pt]`. Because the vocabulary has been changed, the
// exact expression below has not itself been revalidated.
const GUIDELINE_PRACTICAL_TERMS = [
  'guideline[pt]',
  '"practice guideline"[pt]',
  '"consensus statement"[pt]',
  '"consensus development conference, NIH"[pt]',
  'consensus[ti]',
  'consensuses[ti]',
  '"position statement"[ti]',
  '"position statements"[ti]',
  '"practice parameter"[ti]',
  '"practice parameters"[ti]',
  '"appropriate use criteria"[ti]',
  '"appropriateness criteria"[ti]',
  '"guidance statement"[ti]',
  '"guidance statements"[ti]',
  '"recommendation statement"[ti]',
  '"recommendation statements"[ti]',
  'guideline[ti]',
  'guidelines[ti]',
];

export const GUIDELINE_PRACTICAL_EXPRESSION =
  `((${GUIDELINE_PRACTICAL_TERMS.join(" OR ")}) NOT (protocol[ti] OR protocols[ti]))`;

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

// PubMed's official systematic[sb] strategy was last modified in 2018 and
// does not even include meta-analysis[pt]. Keep the precise official subset,
// then supplement it with current publication types and high-signal title
// phrases so that recent/in-process citations can be retrieved. The outer NOT
// removes common non-review publication formats and indexed scoping reviews.
export const PUBMED_SYSTEMATIC_SUBSET_EXPRESSION = "systematic[sb]";
const SYSTEMATIC_REVIEW_CURRENT_TERMS = [
  PUBMED_SYSTEMATIC_SUBSET_EXPRESSION,
  '"meta-analysis"[pt]',
  '"network meta-analysis"[pt]',
  '(systematic[ti] AND review*[ti])',
  '"systematic overview"[ti]',
  '"umbrella review"[ti]',
  '"umbrella reviews"[ti]',
  '"overview of reviews"[ti]',
  '"review of reviews"[ti]',
  '"meta-review"[ti]',
  '"meta-reviews"[ti]',
  '"meta-analysis"[ti]',
  '"meta-analyses"[ti]',
  '"meta analysis"[ti]',
  '"meta analyses"[ti]',
  'metaanaly*[ti]',
  '"evidence synthesis"[ti]',
  '"evidence syntheses"[ti]',
  '"rapid review"[ti]',
  '"rapid reviews"[ti]',
  '((search*[tiab] OR medline[tiab] OR pubmed[tiab] OR embase[tiab] OR cochrane[tiab] OR scopus[tiab] OR "web of science"[tiab] OR "data sources"[tiab]) AND ("study selection"[tiab] OR "selection criteria"[tiab] OR "eligibility criteria"[tiab] OR "inclusion criteria"[tiab] OR "exclusion criteria"[tiab]))',
];
const SYSTEMATIC_REVIEW_EXCLUSIONS =
  '(protocol[ti] OR protocols[ti] OR scoping[ti] OR comment[pt] OR editorial[pt] OR letter[pt] OR "case reports"[pt] OR "published erratum"[pt] OR "retraction notice"[pt] OR "retracted publication"[pt] OR withdrawn[ti] OR "scoping review"[pt])';
export const SYSTEMATIC_REVIEW_CURRENT_EXPRESSION =
  `((${SYSTEMATIC_REVIEW_CURRENT_TERMS.join(" OR ")}) NOT ${SYSTEMATIC_REVIEW_EXCLUSIONS})`;
// Backward-compatible export name used by earlier app code/tests.
export const SYSTEMATIC_REVIEW_SENSITIVITY_EXPRESSION =
  SYSTEMATIC_REVIEW_CURRENT_EXPRESSION;
export const GUIDELINE_OR_SR_SENSITIVITY_EXPRESSION =
  `(${GUIDELINE_PRACTICAL_EXPRESSION} OR ${SYSTEMATIC_REVIEW_CURRENT_EXPRESSION})`;

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
    label: "診療ガイドライン（実用型・推奨）",
    description:
      "検証済み5式のうち、感度を保ちながら候補数が最少だった MD Anderson のタイトル中心フィルターを、2026年の Consensus Statement 出版タイプに対応させました。GRADE-ADOLOPMENTでは、まず Epistemonikos-GRADE・WHO などの専用情報源を探し、PubMedを補完検索として使います。",
    expression: GUIDELINE_PRACTICAL_EXPRESSION,
    source:
      "Lunny et al., J Clin Epidemiol 2020;117:109-116（旧MD Anderson PubMed式：感度95.0%、精度0.08%）",
    sourceUrl: GUIDELINE_FILTER_VALIDATION_URL,
    caution:
      "元の検証でも精度は低く、現行語彙への更新後は未再検証です。GRADE・AGREE・EtDはAND必須語にせず、検索後の優先順位付け・質評価に使います。網羅性が絶対要件なら下のCADTH broadも併用し、専用情報源・開発機関サイト・引用追跡を必ず組み合わせてください。",
    evidenceBadge: "基礎式の外部検証：感度95.0%（更新後未検証）",
    additionalSources: [
      {
        label: "GRADE Guidance 39（GRADE-ADOLOPMENT, 2024）",
        url: GRADE_ADOLOPMENT_GUIDANCE_URL,
      },
      {
        label: "IQWiG 2026：MD Anderson / CADTHの実地比較（Appendix D）",
        url: IQWIG_GUIDELINE_FILTER_COMPARISON_URL,
      },
      {
        label: "GRADE source guideline scoping（GELA/Cochrane Africa, 2024）",
        url: GRADE_SOURCE_GUIDELINE_SCOPING_URL,
      },
      {
        label: "Epistemonikos GRADE guidelines repository",
        url: EPISTEMONIKOS_GRADE_GUIDELINES_URL,
      },
      { label: "WHO Guidelines", url: WHO_GUIDELINES_URL },
    ],
  },
  {
    key: "guideline_broad",
    label: "診療ガイドライン（網羅性優先・大量ノイズ）",
    description:
      "CADTH broad の感度最大フィルターを現行PubMed語彙へ適合させた補助オプションです。実用型で既知の重要ガイドラインが漏れた場合や、網羅性を最優先する正式レビューで使います。",
    expression: GUIDELINE_SENSITIVITY_MAX_EXPRESSION,
    source:
      "Lunny et al., J Clin Epidemiol 2020;117:109-116（CADTH broad：感度98.0%、精度0.01%）",
    sourceUrl: GUIDELINE_FILTER_VALIDATION_URL,
    caution:
      "約1件を得るため数千件を確認し得る低精度フィルターです。通常検索の既定にはせず、専用情報源を検索した後の感度確認に限定してください。現行語彙への更新後は未再検証です。",
    evidenceBadge: "基礎式の外部検証：感度98.0%（更新後未検証）",
  },
  {
    key: "systematic_review",
    label: "SR / メタ解析（最新・未索引を補完）",
    description:
      "PubMed公式 systematic[sb] を土台に、そこに含まれない Meta-Analysis、2025年追加の Network Meta-Analysis 出版タイプ、高信号のタイトル語、検索方法＋選択基準の共起語を補います。最新・in-processレコードを拾いつつ、protocol・editorial・letter・scoping reviewを除外します。2026年の Evidence Synthesis 出版タイプはガイドライン等も含む広い上位語なので、既定式ではタイトル語だけを採用します。",
    expression: SYSTEMATIC_REVIEW_CURRENT_EXPRESSION,
    source:
      "U.S. National Library of Medicine, systematic[sb] strategy（最終改訂2018年12月）",
    sourceUrl: PUBMED_SYSTEMATIC_REVIEW_HELP_URL,
    caution:
      "補完後の結合式そのものは未検証です。Fontanive 2025の検証は15歯科誌・2019年の標本に限られ、他領域へそのまま一般化できません。他データベース、既知SRの引用追跡、レジストリも併用してください。",
    evidenceBadge: "公式subset＋2025/2026語彙（結合後は未検証）",
    additionalSources: [
      {
        label: "Fontanive et al. 2025：最新SRフィルターの外部検証",
        url: SYSTEMATIC_REVIEW_FILTER_VALIDATION_URL,
      },
      {
        label: "Salvador-Oliván et al. 2021：検索方法の共起による補完",
        url: SYSTEMATIC_REVIEW_COMPLEMENT_METHOD_URL,
      },
      {
        label: "NLM 2025 MeSH：Network Meta-Analysis / Scoping Review",
        url: NLM_MESH_2025_HIGHLIGHTS_URL,
      },
      {
        label: "NLM 2026 PubMed article types：Evidence Synthesis",
        url: NLM_2026_ARTICLE_TYPES_URL,
      },
    ],
  },
  {
    key: "guideline_or_sr",
    label: "診療ガイドライン＋SR/メタ解析（実用型）",
    description:
      "ノイズを抑えた診療ガイドライン実用型と、最新・未索引を補うSR/メタ解析式を OR で結合します。GRADE-ADOLOPMENTの候補探索をPubMedで補助するための便宜的フィルターです。",
    expression: GUIDELINE_OR_SR_SENSITIVITY_EXPRESSION,
    source:
      "Lunny 2020のMD Anderson型とNLM systematic[sb]＋現行語彙を本アプリ内でOR結合",
    sourceUrl: GRADE_ADOLOPMENT_GUIDANCE_URL,
    caution:
      "OR結合後の性能は独立検証されていません。候補の存在確認には便利ですが、正式なガイドライン作成では専用情報源と複数データベースを別に検索してください。",
    evidenceBadge: "実用構成式：結合後は未検証",
    additionalSources: [
      {
        label: "GRADE Guidance 39（GRADE-ADOLOPMENT）",
        url: GRADE_ADOLOPMENT_GUIDANCE_URL,
      },
      {
        label: "Epistemonikos GRADE guidelines repository",
        url: EPISTEMONIKOS_GRADE_GUIDELINES_URL,
      },
    ],
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
