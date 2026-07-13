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
        controller.signal,
        { useHistory: false }
      );
      if (!controller.signal.aborted) {
        setChecked({ query: snapshot, result });
      }
    } catch (cause) {
      if ((cause as { name?: string }).name === "AbortError") return;
      const message =
        cause instanceof Error ? cause.message : "PubMed APIの確認に失敗しました";
      const normalizedMessage = message.toLowerCase();
      setError(
        message.includes("429") || message.toLowerCase().includes("rate")
          ? "PubMed APIの利用上限に達しました。少し待ってから再実行してください。"
          : normalizedMessage.includes("failed to fetch") ||
              normalizedMessage.includes("network") ||
              normalizedMessage.includes("load failed")
            ? "PubMed APIへ接続できませんでした。一時的な通信障害、PubMed側の混雑、またはブラウザの通信制限が考えられます。少し待って再実行してください。"
            : `PubMed APIの補助確認を完了できませんでした。検索式の誤りとは限りません。技術情報：${message}`
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
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => void checkDetails()}
          disabled={!query.trim() || loading}
        >
          {loading ? "PubMedで確認中…" : "PubMed APIで補助確認"}
        </button>
        <div>
          <h4>PubMed APIでDetails相当を補助確認</h4>
          <p className="sr-pubmed-details-instruction">
            このボタンを押して最終的な検索式の草案を完成させてください。
          </p>
          <p>
            PubMed ESearch APIが返す Query Translation、警告、エラー、該当件数を確認します。
            論文データは取得せず、NCBI Historyサーバーへ検索結果セットを保存しないため、上位100件のプレビューより先に実行できます。
            ただし、Web版Advanced SearchのDetailsと完全に同一ではありません。
          </p>
        </div>
      </div>

      {error && (
        <div className="sr-pubmed-details-alert" role="alert">
          <strong>APIによる補助確認を完了できませんでした</strong>
          <p>{error}</p>
          <p>
            検索式は変更されていません。再実行しても解消しない場合は、下の
            「PubMed Advanced Search を開く（外部）」からWeb版のDetailsを確認してください。
          </p>
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
                API通信は成功しました。PubMedが次の警告・エラーを返しました。
              </strong>
              <p>
                この赤い表示は、ボタンの故障ではなく、PubMedが検索式内の語句・フィールド・構文に確認事項を検出したことを示します。
                内容を修正して、もう一度補助確認してください。
              </p>
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
            これはPubMed ESearch APIによる補助的な解釈結果であり、妥当性が自動保証された「修正済み正解」ではありません。
            警告がある場合は語句・フィールドタグ・括弧を修正し、再確認してください。
            最終版は必ずWeb版PubMed Advanced SearchのDetailsでも確認してください。
          </p>
        </div>
      )}
    </div>
  );
}
