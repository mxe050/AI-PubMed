import { useState } from "react";
import type { AppSettings, PubMedArticle } from "../types";
import { extractPmids } from "../utils/extractPmids";
import { extractUrls } from "../utils/extractCitations";
import { verifyPmidsWithAbstracts } from "../api/verifyPmidsWithAbstracts";
import { createNcbiRateLimiter } from "../utils/createNcbiRateLimiter";

interface Props {
  settings: AppSettings;
}

export function FactCheckTab({ settings }: Props) {
  const [aiResponse, setAiResponse] = useState("");
  const [hasRun, setHasRun] = useState(false);

  const [pubmedResults, setPubmedResults] = useState<PubMedArticle[]>([]);
  const [pubmedLoading, setPubmedLoading] = useState(false);
  const [pubmedError, setPubmedError] = useState<string | null>(null);

  const detectedPmids = extractPmids(aiResponse);
  const detectedUrls = extractUrls(aiResponse);

  async function handleStartFactCheck() {
    setHasRun(true);
    setPubmedResults([]);
    setPubmedError(null);

    if (detectedPmids.length === 0) return;

    setPubmedLoading(true);
    try {
      const limiter = createNcbiRateLimiter(settings);
      const results = await verifyPmidsWithAbstracts(
        detectedPmids,
        settings,
        limiter
      );
      setPubmedResults(results);
    } catch (e) {
      setPubmedError(
        e instanceof Error ? e.message : "PubMed検索に失敗しました"
      );
    } finally {
      setPubmedLoading(false);
    }
  }

  const verifiedArticles = pubmedResults.filter((a) => a.verified);
  const unverifiedArticles = pubmedResults.filter((a) => !a.verified);

  return (
    <div className="fact-check-tab">
      <header className="fact-check-header">
        <h2>AI出力ファクトチェック</h2>
        <p className="hint">
          AI（ChatGPT / Claude / Geminiなど）の回答に含まれる引用情報の真偽を確認します。
        </p>
        <ol className="fact-check-overview">
          <li>
            <strong>PubMed</strong>：AI回答内のPMIDを自動抽出し、PubMedで実在確認＋抄録取得＋要約用プロンプト生成
          </li>
          <li>
            <strong>URL</strong>：AI回答内のURLを抽出し、クリックして実在確認
          </li>
        </ol>
      </header>

      <section className="fact-check-section">
        <h3>1. AI回答を貼り付け</h3>
        <p className="hint">
          外部AIに質問してから、その回答全体をここに貼り付けてください。
        </p>
        <textarea
          value={aiResponse}
          onChange={(e) => setAiResponse(e.target.value)}
          rows={12}
          placeholder="ChatGPT / Claude / Gemini などからのAI回答全体をここに貼り付けてください..."
          style={{ width: "100%" }}
        />

        {aiResponse && (
          <div className="detected-summary">
            <p>
              検出された情報：PMID候補 <strong>{detectedPmids.length}</strong> 個
              / URL <strong>{detectedUrls.length}</strong> 個
            </p>
          </div>
        )}

        <button
          className="btn btn-primary"
          onClick={handleStartFactCheck}
          disabled={!aiResponse.trim() || pubmedLoading}
        >
          {pubmedLoading ? "ファクトチェック中..." : "ファクトチェックを実行"}
        </button>
      </section>

      {hasRun && (
        <section className="fact-check-section">
          <h3>2. PubMedファクトチェック結果</h3>

          {pubmedLoading && <p className="hint">PubMed APIで確認中...</p>}
          {pubmedError && <p className="error-text">{pubmedError}</p>}

          {detectedPmids.length === 0 && !pubmedLoading && (
            <p>AI回答にPMIDは含まれていませんでした。</p>
          )}

          {pubmedResults.length > 0 && (
            <>
              <div className="verify-summary">
                <span className="verify-count verified">
                  ✓ 実在確認: {verifiedArticles.length} 件
                </span>
                {unverifiedArticles.length > 0 && (
                  <span className="verify-count unverified">
                    ✗ 未確認 / 不在: {unverifiedArticles.length} 件
                  </span>
                )}
              </div>

              {unverifiedArticles.length > 0 && (
                <div className="unverified-section">
                  <h4>⚠ 未確認PMID（ハルシネーションの可能性）</h4>
                  <p className="warning-text">
                    以下のPMIDはPubMedで見つかりませんでした。AIの誤りの可能性が高いです。
                  </p>
                  <ul>
                    {unverifiedArticles.map((a) => (
                      <li key={a.pmid}>
                        <a
                          href={`https://pubmed.ncbi.nlm.nih.gov/${a.pmid}/`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          PMID {a.pmid}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {verifiedArticles.length > 0 && (
                <div className="verified-section">
                  <h4>✓ 実在確認済みPMID（抄録付き＋要約用プロンプト）</h4>
                  <div className="verified-list">
                    {verifiedArticles.map((a) => (
                      <FactCheckArticleCard key={a.pmid} article={a} />
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </section>
      )}

      <section className="fact-check-section">
        <h3>3. URL確認</h3>
        <p className="hint">
          AI回答内のURLを抽出します。各URLをクリックして、リンク先が実在し、AIの主張と一致する内容かを目視で確認してください。
          ブラウザのCORS制限により、自動でのURL存在確認はできません。
        </p>
        {detectedUrls.length === 0 ? (
          aiResponse ? (
            <p>AI回答にURLは含まれていませんでした。</p>
          ) : (
            <p className="hint">先にAI回答を貼り付けてください。</p>
          )
        ) : (
          <ul className="url-list">
            {detectedUrls.map((url) => (
              <li key={url}>
                <a href={url} target="_blank" rel="noreferrer">
                  {url}
                </a>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function FactCheckArticleCard({ article }: { article: PubMedArticle }) {
  const [showSummaryPrompt, setShowSummaryPrompt] = useState(false);
  const [copied, setCopied] = useState(false);

  const summaryPrompt = `以下はPubMedで取得した論文の抄録です。日本語で3〜5行に簡潔に要約してください。
要約には以下を含めてください：
- 研究目的
- 研究デザイン・対象
- 主要な結果
- 結論

PMID: ${article.pmid}
Title: ${article.title ?? "(no title)"}
Journal: ${article.journal ?? ""}${article.year ? " (" + article.year + ")" : ""}
${article.authors?.length ? "Authors: " + article.authors.slice(0, 5).join(", ") + (article.authors.length > 5 ? " et al." : "") : ""}

Abstract:
${article.abstractText ?? "(抄録は取得できませんでした)"}`;

  async function handleCopyPrompt() {
    try {
      await navigator.clipboard.writeText(summaryPrompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="verified-article-card">
      <div className="vac-header">
        <a
          href={`https://pubmed.ncbi.nlm.nih.gov/${article.pmid}/`}
          target="_blank"
          rel="noreferrer"
          className="vac-pmid"
        >
          PMID {article.pmid}
        </a>
        <span className="vac-meta">
          {article.year && <span>{article.year}</span>}
          {article.journal && <span>{article.journal}</span>}
        </span>
      </div>
      <div className="vac-title">{article.title ?? "(タイトル未取得)"}</div>
      {article.authors && article.authors.length > 0 && (
        <div className="vac-authors">
          {article.authors.slice(0, 5).join(", ")}
          {article.authors.length > 5 && " et al."}
        </div>
      )}
      {article.abstractText ? (
        <details className="vac-abstract" open>
          <summary>抄録を表示</summary>
          <p>{article.abstractText}</p>
        </details>
      ) : (
        <p className="vac-no-abstract">（抄録は取得できませんでした）</p>
      )}
      {article.meshTerms && article.meshTerms.length > 0 && (
        <div className="vac-mesh">
          <strong>MeSH:</strong> {article.meshTerms.slice(0, 10).join("; ")}
        </div>
      )}

      {article.abstractText && (
        <div className="summary-section">
          {!showSummaryPrompt ? (
            <button
              className="btn btn-secondary btn-small"
              onClick={() => setShowSummaryPrompt(true)}
            >
              この抄録をAIで要約するためのプロンプトを表示
            </button>
          ) : (
            <>
              <p className="hint">
                以下のプロンプトをコピーしてChatGPT / Claude / Geminiに貼り付けると、抄録の日本語要約が得られます。
              </p>
              <pre className="summary-prompt">{summaryPrompt}</pre>
              <button
                className="btn btn-primary btn-small"
                onClick={handleCopyPrompt}
              >
                {copied ? "コピーしました" : "プロンプトをコピー"}
              </button>
              <button
                className="btn btn-secondary btn-small"
                onClick={() => setShowSummaryPrompt(false)}
                style={{ marginLeft: 8 }}
              >
                閉じる
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
