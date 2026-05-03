import { useState } from "react";
import type { PubMedSearchResult } from "../types";
import { buildPrompt } from "../utils/buildPrompt";
import { buildApiFeedbackBlock } from "../utils/buildApiFeedbackBlock";
import { revisionPrompt } from "../prompts/revision";
import { PromptDisplay } from "./PromptDisplay";

interface Props {
  question: string;
  executedSearchString: string;
  pubmedResult?: PubMedSearchResult;
}

export function RevisionPromptGenerator({
  question,
  executedSearchString,
  pubmedResult,
}: Props) {
  const [relevantCount, setRelevantCount] = useState("");
  const [noiseDescription, setNoiseDescription] = useState("");
  const [additionalKeywords, setAdditionalKeywords] = useState("");
  const [termsToRemove, setTermsToRemove] = useState("");
  const [userGoal, setUserGoal] = useState("");
  const [generatedPrompt, setGeneratedPrompt] = useState("");

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

  return (
    <div className="revision-prompt-generator">
      <h3>改善プロンプト生成</h3>
      <p className="hint">
        PubMed検索結果を確認後、以下の評価を入力して改善プロンプトを生成してください。
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

      <PromptDisplay prompt={generatedPrompt} title="改善プロンプト" />
    </div>
  );
}
