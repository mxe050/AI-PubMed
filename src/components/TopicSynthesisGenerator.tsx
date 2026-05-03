import { useState } from "react";
import type { AppSettings, PubMedSearchResult, PubMedArticle } from "../types";
import { buildPrompt } from "../utils/buildPrompt";
import { buildApiFeedbackBlock } from "../utils/buildApiFeedbackBlock";
import { buildAbstractsBlock } from "../utils/buildAbstractsBlock";
import { extractPmids } from "../utils/extractPmids";
import { verifyPmidsWithAbstracts } from "../api/verifyPmidsWithAbstracts";
import { createNcbiRateLimiter } from "../utils/createNcbiRateLimiter";
import { topicSynthesisPrompt } from "../prompts/topicExploration";
import { PromptDisplay } from "./PromptDisplay";

interface Props {
  settings: AppSettings;
  question: string;
  executedSearchString: string;
  pubmedResult: PubMedSearchResult;
}

export function TopicSynthesisGenerator({
  settings,
  question,
  executedSearchString,
  pubmedResult,
}: Props) {
  const [generatedPrompt, setGeneratedPrompt] = useState("");
  const [synthesisResponse, setSynthesisResponse] = useState("");
  const [verifyResults, setVerifyResults] = useState<PubMedArticle[]>([]);
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);

  const articlesWithAbstract = pubmedResult.articles.filter(
    (a) => a.abstractText
  ).length;

  function handleGenerate() {
    const prompt = buildPrompt(topicSynthesisPrompt, {
      question,
      executedSearchString,
      apiFeedbackBlock: buildApiFeedbackBlock(pubmedResult),
      abstractsBlock: buildAbstractsBlock(pubmedResult),
    });
    setGeneratedPrompt(prompt);
  }

  // Detect ALL PMIDs in synthesis response (both new and previously seen)
  const allDetectedPmids = extractPmids(synthesisResponse);
  const newPmids = allDetectedPmids.filter(
    (pmid) => !pubmedResult.idList.includes(pmid)
  );
  const previouslySeenPmids = allDetectedPmids.filter((pmid) =>
    pubmedResult.idList.includes(pmid)
  );

  async function handleVerifyAllPmids() {
    if (allDetectedPmids.length === 0) return;
    setVerifyLoading(true);
    setVerifyError(null);
    try {
      const limiter = createNcbiRateLimiter(settings);
      const verified = await verifyPmidsWithAbstracts(
        allDetectedPmids,
        settings,
        limiter
      );
      setVerifyResults(verified);
    } catch (e) {
      setVerifyError(
        e instanceof Error ? e.message : "PMID実在確認に失敗しました"
      );
    } finally {
      setVerifyLoading(false);
    }
  }

  const verifiedArticles = verifyResults.filter((a) => a.verified);
  const unverifiedArticles = verifyResults.filter((a) => !a.verified);

  return (
    <div className="topic-synthesis-generator">
      <h3>6-1. 統合プロンプトを生成</h3>
      <p className="hint">
        PubMed検索で得られた上位文献のタイトル・抄録・MeSHを、AIに戻して最終回答を統合させます。
        AIは訓練データに含まれる「論文の考察セクション」の知識も使って答えを完成させます。
      </p>
      <div className="hint-stats">
        <p>
          抄録が取得できている文献数: <strong>{articlesWithAbstract}</strong> /{" "}
          {pubmedResult.articles.length} 件
        </p>
        {articlesWithAbstract === 0 && (
          <p className="warning-text">
            抄録が1件も取得できていません。EFetchが失敗した可能性があります。
          </p>
        )}
      </div>

      <button className="btn btn-primary" onClick={handleGenerate}>
        統合プロンプトを生成
      </button>

      {generatedPrompt && (
        <>
          <PromptDisplay
            prompt={generatedPrompt}
            title="6-2. 統合プロンプト（外部AIへ）"
          />
          <p className="hint">
            このプロンプトをコピーして、ChatGPT / Claude /
            Geminiなどの外部AIに貼り付けてください。
            プロンプトには上位文献の抄録が含まれているため、長文になります。
          </p>

          <h3>6-3. AIの統合回答を貼り付け</h3>
          <p className="hint">
            AIは「PubMed結果の客観的データ」と「訓練データに含まれる考察セクションの知識」を統合した最終回答を返します。
          </p>
          <textarea
            value={synthesisResponse}
            onChange={(e) => setSynthesisResponse(e.target.value)}
            rows={12}
            placeholder="AIの統合回答をここに貼り付け..."
            style={{ width: "100%" }}
          />

          {synthesisResponse && (
            <div className="synthesis-final">
              <h3>6-4. 【最終ファクトチェック】PubMedで実在確認</h3>
              <p className="hint">
                <strong>これがハルシネーション検出の最終ステップです。</strong>
                AI回答に出現するすべてのPMID（新規・既出問わず）をPubMed APIで実在確認し、
                確認できたものは<strong>抄録の本文も取得</strong>して下に表示します。
                抄録取得はNCBI E-utilities EFetchを使い、APIキー不要・無料です（NCBI APIキーがあればより安定）。
              </p>

              {allDetectedPmids.length === 0 ? (
                <p>AI回答からPMIDが検出されませんでした。</p>
              ) : (
                <>
                  <div className="pmid-summary">
                    <p>
                      検出されたPMID: 計 <strong>{allDetectedPmids.length}</strong>{" "}
                      個
                      （うち既出 {previouslySeenPmids.length} 個、新規 {newPmids.length} 個）
                    </p>
                  </div>
                  <button
                    className="btn btn-primary"
                    onClick={handleVerifyAllPmids}
                    disabled={verifyLoading}
                  >
                    {verifyLoading
                      ? "確認中..."
                      : "全PMIDをPubMedで実在確認＋抄録取得"}
                  </button>
                  {verifyError && (
                    <p className="error-text">{verifyError}</p>
                  )}

                  {verifyResults.length > 0 && (
                    <div className="verify-final-results">
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
                            以下のPMIDはPubMedで見つかりませんでした。
                            AIの記憶誤り（ハルシネーション）の可能性が高いため、AI回答内のこれらの引用は信用しないでください。
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
                          <h4>✓ 実在確認済みPMID（抄録付き）</h4>
                          <p className="hint">
                            以下はPubMedで実在が確認された論文です。タイトル・雑誌・年・抄録本文・MeSHを表示します。
                            これらはAIの引用が正しいことを示しますが、AI解説と論文内容が一致するかは抄録を読んで確認してください。
                          </p>
                          <div className="verified-list">
                            {verifiedArticles.map((a) => (
                              <VerifiedArticleCard
                                key={a.pmid}
                                article={a}
                                wasInOriginalSearch={pubmedResult.idList.includes(
                                  a.pmid
                                )}
                              />
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}

              <h3>6-5. 完成した最終回答</h3>
              <p className="hint">
                以下があなたの疑問に対する最終回答です。
                上のファクトチェック結果と合わせて、各引用の信頼性を確認してください。
                AI回答内のラベル（【PubMed結果より】【AI記憶・確認済み】【AI記憶・未確認】【一般論】）を必ずチェックしてください。
              </p>
              <pre className="final-answer">{synthesisResponse}</pre>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function VerifiedArticleCard({
  article,
  wasInOriginalSearch,
}: {
  article: PubMedArticle;
  wasInOriginalSearch: boolean;
}) {
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
        {wasInOriginalSearch ? (
          <span className="vac-badge vac-badge-orig">既出（PubMed上位）</span>
        ) : (
          <span className="vac-badge vac-badge-new">AIが新規提示</span>
        )}
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
        <details className="vac-abstract" open={!wasInOriginalSearch}>
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
    </div>
  );
}
