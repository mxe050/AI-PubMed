import { useState } from "react";
import type { AppSettings, PubMedSearchResult } from "../types";
import { buildPrompt } from "../utils/buildPrompt";
import { buildApiFeedbackBlock } from "../utils/buildApiFeedbackBlock";
import { buildAbstractsBlock } from "../utils/buildAbstractsBlock";
import { extractPmids } from "../utils/extractPmids";
import { verifyPmids } from "../api/verifyPmids";
import { createNcbiRateLimiter } from "../utils/createNcbiRateLimiter";
import type { PubMedArticle } from "../types";
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

  const detectedPmids = extractPmids(synthesisResponse).filter(
    (pmid) => !pubmedResult.idList.includes(pmid)
  );

  async function handleVerifyNewPmids() {
    if (detectedPmids.length === 0) return;
    setVerifyLoading(true);
    setVerifyError(null);
    try {
      const limiter = createNcbiRateLimiter(settings);
      const verified = await verifyPmids(detectedPmids, settings, limiter);
      setVerifyResults(verified);
    } catch (e) {
      setVerifyError(
        e instanceof Error ? e.message : "PMID実在確認に失敗しました"
      );
    } finally {
      setVerifyLoading(false);
    }
  }

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
            タイトルとMeSHのみで統合プロンプトを生成しますが、精度が落ちる場合があります。
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
              <h3>6-4. 最終ファクトチェック</h3>
              <p className="hint">
                AIが新たに提示したPMID（PubMed結果に含まれていないもの）を実在確認します。
                これがハルシネーション検出の最終ステップです。
              </p>

              {detectedPmids.length === 0 ? (
                <p>
                  AI回答に新規PMIDは含まれていません（または既にPubMed結果に含まれているPMIDのみ）。
                </p>
              ) : (
                <>
                  <p>
                    AI回答から新規PMID候補を {detectedPmids.length} 個検出：
                    {detectedPmids.join(", ")}
                  </p>
                  <button
                    className="btn btn-secondary"
                    onClick={handleVerifyNewPmids}
                    disabled={verifyLoading}
                  >
                    {verifyLoading ? "確認中..." : "新規PMIDを実在確認"}
                  </button>
                  {verifyError && (
                    <p className="error-text">{verifyError}</p>
                  )}
                  {verifyResults.length > 0 && (
                    <table>
                      <thead>
                        <tr>
                          <th>PMID</th>
                          <th>状態</th>
                          <th>タイトル</th>
                        </tr>
                      </thead>
                      <tbody>
                        {verifyResults.map((a) => (
                          <tr
                            key={a.pmid}
                            className={a.verified ? "" : "unverified"}
                          >
                            <td>
                              <a
                                href={`https://pubmed.ncbi.nlm.nih.gov/${a.pmid}/`}
                                target="_blank"
                                rel="noreferrer"
                              >
                                {a.pmid}
                              </a>
                            </td>
                            <td>
                              {a.verified ? (
                                <span className="badge-verified">
                                  確認済み
                                </span>
                              ) : (
                                <span className="badge-unverified">
                                  未確認 / 不在
                                </span>
                              )}
                            </td>
                            <td>{a.title ?? "-"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </>
              )}

              <h3>6-5. 完成した最終回答</h3>
              <p className="hint">
                以下があなたの疑問に対する最終回答です。
                ハルシネーション警告とラベル（【PubMed結果より】【AI記憶・確認済み】等）を必ず確認してください。
              </p>
              <pre className="final-answer">{synthesisResponse}</pre>
            </div>
          )}
        </>
      )}
    </div>
  );
}
