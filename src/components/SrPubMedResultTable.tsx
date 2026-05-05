// SR専用検索結果テーブル
// EBM/topic 共用の PubMedResultTable とは異なり：
// - MeSH カラム削除
// - 「年」カラム削除し代わりに「著者年」（コクラン方式 "姓 年"）
// - 詳細展開行は共用版と同等（抄録・MeSH全件・Pub Types・全著者）

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
        <p>
          <strong>検索結果件数：</strong> {result.count.toLocaleString()} 件
        </p>
        <p>
          <strong>表示件数：</strong> {result.articles.length} 件（上位）
        </p>
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

      <table>
        <thead>
          <tr>
            <th>選択</th>
            <th>PMID</th>
            <th>著者年</th>
            <th>タイトル</th>
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
                setExpandedPmid(
                  expandedPmid === article.pmid ? null : article.pmid
                )
              }
            />
          ))}
        </tbody>
      </table>
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
  return (
    <>
      <tr className={expanded ? "expanded" : ""} onClick={onExpand}>
        <td onClick={(e) => e.stopPropagation()}>
          <input type="checkbox" />
        </td>
        <td>
          <a
            href={`https://pubmed.ncbi.nlm.nih.gov/${article.pmid}/`}
            target="_blank"
            rel="noreferrer"
            onClick={(e) => e.stopPropagation()}
          >
            {article.pmid}
          </a>
          {!article.verified && <span className="badge-unverified">未確認</span>}
        </td>
        <td>{authorYear}</td>
        <td className="title-cell">{article.title}</td>
        <td>{article.journal}</td>
      </tr>
      {expanded && (
        <tr className="detail-row">
          <td colSpan={5}>
            {article.abstractText && (
              <div className="abstract">
                <strong>抄録：</strong>
                <p>{article.abstractText}</p>
              </div>
            )}
            {article.meshTerms && article.meshTerms.length > 0 && (
              <div className="mesh-full">
                <strong>MeSH Terms：</strong>
                <p>{article.meshTerms.join("; ")}</p>
              </div>
            )}
            {article.publicationTypes && article.publicationTypes.length > 0 && (
              <div className="pub-types">
                <strong>Publication Types：</strong>
                <p>{article.publicationTypes.join("; ")}</p>
              </div>
            )}
            {article.authors && article.authors.length > 0 && (
              <div className="authors">
                <strong>著者：</strong>
                <p>{article.authors.join(", ")}</p>
              </div>
            )}
          </td>
        </tr>
      )}
    </>
  );
}
