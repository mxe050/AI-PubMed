// Intervention study-design filters for PubMed.
// CPG and SR are document types with different retrieval purposes and are
// implemented as independent searches in src/search/cpgSrFilters.ts.

export type StudyDesignFilterKey = 'none' | 'rct' | 'non_rct';

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
}

export const COCHRANE_CHAPTER_4_URL =
  'https://www.cochrane.org/authors/handbooks-and-manuals/handbook/current/chapter-04';
export const COCHRANE_CHAPTER_24_URL =
  'https://www.cochrane.org/authors/handbooks-and-manuals/handbook/current/chapter-24';
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

