import type { ESearchResult } from "../api/esearchPubMed";

export type PubMedTranslationStatus =
  | "error"
  | "warning"
  | "translated"
  | "unchanged";

export interface PubMedTranslationAssessment {
  status: PubMedTranslationStatus;
  translatedQuery: string;
  translationReturned: boolean;
  changed: boolean;
  warnings: string[];
  errors: string[];
}

function normalizeForComparison(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

export function assessPubMedQueryTranslation(
  originalQuery: string,
  result: ESearchResult
): PubMedTranslationAssessment {
  const translationReturned = Boolean(result.queryTranslation?.trim());
  const translatedQuery =
    result.queryTranslation?.trim() || originalQuery.trim();
  const changed =
    normalizeForComparison(originalQuery) !==
    normalizeForComparison(translatedQuery);
  const warnings = result.warningList.filter((message) => message.trim());
  const errors = result.errorList.filter((message) => message.trim());

  const status: PubMedTranslationStatus =
    errors.length > 0
      ? "error"
      : warnings.length > 0
        ? "warning"
        : changed
          ? "translated"
          : "unchanged";

  return {
    status,
    translatedQuery,
    translationReturned,
    changed,
    warnings,
    errors,
  };
}
