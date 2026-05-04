import type { PubMedArticle, CommentsCorrection } from "../types";

export type EvidenceLevel =
  | "meta_analysis"
  | "systematic_review"
  | "rct"
  | "clinical_trial"
  | "guideline"
  | "observational"
  | "case_report"
  | "review"
  | "editorial"
  | "comment"
  | "letter"
  | "unknown";

export interface EvidenceBadge {
  level: EvidenceLevel;
  label: string;
  hint: string;
  color: "high" | "mid" | "low" | "warn" | "neutral";
}

export function getEvidenceBadge(
  publicationTypes: string[] | undefined
): EvidenceBadge {
  const pt = (publicationTypes ?? []).map((p) => p.toLowerCase());
  const has = (s: string) => pt.some((p) => p.includes(s.toLowerCase()));

  if (has("meta-analysis"))
    return {
      level: "meta_analysis",
      label: "Meta-analysis",
      hint: "高: メタ解析",
      color: "high",
    };
  if (has("systematic review"))
    return {
      level: "systematic_review",
      label: "Systematic Review",
      hint: "高: システマティックレビュー",
      color: "high",
    };
  if (
    has("practice guideline") ||
    has("guideline") ||
    has("consensus development")
  )
    return {
      level: "guideline",
      label: "Guideline",
      hint: "高: 診療ガイドライン",
      color: "high",
    };
  if (has("randomized controlled trial"))
    return {
      level: "rct",
      label: "RCT",
      hint: "中〜高: ランダム化比較試験",
      color: "high",
    };
  if (has("clinical trial"))
    return {
      level: "clinical_trial",
      label: "Clinical Trial",
      hint: "中: 臨床試験（RCTでない可能性あり）",
      color: "mid",
    };
  if (has("observational study") || has("cohort") || has("case-control"))
    return {
      level: "observational",
      label: "Observational Study",
      hint: "中: 観察研究",
      color: "mid",
    };
  if (has("case reports"))
    return {
      level: "case_report",
      label: "Case Report",
      hint: "低: 症例報告",
      color: "low",
    };
  if (has("review"))
    return {
      level: "review",
      label: "Review",
      hint: "中: 一般レビュー（SRでない可能性）",
      color: "mid",
    };
  if (has("editorial"))
    return {
      level: "editorial",
      label: "Editorial",
      hint: "注意: Editorial（強い臨床主張の根拠には不適）",
      color: "warn",
    };
  if (has("comment"))
    return {
      level: "comment",
      label: "Comment",
      hint: "注意: コメント（根拠としては不十分）",
      color: "warn",
    };
  if (has("letter"))
    return {
      level: "letter",
      label: "Letter",
      hint: "注意: Letter（根拠としては不十分）",
      color: "warn",
    };
  return {
    level: "unknown",
    label: "Type Unknown",
    hint: "種別要確認",
    color: "neutral",
  };
}

export interface RetractionStatus {
  isRetracted: boolean;
  isRetractionNotice: boolean;
  hasExpressionOfConcern: boolean;
  hasErratum: boolean;
  isDuplicate: boolean;
  details: { type: string; pmid?: string; note?: string }[];
}

export function getRetractionStatus(
  article: PubMedArticle
): RetractionStatus {
  const pt = (article.publicationTypes ?? []).map((p) => p.toLowerCase());
  const cc: CommentsCorrection[] = article.commentsCorrections ?? [];

  const isRetracted =
    pt.some((p) => p.includes("retracted publication")) ||
    cc.some((c) => /retractionin/i.test(c.refType));
  const isRetractionNotice = pt.some((p) =>
    p.includes("retraction of publication")
  );
  const hasExpressionOfConcern =
    pt.some((p) => p.includes("expression of concern")) ||
    cc.some((c) => /expressionofconcern/i.test(c.refType));
  const hasErratum =
    pt.some((p) => p.includes("published erratum")) ||
    cc.some((c) => /erratum/i.test(c.refType));
  const isDuplicate = pt.some((p) => p.includes("duplicate publication"));

  const details = cc
    .filter((c) =>
      /retraction|erratum|expressionofconcern|comment/i.test(c.refType)
    )
    .map((c) => ({ type: c.refType, pmid: c.pmid, note: c.note }));

  return {
    isRetracted,
    isRetractionNotice,
    hasExpressionOfConcern,
    hasErratum,
    isDuplicate,
    details,
  };
}
