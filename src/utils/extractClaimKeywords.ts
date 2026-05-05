/**
 * Pulls "important" keywords out of an AI-generated claim so we can highlight
 * them inside the matching PubMed abstract. Pure heuristic — no AI calls.
 *
 * Outputs unique tokens, lower-cased except numeric units, ordered by first
 * appearance in the input. A side channel returns the percentage of those
 * tokens that occur in the supplied abstract (case-insensitive).
 */

const STOPWORDS_EN = new Set<string>([
  "the", "a", "an", "is", "was", "in", "of", "and", "or", "that", "this",
  "with", "for", "to", "from", "by", "at", "on", "as", "it", "be", "are",
  "were", "been", "has", "have", "had", "which", "their", "our", "but",
  "not", "they", "we", "no", "do", "did", "will", "would", "could", "should",
  "may", "might", "can", "shall", "its", "these", "those", "than", "also",
  "into", "over", "such", "both", "each", "between", "after", "before",
  "during", "through", "about", "however", "thus", "therefore", "while",
  "when", "where", "who", "whom", "what", "why", "how", "if", "then", "else",
  "than", "more", "most", "less", "least", "very", "much", "many", "any",
  "all", "some", "other", "another", "same", "different", "new", "old",
  // Citation noise: "et al.", "vs", "cf", "etc", "e.g.", "i.e." etc. should not be keywords.
  "et", "al", "vs", "cf", "etc", "ie", "eg", "pp", "pmid", "doi",
]);

const STOPWORDS_JA = new Set<string>([
  "は", "が", "を", "に", "で", "の", "と", "も", "た", "だ", "て", "し",
  "れ", "さ", "い", "な", "する", "ある", "いる", "この", "その", "あの",
  "どの", "こと", "もの", "ため", "という", "について", "において",
  "における", "により", "による", "及び", "および", "または", "ならびに",
  "など", "なお", "また", "さらに", "とくに", "特に", "ほぼ", "より",
  "ような", "ように", "ことが", "ことを", "ことは", "ものが", "ものを",
]);

const NUMERIC_TOKEN_RE = /[A-Za-z]?\d+(?:\.\d+)?(?:%|％)?(?:\s*(?:CI|95%CI|p|n|N|HR|OR|RR|SD|SE))?/g;

/**
 * Pulls keywords from raw text. Numbers ("p=0.05", "n=120", "95%CI") are
 * preserved verbatim; English/Japanese alpha tokens get stop-word filtered.
 */
export function extractClaimKeywords(text: string): string[] {
  if (!text) return [];

  const ordered: string[] = [];
  const seen = new Set<string>();

  // 1) Numeric / statistical expressions first — high signal, must survive.
  collectStatisticalExpressions(text).forEach((tok) => {
    const norm = normalizeToken(tok);
    if (!seen.has(norm)) {
      seen.add(norm);
      ordered.push(tok);
    }
  });

  // 2) Word-level tokens (English + Japanese). Split on whitespace and
  //    common punctuation. Keep CJK runs together.
  const tokens = tokenize(text);
  for (const t of tokens) {
    if (!isContentful(t)) continue;
    const norm = normalizeToken(t);
    if (seen.has(norm)) continue;
    seen.add(norm);
    ordered.push(t);
  }

  return ordered;
}

/**
 * Compute keyword match: how many keywords from `claim` appear (case-insensitively)
 * inside `target`. Each keyword counts at most once.
 */
export function computeKeywordMatch(
  claim: string,
  target: string
): {
  keywords: string[];
  matched: string[];
  percent: number;
} {
  const keywords = extractClaimKeywords(claim);
  if (keywords.length === 0) {
    return { keywords, matched: [], percent: 0 };
  }
  const lowerTarget = (target ?? "").toLowerCase();
  const matched: string[] = [];
  for (const kw of keywords) {
    if (lowerTarget.includes(kw.toLowerCase())) {
      matched.push(kw);
    }
  }
  const percent = Math.round((matched.length / keywords.length) * 100);
  return { keywords, matched, percent };
}

// -------------------------- helpers --------------------------

function tokenize(text: string): string[] {
  // Drop stat expressions to avoid double-counting them as plain words.
  const stripped = text.replace(NUMERIC_TOKEN_RE, " ");
  // Split on whitespace + most punctuation; keep CJK runs intact.
  const parts = stripped.split(
    /[\s,，、。.!?！？:：;；()（）\[\]【】「」『』<>《》/\\|"'`*+_=#]+/u
  );
  const out: string[] = [];
  for (const p of parts) {
    if (!p) continue;
    // If a part contains both Latin alphanumerics and CJK, split further.
    if (/[A-Za-z0-9]/.test(p) && /[぀-ヿ㐀-鿿]/.test(p)) {
      const sub = p.split(/(?<=[A-Za-z0-9])(?=[぀-ヿ㐀-鿿])|(?<=[぀-ヿ㐀-鿿])(?=[A-Za-z0-9])/u);
      out.push(...sub);
    } else {
      out.push(p);
    }
  }
  return out;
}

function isContentful(tok: string): boolean {
  const t = tok.trim();
  if (!t) return false;
  if (t.length === 1 && !/\d/.test(t)) return false; // single ASCII letter or kana
  // Drop very short pure-ASCII tokens (≤2 chars) — they cause noisy highlights ("al", "et").
  if (t.length <= 2 && /^[A-Za-z]+$/.test(t)) return false;
  const lower = t.toLowerCase();
  if (STOPWORDS_EN.has(lower)) return false;
  if (STOPWORDS_JA.has(t)) return false;
  // Pure punctuation / symbol
  if (!/[\p{L}\p{N}]/u.test(t)) return false;
  return true;
}

function normalizeToken(t: string): string {
  return t.toLowerCase().normalize("NFKC");
}

function collectStatisticalExpressions(text: string): string[] {
  const out: string[] = [];
  const patterns = [
    /\bp\s*[=<>≤≥]\s*0?\.\d+\b/gi,
    /\b(?:n|N)\s*[=]\s*\d+(?:[,，]\d+)*\b/g,
    /\b\d+(?:\.\d+)?%(?:\s*CI)?\b/g,
    /\b95%?\s*CI[\s:：]*[\d\.\-–—]+(?:[\s,–—-]+[\d\.\-]+)?/gi,
    /\b(?:HR|OR|RR|RD)\s*[=:：]?\s*\d+(?:\.\d+)?\b/gi,
    /\b\d+(?:\.\d+)?\s*(?:mg|μg|ug|g|kg|ml|mL|L|U|IU|mmHg|°C|years?|months?|weeks?|days?)\b/gi,
  ];
  for (const re of patterns) {
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      out.push(m[0].trim());
    }
  }
  return out;
}
