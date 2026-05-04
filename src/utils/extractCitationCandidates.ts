export type CitationCandidateType =
  | "quoted_title"
  | "italic_title"
  | "english_plain_title"
  | "title_year_pattern";

export interface CitationCandidate {
  id: string;
  raw: string;
  type: CitationCandidateType;
  /** ESearch query that PubMed can use to find this citation. */
  query: string;
  /** Display label for UI. */
  display: string;
  context: string;
  /** When a nearby author+year is found, the title's query is enhanced with author+year filter. */
  enhancedWithAuthorYear?: { author: string; year: string };
}

export interface SkippedAuthorYear {
  raw: string;
  context: string;
}

export interface ExtractionResult {
  candidates: CitationCandidate[];
  /** author+year mentions that have NO nearby title — cannot be reliably fact-checked. */
  skippedAuthorYearOnly: SkippedAuthorYear[];
  /** author+year mentions that DID have a nearby title and were used to enhance the title's query. */
  combinedAuthorYearCount: number;
}

interface InternalCandidate extends CitationCandidate {
  _startIndex: number;
  _endIndex: number;
}

interface AuthorYearMatch {
  raw: string;
  authorRaw: string;
  surname: string;
  year: string;
  index: number;
  endIndex: number;
  context: string;
}

/** Academic keywords that strongly suggest a phrase is a paper title. */
const ACADEMIC_KEYWORDS = [
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
  "guideline",
  "guidelines",
  "consensus",
  "statement",
  "recommendation",
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

/** Distance (chars) within which a nearby author+year is considered to belong to a title. */
const AUTHOR_YEAR_PROXIMITY = 350;

export function extractCitationCandidates(text: string): ExtractionResult {
  if (!text) {
    return {
      candidates: [],
      skippedAuthorYearOnly: [],
      combinedAuthorYearCount: 0,
    };
  }

  const titles = new Map<string, InternalCandidate>();

  // 1) Quoted titles
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
      if (!titles.has(id)) {
        const cleanTitle = cleanTitleText(title);
        titles.set(id, {
          id,
          raw: m[0],
          type: "quoted_title",
          query: cleanTitle,
          display: title,
          context: getContext(text, m.index, 200),
          _startIndex: m.index,
          _endIndex: m.index + m[0].length,
        });
      }
    }
  }

  // 2) Italic titles
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
      if (!titles.has(id)) {
        const cleanTitle = cleanTitleText(title);
        titles.set(id, {
          id,
          raw: m[0],
          type: "italic_title",
          query: cleanTitle,
          display: title,
          context: getContext(text, m.index, 200),
          _startIndex: m.index,
          _endIndex: m.index + m[0].length,
        });
      }
    }
  }

  // 3) English title followed by year in parentheses
  const titleYearRe =
    /([A-Z][A-Za-zÀ-ſ0-9'\-,:;()&\s]{20,250}?)\s*[\(（]\s*((?:19|20)\d{2})\s*年?\s*[\)）]/g;
  let m: RegExpExecArray | null;
  while ((m = titleYearRe.exec(text)) !== null) {
    const title = m[1].trim().replace(/[,:;\s]+$/, "");
    const year = m[2];
    if (!looksLikeEnglishTitle(title)) continue;
    const id = `title-year:${title.toLowerCase()}:${year}`;
    if (!titles.has(id)) {
      // Use plain title text — do NOT add year filter (overly strict, breaks search)
      const cleanTitle = cleanTitleText(title);
      titles.set(id, {
        id,
        raw: m[0],
        type: "title_year_pattern",
        query: cleanTitle,
        display: `${title} (${year})`,
        context: getContext(text, m.index, 200),
        _startIndex: m.index,
        _endIndex: m.index + m[0].length,
      });
    }
  }

  // 4) English plain-text titles
  const englishTitles = extractEnglishPlainTextTitles(text);
  for (const t of englishTitles) {
    const id = `english:${t.title.toLowerCase()}`;
    if (!titles.has(id)) {
      const cleanTitle = cleanTitleText(t.title);
      titles.set(id, {
        id,
        raw: t.title,
        type: "english_plain_title",
        query: cleanTitle,
        display: t.title,
        context: getContext(text, t.index, 200),
        _startIndex: t.index,
        _endIndex: t.index + t.title.length,
      });
    }
  }

  // 5) Find author+year occurrences (NOT added as candidates directly).
  //    These are used to either:
  //    (a) enhance a nearby title's query, or
  //    (b) be reported as "skipped — not verifiable" if no nearby title exists.
  const authorYears: AuthorYearMatch[] = [];
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
    authorYears.push({
      raw: m[0],
      authorRaw,
      surname,
      year,
      index: m.index,
      endIndex: m.index + m[0].length,
      context: getContext(text, m.index, 200),
    });
  }

  // 6) Combine: for each author+year, find the nearest title within proximity.
  //    If found, enhance the title's query with `AND Surname[Author] AND Year[dp]`.
  //    If not found, add to skipped list.
  const titleArray = Array.from(titles.values());
  const skippedAuthorYearOnly: SkippedAuthorYear[] = [];
  let combinedAuthorYearCount = 0;
  const seenAuthorYearKeys = new Set<string>();

  for (const ay of authorYears) {
    const ayKey = `${ay.authorRaw.toLowerCase()}:${ay.year}`;
    // Avoid duplicate processing of the same author+year mention
    if (seenAuthorYearKeys.has(ayKey)) continue;

    // Find nearest title within proximity (any direction)
    let nearestTitle: InternalCandidate | null = null;
    let nearestDist = Infinity;
    for (const t of titleArray) {
      // Distance: from author+year to title boundary
      const dist =
        ay.index < t._startIndex
          ? t._startIndex - ay.endIndex
          : ay.index - t._endIndex;
      if (dist < AUTHOR_YEAR_PROXIMITY && dist < nearestDist) {
        nearestTitle = t;
        nearestDist = dist;
      }
    }

    if (nearestTitle) {
      // Note nearby author+year for display purposes only.
      // Do NOT modify the query — adding [Author] / [dp] filters often
      // breaks PubMed matching. The plain title text matches better via
      // ATM (Automatic Term Mapping).
      if (!nearestTitle.enhancedWithAuthorYear) {
        nearestTitle.enhancedWithAuthorYear = {
          author: ay.authorRaw,
          year: ay.year,
        };
        nearestTitle.display = `${nearestTitle.display}（${ay.authorRaw}, ${ay.year}）`;
      }
      combinedAuthorYearCount++;
      seenAuthorYearKeys.add(ayKey);
    } else {
      // Standalone author+year — cannot be reliably verified, skip.
      skippedAuthorYearOnly.push({
        raw: ay.raw,
        context: ay.context,
      });
      seenAuthorYearKeys.add(ayKey);
    }
  }

  // Strip internal fields from final output
  const candidates: CitationCandidate[] = titleArray
    .slice(0, 50)
    .map(({ _startIndex: _s, _endIndex: _e, ...rest }) => {
      void _s;
      void _e;
      return rest;
    });

  return {
    candidates,
    skippedAuthorYearOnly: skippedAuthorYearOnly.slice(0, 30),
    combinedAuthorYearCount,
  };
}

/**
 * Clean a title string for use as a PubMed search query.
 * Strategy: pass the title text as-is to PubMed (no quotes, no field tags,
 * no OR alternatives). PubMed's Automatic Term Mapping (ATM) handles plain
 * title text well. Adding [Title], [Title/Abstract], or year filters often
 * BREAKS matching — many real titles fail to hit because of indexing
 * differences (colons, special characters, journal-specific formatting).
 */
function cleanTitleText(title: string): string {
  return title
    .replace(/[\s.,;:!?]+$/, "")
    .replace(/\s+/g, " ")
    .trim();
}

function looksLikeTitle(s: string): boolean {
  if (s.length < 12 || s.length > 250) return false;
  if (/^https?:\/\//i.test(s)) return false;
  if (/^[\d\s.\-_/]+$/.test(s)) return false;
  if (/^[A-Z_]+$/.test(s)) return false;

  const englishCharCount = (s.match(/[A-Za-z]/g) ?? []).length;
  const japaneseCharCount = (s.match(/[぀-ゟ゠-ヿ一-鿿]/g) ?? []).length;
  const isLetterRich = englishCharCount + japaneseCharCount >= 8;
  if (!isLetterRich) return false;

  if (englishCharCount > japaneseCharCount * 2) {
    return looksLikeEnglishTitle(s);
  }
  if (japaneseCharCount > englishCharCount) {
    return looksLikeJapaneseTitle(s);
  }
  return /\s/.test(s) || s.length >= 20;
}

function looksLikeEnglishTitle(s: string): boolean {
  if (!/^[A-Z]/.test(s.trim())) return false;
  const words = s.split(/\s+/);
  if (words.length < 3 || words.length > 40) return false;
  return ACADEMIC_KEYWORDS_RE.test(s) || /:/.test(s) || words.length >= 5;
}

function looksLikeJapaneseTitle(s: string): boolean {
  const trimmed = s.trim();

  const sentenceEndings = [
    /である\.?$/,
    /であった\.?$/,
    /です\.?$/,
    /ます\.?$/,
    /ました\.?$/,
    /[いた]\.?$/,
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
    /[をがにはで][^を]*?(する|なる|される|なった)\.?$/,
  ];
  for (const re of sentenceEndings) {
    if (re.test(trimmed)) return false;
  }

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

  if (/[。.]$/.test(trimmed)) return false;

  if (/(?:である|でした|ました|されている|されていた|なる|示す|考えられる)/.test(trimmed)) {
    return false;
  }

  return true;
}

function extractEnglishPlainTextTitles(
  text: string
): { title: string; index: number }[] {
  const out: { title: string; index: number }[] = [];

  const colonTitleRe =
    /([A-Z][A-Za-zÀ-ſ0-9'\-,&\s]{8,150}?:\s+[A-Za-zÀ-ſ0-9'\-,&\s]{5,150}?)(?=[.,;。、]|\s*\(|\s*\d{4}|$)/gm;
  let m: RegExpExecArray | null;
  while ((m = colonTitleRe.exec(text)) !== null) {
    const candidate = m[1].trim();
    if (looksLikeEnglishTitle(candidate) && hasGoodEnglishRatio(candidate)) {
      out.push({ title: candidate, index: m.index });
    }
  }

  const phraseRe =
    /(?:^|[^A-Za-z])([A-Z][A-Za-zÀ-ſ0-9'\-,&]+(?:\s+[A-Za-zÀ-ſ0-9'\-,&]+){4,34})(?=[.,;。、:]|\s*\(\d|\s*$)/gm;
  while ((m = phraseRe.exec(text)) !== null) {
    const candidate = m[1].trim();
    if (
      ACADEMIC_KEYWORDS_RE.test(candidate) &&
      looksLikeEnglishTitle(candidate) &&
      hasGoodEnglishRatio(candidate)
    ) {
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
