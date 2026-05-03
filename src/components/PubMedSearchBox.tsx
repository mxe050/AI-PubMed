import { useState } from "react";
import type { AppSettings, PubMedSearchResult } from "../types";
import { esearchPubMed } from "../api/esearchPubMed";
import { esummaryPubMed } from "../api/esummaryPubMed";
import { efetchPubMed } from "../api/efetchPubMed";
import { createNcbiRateLimiter } from "../utils/createNcbiRateLimiter";

interface Props {
  settings: AppSettings;
  searchString: string;
  onResult: (result: PubMedSearchResult) => void;
}

export function PubMedSearchBox({ settings, searchString, onResult }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function runSearch() {
    setLoading(true);
    setError(null);

    try {
      const limiter = createNcbiRateLimiter(settings);

      const search = await esearchPubMed(searchString, settings, limiter, 20);

      const summaries = await esummaryPubMed(
        search.idList,
        settings,
        limiter
      );

      let detailedArticles = summaries;

      try {
        const fetched = await efetchPubMed(search.idList, settings, limiter);
        detailedArticles = summaries.map((summary) => {
          const detail = fetched.find((f) => f.pmid === summary.pmid);
          return {
            ...summary,
            abstractText: detail?.abstractText,
            meshTerms: detail?.meshTerms,
            publicationTypes: detail?.publicationTypes,
          };
        });
      } catch {
        console.warn("EFetch failed; using ESummary only");
      }

      const result: PubMedSearchResult = {
        id: crypto.randomUUID(),
        searchStringId: crypto.randomUUID(),
        query: searchString,
        count: search.count,
        idList: search.idList,
        queryTranslation: search.queryTranslation,
        articles: detailedArticles,
        fetchedAt: new Date().toISOString(),
        apiMode: settings.ncbiApiKey ? "user_api_key" : "no_api_key",
      };

      onResult(result);
    } catch (e) {
      const message =
        e instanceof Error ? e.message : "PubMed API検索に失敗しました";

      if (message.includes("429") || message.includes("rate")) {
        setError(
          "PubMed APIのリクエスト制限に達しました。少し待ってから再試行してください。NCBI APIキーの入力を検討してください。"
        );
      } else if (message.includes("401") || message.includes("403")) {
        setError(
          "NCBI APIキーが無効、または利用できません。APIキーなしモードで再試行できます。"
        );
      } else {
        setError(message);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="pubmed-search-box">
      <button
        className="btn btn-primary"
        onClick={runSearch}
        disabled={!searchString || loading}
      >
        {loading ? "検索中..." : "PubMed APIで検索"}
      </button>

      {error && (
        <div role="alert" className="error-box">
          <p>{error}</p>
          <p className="hint">
            うまく動作しない場合は、検索式をコピーしてPubMedに直接貼り付けてください。
          </p>
        </div>
      )}
    </div>
  );
}
