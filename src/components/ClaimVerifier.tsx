import { useMemo } from "react";
import type { PubMedArticle } from "../types";
import { computeKeywordMatch } from "../utils/extractClaimKeywords";

interface Props {
  /** Raw text from the AI output that mentions this paper (≈ surrounding sentences). */
  aiClaimText: string;
  article: PubMedArticle;
  onClose: () => void;
}

/**
 * Two-column "AI claim ↔ actual abstract" comparison panel.
 *
 *  - Left column: the AI's text about this paper.
 *  - Right column: PubMed abstract with claim keywords highlighted.
 *  - Header: keyword match ratio + a disclaimer that highlight ≠ correctness.
 *
 * Layout switches to stacked at <768px via the `.claim-verifier` CSS class.
 */
export function ClaimVerifier({ aiClaimText, article, onClose }: Props) {
  const abstract = article.abstractText ?? "";

  const match = useMemo(
    () => computeKeywordMatch(aiClaimText, abstract),
    [aiClaimText, abstract]
  );

  const highlighted = useMemo(
    () => buildHighlightedAbstract(abstract, match.keywords),
    [abstract, match.keywords]
  );

  const pubmedUrl = `https://pubmed.ncbi.nlm.nih.gov/${article.pmid}/`;

  return (
    <div className="claim-verifier">
      <div className="claim-verifier-header">
        <div className="claim-verifier-stats">
          <strong>キーワード一致：</strong>
          <span>
            {match.matched.length}/{match.keywords.length}語（{match.percent}%）
          </span>
        </div>
        <button
          className="btn btn-secondary btn-small"
          onClick={onClose}
          aria-label="閉じる"
        >
          閉じる
        </button>
      </div>

      <p className="claim-verifier-warning">
        ⚠ キーワードの一致は参考情報です。内容の正確性は必ず原文を読んで判断してください。
      </p>

      <div className="claim-verifier-cols">
        <section className="claim-verifier-col">
          <h4>AIの主張</h4>
          <p className="claim-text">
            {aiClaimText || "(該当箇所が抽出できませんでした)"}
          </p>
        </section>

        <section className="claim-verifier-col">
          <h4>実際のアブストラクト</h4>
          {abstract ? (
            <p
              className="abstract-text"
              dangerouslySetInnerHTML={{ __html: highlighted }}
            />
          ) : (
            <p className="hint">
              抄録が取得できませんでした。本文の確認には PubMed か出版社サイトを参照してください。
            </p>
          )}
          <p className="claim-verifier-link">
            <a href={pubmedUrl} target="_blank" rel="noopener noreferrer">
              PubMedで原文を見る → PMID {article.pmid}
            </a>
          </p>
        </section>
      </div>
    </div>
  );
}

function buildHighlightedAbstract(abstract: string, keywords: string[]): string {
  if (!abstract) return "";
  let out = escapeHtml(abstract);
  // Sort by length (descending) so longer matches like "95%CI" win over "CI".
  const sorted = [...keywords]
    .filter((k) => k.length >= 2)
    .sort((a, b) => b.length - a.length);

  for (const kw of sorted) {
    const escapedKw = escapeRegExp(kw);
    // Skip if marker tags would already cover this region — naive: replace only
    // text not currently inside <mark>...</mark>. We approximate by chunking.
    out = replaceOutsideMarks(out, escapedKw);
  }
  return out;
}

function replaceOutsideMarks(html: string, escapedKw: string): string {
  const re = new RegExp(`(${escapedKw})`, "gi");
  // Split by existing <mark>…</mark> spans and only replace in text segments.
  const parts = html.split(/(<mark[^>]*>[\s\S]*?<\/mark>)/);
  for (let i = 0; i < parts.length; i++) {
    if (i % 2 === 1) continue; // existing <mark>
    parts[i] = parts[i].replace(re, '<mark class="claim-hl">$1</mark>');
  }
  return parts.join("");
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
