import { useState } from "react";
import type { PubMedSearchResult } from "../types";
import { buildPrompt } from "../utils/buildPrompt";
import { buildApiFeedbackBlock } from "../utils/buildApiFeedbackBlock";
import { buildAbstractsBlock } from "../utils/buildAbstractsBlock";
import { topicSynthesisPrompt } from "../prompts/topicExploration";
import { PromptDisplay } from "./PromptDisplay";

interface Props {
  question: string;
  executedSearchString: string;
  pubmedResult: PubMedSearchResult;
}

export function TopicSynthesisGenerator({
  question,
  executedSearchString,
  pubmedResult,
}: Props) {
  const [generatedPrompt, setGeneratedPrompt] = useState("");

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

  return (
    <div className="topic-synthesis-generator">
      <p className="hint">
        PubMed検索の結果（タイトル・抄録・MeSH・Publication Types・Query Translation）を、
        改良プロンプトに自動挿入します。AIは訓練データに含まれる「論文の考察セクション」の知識と統合して最終回答を作ります。
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
            title="統合プロンプト（外部AIへ）"
          />
          <div className="next-step-hint">
            <h4>次にすること</h4>
            <ol>
              <li>上のプロンプトをコピー</li>
              <li>ChatGPT / Claude / Geminiなどに貼り付け</li>
              <li>AIから返ってきた最終回答を全文コピー</li>
              <li>
                <strong>「AI出力ファクトチェック」タブ</strong>に貼り付け、PMID実在確認＋抄録取得＋URL確認でハルシネーションを検出
              </li>
            </ol>
          </div>
        </>
      )}
    </div>
  );
}
