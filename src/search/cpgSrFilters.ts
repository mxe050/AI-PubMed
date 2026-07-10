/**
 * CPG / systematic-review filters used by the dedicated searches.
 *
 * These are deliberately separate from intervention study-design filters.
 * The CPG candidates are locally unvalidated adaptations: published
 * sensitivity/precision estimates for other filters must not be attributed to
 * them. Publication dates are intentionally absent.
 */

export const CPG_FILTER_CANDIDATE_1 =
  '("practice guideline"[pt] OR guideline*[ti])';

export const CPG_FILTER_CANDIDATE_2 =
  '("practice guideline"[pt] OR "clinical practice guideline*"[ti] OR "practice guideline*"[ti] OR "clinical guideline*"[ti] OR (guideline*[ti] NOT medline[sb]))';

/** Default until a project-specific, manually adjudicated known set is supplied. */
export const CPG_FILTER = CPG_FILTER_CANDIDATE_1;

/** CPG exclusions are intentionally empty: formal CPGs are selected positively. */
export const CPG_EXCLUSIONS = '';

export const SR_CORE =
  '(systematic[sb] OR "meta-analysis"[pt] OR "meta-analysis"[ti] OR "meta-analyses"[ti] OR "meta analysis"[ti] OR "meta analyses"[ti] OR metaanaly*[ti])';

/**
 * Not enabled by default. It may only be enabled after measuring incremental
 * recall on a manually adjudicated known-eligible SR set.
 */
export const SR_SENSITIVITY_EXTENSION =
  '((search*[tiab] OR medline[tiab] OR pubmed[tiab] OR embase[tiab] OR cochrane[tiab] OR scopus[tiab] OR "web of science"[tiab] OR "data sources"[tiab]) AND ("study selection"[tiab] OR "selection criteria"[tiab] OR "eligibility criteria"[tiab] OR "inclusion criteria"[tiab] OR "exclusion criteria"[tiab]))';

/** Optional only when the review protocol explicitly includes reviews of reviews. */
export const SR_UMBRELLA_EXTENSION =
  '("umbrella review*"[ti] OR "overview of reviews"[ti] OR "review of reviews"[ti])';

/** Optional only when the review protocol explicitly includes rapid reviews. */
export const SR_RAPID_REVIEW_EXTENSION =
  '("rapid review*"[ti])';

export const SR_EXCLUSIONS =
  '(protocol*[ti] OR "scoping review"[pt] OR "scoping review*"[ti])';

export const CPG_FORBIDDEN_TERMS = [
  'consensus',
  'position statement',
  'practice parameter',
  'appropriate use criteria',
  'appropriateness criteria',
  'guidance statement',
  'recommendation statement',
] as const;

export const FORBIDDEN_DATE_PATTERNS = [
  /\[(?:dp|edat|crdt|epdat|ppdat|pdat)\]/i,
  /\b(?:mindate|maxdate|datetype)\b/i,
  /\blast\s+(?:\d+|x|year)\s+years?\b/i,
  /\b(?:current_year|currentYear)\s*-\s*\d+\b/,
] as const;

export const FORBIDDEN_NOT_TARGETS = [
  'comment[pt]',
  'editorial[pt]',
  'letter[pt]',
  '"case reports"[pt]',
  'withdrawn[ti]',
] as const;

export interface SrFilterOptions {
  sensitivityExtension?: boolean;
  umbrellaExtension?: boolean;
  rapidReviewExtension?: boolean;
}

export function buildSrFilter(options: SrFilterOptions = {}): string {
  const blocks = [SR_CORE];
  if (options.sensitivityExtension) blocks.push(SR_SENSITIVITY_EXTENSION);
  if (options.umbrellaExtension) blocks.push(SR_UMBRELLA_EXTENSION);
  if (options.rapidReviewExtension) blocks.push(SR_RAPID_REVIEW_EXTENSION);
  const inclusion = blocks.length === 1 ? blocks[0] : `(${blocks.join(' OR ')})`;
  return `(${inclusion} NOT ${SR_EXCLUSIONS})`;
}

