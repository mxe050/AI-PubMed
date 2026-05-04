/**
 * AI 回答から検索式の「構造解説」相当のテキストを抽出する。
 * 優先度：
 *   1) 「## N. PIC 要素ごとの関連語リスト」セクション全体
 *   2) 「## N. O（アウトカム）...」セクション
 *   3) 「## N. 論理構造...」セクション
 *   4) 「## N. 検索式の構造解説」セクション全体
 *   5) フォールバック：AI 回答全文（最終コードブロック以外）
 *
 * セクション抽出は「次の `## N` 見出しか文書末まで」を境界とする。
 */
export function extractSrExplanation(aiResponse: string): string {
  if (!aiResponse) return "";

  const headings: RegExp[] = [
    /^##\s*\d+[.\s]*PIC[^\n]*$/m,
    /^##\s*\d+[.\s]*PIC要素[^\n]*$/m,
    /^##\s*\d+[.\s]*O[（(][^\n]*$/m,
    /^##\s*\d+[.\s]*論理構造[^\n]*$/m,
    /^##\s*\d+[.\s]*検索式の構造解説[^\n]*$/m,
    /^##\s*\d+[.\s]*構造解説[^\n]*$/m,
    /^##\s*\d+[.\s]*検索式の解説[^\n]*$/m,
  ];

  const sections: string[] = [];
  const seenStarts = new Set<number>();

  for (const headRe of headings) {
    const m = aiResponse.match(headRe);
    if (!m || m.index == null) continue;
    if (seenStarts.has(m.index)) continue;
    seenStarts.add(m.index);

    const startIdx = m.index;
    const remainder = aiResponse.slice(startIdx + m[0].length);
    // Next "## N" heading or end of document
    const nextHeadingMatch = remainder.match(/\n##\s*\d/);
    const endIdx = nextHeadingMatch
      ? startIdx + m[0].length + (nextHeadingMatch.index ?? 0)
      : aiResponse.length;
    const section = aiResponse.slice(startIdx, endIdx).trim();
    if (section.length > 0) {
      sections.push(section);
    }
  }

  if (sections.length > 0) {
    return sections.join("\n\n---\n\n").trim();
  }

  // Fallback: full response trimmed of trailing code block (the search expression)
  // so the explanation area shows useful context rather than re-displaying the query.
  const lastBacktick = aiResponse.lastIndexOf("```");
  if (lastBacktick > 0) {
    const prevBacktick = aiResponse.lastIndexOf("```", lastBacktick - 1);
    if (prevBacktick > 0) {
      const beforeFinalCodeBlock = aiResponse.slice(0, prevBacktick).trim();
      if (beforeFinalCodeBlock.length > 200) {
        return beforeFinalCodeBlock;
      }
    }
  }
  return aiResponse.trim();
}
