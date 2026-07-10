// SR 専用の PubMed 検索結果プレビュー。

import { useState } from "react";
import type { PubMedArticle, PubMedSearchResult } from "../types";
import { formatAuthorYear } from "../utils/extractFirstAuthorLastName";

interface Props {
  result: PubMedSearchResult;
}

export function SrPubMedResultTable({ result }: Props) {
  const [expandedPmid, setExpandedPmid] = useState<string | null>(null);

  return (
    <div className="pubmed-result-table sr-pubmed-result-table">
      <div className="result-summary">
        <p><strong>検索結果総数：</strong> {result.count.toLocaleString()} 件</p>
        <p>
          <strong>プレビュー：</strong> {result.articles.length} 件
          （Best Match 上位。全件取得ではありません）
        </p>
        {result.warnings && result.warnings.length > 0 && (
          <div className="sr-api-warning" role="alert">
            <strong>PubMed からの検索警告</strong>
            <ul>{result.warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul>
          </div>
        )}
        {result.knownPmidBenchmark && (
          <div
            className={`known-pmid-benchmark ${
              result.knownPmidBenchmark.error ||
              result.knownPmidBenchmark.missedPmids.length > 0
                ? "has-misses"
                : "all-matched"
            }`}
            role={
              result.knownPmidBenchmark.error ||
              result.knownPmidBenchmark.missedPmids.length > 0
                ? "alert"
                : "status"
            }
          >
            <strong>
              既知重要PMIDの回収：
              {result.knownPmidBenchmark.matchedPmids.length} / {" "}
              {result.knownPmidBenchmark.requestedPmids.length}件
            </strong>
            {result.knownPmidBenchmark.error ? (
              <p>照合エラー：{result.knownPmidBenchmark.error}</p>
            ) : result.knownPmidBenchmark.missedPmids.length > 0 ? (
              <>
                <p>
                  未回収の既知論文があります。P/Iの同義語、MeSH、表記揺れを追加して再検索してください。
                </p>
                <ul>
                  {result.knownPmidBenchmark.missedPmids.map((pmid) => (
                    <li key={pmid}>
                      <a
                        href={`https://pubmed.ncbi.nlm.nih.gov/${pmid}/`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        PMID {pmid}
                      </a>
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <p>入力した既知重要論文をすべて回収できています。</p>
            )}
            {result.knownPmidBenchmark.warnings &&
              result.knownPmidBenchmark.warnings.length > 0 && (
                <p>
                  PubMed警告：
                  {result.knownPmidBenchmark.warnings.join(" / ")}
                </p>
              )}
          </div>
        )}
        {result.queryTranslation && (
          <details>
            <summary>PubMed query translation</summary>
            <pre className="query-translation">{result.queryTranslation}</pre>
          </details>
        )}
        <p className="api-mode-badge">
          API mode: {result.apiMode === "user_api_key" ? "APIキーあり" : "APIキーなし"}
        </p>
      </div>

      <div className="table-scroll" role="region" aria-label="PubMed検索結果プレビュー" tabIndex={0}>
        <table>
          <thead>
            <tr>
              <th>PMID</th>
              <th>著者年</th>
              <th>タイトル / 抄録</th>
              <th>雑誌</th>
            </tr>
          </thead>
          <tbody>
            {result.articles.map((article) => (
              <ArticleRow
                key={article.pmid}
                article={article}
                expanded={expandedPmid === article.pmid}
                onExpand={() =>
                  setExpandedPmid(expandedPmid === article.pmid ? null : article.pmid)
                }
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ArticleRow({
  article,
  expanded,
  onExpand,
}: {
  article: PubMedArticle;
  expanded: boolean;
  onExpand: () => void;
}) {
  const authorYear = formatAuthorYear(article.authors, article.year);
  const detailId = `sr-article-detail-${article.pmid}`;

  return (
    <>
      <tr className={expanded ? "expanded" : ""}>
        <td>
          <a href={`https://pubmed.ncbi.nlm.nih.gov/${article.pmid}/`} target="_blank" rel="noreferrer">
            {article.pmid}
          </a>
          {!article.verified && <span className="badge-unverified">未確認</span>}
        </td>
        <td>{authorYear}</td>
        <td className="title-cell">
          <button
            type="button"
            className="sr-article-expand-button"
            onClick={onExpand}
            aria-expanded={expanded}
            aria-controls={detailId}
          >
            <span aria-hidden="true">{expanded ? "▾" : "▸"}</span>{" "}
            {article.title || "（タイトルなし）"}
          </button>
        </td>
        <td>{article.journal}</td>
      </tr>
      {expanded && (
        <tr className="detail-row" id={detailId}>
          <td colSpan={4}>
            {article.abstractText ? (
              <div className="abstract"><strong>抄録：</strong><p>{article.abstractText}</p></div>
            ) : (
              <p className="hint">抄録は取得できませんでした。</p>
            )}
            {article.meshTerms && article.meshTerms.length > 0 && (
              <div className="mesh-full"><strong>MeSH Terms：</strong><p>{article.meshTerms.join("; ")}</p></div>
            )}
            {article.publicationTypes && article.publicationTypes.length > 0 && (
              <div className="pub-types"><strong>Publication Types：</strong><p>{article.publicationTypes.join("; ")}</p></div>
            )}
            {article.commentsCorrections && article.commentsCorrections.length > 0 && (
              <div className="comments-corrections">
                <strong>訂正・撤回など：</strong>
                <ul>
                  {article.commentsCorrections.map((item, index) => (
                    <li key={`${item.refType}-${item.pmid || index}`}>
                      {item.refType}{item.pmid ? ` (PMID: ${item.pmid})` : ""}{item.note ? ` — ${item.note}` : ""}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {article.authors && article.authors.length > 0 && (
              <div className="authors"><strong>著者：</strong><p>{article.authors.join(", ")}</p></div>
            )}
          </td>
        </tr>
      )}
    </>
  );
}
