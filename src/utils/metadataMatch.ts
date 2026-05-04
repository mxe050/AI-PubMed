import type { PubMedArticle } from "../types";

export interface MetadataMatchResult {
  yearMatch?: { aiClaim: string; pubmed: string; match: boolean };
  doiMatch?: { aiClaim: string; pubmed: string; match: boolean };
  firstAuthorMatch?: { aiClaim: string; pubmed: string; match: boolean };
  journalMatch?: { aiClaim: string; pubmed: string; match: boolean };
  hasAnyCheck: boolean;
}

const JOURNAL_KEYWORDS = [
  "lancet",
  "nejm",
  "new england journal",
  "jama",
  "bmj",
  "annals of internal medicine",
  "circulation",
  "european heart",
  "nature",
  "science",
  "cell",
  "plos",
  "cochrane",
  "blood",
  "diabetes care",
  "gastroenterology",
  "neurology",
];

export function checkMetadataMatch(
  context: string,
  pubmedArticle: PubMedArticle
): MetadataMatchResult {
  const result: MetadataMatchResult = { hasAnyCheck: false };
  if (!context) return result;

  const lower = context.toLowerCase();

  // Year match
  const yearInContext = context.match(/\b(19|20)\d{2}\b/g);
  if (yearInContext && pubmedArticle.year) {
    const claimedYear = yearInContext[yearInContext.length - 1];
    result.yearMatch = {
      aiClaim: claimedYear,
      pubmed: pubmedArticle.year,
      match: claimedYear === pubmedArticle.year,
    };
    result.hasAnyCheck = true;
  }

  // DOI match
  const doiInContext = context.match(
    /10\.\d{4,9}\/[-._;()/:A-Z0-9a-z]+/i
  );
  if (doiInContext && pubmedArticle.doi) {
    const claimedDoi = doiInContext[0]
      .replace(/[.,;:)\]]+$/, "")
      .toLowerCase();
    const pmDoi = pubmedArticle.doi.toLowerCase();
    result.doiMatch = {
      aiClaim: claimedDoi,
      pubmed: pmDoi,
      match: claimedDoi === pmDoi,
    };
    result.hasAnyCheck = true;
  }

  // First author surname match
  if (pubmedArticle.authors && pubmedArticle.authors.length > 0) {
    const firstAuthor = pubmedArticle.authors[0];
    const surname = firstAuthor.split(/\s+/)[0]?.toLowerCase();
    if (surname && surname.length >= 3) {
      const surnameRe = new RegExp(`\\b${escapeRegex(surname)}\\b`, "i");
      const found = surnameRe.test(context);
      result.firstAuthorMatch = {
        aiClaim: found ? `${surname} (in context)` : "(not found in context)",
        pubmed: firstAuthor,
        match: found,
      };
      if (found) result.hasAnyCheck = true;
    }
  }

  // Journal match (heuristic via keyword overlap)
  if (pubmedArticle.journal) {
    const pmJournalLower = pubmedArticle.journal.toLowerCase();
    const matchedKeyword = JOURNAL_KEYWORDS.find(
      (kw) => pmJournalLower.includes(kw) && lower.includes(kw)
    );
    const tokens = pmJournalLower
      .split(/[^a-zA-Z]+/)
      .filter((t) => t.length >= 4);
    const tokenHit = tokens.find((t) => lower.includes(t));
    if (matchedKeyword || tokenHit) {
      result.journalMatch = {
        aiClaim: matchedKeyword ?? tokenHit ?? "(token hit)",
        pubmed: pubmedArticle.journal,
        match: true,
      };
      result.hasAnyCheck = true;
    } else if (
      tokens.length > 0 &&
      tokens.some((t) => lower.includes(t.slice(0, 4)))
    ) {
      // partial hint
    } else {
      result.journalMatch = {
        aiClaim: "(not found in context)",
        pubmed: pubmedArticle.journal,
        match: false,
      };
      result.hasAnyCheck = true;
    }
  }

  return result;
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
