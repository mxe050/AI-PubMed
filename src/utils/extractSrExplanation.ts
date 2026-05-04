/**
 * AI 回答から検索式の「構造解説」相当のテキストを抽出する。
 * 優先度：
 *   1) 「## 4. 検索式の構造解説」/「## N. 構造解説」/「## N. 解説」セクション
 *   2) 「## N. PIC 要素ごとの関連語リスト」セクション
 *   3) フォールバック：最終コードブロック（検索式）以外のすべての本文
 */
export function extractSrExplanation(aiResponse: string): string {
  if (!aiResponse) return "";

  const sectionPatterns = [
    /^##\s*\d+[.\s]*検索式の構造解説[\s\S]*?(?=^##\s*\d|^---\s*$|$)/m,
    /^##\s*\d+[.\s]*構造解説[\s\S]*?(?=^##\s*\d|^---\s*$|$)/m,
    /^##\s*\d+[.\s]*検索式の解説[\s\S]*?(?=^##\s*\d|^---\s*$|$)/m,
    /^##\s*\d+[.\s]*PIC[\s\S]*?(?=^##\s*\d|^---\s*$|$)/m,
  ];

  const sections: string[] = [];
  for (const re of sectionPatterns) {
    const match = aiResponse.match(re);
    if (match && !sections.includes(match[0])) {
      sections.push(match[0].trim());
    }
  }

  if (sections.length > 0) {
    return sections.join("\n\n").trim();
  }

  // Fallback: full response (the user can read all sections)
  return aiResponse.trim();
}
