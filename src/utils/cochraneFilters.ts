// Intervention study-design filters for PubMed.
// CPG and SR are document-type filters rather than intervention designs. They
// remain separate choices and are never merged into one convenience filter.

import { CPG_FILTER, buildSrFilter } from '../search/cpgSrFilters';

export type StudyDesignFilterKey =
  | 'none'
  | 'guideline'
  | 'systematic_review'
  | 'rct'
  | 'non_rct';

export interface StudyDesignFilter {
  key: StudyDesignFilterKey;
  label: string;
  description: string;
  expression: string;
  source: string;
  sourceUrl?: string;
  caution?: string;
  evidenceBadge: string;
  additionalSources?: Array<{ label: string; url: string }>;
  /** Ready-to-adapt wording for a protocol/manuscript Methods section. */
  methodsTemplate?: string;
  /** Complete references suitable for a manuscript bibliography. */
  references?: Array<{ citation: string; url: string }>;
}

export const COCHRANE_CHAPTER_4_URL =
  'https://www.cochrane.org/authors/handbooks-and-manuals/handbook/current/chapter-04';
export const COCHRANE_CHAPTER_24_URL =
  'https://www.cochrane.org/authors/handbooks-and-manuals/handbook/current/chapter-24';
export const LUNNY_GUIDELINE_FILTER_URL =
  'https://pubmed.ncbi.nlm.nih.gov/31610216/';
export const GRADE_ADOLOPMENT_GUIDANCE_URL =
  'https://doi.org/10.1016/j.jclinepi.2024.111494';
export const ISSG_GUIDELINE_FILTERS_URL =
  'https://sites.google.com/a/york.ac.uk/issg-search-filters-resource/home/guidelines';
export const NLM_SYSTEMATIC_FILTER_URL =
  'https://www.nlm.nih.gov/bsd/pubmed_subsets/sysreviews_strategy.html';
export const COCHRANE_SR_FILTER_REVIEW_URL =
  'https://doi.org/10.1002/14651858.MR000054.pub2';
export const ANIMAL_ONLY_EXCLUSION = '(animals[mh] NOT humans[mh])';

/** Cochrane Highly Sensitive Search Strategy, sensitivity-maximizing PubMed format. */
export const COCHRANE_RCT_SENSITIVITY_MAX_EXPRESSION =
  '(randomized controlled trial[pt] OR controlled clinical trial[pt] OR randomized[tiab] OR placebo[tiab] OR drug therapy[sh] OR randomly[tiab] OR trial[tiab] OR groups[tiab])';

export const studyDesignFilters: StudyDesignFilter[] = [
  {
    key: 'none',
    label: 'フィルターなし（最も広い）',
    description:
      '研究デザインでは絞り込みません。未索引・デザイン表記が不明確な文献も残します。',
    expression: '',
    source: '',
    evidenceBadge: '感度最大：制限なし',
    methodsTemplate:
      '研究デザインまたは文書種別による検索フィルターは適用しなかった。',
  },
  {
    key: 'guideline',
    label: '診療ガイドライン（実用型）',
    description:
      '索引済みのPractice Guidelineと、タイトルにguidelineを明記した未索引・新着レコードを検索する簡潔なPubMed式です。consensus statement、position statement、practice parameter等は含めません。',
    expression: CPG_FILTER,
    source:
      'Lunny et al. 2020、ISSG Guidelines Resource、GRADE Guidance 39を参照した目的適合型の改変式',
    sourceUrl: LUNNY_GUIDELINE_FILTER_URL,
    caution:
      'この完全一致式自体は外部検証済みではなく、Lunnyらの性能値を転用できません。GRADE-ADOLOPMENTではPubMedだけで完結せず、Epistemonikos-GRADE、WHO、GIN、学会・発行機関サイト等も検索してください。',
    evidenceBadge: '参照文献あり・改変後未検証',
    methodsTemplate:
      'PubMedを開始年から検索日まで検索した。トピック検索式に、実用的な診療ガイドライン検索ブロック（"practice guideline"[pt] OR guideline*[ti]）をAND結合した。本式はLunnyらおよびISSG Search Filters Resourceを参照して本研究の対象定義に合わせて改変したため、原フィルターの報告済み性能値は適用しなかった。GRADE-ADOLOPMENT Guidance 39に従い、ガイドライン専用データベースおよび発行機関ウェブサイトも補完検索した。出版年制限は用いなかった。',
    references: [
      {
        citation:
          'Lunny C, Salzwedel DM, Liu T, et al. Validation of five search filters for retrieval of clinical practice guidelines produced low precision. J Clin Epidemiol. 2020;117:109-116. doi:10.1016/j.jclinepi.2019.09.022.',
        url: LUNNY_GUIDELINE_FILTER_URL,
      },
      {
        citation:
          'Klugar M, Lotfi T, Darzi AJ, et al; GRADE Working Group. GRADE guidance 39: using GRADE-ADOLOPMENT to adopt, adapt or create contextualized recommendations from source guidelines and evidence syntheses. J Clin Epidemiol. 2024;174:111494. doi:10.1016/j.jclinepi.2024.111494.',
        url: GRADE_ADOLOPMENT_GUIDANCE_URL,
      },
      {
        citation:
          'InterTASC Information Specialists\' Sub-Group. ISSG Search Filters Resource: Guidelines [Internet]. York (UK): University of York; updated 2026 Jun 15 [cited YYYY Mon DD].',
        url: ISSG_GUIDELINE_FILTERS_URL,
      },
    ],
    additionalSources: [
      { label: 'GRADE Guidance 39（Step 3: source guidelineの同定）', url: GRADE_ADOLOPMENT_GUIDANCE_URL },
      { label: 'ISSG Guidelines filters（2026更新）', url: ISSG_GUIDELINE_FILTERS_URL },
    ],
  },
  {
    key: 'systematic_review',
    label: 'SR / メタ解析（実用型）',
    description:
      'PubMed公式Systematic Review subsetを中心に、Meta-Analysisの出版タイプと高信号のタイトル語を補います。protocolとscoping reviewだけを限定的に除外します。',
    expression: buildSrFilter(),
    source:
      'NLM systematic[sb]を中心に、Cochrane Methodology Review 2023と現行Publication Typeを考慮した改変式',
    sourceUrl: NLM_SYSTEMATIC_FILTER_URL,
    caution:
      '結合式全体は外部検証済みではありません。抄録中の検索方法ヒューリスティック、umbrella review、rapid reviewは既定式へ含めていません。複数データベースと引用追跡を併用してください。',
    evidenceBadge: 'NLM公式subset中心・結合後未検証',
    methodsTemplate:
      'PubMedを開始年から検索日まで検索した。トピック検索式に、NLMのSystematic Review subsetを中心とする検索ブロック（systematic[sb] OR "meta-analysis"[pt] OR "meta-analysis"[ti] OR "meta-analyses"[ti] OR "meta analysis"[ti] OR "meta analyses"[ti] OR metaanaly*[ti]）をAND結合し、明示的なprotocolおよびscoping reviewを限定的に除外した。結合式は改変式であるため既報の性能値を転用しなかった。出版年制限は用いなかった。',
    references: [
      {
        citation:
          'National Library of Medicine. Search strategy used to create the PubMed Systematic Reviews filter [Internet]. Bethesda (MD): NLM; last modified 2018 Dec [cited YYYY Mon DD].',
        url: NLM_SYSTEMATIC_FILTER_URL,
      },
      {
        citation:
          'Escobar Liquitay CM, Garegnani L, Garrote V, Solà I, Franco JVA. Search strategies (filters) to identify systematic reviews in MEDLINE and Embase. Cochrane Database Syst Rev. 2023;9:MR000054. doi:10.1002/14651858.MR000054.pub2.',
        url: COCHRANE_SR_FILTER_REVIEW_URL,
      },
    ],
  },
  {
    key: 'rct',
    label: 'RCT（Cochrane 感度最大）',
    description:
      'Cochrane Handbook掲載のPubMed用Highly Sensitive Search Strategyの感度最大版を使用します。',
    expression: COCHRANE_RCT_SENSITIVITY_MAX_EXPRESSION,
    source:
      'Cochrane Handbook, Chapter 4, Box 4.4.a（2008 revision; PubMed format）',
    sourceUrl: COCHRANE_CHAPTER_4_URL,
    caution:
      '感度を優先するためノイズは増えます。査読原稿では検索日、完全な式、インターフェースを併記してください。',
    evidenceBadge: 'Cochrane掲載・感度最大',
    methodsTemplate:
      'ランダム化比較試験の検索には、Cochrane Highly Sensitive Search StrategyのPubMed用感度最大版を使用した。',
    references: [
      {
        citation:
          'Lefebvre C, Glanville J, Briscoe S, et al. Chapter 4: Searching for and selecting studies. In: Higgins JPT, Thomas J, Chandler J, et al, eds. Cochrane Handbook for Systematic Reviews of Interventions. Version 6.5.1. Cochrane; 2025.',
        url: COCHRANE_CHAPTER_4_URL,
      },
    ],
  },
  {
    key: 'non_rct',
    label: '非RCT（感度最大：デザインで絞らない）',
    description:
      '非ランダム化研究はデザイン名と索引が一貫しないため、既定では方法論フィルターを追加しません。',
    expression: '',
    source:
      'Cochrane Handbook, Chapter 24 §24.3.1.1（NRSI検索フィルターの限界）',
    sourceUrl: COCHRANE_CHAPTER_24_URL,
    caution:
      '「非RCTを同定する検証済み式」ではありません。研究デザインはスクリーニング時に判定します。',
    evidenceBadge: 'Cochraneの注意に沿った広い検索',
    methodsTemplate:
      '非ランダム化研究については、方法論フィルターによる検索漏れを避けるため研究デザインによる制限を適用せず、スクリーニング時に研究デザインを判定した。',
    references: [
      {
        citation:
          'Reeves BC, Deeks JJ, Higgins JPT, et al. Chapter 24: Including non-randomized studies on intervention effects. In: Cochrane Handbook for Systematic Reviews of Interventions. Version 6.5.1. Cochrane; 2025.',
        url: COCHRANE_CHAPTER_24_URL,
      },
    ],
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
    core: trimmed.replace(TRAILING_ANIMAL_EXCLUSION, '').trim(),
    hadExclusion: TRAILING_ANIMAL_EXCLUSION.test(trimmed),
  };
}

/** Add the standard animal-only exclusion once, tolerating tag whitespace. */
export function appendAnimalOnlyExclusion(query: string): string {
  const { core, hadExclusion } = splitTrailingAnimalExclusion(query);
  if (!core) return '';
  if (hadExclusion) return `${core} NOT ${ANIMAL_ONLY_EXCLUSION}`;
  return `(${core}) NOT ${ANIMAL_ONLY_EXCLUSION}`;
}

/** Apply the intervention design filter to a base query. */
export function applyStudyDesignFilter(
  baseQuery: string,
  filter: StudyDesignFilter
): string {
  const { core, hadExclusion } = splitTrailingAnimalExclusion(baseQuery);
  if (!core) return '';
  const filtered = filter.expression
    ? `(${core}) AND (${filter.expression})`
    : core;
  return hadExclusion
    ? `${filtered} NOT ${ANIMAL_ONLY_EXCLUSION}`
    : filtered;
}
