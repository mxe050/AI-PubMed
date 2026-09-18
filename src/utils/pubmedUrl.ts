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

/** Returns whether the query was passed via URL rather than manual paste. */
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

  // A conservative compatibility threshold; long queries remain available in full.
  const URL_LIMIT = 1900;

  if (destination === "regular" && baseFull.length <= URL_LIMIT) {
    window.open(baseFull, "_blank", "noopener,noreferrer");
    return true;
  }

  // Fallback: copy to clipboard and open the blank Advanced Search /
  // regular Search page. User pastes the query in.
  const blankUrl =
    destination === "advanced"
      ? "https://pubmed.ncbi.nlm.nih.gov/advanced/"
      : "https://pubmed.ncbi.nlm.nih.gov/";

  // Open during the click event, before awaiting clipboard permission.
  window.open(baseFull.length <= URL_LIMIT ? baseFull : blankUrl, "_blank", "noopener,noreferrer");
  try {
    await copyText(trimmed);
    alert(destination === "advanced"
      ? "検索式全文をコピーしました。\nAdvanced SearchはURLの検索式を入力欄に反映しない場合があります。Query boxへ貼り付けて検索してください。"
      : "検索式が長いため、全文をクリップボードにコピーしました。\n開いたPubMedのクエリ欄に貼り付けて検索してください。");
  } catch {
    alert("PubMedへの移動時に検索式を自動コピーできませんでした。\nアプリの検索式欄から全文を手動でコピーし、PubMedのクエリ欄に貼り付けてください。");
  }
  return false;
}
import { copyText } from "./textActions";
