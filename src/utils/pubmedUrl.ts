export function buildPubMedWebUrl(query: string): string {
  return `https://pubmed.ncbi.nlm.nih.gov/?term=${encodeURIComponent(query)}`;
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
