/**
 * Pre-processes AI-generated text so downstream citation extraction
 * (extractCitationCandidates / extractPmidsCategorized / extractCitations)
 * can work on a more uniform, line-oriented form.
 *
 * The pipeline is conservative: every transformation reports whether it
 * actually fired so the UI can show a small "auto-cleaned" notice.
 *
 * Order of operations matches the spec:
 *   (a) markdown table → 1-line-per-row
 *   (b) numbered/bulleted list → split into independent blocks
 *   (c) abbreviated author+year → reattach surrounding journal/title context
 *   (d) merge in-text citation with end-of-text reference list
 *   (e) resolve ibid / 同上 to the previous citation
 *   (f) normalize PMID / DOI surface form
 */

export interface CleanAiOutputResult {
  cleaned: string;
  /** True if a transformation actually changed the text (for UI notice). */
  transformed: boolean;
  /** Per-step flags, useful for debugging and telemetry. */
  steps: {
    markdownTable: boolean;
    listSplit: boolean;
    abbreviatedCitation: boolean;
    duplicateMerge: boolean;
    ibidResolution: boolean;
    pmidDoiNormalized: boolean;
  };
}

const EMPTY_STEPS: CleanAiOutputResult["steps"] = {
  markdownTable: false,
  listSplit: false,
  abbreviatedCitation: false,
  duplicateMerge: false,
  ibidResolution: false,
  pmidDoiNormalized: false,
};

export function cleanAiOutput(input: string): CleanAiOutputResult {
  if (!input) {
    return { cleaned: "", transformed: false, steps: { ...EMPTY_STEPS } };
  }

  const steps: CleanAiOutputResult["steps"] = { ...EMPTY_STEPS };
  let text = input;

  // (a) markdown tables → joined comma form
  {
    const out = expandMarkdownTables(text);
    if (out.changed) {
      text = out.text;
      steps.markdownTable = true;
    }
  }

  // (b) numbered / bulleted lists → independent blocks (each on its own line,
  //     with a blank line separator so extractors treat them as siblings)
  {
    const out = splitNumberedAndBulletedLists(text);
    if (out.changed) {
      text = out.text;
      steps.listSplit = true;
    }
  }

  // (f) PMID / DOI normalization (run before citation merge so identifiers
  //     compare cleanly across in-text and reference-list mentions)
  {
    const out = normalizePmidAndDoi(text);
    if (out.changed) {
      text = out.text;
      steps.pmidDoiNormalized = true;
    }
  }

  // (c) abbreviated "Smith et al." → attach nearby year / journal / title hint
  {
    const out = enrichAbbreviatedCitations(text);
    if (out.changed) {
      text = out.text;
      steps.abbreviatedCitation = true;
    }
  }

  // (d) merge in-text "(Smith 2023)" with end-of-text reference list entry
  {
    const out = mergeInTextWithReferenceList(text);
    if (out.changed) {
      text = out.text;
      steps.duplicateMerge = true;
    }
  }

  // (e) "ibid." / "（前掲）" / "（同上）" / "（同書）"
  {
    const out = resolveIbid(text);
    if (out.changed) {
      text = out.text;
      steps.ibidResolution = true;
    }
  }

  const transformed =
    steps.markdownTable ||
    steps.listSplit ||
    steps.abbreviatedCitation ||
    steps.duplicateMerge ||
    steps.ibidResolution ||
    steps.pmidDoiNormalized;

  return { cleaned: text, transformed, steps };
}

// ------------------------- (a) markdown tables -------------------------

const TABLE_SEPARATOR_RE = /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)+\|?\s*$/;

function expandMarkdownTables(text: string): { text: string; changed: boolean } {
  const lines = text.split(/\r?\n/);
  const out: string[] = [];
  let changed = false;
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const next = lines[i + 1] ?? "";
    if (looksLikeTableRow(line) && TABLE_SEPARATOR_RE.test(next)) {
      // Collect contiguous table rows (skip the separator)
      const rows: string[][] = [splitRow(line)];
      i += 2; // skip header + separator
      while (i < lines.length && looksLikeTableRow(lines[i])) {
        rows.push(splitRow(lines[i]));
        i++;
      }
      // Emit each data row (rows[1..]) as one comma-joined line
      const dataRows = rows.slice(1);
      if (dataRows.length === 0) {
        // Header-only table — keep header as a single line
        out.push(rows[0].join(", "));
      } else {
        for (const r of dataRows) {
          const joined = r
            .map((cell) => cell.trim())
            .filter((c) => c.length > 0)
            .join(", ");
          if (joined) out.push(joined);
        }
      }
      changed = true;
      continue;
    }
    out.push(line);
    i++;
  }

  return { text: out.join("\n"), changed };
}

function looksLikeTableRow(line: string): boolean {
  if (!line) return false;
  const trimmed = line.trim();
  if (!trimmed.includes("|")) return false;
  // require at least 2 pipes to be a real row (|a|b| or a|b|c)
  const pipeCount = (trimmed.match(/\|/g) ?? []).length;
  return pipeCount >= 2;
}

function splitRow(line: string): string[] {
  let trimmed = line.trim();
  if (trimmed.startsWith("|")) trimmed = trimmed.slice(1);
  if (trimmed.endsWith("|")) trimmed = trimmed.slice(0, -1);
  return trimmed.split("|");
}

// ------------------------- (b) lists -------------------------

const NUMBERED_RE = /^\s*(\d{1,3})[\.\)）]\s+/;
const BULLET_RE = /^\s*[\-\*・]\s+/;

function splitNumberedAndBulletedLists(text: string): {
  text: string;
  changed: boolean;
} {
  const lines = text.split(/\r?\n/);
  const out: string[] = [];
  let changed = false;
  let inList = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const isItem = NUMBERED_RE.test(line) || BULLET_RE.test(line);
    if (isItem) {
      // Insert a blank-line separator before list items if previous line
      // was non-empty content, so extractors treat each item as its own block.
      const prev = out[out.length - 1];
      if (prev !== undefined && prev.trim() !== "") {
        out.push("");
        changed = true;
      }
      out.push(line);
      inList = true;
    } else {
      if (inList && line.trim() === "") {
        // already a separator; keep
        out.push(line);
      } else if (inList && line.trim() !== "") {
        // continuation after a list item — emit blank line first
        out.push("");
        out.push(line);
        inList = false;
        changed = true;
      } else {
        out.push(line);
      }
    }
  }

  return { text: out.join("\n"), changed };
}

// ------------------------- (c) abbreviated citation enrichment -------

const ABBREV_RE =
  /([A-Z][A-Za-zÀ-ſ'\-]{1,30})\s+et\s+al\.(?!\s*[\(（,，]\s*\d{4})/g;

/**
 * "Smith et al." with no nearby year → look ±2 sentences for a 4-digit year
 * + journal/title hint and append "(Year)" so author+year extractor can pick it up.
 */
function enrichAbbreviatedCitations(text: string): {
  text: string;
  changed: boolean;
} {
  let changed = false;
  const sentences = splitIntoSentences(text);

  for (let i = 0; i < sentences.length; i++) {
    const s = sentences[i];
    if (!ABBREV_RE.test(s)) {
      ABBREV_RE.lastIndex = 0;
      continue;
    }
    ABBREV_RE.lastIndex = 0;

    const windowStart = Math.max(0, i - 2);
    const windowEnd = Math.min(sentences.length - 1, i + 2);
    const windowText = sentences.slice(windowStart, windowEnd + 1).join(" ");

    const yearMatch = windowText.match(/\b(19|20)\d{2}\b/);
    if (!yearMatch) continue;
    const year = yearMatch[0];

    const replaced = s.replace(ABBREV_RE, (_m, surname) => {
      changed = true;
      return `${surname} et al. (${year})`;
    });
    sentences[i] = replaced;
  }

  return { text: sentences.join(""), changed };
}

function splitIntoSentences(text: string): string[] {
  // Keep delimiters so re-joining is loss-less.
  const parts = text.split(/(?<=[。．\.!?！？\n])/);
  return parts;
}

// ------------------------- (d) in-text citation ↔ reference list ------

interface RefEntry {
  surname: string;
  year: string;
  full: string;
}

/**
 * Detects a tail "References" / "文献" / numbered list section, indexes each
 * reference by surname+year, and appends `(refSummary)` after every in-text
 * "(Smith 2023)" / "Smith et al., 2023" mention so the extractor sees title
 * and journal alongside the in-text mention.
 */
function mergeInTextWithReferenceList(text: string): {
  text: string;
  changed: boolean;
} {
  const refs = extractReferenceList(text);
  if (refs.length === 0) return { text, changed: false };

  let changed = false;
  // Replace "(Smith, 2023)" / "Smith et al. (2023)" / "Smith and Jones (2023)"
  const inTextRe =
    /(?:[\(（]\s*)?([A-Z][A-Za-zÀ-ſ'\-]{1,30})(?:\s+et\s+al\.?|(?:\s+and|\s*&)\s+[A-Z][A-Za-zÀ-ſ'\-]{1,30})?[\s,，、]*?[\(（]?\s*((?:19|20)\d{2})\s*[\)）]?(?:\s*[\)）])?/g;

  const out = text.replace(inTextRe, (full, surname, year, offset) => {
    const key = `${surname.toLowerCase()}|${year}`;
    const ref = refs.find(
      (r) => r.surname.toLowerCase() === surname.toLowerCase() && r.year === year
    );
    if (!ref) return full;
    // Avoid double-merging if the in-text mention IS the reference-list line itself.
    const lineStart = text.lastIndexOf("\n", offset) + 1;
    const lineEnd = text.indexOf("\n", offset);
    const surrounding = text.slice(
      lineStart,
      lineEnd === -1 ? text.length : lineEnd
    );
    if (surrounding.trim() === ref.full.trim()) return full;
    if (full.includes(ref.full.slice(0, Math.min(40, ref.full.length))))
      return full;
    changed = true;
    void key;
    return `${full} [ref: ${ref.full}]`;
  });

  return { text: out, changed };
}

function extractReferenceList(text: string): RefEntry[] {
  const headingRe =
    /\n\s*(?:#+\s*)?(?:references?|文献|参考文献|引用文献|bibliography)\s*:?\s*\n/i;
  const m = headingRe.exec(text);
  if (!m) return [];
  const tail = text.slice(m.index + m[0].length);

  const lines = tail.split(/\r?\n/);
  const refs: RefEntry[] = [];

  for (const line of lines) {
    const cleaned = line.replace(/^\s*\d{1,3}[\.\)）]\s+/, "").trim();
    if (!cleaned) continue;
    const surnameMatch = cleaned.match(/^([A-Z][A-Za-zÀ-ſ'\-]{1,30})/);
    const yearMatch = cleaned.match(/\b((?:19|20)\d{2})\b/);
    if (!surnameMatch || !yearMatch) continue;
    refs.push({
      surname: surnameMatch[1],
      year: yearMatch[1],
      full: cleaned.length > 240 ? cleaned.slice(0, 240) + "…" : cleaned,
    });
  }

  return refs;
}

// ------------------------- (e) ibid / 同上 ----------------------------

const IBID_TOKENS = [
  /[（(]\s*ibid\.?\s*[）)]/gi,
  /[（(]\s*前掲\s*[）)]/g,
  /[（(]\s*同上\s*[）)]/g,
  /[（(]\s*同書\s*[）)]/g,
];

function resolveIbid(text: string): { text: string; changed: boolean } {
  let changed = false;
  let working = text;
  const tokens = collectAllIbidPositions(working);
  if (tokens.length === 0) return { text, changed };

  // For each ibid token, replace with the most recent prior citation snippet
  // (= the nearest "(Author Year)" before this position).
  const citationRe =
    /[\(（]\s*[A-Z][A-Za-zÀ-ſ'\-]{1,30}(?:\s+et\s+al\.?|(?:\s+and|\s*&)\s+[A-Z][A-Za-zÀ-ſ'\-]{1,30})?\s*,?\s*(?:19|20)\d{2}\s*[\)）]/g;

  // Build a sorted list of citation positions.
  const citations: { idx: number; raw: string }[] = [];
  let cm: RegExpExecArray | null;
  while ((cm = citationRe.exec(working)) !== null) {
    citations.push({ idx: cm.index, raw: cm[0] });
  }
  if (citations.length === 0) return { text, changed };

  // Replace from the END to keep indices stable.
  for (let i = tokens.length - 1; i >= 0; i--) {
    const tok = tokens[i];
    const prior = [...citations].reverse().find((c) => c.idx < tok.idx);
    if (!prior) continue;
    working =
      working.slice(0, tok.idx) +
      prior.raw +
      working.slice(tok.idx + tok.length);
    changed = true;
  }

  return { text: working, changed };
}

function collectAllIbidPositions(
  text: string
): { idx: number; length: number }[] {
  const all: { idx: number; length: number }[] = [];
  for (const re of IBID_TOKENS) {
    re.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      all.push({ idx: m.index, length: m[0].length });
    }
  }
  all.sort((a, b) => a.idx - b.idx);
  return all;
}

// ------------------------- (f) PMID / DOI normalization ---------------

function normalizePmidAndDoi(text: string): { text: string; changed: boolean } {
  let changed = false;
  let out = text;

  // PMID: "pmid 12345" / "PMID:12345" / "PMID#12345" → "PMID: 12345"
  out = out.replace(/\b(pmid)\s*[:#]?\s*(\d{1,9})\b/gi, (m, _p, n) => {
    const norm = `PMID: ${n}`;
    if (m !== norm) changed = true;
    return norm;
  });

  // DOI URL → bare DOI form prefixed with "DOI: "
  out = out.replace(
    /https?:\/\/(?:dx\.)?doi\.org\/(10\.\d{4,9}\/[\-._;()/:A-Za-z0-9]+)/gi,
    (_m, d) => {
      changed = true;
      return `DOI: ${d}`;
    }
  );

  // "doi:10.xxx" / "DOI 10.xxx" / "DOI: 10.xxx" → "DOI: 10.xxx"
  out = out.replace(
    /\b(doi)\s*[:：]?\s*(10\.\d{4,9}\/[\-._;()/:A-Za-z0-9]+)/gi,
    (m, _p, d) => {
      const norm = `DOI: ${d}`;
      if (m !== norm) changed = true;
      return norm;
    }
  );

  return { text: out, changed };
}
