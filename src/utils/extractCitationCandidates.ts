export type CitationCandidateType =
  | "quoted_title"
  | "italic_title"
  | "english_plain_title"
  | "title_year_pattern"
  | "author_year";

export interface CitationCandidate {
  id: string;
  raw: string;
  type: CitationCandidateType;
  /** ESearch query that PubMed can use to find this citation. */
  query: string;
  /** Display label for UI. */
  display: string;
  context: string;
}

/** Academic keywords that strongly suggest a phrase is a paper title. */
const ACADEMIC_KEYWORDS = [
  // study design
  "review",
  "systematic review",
  "meta-analysis",
  "meta analysis",
  "randomized controlled trial",
  "randomised controlled trial",
  "controlled trial",
  "clinical trial",
  "cohort study",
  "case-control",
  "cross-sectional",
  "observational",
  "validation",
  "reliability",
  "reproducibility",
  "agreement",
  // recommendation / guideline
  "guideline",
  "guidelines",
  "consensus",
  "statement",
  "recommendation",
  // research focus
  "efficacy",
  "effectiveness",
  "safety",
  "outcome",
  "outcomes",
  "diagnosis",
  "treatment",
  "management",
  "comparison",
  "evaluation",
  "assessment",
  "impact",
  "association",
  "relationship",
  // study type
  "trial",
  "study",
  "studies",
  "analysis",
  "survey",
  "report",
];

const ACADEMIC_KEYWORDS_RE = new RegExp(
  `\\b(${ACADEMIC_KEYWORDS.map((k) => k.replace(/[-\s]/g, "[\\s-]")).join("|")})\\b`,
  "i"
);

export function extractCitationCandidates(text: string): CitationCandidate[] {
  if (!text) return [];
  const found = new Map<string, CitationCandidate>();

  // 1) Quoted titles: 「...」『...』 / "..." / “...” — but FILTER Japanese
  //    descriptive sentences that aren't titles.
  const quotePatterns = [
    /「([^」]{8,250})」/g,
    /『([^』]{8,250})』/g,
    /"([^"]{12,250})"/g,
    /“([^”]{12,250})”/g,
  ];

  for (const re of quotePatterns) {
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      const title = m[1].trim();
      if (!looksLikeTitle(title)) continue;
      const id = `quoted:${title.toLowerCase()}`;
      if (!found.has(id)) {
        found.set(id, {
          id,
          raw: m[0],
          type: "quoted_title",
          query: buildTitleQuery(title),
          display: title,
          context: getContext(text, m.index, 200),
        });
      }
    }
  }

  // 2) Italic titles: *...* or _..._ (markdown italic)
  const italicPatterns = [
    /(?<!\*)\*([^*\n]{12,250})\*(?!\*)/g,
    /(?<![_\w])_([^_\n]{12,250})_(?!\w)/g,
  ];
  for (const re of italicPatterns) {
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      const title = m[1].trim();
      if (!looksLikeTitle(title)) continue;
      const id = `italic:${title.toLowerCase()}`;
      if (!found.has(id)) {
        found.set(id, {
          id,
          raw: m[0],
          type: "italic_title",
          query: buildTitleQuery(title),
          display: title,
          context: getContext(text, m.index, 200),
        });
      }
    }
  }

  // 3) English title followed by year in parentheses:
  //    "Oral health status and ... systematic review (2006年)"
  //    "Some Title: A Subtitle (2020)"
  const titleYearRe =
    /([A-Z][A-Za-zÀ-ſ0-9'\-,:;()&\s]{20,250}?)\s*[\(（]\s*((?:19|20)\d{2})\s*年?\s*[\)）]/g;
  let m: RegExpExecArray | null;
  while ((m = titleYearRe.exec(text)) !== null) {
    const title = m[1].trim().replace(/[,:;\s]+$/, "");
    const year = m[2];
    if (!looksLikeEnglishTitle(title)) continue;
    const id = `title-year:${title.toLowerCase()}:${year}`;
    if (!found.has(id)) {
      found.set(id, {
        id,
        raw: m[0],
        type: "title_year_pattern",
        query: `(${buildTitleQuery(title)}) AND ${year}[dp]`,
        display: `${title} (${year})`,
        context: getContext(text, m.index, 200),
      });
    }
  }

  // 4) English plain-text title: starts with capital, has academic keywords,
  //    5-35 words, mostly English. (Catches inline mentions in Japanese prose.)
  //    e.g. "...the paper Oral health status and health-related quality of life:
  //    a systematic review showed..."
  const englishTitles = extractEnglishPlainTextTitles(text);
  for (const t of englishTitles) {
    const id = `english:${t.title.toLowerCase()}`;
    if (!found.has(id)) {
      found.set(id, {
        id,
        raw: t.title,
        type: "english_plain_title",
        query: buildTitleQuery(t.title),
        display: t.title,
        context: getContext(text, t.index, 200),
      });
    }
  }

  // 5) Author + year: "Smith et al. 2017", "Smith and Jones 2020", etc.
  const authorYearRe =
    /([A-Z][a-zA-ZÀ-ſ'\-]{1,30}(?:\s+et\s+al\.?|\s+and\s+[A-Z][a-zA-ZÀ-ſ'\-]{1,30})?)[\s,(]+((?:19|20)\d{2})\b/g;
  while ((m = authorYearRe.exec(text)) !== null) {
    const authorRaw = m[1].trim();
    const year = m[2];
    const surname = authorRaw
      .replace(/\s+et\s+al\.?$/i, "")
      .split(/\s+and\s+/)[0]
      .split(/\s+/)[0]
      .trim();
    if (surname.length < 2) continue;
    const id = `author:${authorRaw.toLowerCase()}:${year}`;
    if (!found.has(id)) {
      const display = `${authorRaw}, ${year}`;
      found.set(id, {
        id,
        raw: m[0],
        type: "author_year",
        query: `${surname}[Author] AND ${year}[dp]`,
        display,
        context: getContext(text, m.index, 200),
      });
    }
  }

  // Limit to 50 candidates
  return Array.from(found.values()).slice(0, 50);
}

function buildTitleQuery(title: string): string {
  // Strip trailing punctuation, normalize whitespace
  const t = title.replace(/[\s.,;:!?]+$/, "").replace(/\s+/g, " ").trim();
  return `"${t}"[Title] OR "${t}"[Title/Abstract]`;
}

/**
 * Check if a quoted/italic string looks like a paper title.
 * - Reject Japanese descriptive sentences (verb-ending)
 * - Accept English title-like phrases or Japanese noun-phrase titles
 */
function looksLikeTitle(s: string): boolean {
  if (s.length < 12 || s.length > 250) return false;

  // Reject obvious non-titles
  if (/^https?:\/\//i.test(s)) return false;
  if (/^[\d\s.\-_/]+$/.test(s)) return false;
  if (/^[A-Z_]+$/.test(s)) return false;

  const englishCharCount = (s.match(/[A-Za-z]/g) ?? []).length;
  const japaneseCharCount = (s.match(/[぀-ゟ゠-ヿ一-鿿]/g) ?? []).length;
  const isLetterRich = englishCharCount + japaneseCharCount >= 8;
  if (!isLetterRich) return false;

  // If mostly English, treat as English title
  if (englishCharCount > japaneseCharCount * 2) {
    return looksLikeEnglishTitle(s);
  }

  // If mostly Japanese, apply Japanese title heuristics
  if (japaneseCharCount > englishCharCount) {
    return looksLikeJapaneseTitle(s);
  }

  // Mixed — accept if has space (multi-word) or is long
  return /\s/.test(s) || s.length >= 20;
}

function looksLikeEnglishTitle(s: string): boolean {
  // Must start with capital letter
  if (!/^[A-Z]/.test(s.trim())) return false;
  const words = s.split(/\s+/);
  if (words.length < 3 || words.length > 40) return false;
  // English titles often have either:
  //   - Multiple words with first capital (Title Case or Sentence case)
  //   - Or contain academic keywords
  //   - Or have ":" subtitle marker
  return (
    ACADEMIC_KEYWORDS_RE.test(s) ||
    /:/.test(s) ||
    words.length >= 5
  );
}

/**
 * Reject Japanese descriptive sentences. Accept Japanese titles (typically
 * noun-phrases).
 */
function looksLikeJapaneseTitle(s: string): boolean {
  const trimmed = s.trim();

  // Reject sentences that look like complete predicates / declarative sentences
  // Common verb endings or copula endings:
  const sentenceEndings = [
    /である\.?$/,
    /であった\.?$/,
    /です\.?$/,
    /ます\.?$/,
    /ました\.?$/,
    /[いた]\.?$/, // verb-ending in past
    /なる\.?$/,
    /なった\.?$/,
    /示す\.?$/,
    /示した\.?$/,
    /された\.?$/,
    /ない\.?$/,
    /ある\.?$/,
    /される\.?$/,
    /いる\.?$/,
    /推奨される\.?$/,
    /低下させる(要因|原因)?である\.?$/,
    /[をがにはで][^を]*?(する|なる|される|なった)\.?$/, // 〜を〜する型
  ];
  for (const re of sentenceEndings) {
    if (re.test(trimmed)) return false;
  }

  // Common Japanese paper-title noun-phrase suffixes — accept these
  const titleSuffixes = [
    /検討$/,
    /報告$/,
    /研究$/,
    /症例$/,
    /調査$/,
    /評価$/,
    /考察$/,
    /総説$/,
    /解析$/,
    /比較$/,
    /分類$/,
    /提案$/,
    /試み$/,
    /現状$/,
    /展望$/,
    /解説$/,
    /実態$/,
    /経験$/,
    /応用$/,
    /有効性$/,
    /有用性$/,
    /発生$/,
    /影響$/,
    /改善$/,
    /検出$/,
    /同定$/,
    /診断$/,
    /治療$/,
    /管理$/,
    /症例報告$/,
    /システマティックレビュー$/,
    /メタ解析$/,
    /メタアナリシス$/,
  ];
  if (titleSuffixes.some((re) => re.test(trimmed))) return true;

  // Reject anything that ends with a Japanese sentence punctuation that
  // suggests a complete sentence
  if (/[。.]$/.test(trimmed)) {
    // Only accept if there's no verb-ending detected above (already filtered)
    // and the content looks noun-like — but to be safe, reject by default
    return false;
  }

  // Default: noun-phrase that doesn't end in obvious sentence pattern — accept
  // only if it's reasonably title-like (no clear verb in middle either)
  if (/(?:である|でした|ました|されている|されていた|なる|示す|考えられる)/.test(trimmed)) {
    return false;
  }

  return true;
}

/**
 * Extract English-style paper titles from plain (un-quoted) text.
 * Strategy: scan for capitalized phrases with academic keywords or title-case
 * patterns.
 */
function extractEnglishPlainTextTitles(
  text: string
): { title: string; index: number }[] {
  const out: { title: string; index: number }[] = [];

  // Strategy A: phrases ending in academic keyword and contain colon
  // Pattern: Capital + words + : + words + (optional academic keyword)
  const colonTitleRe =
    /([A-Z][A-Za-zÀ-ſ0-9'\-,&\s]{8,150}?:\s+[A-Za-zÀ-ſ0-9'\-,&\s]{5,150}?)(?=[.,;。、]|\s*\(|\s*\d{4}|$)/gm;
  let m: RegExpExecArray | null;
  while ((m = colonTitleRe.exec(text)) !== null) {
    const candidate = m[1].trim();
    if (looksLikeEnglishTitle(candidate) && hasGoodEnglishRatio(candidate)) {
      out.push({ title: candidate, index: m.index });
    }
  }

  // Strategy B: long English phrases with academic keywords (no colon)
  // Look for capitalized start, 5-35 English words, contains academic keyword
  const phraseRe =
    /(?:^|[^A-Za-z])([A-Z][A-Za-zÀ-ſ0-9'\-,&]+(?:\s+[A-Za-zÀ-ſ0-9'\-,&]+){4,34})(?=[.,;。、:]|\s*\(\d|\s*$)/gm;
  while ((m = phraseRe.exec(text)) !== null) {
    const candidate = m[1].trim();
    if (
      ACADEMIC_KEYWORDS_RE.test(candidate) &&
      looksLikeEnglishTitle(candidate) &&
      hasGoodEnglishRatio(candidate)
    ) {
      // Skip if already collected
      if (!out.some((o) => o.title === candidate)) {
        out.push({ title: candidate, index: m.index });
      }
    }
  }

  return out;
}

function hasGoodEnglishRatio(s: string): boolean {
  const englishCount = (s.match(/[A-Za-z]/g) ?? []).length;
  const totalAlpha = s.replace(/[\s\d.,;:()\[\]'"\-&]/g, "").length;
  if (totalAlpha === 0) return false;
  return englishCount / totalAlpha > 0.7;
}

function getContext(text: string, index: number, radius: number): string {
  const start = Math.max(0, index - radius);
  const end = Math.min(text.length, index + radius);
  let snippet = text.slice(start, end);
  if (start > 0) snippet = "…" + snippet;
  if (end < text.length) snippet = snippet + "…";
  return snippet.replace(/\s+/g, " ").trim();
}
