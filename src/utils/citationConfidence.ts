import type { ExtractedPmid } from "./extractPmidsCategorized";
import type {
  CitationCandidate,
  CitationCandidateType,
} from "./extractCitationCandidates";

export type CitationConfidence = "HIGH" | "MEDIUM" | "LOW";

export interface CitationConfidenceInfo {
  level: CitationConfidence;
  label: string;
  reason: string;
}

const HIGH: CitationConfidenceInfo = {
  level: "HIGH",
  label: "🟢 高信頼",
  reason: "PMIDまたはDOIで特定できました",
};

const MEDIUM: CitationConfidenceInfo = {
  level: "MEDIUM",
  label: "🟡 中信頼",
  reason: "著者名と年で推定しています。候補が複数あるため確認をお勧めします",
};

const LOW: CitationConfidenceInfo = {
  level: "LOW",
  label: "🔴 低信頼",
  reason: "具体的な論文を特定できませんでした。手動での確認が必要です",
};

/**
 * Score a verified PMID extraction:
 *  - explicit "PMID: 12345" / pubmed_url confirmed by PubMed → HIGH
 *  - bare 5-9 digit number (誤検出含む) confirmed by PubMed   → MEDIUM
 *  - any extracted PMID NOT confirmed                          → LOW
 */
export function scorePmidExtractionConfidence(args: {
  extracted: ExtractedPmid;
  verified: boolean;
}): CitationConfidenceInfo {
  if (!args.verified) return LOW;
  if (
    args.extracted.confidence === "explicit" ||
    args.extracted.confidence === "pubmed_url"
  ) {
    return HIGH;
  }
  return MEDIUM;
}

/**
 * Score a citation candidate (title / author+year+journal) against PubMed
 * search results. The candidate context is also inspected for fallback
 * markers (PMID/DOI nearby, vague-citation phrases).
 */
export function scoreCitationConfidence(args: {
  candidate: CitationCandidate;
  pubmedHitCount: number;
  /** Best title-similarity among hits (0..1). */
  bestSimilarity?: number;
}): CitationConfidenceInfo {
  const { candidate, pubmedHitCount, bestSimilarity = 0 } = args;
  const ctx = candidate.context ?? "";

  if (isVagueCitation(candidate.display) || isVagueCitation(ctx)) {
    return LOW;
  }

  // PMID / DOI inside the surrounding context wins.
  if (/PMID\s*[:#]?\s*\d{1,9}/i.test(ctx) || /\b10\.\d{4,9}\/\S+/i.test(ctx)) {
    return HIGH;
  }

  // Single perfect hit on PubMed → HIGH.
  if (pubmedHitCount === 1 && bestSimilarity >= 0.85) {
    return HIGH;
  }

  if (pubmedHitCount === 0) {
    return LOW;
  }

  // No clear year for an "author-only" reference → LOW.
  if (
    candidate.type === "author_year_journal" ||
    candidate.enhancedWithAuthorYear ||
    /(?:19|20)\d{2}/.test(candidate.display)
  ) {
    return MEDIUM;
  }

  // Title-only candidates that hit something but aren't PMID/DOI verified
  // still default to MEDIUM (manual confirmation needed).
  void ({} as CitationCandidateType);
  return MEDIUM;
}

const VAGUE_PATTERNS = [
  /複数の研究/,
  /いくつかの報告/,
  /several studies/i,
  /multiple reports/i,
  /a number of (?:studies|trials|reports)/i,
  /many studies/i,
];

function isVagueCitation(text: string): boolean {
  if (!text) return false;
  return VAGUE_PATTERNS.some((re) => re.test(text));
}

export function summarizeConfidenceCounts<T extends { confidence: CitationConfidenceInfo }>(
  items: T[]
): Record<CitationConfidence, number> {
  const out: Record<CitationConfidence, number> = { HIGH: 0, MEDIUM: 0, LOW: 0 };
  for (const it of items) {
    out[it.confidence.level] += 1;
  }
  return out;
}
