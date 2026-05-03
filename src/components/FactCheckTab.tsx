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
                  <BulkTranslateButton articles={verifiedArticles} />
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

function BulkTranslateButton({ articles }: { articles: PubMedArticle[] }) {
  const [copied, setCopied] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);

  const articleBlocks = articles
    .map((a, idx) => {
      const lines: string[] = [];
      lines.push(`--- [${idx + 1}] PMID ${a.pmid} ---`);
      lines.push(`Title: ${a.title ?? "(no title)"}`);
      if (a.journal) lines.push(`Journal: ${a.journal}${a.year ? " (" + a.year + ")" : ""}`);
      if (a.authors?.length) {
        lines.push(
          `Authors: ${a.authors.slice(0, 5).join(", ")}${a.authors.length > 5 ? " et al." : ""}`
        );
      }
      if (a.meshTerms?.length) {
        lines.push(`MeSH: ${a.meshTerms.slice(0, 10).join("; ")}`);
      }
      lines.push(`Abstract:\n${a.abstractText ?? "(抄録は取得できませんでした)"}`);
      return lines.join("\n");
    })
    .join("\n\n");

  const bulkPrompt = `あなたは医学情報専門家です。以下に、PubMedから取得した ${articles.length} 件の論文の抄録があります。
すべての抄録を読み、次の2段階で日本語化してください。

# 第1段階：各抄録の日本語訳と簡潔な要約
それぞれの抄録について、以下の形式で出力してください：

## [番号] PMID xxxxxxx — タイトル日本語訳
- 雑誌・年・著者
- **日本語要約（5〜8行）**：研究目的・対象・主要結果・結論を含む
- **キーポイント（箇条書き2〜4個）**：臨床的に重要な点

# 第2段階：全${articles.length}件のまとめ
全抄録を横断して以下を日本語で記述してください：

## 共通テーマ
複数の抄録に共通する主題、対象、介入、アウトカムをまとめてください。

## 結論の傾向
結果の方向性（賛成／反対／中立）、効果の大きさ、エビデンスの質を集約してください。
矛盾する結果がある場合は明示してください。

## 主要なエビデンスギャップ
これらの抄録から見えてくる、まだ明確になっていない論点や今後の研究課題を挙げてください。

## 臨床への示唆
医療現場でこれらのエビデンスをどう活用できるかを2〜4行でまとめてください。

# 重要ルール
- 日本語訳・要約はあくまで抄録の内容に忠実に。あなたの記憶からの情報を混ぜないでください。
- 抄録に書かれていないことを補足する場合は【AI記憶・要確認】とラベルを付けてください。
- 数値・PMID・固有名詞は原文のまま正確に転記してください。

---

# 抄録データ（${articles.length}件）

${articleBlocks}`;

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(bulkPrompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = bulkPrompt;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <div className="bulk-translate-box">
      <h5>全{articles.length}件の抄録を一括で翻訳＋まとめ</h5>
      <p className="hint">
        確認済み抄録{articles.length}件を、AIに「日本語訳＋個別要約＋全体まとめ」させるプロンプトを生成します。
        ChatGPT / Claude / Geminiなどに貼り付けてください。
        抄録量が多い場合はClaude（長文処理に強い）やGemini（長文コンテキスト）が向きます。
      </p>
      <div className="button-group">
        <button className="btn btn-primary" onClick={handleCopy}>
          {copied ? "コピーしました" : "全抄録の翻訳＋まとめプロンプトをコピー"}
        </button>
        <button
          className="btn btn-secondary"
          onClick={() => setShowPrompt((v) => !v)}
        >
          {showPrompt ? "プロンプト本文を隠す" : "プロンプト本文を表示"}
        </button>
      </div>
      {showPrompt && <pre className="summary-prompt">{bulkPrompt}</pre>}
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
