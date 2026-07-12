import { useEffect, useMemo, useRef, useState } from "react";
import { esearchPubMed, type ESearchResult } from "../api/esearchPubMed";
import type { AppSettings } from "../types";
import { assessPubMedQueryTranslation } from "../utils/assessPubMedQueryTranslation";
import { createNcbiRateLimiter } from "../utils/createNcbiRateLimiter";

interface Props {
  settings: AppSettings;
  query: string;
}

interface CheckedDetails {
  query: string;
  result: ESearchResult;
}

export function SrPubMedDetailsChecker({ settings, query }: Props) {
  const [checked, setChecked] = useState<CheckedDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copyMessage, setCopyMessage] = useState("");
  const controllerRef = useRef<AbortController | null>(null);

  useEffect(
    () => () => {
      controllerRef.current?.abort();
    },
    []
  );

  const assessment = useMemo(
    () =>
      checked
        ? assessPubMedQueryTranslation(checked.query, checked.result)
        : null,
    [checked]
  );
  const isStale = Boolean(checked && checked.query !== query);

  async function checkDetails() {
    const snapshot = query.trim();
    if (!snapshot) return;

    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    setLoading(true);
    setError("");
    setCopyMessage("");
    setChecked(null);

    try {
      const result = await esearchPubMed(
        snapshot,
        settings,
        createNcbiRateLimiter(settings),
        0,
        0,
        controller.signal
      );
      if (!controller.signal.aborted) {
        setChecked({ query: snapshot, result });
      }
    } catch (cause) {
      if ((cause as { name?: string }).name === "AbortError") return;
      const message =
        cause instanceof Error ? cause.message : "PubMed APIの確認に失敗しました";
      setError(
        message.includes("429") || message.toLowerCase().includes("rate")
          ? "PubMed APIの利用上限に達しました。少し待ってから再実行してください。"
          : `PubMed APIでDetails相当を確認できませんでした：${message}`
      );
    } finally {
      if (controllerRef.current === controller) {
        setLoading(false);
      }
    }
  }

  async function copyTranslatedQuery() {
    if (!assessment?.translatedQuery) return;
    try {
      await navigator.clipboard.writeText(assessment.translatedQuery);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = assessment.translatedQuery;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
    }
    setCopyMessage("PubMedが解釈した検索式をコピーしました");
    setTimeout(() => setCopyMessage(""), 1800);
  }

  return (
    <div className="sr-pubmed-details-checker">
      <div className="sr-pubmed-details-heading">
        <div>
          <h4>PubMed Advanced Search の Details相当を確認</h4>
          <p>
            PubMed APIで Query Translation、警告、エラーを確認します。論文データは取得しないため、上位100件のプレビューより先に実行できます。
          </p>
        </div>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => void checkDetails()}
          disabled={!query.trim() || loading}
        >
          {loading ? "PubMedで確認中…" : "PubMed APIでDetails相当を確認"}
        </button>
      </div>

      {error && (
        <div className="sr-pubmed-details-alert" role="alert">
          {error}
        </div>
      )}

      {checked && assessment && (
        <div className="sr-pubmed-details-result">
          {isStale && (
            <div className="sr-pubmed-details-stale" role="status">
              検索式が確認後に変更されています。現在の式でもう一度確認してください。
            </div>
          )}

          {(assessment.status === "error" ||
            assessment.status === "warning") && (
            <div className="sr-pubmed-details-alert" role="alert">
              <strong>
                PubMedのDetailsでは、この種類の警告・エラーが赤字で表示されます。検索式を確認・修正してください。
              </strong>
              {assessment.errors.length > 0 && (
                <div>
                  <span>エラー</span>
                  <ul>
                    {assessment.errors.map((message, index) => (
                      <li key={`error-${index}`}>{message}</li>
                    ))}
                  </ul>
                </div>
              )}
              {assessment.warnings.length > 0 && (
                <div>
                  <span>警告</span>
                  <ul>
                    {assessment.warnings.map((message, index) => (
                      <li key={`warning-${index}`}>{message}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {assessment.status === "translated" && (
            <div className="sr-pubmed-details-info" role="status">
              警告・エラーは返されませんでした。下の変換はMeSH・同義語等への通常のAutomatic Term Mappingを含み、元の式が誤りという意味ではありません。
            </div>
          )}

          {assessment.status === "unchanged" && (
            <div className="sr-pubmed-details-ok" role="status">
              PubMedから警告・エラーは返されず、検索式の実質的な変換もありませんでした。
            </div>
          )}

          <div className="sr-pubmed-details-meta">
            PubMed該当件数：{checked.result.count.toLocaleString("ja-JP")}件
          </div>
          <label htmlFor="sr-pubmed-translated-query">
            {assessment.translationReturned
              ? "PubMedが実際に解釈した検索式（Query Translation）"
              : "確認対象の元の検索式（Query Translationは返されませんでした）"}
          </label>
          <textarea
            id="sr-pubmed-translated-query"
            value={assessment.translatedQuery}
            readOnly
            rows={6}
          />
          <div className="sr-pubmed-details-copy-row">
            <button
              type="button"
              className="btn btn-secondary sr-copy-translated-query"
              onClick={() => void copyTranslatedQuery()}
              disabled={!assessment.translatedQuery}
            >
              {assessment.translationReturned
                ? "PubMed解釈後の検索式をコピー"
                : "元の検索式をコピー"}
            </button>
            {copyMessage && (
              <span className="ebm-copy-feedback" role="status">
                {copyMessage}
              </span>
            )}
          </div>
          <p className="hint">
            これはPubMedによる解釈結果であり、妥当性が自動保証された「修正済み正解」ではありません。警告がある場合は語句・フィールドタグ・括弧を修正し、再確認してください。
          </p>
        </div>
      )}
    </div>
  );
}
