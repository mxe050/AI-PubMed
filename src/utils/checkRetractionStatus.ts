import type { PubMedArticle } from "../types";
import { getRetractionStatus } from "./evidenceLevel";
import type { RetractionStatus } from "./evidenceLevel";

export type RetractionFlagKind =
  | "retracted"
  | "retraction_notice"
  | "expression_of_concern"
  | "erratum"
  | "duplicate";

export interface RetractionBadge {
  kind: RetractionFlagKind;
  /** Short label shown on the badge itself. */
  label: string;
  /** Long-form description for tooltip / banner. */
  description: string;
  /** ⚠️ / 📝 / ⚠ / etc. */
  icon: string;
  /** Visual severity: severe (red) / moderate (orange) / mild (yellow). */
  severity: "severe" | "moderate" | "mild";
  /**
   * Related PMID extracted from CommentsCorrections (e.g. the retraction
   * notice for a retracted paper). Each badge can carry one related PMID.
   */
  relatedPmid?: string;
}

export interface RetractionCheckResult {
  /** Underlying status from evidenceLevel.ts (existing logic — not duplicated). */
  raw: RetractionStatus;
  /** Ordered list of badges to render (empty if the paper has no problems). */
  badges: RetractionBadge[];
  /** Convenience flags for code that just needs "is this paper bad?". */
  hasAnyProblem: boolean;
  hasSevereProblem: boolean;
}

/**
 * Single source of truth for the FactCheck UI's retraction warnings.
 * Wraps `getRetractionStatus` (evidenceLevel.ts) and converts it into
 * sortable, render-ready badges.
 */
export function checkRetractionStatus(
  article: PubMedArticle
): RetractionCheckResult {
  const raw = getRetractionStatus(article);
  const badges: RetractionBadge[] = [];

  if (raw.isRetracted) {
    badges.push({
      kind: "retracted",
      label: "撤回済み（Retracted）",
      description:
        "この論文は撤回されています。引用しないでください。撤回通知が PubMed に登録されています。",
      icon: "⚠️",
      severity: "severe",
      relatedPmid: pickRelatedPmid(raw, /retractionin/i),
    });
  }

  if (raw.isRetractionNotice) {
    badges.push({
      kind: "retraction_notice",
      label: "撤回通知（Retraction Notice）",
      description:
        "この論文自体が他論文を撤回するための通知です。撤回された論文側を必ず確認してください。",
      icon: "⚠️",
      severity: "severe",
      relatedPmid: pickRelatedPmid(raw, /retractionof/i),
    });
  }

  if (raw.hasExpressionOfConcern) {
    badges.push({
      kind: "expression_of_concern",
      label: "懸念表明あり（Expression of Concern）",
      description:
        "この論文には学術的・倫理的な懸念が表明されています。引用前に内容を確認してください。",
      icon: "⚠",
      severity: "moderate",
      relatedPmid: pickRelatedPmid(raw, /expressionofconcern/i),
    });
  }

  if (raw.hasErratum) {
    badges.push({
      kind: "erratum",
      label: "正誤表あり（Erratum published）",
      description:
        "この論文には正誤表（訂正）が出ています。元論文と訂正内容の両方を確認してください。",
      icon: "📝",
      severity: "mild",
      relatedPmid: pickRelatedPmid(raw, /erratum/i),
    });
  }

  if (raw.isDuplicate) {
    badges.push({
      kind: "duplicate",
      label: "重複出版（Duplicate Publication）",
      description:
        "別の論文と内容が重複している可能性があります（同じ研究の二重投稿など）。",
      icon: "⚠",
      severity: "moderate",
    });
  }

  // Severity-priority ordering: severe → moderate → mild
  const severityOrder: Record<RetractionBadge["severity"], number> = {
    severe: 0,
    moderate: 1,
    mild: 2,
  };
  badges.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

  const hasSevereProblem = badges.some((b) => b.severity === "severe");

  return {
    raw,
    badges,
    hasAnyProblem: badges.length > 0,
    hasSevereProblem,
  };
}

function pickRelatedPmid(raw: RetractionStatus, refTypeRe: RegExp): string | undefined {
  const match = raw.details.find((d) => refTypeRe.test(d.type));
  return match?.pmid;
}

/**
 * Compact one-liner for log / tooltip / aria-label:
 *   "⚠️ 撤回済み（Retracted）, 📝 正誤表あり"
 */
export function describeRetractionStatus(article: PubMedArticle): string {
  const result = checkRetractionStatus(article);
  if (result.badges.length === 0) return "";
  return result.badges.map((b) => `${b.icon} ${b.label}`).join(", ");
}
