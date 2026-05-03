import { useState } from "react";
import type { PubMedArticle, PubMedSearchResult } from "../types";

interface Props {
  result: PubMedSearchResult;
  selectedPmids: string[];
  onToggle: (pmid: string) => void;
}

export function PubMedResultTable({ result, selectedPmids, onToggle }: Props) {
  const [expandedPmid, setExpandedPmid] = useState<string | null>(null);

  return (
    <div className="pubmed-result-table">
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
            <th>年</th>
            <th>タイトル</th>
            <th>雑誌</th>
            <th>MeSH</th>
          </tr>
        </thead>
        <tbody>
          {result.articles.map((article) => (
            <ArticleRow
              key={article.pmid}
              article={article}
              selected={selectedPmids.includes(article.pmid)}
              expanded={expandedPmid === article.pmid}
              onToggle={() => onToggle(article.pmid)}
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
  selected,
  expanded,
  onToggle,
  onExpand,
}: {
  article: PubMedArticle;
  selected: boolean;
  expanded: boolean;
  onToggle: () => void;
  onExpand: () => void;
}) {
  return (
    <>
      <tr className={expanded ? "expanded" : ""} onClick={onExpand}>
        <td onClick={(e) => e.stopPropagation()}>
          <input
            type="checkbox"
            checked={selected}
            onChange={onToggle}
          />
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
        <td>{article.year}</td>
        <td className="title-cell">{article.title}</td>
        <td>{article.journal}</td>
        <td className="mesh-cell">{article.meshTerms?.slice(0, 5).join("; ")}</td>
      </tr>
      {expanded && (
        <tr className="detail-row">
          <td colSpan={6}>
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
