import { useRef, useState } from "react";
import type { AppSettings, PubMedArticle, PubMedSearchResult } from "../types";
import { esearchPubMed } from "../api/esearchPubMed";
import { esummaryPubMed } from "../api/esummaryPubMed";
import { efetchPubMed } from "../api/efetchPubMed";
import { createNcbiRateLimiter } from "../utils/createNcbiRateLimiter";
import {
  buildKnownPmidBenchmarkQuery,
  summarizeKnownPmidMatches,
} from "../utils/knownPmidBenchmark";
import { validatePubMedQuery, type QueryKind } from "../search/queryValidator";
import { retrieveAllPubMedIds } from "../api/retrieveAllPubMedIds";

interface Props {
  settings: AppSettings;
  searchString: string;
  onResult: (result: PubMedSearchResult) => void;
  retmax?: number;
  buttonLabel?: string;
  buttonVariant?: "primary" | "secondary";
  benchmarkPmids?: string[];
  queryKind?: QueryKind;
  retrievalSource?: "CPG" | "SR";
  allowFullIdExport?: boolean;
}

export function PubMedSearchBox({
  settings,
  searchString,
  onResult,
  retmax = 20,
  buttonLabel,
  buttonVariant = "primary",
  benchmarkPmids = [],
  queryKind = "general",
  retrievalSource,
  allowFullIdExport = false,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const [exportProgress, setExportProgress] = useState<string>("");
  const [progressMessage, setProgressMessage] = useState("");

  async function runSearch() {
    setLoading(true);
    setError(null);
    setProgressMessage("PubMedで上位文献を検索中…");
    const validation = validatePubMedQuery(searchString, queryKind);
    if (!validation.valid) {
      setError(
        validation.diagnostics
          .filter((item) => item.severity === "error")
          .map((item) => item.message)
          .join(" / ")
      );
      setProgressMessage("");
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const limiter = createNcbiRateLimiter(settings);

      const search = await esearchPubMed(
        searchString,
        settings,
        limiter,
        retmax,
        0,
        controller.signal
      );
      setProgressMessage(
        `該当${search.count.toLocaleString("ja-JP")}件。上位${search.idList.length}件の書誌情報を取得中…`
      );

      let knownPmidBenchmark: PubMedSearchResult["knownPmidBenchmark"];
      const benchmarkQuery = buildKnownPmidBenchmarkQuery(
        searchString,
        benchmarkPmids
      );
      if (benchmarkQuery) {
        try {
          const benchmarkSearch = await esearchPubMed(
            benchmarkQuery,
            settings,
            limiter,
            benchmarkPmids.length,
            0,
            controller.signal
          );
          knownPmidBenchmark = summarizeKnownPmidMatches(
            benchmarkPmids,
            benchmarkSearch.idList,
            benchmarkQuery,
            [...benchmarkSearch.warningList, ...benchmarkSearch.errorList]
          );
        } catch (benchmarkError) {
          knownPmidBenchmark = {
            requestedPmids: benchmarkPmids,
            matchedPmids: [],
            missedPmids: benchmarkPmids,
            benchmarkQuery,
            error:
              benchmarkError instanceof Error
                ? benchmarkError.message
                : "既知PMIDの照合に失敗しました",
          };
        }
      }

      const previewWarnings: string[] = [];
      let summaries: PubMedArticle[];
      try {
        summaries = await esummaryPubMed(
          search.idList,
          settings,
          limiter,
          controller.signal
        );
      } catch (summaryError) {
        if (
          summaryError instanceof DOMException &&
          summaryError.name === "AbortError"
        ) {
          throw summaryError;
        }
        previewWarnings.push(
          "上位文献の書誌情報を取得できなかったため、PMIDのみ表示します。時間をおいて再実行してください。"
        );
        summaries = search.idList.map((pmid) => ({
          pmid,
          verified: false,
          source: "manual",
          bibliographicStatus: "unverified",
          contentVerificationStatus: "unverified",
        }));
      }

      let detailedArticles = summaries;

      setProgressMessage(
        `上位${search.idList.length}件の抄録・MeSHを取得中…`
      );
      try {
        const fetched = await efetchPubMed(
          search.idList,
          settings,
          limiter,
          controller.signal
        );
        detailedArticles = summaries.map((summary) => {
          const detail = fetched.find((f) => f.pmid === summary.pmid);
          if (!detail) return summary;
          return {
            ...detail,
            ...summary,
            abstractText: detail.abstractText,
            abstractSections: detail.abstractSections,
            meshTerms: detail.meshTerms,
            publicationTypes: detail.publicationTypes,
            commentsCorrections: detail.commentsCorrections,
          };
        });
      } catch (fetchError) {
        if (fetchError instanceof DOMException && fetchError.name === "AbortError") {
          throw fetchError;
        }
        previewWarnings.push(
          "抄録・MeSHの追加取得を完了できなかったため、取得済みの書誌情報を表示します。"
        );
      }

      const result: PubMedSearchResult = {
        id: crypto.randomUUID(),
        searchStringId: crypto.randomUUID(),
        query: searchString,
        count: search.count,
        idList: search.idList,
        queryTranslation: search.queryTranslation,
        warningList: [...search.warningList, ...previewWarnings],
        errorList: search.errorList,
        warnings: [
          ...search.warningList,
          ...search.errorList,
          ...previewWarnings,
        ],
        queryParameters: {
          db: "pubmed",
          retmode: "json",
          retmax: String(retmax),
          retstart: "0",
          sort: "relevance",
          usehistory: "y",
        },
        retrievalSource,
        knownPmidBenchmark,
        articles: detailedArticles,
        fetchedAt: new Date().toISOString(),
        apiMode: settings.ncbiApiKey ? "user_api_key" : "no_api_key",
      };

      onResult(result);
      setProgressMessage(
        `上位${result.articles.length}件のプレビューをボタン直下に表示しました。`
      );
    } catch (e) {
      setProgressMessage("");
      if (e instanceof DOMException && e.name === "AbortError") {
        setError("検索をキャンセルしました。");
        return;
      }
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
      abortControllerRef.current = null;
    }
  }

  async function exportAllPmids() {
    const validation = validatePubMedQuery(searchString, queryKind);
    if (!validation.valid) {
      setError(validation.diagnostics.filter((item) => item.severity === "error").map((item) => item.message).join(" / "));
      return;
    }
    setLoading(true);
    setError(null);
    setProgressMessage("");
    setExportProgress("全件数を確認中…");
    const controller = new AbortController();
    abortControllerRef.current = controller;
    try {
      const limiter = createNcbiRateLimiter(settings);
      const pmids = await retrieveAllPubMedIds(searchString, settings, limiter, {
        signal: controller.signal,
        onProgress: ({ retrieved, total }) => setExportProgress(`${retrieved.toLocaleString()} / ${total.toLocaleString()}件`),
      });
      const audit = {
        database: "PubMed",
        query: searchString,
        retrievalSource: retrievalSource ?? null,
        retrievedAt: new Date().toISOString(),
        count: pmids.length,
        pmids,
        limitations: [
          "PubMed書誌の取得は内容・推奨の妥当性を保証しない",
          "CPGのcurrent状態は発行機関の版・置換情報を別途確認する",
        ],
      };
      const blob = new Blob([JSON.stringify(audit, null, 2)], { type: "application/json;charset=utf-8" });
      const href = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = href;
      anchor.download = `pubmed-${(retrievalSource ?? "search").toLowerCase()}-all-pmids.json`;
      anchor.click();
      URL.revokeObjectURL(href);
      setExportProgress(`全${pmids.length.toLocaleString()}件を出力しました`);
    } catch (caught) {
      if (caught instanceof DOMException && caught.name === "AbortError") {
        setError("全PMID取得をキャンセルしました。");
      } else {
        setError(caught instanceof Error ? caught.message : "全PMID取得に失敗しました");
      }
    } finally {
      setLoading(false);
      abortControllerRef.current = null;
    }
  }

  return (
    <div className="pubmed-search-box">
      <button
        type="button"
        className={`btn btn-${buttonVariant}`}
        onClick={runSearch}
        disabled={!searchString || loading}
      >
        {loading ? "検索中..." : (buttonLabel ?? "PubMed APIで検索")}
      </button>
      {loading && (
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => abortControllerRef.current?.abort()}
        >
          検索をキャンセル
        </button>
      )}
      {allowFullIdExport && (
        <button
          type="button"
          className="btn btn-secondary"
          onClick={exportAllPmids}
          disabled={!searchString || loading}
        >
          全PMIDを取得してJSON出力
        </button>
      )}
      {progressMessage && (
        <span className="pubmed-search-status" role="status" aria-live="polite">
          {progressMessage}
        </span>
      )}
      {exportProgress && <span role="status" aria-live="polite">{exportProgress}</span>}

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
