export function extractSearchString(text: string): string | null {
  if (!text) return null;

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
  const searchLine = lines.find(
    (line) =>
      line.includes("[mh]") ||
      line.includes("[tiab]") ||
      line.includes("[pt]") ||
      line.includes("[Mesh]") ||
      line.includes("[MeSH]") ||
      (line.includes("AND") && line.includes("OR") && line.length > 30)
  );

  return searchLine ? searchLine.trim() : null;
}
