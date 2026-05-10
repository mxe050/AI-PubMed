export function extractSearchString(text: string): string | null {
  if (!text) return null;

  const sectionSearch = extractFromLabeledSection(text);
  if (sectionSearch) return sectionSearch;

  const codeBlocks = Array.from(
    text.matchAll(/```(?:text|pubmed)?\s*\n?([\s\S]*?)```/g)
  );

  if (codeBlocks.length > 0) {
    const candidates = codeBlocks
      .map((m) => m[1].trim())
      .filter((s) => s.length > 0);

    const withTags = candidates.find(
      (s) =>
        s.includes("[mh]") ||
        s.includes("[tiab]") ||
        s.includes("[pt]") ||
        s.includes("[Mesh]") ||
        s.includes("[MeSH]")
    );
    if (withTags) return withTags;

    const longest = candidates.sort((a, b) => b.length - a.length)[0];
    if (longest) return longest;
  }

  const lines = text.split("\n");
  const searchLine = lines.find((line) => isLikelyFullSearchString(line));

  return searchLine ? searchLine.trim() : null;
}

const SEARCH_SECTION_HEADING =
  /(?:PubMed\s*search\s*string|PubMed検索式案|PubMed検索式|検索式案|検索式)/i;

function extractFromLabeledSection(text: string): string | null {
  const lines = text.split(/\r?\n/);

  for (let i = 0; i < lines.length; i++) {
    if (!SEARCH_SECTION_HEADING.test(stripMarkdown(lines[i]))) continue;

    const collected: string[] = [];
    for (let j = i + 1; j < lines.length; j++) {
      const raw = lines[j];
      const line = stripMarkdown(raw).trim();
      if (!line) {
        if (collected.length > 0) break;
        continue;
      }
      if (isSectionBoundary(line)) {
        if (collected.length > 0) break;
        continue;
      }
      if (isLikelySearchFragment(line)) {
        collected.push(cleanSearchLine(line));
        continue;
      }
      if (collected.length > 0) break;
    }

    const candidate = collected.join(" ").replace(/\s+/g, " ").trim();
    if (isLikelyFullSearchString(candidate)) return candidate;
  }

  return null;
}

function stripMarkdown(line: string): string {
  return line
    .replace(/^#{1,6}\s*/, "")
    .replace(/^\s*[-*+]\s+/, "")
    .replace(/^\s*\d+[.)]\s+/, "")
    .replace(/\*\*/g, "")
    .trim();
}

function cleanSearchLine(line: string): string {
  return stripMarkdown(line)
    .replace(/^【[^】]+】\s*/, "")
    .replace(/^PubMed検索式案[：:]\s*/i, "")
    .replace(/^PubMed検索式[：:]\s*/i, "")
    .replace(/^検索式案[：:]\s*/i, "")
    .replace(/^検索式[：:]\s*/i, "")
    .trim();
}

function isSectionBoundary(line: string): boolean {
  return (
    /^---+$/.test(line) ||
    /^#{1,6}\s+/.test(line) ||
    /^##?\s*\d+[.)\s]/.test(line) ||
    /^【[^】]+】\s*$/.test(line)
  );
}

function hasPubMedTag(text: string): boolean {
  return /\[(?:mh|mesh|tiab|pt|tw|sh)\]/i.test(text);
}

function isLikelySearchFragment(line: string): boolean {
  if (hasPubMedTag(line) && /(?:\bAND\b|\bOR\b|^\(|\)$)/i.test(line)) {
    return true;
  }
  if (line.length > 40 && /(?:\bAND\b|\bOR\b)/i.test(line)) return true;
  if (line.startsWith("(") || line.endsWith(")")) return true;
  return false;
}

function isLikelyFullSearchString(line: string): boolean {
  const cleaned = cleanSearchLine(line);
  if (!cleaned) return false;
  if (/^\s*["“][^"”]+["”]\s*\[[^\]]+\]\s*$/.test(cleaned)) {
    return false;
  }
  return (
    (hasPubMedTag(cleaned) && /(?:\bAND\b|\bOR\b)/i.test(cleaned)) ||
    (cleaned.length > 80 && /(?:\bAND\b|\bOR\b)/i.test(cleaned))
  );
}
