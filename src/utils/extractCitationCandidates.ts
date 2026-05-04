export type CitationCandidateType =
  | "quoted_title"
  | "author_year"
  | "italic_title";

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

export function extractCitationCandidates(text: string): CitationCandidate[] {
  if (!text) return [];
  const found = new Map<string, CitationCandidate>();

  // 1) Quoted titles: 「...」『...』 / "..." / “...” / 'longer quoted'
  const quotePatterns: { re: RegExp; quote: string }[] = [
    { re: /「([^」]{8,250})」/g, quote: "「」" },
    { re: /『([^』]{8,250})』/g, quote: "『』" },
    { re: /"([^"]{12,250})"/g, quote: '""' },
    { re: /“([^”]{12,250})”/g, quote: "“”" },
  ];

  for (const { re } of quotePatterns) {
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
          query: `"${title}"[Title] OR "${title}"[Title/Abstract]`,
          display: title,
          context: getContext(text, m.index, 200),
        });
      }
    }
  }

  // 2) Italic titles: *Title here* or _Title here_ (markdown italic)
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
          query: `"${title}"[Title] OR "${title}"[Title/Abstract]`,
          display: title,
          context: getContext(text, m.index, 200),
        });
      }
    }
  }

  // 3) Author + year patterns:
  //    "Smith et al., 2017" / "Smith et al. 2017" / "Smith and Jones 2020"
  //    / "Schunemann et al. (2017)" / "(Schunemann, 2017)"
  const authorYearRe =
    /([A-Z][a-zA-ZÀ-ſ'\-]{1,30}(?:\s+et\s+al\.?|\s+and\s+[A-Z][a-zA-ZÀ-ſ'\-]{1,30})?)[\s,(]+((?:19|20)\d{2})\b/g;
  let m: RegExpExecArray | null;
  while ((m = authorYearRe.exec(text)) !== null) {
    const authorRaw = m[1].trim();
    const year = m[2];
    // Get just the surname for ESearch
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

  // Limit to 40 candidates
  return Array.from(found.values()).slice(0, 40);
}

function looksLikeTitle(s: string): boolean {
  if (s.length < 12 || s.length > 250) return false;
  // Reject pure numerics, URLs, code-like strings
  if (/^https?:\/\//i.test(s)) return false;
  if (/^[\d\s.\-_/]+$/.test(s)) return false;
  if (/^[A-Z_]+$/.test(s)) return false; // shouting / variable names

  // Should have spaces (multi-word) — for titles
  // Allow Japanese titles (no spaces necessarily)
  const hasSpace = /\s/.test(s);
  const hasJapanese = /[぀-ゟ゠-ヿ一-鿿]/.test(s);
  const isLetterRich = (s.match(/[A-Za-z぀-鿿]/g) ?? []).length >= 8;
  if (!isLetterRich) return false;

  return hasSpace || hasJapanese;
}

function getContext(text: string, index: number, radius: number): string {
  const start = Math.max(0, index - radius);
  const end = Math.min(text.length, index + radius);
  let snippet = text.slice(start, end);
  if (start > 0) snippet = "…" + snippet;
  if (end < text.length) snippet = snippet + "…";
  return snippet.replace(/\s+/g, " ").trim();
}
