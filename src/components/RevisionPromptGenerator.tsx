import { useState } from "react";
import type { PubMedSearchResult } from "../types";
import { buildPrompt } from "../utils/buildPrompt";
import { buildApiFeedbackBlock } from "../utils/buildApiFeedbackBlock";
import { extractSearchString } from "../utils/extractSearchString";
import { revisionPrompt } from "../prompts/revision";
import { PromptDisplay } from "./PromptDisplay";

interface Props {
  question: string;
  executedSearchString: string;
  pubmedResult?: PubMedSearchResult;
  onApplyRevisedSearchString?: (revised: string) => void;
}

export function RevisionPromptGenerator({
  question,
  executedSearchString,
  pubmedResult,
  onApplyRevisedSearchString,
}: Props) {
  const [relevantCount, setRelevantCount] = useState("");
  const [noiseDescription, setNoiseDescription] = useState("");
  const [additionalKeywords, setAdditionalKeywords] = useState("");
  const [termsToRemove, setTermsToRemove] = useState("");
  const [userGoal, setUserGoal] = useState("");
  const [generatedPrompt, setGeneratedPrompt] = useState("");
  const [revisedAiResponse, setRevisedAiResponse] = useState("");
  const [extractedRevised, setExtractedRevised] = useState<string | null>(null);

  function handleGenerate() {
    const prompt = buildPrompt(revisionPrompt, {
      question,
      executedSearchString,
      apiFeedbackBlock: buildApiFeedbackBlock(pubmedResult),
      resultCount: pubmedResult ? String(pubmedResult.count) : "未取得",
      relevantCountTop20: relevantCount || "未入力",
      noiseDescription: noiseDescription || "未入力",
      additionalKeywords: additionalKeywords || "未入力",
      termsToRemove: termsToRemove || "未入力",
      userGoal: userGoal || "未入力",
    });
    setGeneratedPrompt(prompt);
  }

  function handleExtract() {
    const extracted = extractSearchString(revisedAiResponse);
    if (extracted) {
      setExtractedRevised(extracted);
    } else {
      alert(
        "改善された検索式を自動抽出できませんでした。AI回答からコピーして手動で適用してください。"
      );
    }
  }

  function handleApply() {
    if (extractedRevised && onApplyRevisedSearchString) {
      onApplyRevisedSearchString(extractedRevised);
    }
  }

  return (
    <div className="revision-prompt-generator">
      <h3>6-1. ユーザー評価入力</h3>
      <p className="hint">
        PubMed検索結果を確認後、以下の評価を入力して改善プロンプトを生成してください。
        件数・PMID・タイトル・付与MeSH・Publication Types・Query Translationは自動的にプロンプトに含まれます。
      </p>

      <div className="form-group">
        <label htmlFor="relevant-count">
          上位20件中、関連が高そうな件数
        </label>
        <input
          id="relevant-count"
          type="text"
          value={relevantCount}
          onChange={(e) => setRelevantCount(e.target.value)}
          placeholder="例：8件"
        />
      </div>

      <div className="form-group">
        <label htmlFor="noise-desc">ノイズとして多かった内容</label>
        <textarea
          id="noise-desc"
          value={noiseDescription}
          onChange={(e) => setNoiseDescription(e.target.value)}
          rows={2}
          placeholder="例：動物実験が多い、小児の論文が混入している"
        />
      </div>

      <div className="form-group">
        <label htmlFor="add-keywords">追加したい検索語</label>
        <textarea
          id="add-keywords"
          value={additionalKeywords}
          onChange={(e) => setAdditionalKeywords(e.target.value)}
          rows={2}
          placeholder="例：oral surgery, dental implant"
        />
      </div>

      <div className="form-group">
        <label htmlFor="remove-terms">除外したい検索語</label>
        <textarea
          id="remove-terms"
          value={termsToRemove}
          onChange={(e) => setTermsToRemove(e.target.value)}
          rows={2}
          placeholder="例：veterinary, pediatric"
        />
      </div>

      <div className="form-group">
        <label htmlFor="user-goal">希望</label>
        <textarea
          id="user-goal"
          value={userGoal}
          onChange={(e) => setUserGoal(e.target.value)}
          rows={2}
          placeholder="例：件数を500件以下に絞りたい"
        />
      </div>

      <button className="btn btn-primary" onClick={handleGenerate}>
        改善プロンプトを生成
      </button>

      {generatedPrompt && (
        <>
          <PromptDisplay prompt={generatedPrompt} title="6-2. 改善プロンプト" />
          <p className="hint">
            このプロンプトをコピーして外部AIに貼り付け、改善された検索式を取得してください。
          </p>

          <h3>6-3. AIからの改善回答を貼り付け</h3>
          <textarea
            value={revisedAiResponse}
            onChange={(e) => setRevisedAiResponse(e.target.value)}
            rows={8}
            placeholder="AIから返ってきた改善後の検索式を含む回答全体をここに貼り付け..."
            style={{ width: "100%" }}
          />

          {revisedAiResponse && (
            <div className="button-group" style={{ marginTop: 8 }}>
              <button className="btn btn-secondary" onClick={handleExtract}>
                改善された検索式を抽出
              </button>
            </div>
          )}

          {extractedRevised && (
            <div className="extracted-revised">
              <h4>抽出された改善後の検索式</h4>
              <pre className="search-preview">{extractedRevised}</pre>
              <div className="button-group">
                {onApplyRevisedSearchString && (
                  <button
                    className="btn btn-primary"
                    onClick={handleApply}
                  >
                    Step 4へ戻して再検索する
                  </button>
                )}
              </div>
              <p className="hint">
                「Step 4へ戻して再検索する」を押すと、Step 4の検索式欄に新しい検索式が入り、
                PubMed APIで再検索できます。これを繰り返して精度を上げてください。
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
