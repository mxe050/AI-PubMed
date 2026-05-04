export type PmidConfidence = "explicit" | "pubmed_url" | "bare_number";

export interface ExtractedPmid {
  pmid: string;
  confidence: PmidConfidence;
  context: string;
}

export function extractPmidsCategorized(text: string): ExtractedPmid[] {
  if (!text) return [];

  const found = new Map<string, ExtractedPmid>();

  function addIfBetter(
    pmid: string,
    confidence: PmidConfidence,
    index: number
  ) {
    const existing = found.get(pmid);
    const order: PmidConfidence[] = ["bare_number", "pubmed_url", "explicit"];
    const score = (c: PmidConfidence) => order.indexOf(c);
    if (!existing || score(confidence) > score(existing.confidence)) {
      found.set(pmid, {
        pmid,
        confidence,
        context: getContextAround(text, index, 220),
      });
    }
  }

  // 1) Explicit PMID: "PMID 12345678" / "PMID: 12345678"
  const explicitRe = /PMID\s*[:#]?\s*(\d{1,9})/gi;
  let m: RegExpExecArray | null;
  while ((m = explicitRe.exec(text)) !== null) {
    addIfBetter(m[1], "explicit", m.index);
  }

  // 2) PubMed URL: pubmed.ncbi.nlm.nih.gov/12345678
  const urlRe = /pubmed\.ncbi\.nlm\.nih\.gov\/(\d{1,9})/gi;
  while ((m = urlRe.exec(text)) !== null) {
    addIfBetter(m[1], "pubmed_url", m.index);
  }

  // 3) Bare 5-9 digit numbers (lowest confidence, may include false positives)
  const bareRe = /\b\d{5,9}\b/g;
  while ((m = bareRe.exec(text)) !== null) {
    addIfBetter(m[0], "bare_number", m.index);
  }

  return Array.from(found.values());
}

function getContextAround(text: string, index: number, radius: number): string {
  const start = Math.max(0, index - radius);
  const end = Math.min(text.length, index + radius);
  let snippet = text.slice(start, end);
  if (start > 0) snippet = "…" + snippet;
  if (end < text.length) snippet = snippet + "…";
  return snippet.replace(/\s+/g, " ").trim();
}
