export function buildPubMedWebUrl(query: string): string {
  return `https://pubmed.ncbi.nlm.nih.gov/?term=${encodeURIComponent(query)}`;
}

export function buildPubMedAdvancedUrl(query: string): string {
  return `https://pubmed.ncbi.nlm.nih.gov/advanced/?term=${encodeURIComponent(query)}`;
}

export function getPubMedUrlWarning(query: string): string | null {
  const url = buildPubMedWebUrl(query);
  const length = url.length;

  if (length > 6000) {
    return "検索式が非常に長いため、URL経由では失敗する可能性があります。検索式をコピーしてPubMedへ直接貼り付けてください。";
  }

  if (length > 1800) {
    return "検索式が長いため、環境によってはPubMedで正しく開けない可能性があります。";
  }

  return null;
}

/**
 * Open PubMed (regular search or Advanced Search) with the given query.
 * If the encoded URL would exceed PubMed's effective URL length limit
 * (~2KB for ?term=), this falls back to copying the query to the clipboard
 * and opening the destination blank, then alerting the user.
 *
 * Returns true if opened with the term in URL (normal), false if the
 * fallback (copy + open blank) was used.
 */
export async function openPubMedWithQuery(
  query: string,
  destination: "regular" | "advanced"
): Promise<boolean> {
  if (!query || !query.trim()) return false;

  const trimmed = query.trim();
  const baseFull =
    destination === "advanced"
      ? `https://pubmed.ncbi.nlm.nih.gov/advanced/?term=${encodeURIComponent(trimmed)}`
      : `https://pubmed.ncbi.nlm.nih.gov/?term=${encodeURIComponent(trimmed)}`;

  // PubMed/NCBI silently strips or rejects ?term= when the encoded URL
  // grows past ~2KB. SR final queries with study-design filters easily
  // exceed this. Use 1900 as a safe threshold.
  const URL_LIMIT = 1900;

  if (baseFull.length <= URL_LIMIT) {
    window.open(baseFull, "_blank", "noopener,noreferrer");
    return true;
  }

  // Fallback: copy to clipboard and open the blank Advanced Search /
  // regular Search page. User pastes the query in.
  const blankUrl =
    destination === "advanced"
      ? "https://pubmed.ncbi.nlm.nih.gov/advanced/"
      : "https://pubmed.ncbi.nlm.nih.gov/";

  try {
    await navigator.clipboard.writeText(trimmed);
  } catch {
    // Clipboard API may fail (e.g., not in user gesture). Try fallback.
    const ta = document.createElement("textarea");
    ta.value = trimmed;
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand("copy");
    } catch {
      // Give up silently — still open blank below.
    }
    document.body.removeChild(ta);
  }

  window.open(blankUrl, "_blank", "noopener,noreferrer");

  alert(
    "検索式が長すぎて URL に渡せないため、検索式をクリップボードにコピーしました。\n" +
      "開いた PubMed ページのクエリ欄に貼り付けて検索してください。"
  );
  return false;
}
