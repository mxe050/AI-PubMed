import { useState } from "react";
import type { AppSettings, PubMedSearchResult } from "../types";
import { buildPrompt } from "../utils/buildPrompt";
import { extractSearchString } from "../utils/extractSearchString";
import { FormFields } from "./FormFields";
import { PromptDisplay } from "./PromptDisplay";
import { AiResponseInput } from "./AiResponseInput";
import { SearchStringInput } from "./SearchStringInput";
import { PubMedSearchBox } from "./PubMedSearchBox";
import { PubMedResultTable } from "./PubMedResultTable";
import { PmidVerifier } from "./PmidVerifier";
import { RevisionPromptGenerator } from "./RevisionPromptGenerator";

interface FieldDef {
  key: string;
  label: string;
  required: boolean;
  multiline: boolean;
  type?: "select";
  options?: { value: string; label: string }[];
  placeholder?: string;
}

interface Props {
  settings: AppSettings;
  fields: FieldDef[];
  promptTemplate: string;
  description: string;
  /** Force "must end with PubMed" mode (for SR / GRADE). */
  enforcePubMed?: boolean;
}

export function StrategyWorkflow({
  settings,
  fields,
  promptTemplate,
  description,
  enforcePubMed = false,
}: Props) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [generatedPrompt, setGeneratedPrompt] = useState("");
  const [aiResponse, setAiResponse] = useState("");
  const [searchString, setSearchString] = useState("");
  const [pubmedResult, setPubmedResult] = useState<PubMedSearchResult | null>(
    null
  );
  const [selectedPmids, setSelectedPmids] = useState<string[]>([]);
  const [iterationCount, setIterationCount] = useState(0);

  function handleFieldChange(key: string, value: string) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  function handleGeneratePrompt() {
    const requiredFields = fields.filter((f) => f.required);
    const missing = requiredFields.filter((f) => !values[f.key]?.trim());

    if (missing.length > 0) {
      alert(
        `以下の必須項目を入力してください：\n${missing.map((f) => f.label).join("\n")}`
      );
      return;
    }

    const prompt = buildPrompt(promptTemplate, values);
    setGeneratedPrompt(prompt);
  }

  function extractSearchStringFromAi() {
    const extracted = extractSearchString(aiResponse);
    if (extracted) {
      setSearchString(extracted);
    } else {
      alert(
        "検索式を自動抽出できませんでした。AI回答からコピーして検索式欄に直接貼り付けてください。"
      );
    }
  }

  function handlePubMedResult(result: PubMedSearchResult) {
    setPubmedResult(result);
    setSelectedPmids([]);
  }

  function handleTogglePmid(pmid: string) {
    setSelectedPmids((prev) =>
      prev.includes(pmid) ? prev.filter((p) => p !== pmid) : [...prev, pmid]
    );
  }

  /** Called when user has revised search string from AI improvement and wants to re-loop. */
  function handleApplyRevisedSearchString(revised: string) {
    setSearchString(revised);
    setPubmedResult(null);
    setSelectedPmids([]);
    setIterationCount((n) => n + 1);
    setTimeout(() => {
      const el = document.getElementById("step-4-pubmed");
      if (el) el.scrollIntoView({ behavior: "smooth" });
    }, 100);
  }

  const question = values.question || "";

  const isAiRoute =
    !enforcePubMed && /ルート\s*B|ルートB|AI直接回答ルート/.test(aiResponse);

  return (
    <div className="strategy-workflow">
      <p className="strategy-description">{description}</p>

      <section className="workflow-section">
        <h2>Step 1: 入力</h2>
        <FormFields
          fields={fields}
          values={values}
          onChange={handleFieldChange}
        />
        <button className="btn btn-primary" onClick={handleGeneratePrompt}>
          プロンプトを生成
        </button>
      </section>

      {generatedPrompt && (
        <section className="workflow-section">
          <h2>Step 2: AI用プロンプト</h2>
          <PromptDisplay prompt={generatedPrompt} />
          <p className="hint">
            このプロンプトをコピーして、ChatGPT / Claude /
            Geminiなどの外部AIに貼り付けてください。
          </p>
        </section>
      )}

      {generatedPrompt && (
        <section className="workflow-section">
          <h2>Step 3: AI回答の貼り付け</h2>
          <AiResponseInput value={aiResponse} onChange={setAiResponse} />

          {aiResponse && isAiRoute && (
            <div className="ai-route-banner">
              <h4>AI直接回答ルートが選ばれました</h4>
              <p>
                AIはこのトピックについて「PubMed検索ではなくAIの解説で進める」と判定したようです。
                以下の点に注意してください：
              </p>
              <ul>
                <li>
                  AI回答内の【確認済み】【未確認・要検証】【一般論】のラベルを必ずチェックしてください。
                </li>
                <li>
                  PMIDが含まれている場合は、必ず下記のPMID実在確認を実行してください。
                </li>
                <li>
                  AI回答末尾の「ファクトチェック手順」に従い、一次資料への到達を試みてください。
                </li>
                <li>
                  PubMed検索式（B-6）が提示されていればStep 4で参考検索を試せます。必須ではありません。
                </li>
              </ul>
            </div>
          )}

          {aiResponse && (
            <PmidVerifier settings={settings} aiResponse={aiResponse} />
          )}
        </section>
      )}

      {aiResponse && (
        <section
          id="step-4-pubmed"
          className="workflow-section"
        >
          <h2>
            Step 4: PubMed検索
            {iterationCount > 0 && (
              <span className="iteration-badge">
                改善ループ {iterationCount} 回目
              </span>
            )}
          </h2>
          {isAiRoute && (
            <p className="hint">
              AIルートが選ばれているため、PubMed検索は任意です。
              B-6の参考検索式があれば試してください。
            </p>
          )}
          <SearchStringInput
            value={searchString}
            onChange={setSearchString}
            onExtractFromAi={extractSearchStringFromAi}
          />
          {searchString && (
            <PubMedSearchBox
              settings={settings}
              searchString={searchString}
              onResult={handlePubMedResult}
            />
          )}
        </section>
      )}

      {pubmedResult && (
        <section className="workflow-section">
          <h2>Step 5: 検索結果の確認</h2>
          <PubMedResultTable
            result={pubmedResult}
            selectedPmids={selectedPmids}
            onToggle={handleTogglePmid}
          />
          <MeshObservationGuide pubmedResult={pubmedResult} />
        </section>
      )}

      {pubmedResult && (
        <section className="workflow-section">
          <h2>Step 6: 改善プロンプト → AIに戻して精度を上げる</h2>
          <p className="hint">
            PubMed検索結果（件数、上位文献、付与MeSH、Publication
            Types、Query
            Translation）が改善プロンプトに自動挿入されます。
            AIの改善回答を貼り戻すと、Step 7で次のループに進めます。
          </p>
          <RevisionPromptGenerator
            question={question}
            executedSearchString={searchString}
            pubmedResult={pubmedResult}
            onApplyRevisedSearchString={handleApplyRevisedSearchString}
          />
        </section>
      )}
    </div>
  );
}

function MeshObservationGuide({
  pubmedResult,
}: {
  pubmedResult: PubMedSearchResult;
}) {
  const meshTerms = Array.from(
    new Set(pubmedResult.articles.flatMap((a) => a.meshTerms ?? []))
  );
  const pubTypes = Array.from(
    new Set(pubmedResult.articles.flatMap((a) => a.publicationTypes ?? []))
  );

  return (
    <div className="mesh-observation-guide">
      <h4>付与MeSH・Publication Types（自動取得）</h4>
      <p className="hint">
        これらは検索結果上位に頻出するMeSHです。Step 6の改善プロンプトに自動的に含まれます。
        手動でPubMedからMeSHをコピーする必要はありません。
      </p>
      {meshTerms.length > 0 ? (
        <div className="mesh-list">
          <strong>頻出MeSH（上位{Math.min(meshTerms.length, 30)}件）：</strong>
          <p>{meshTerms.slice(0, 30).join("; ")}</p>
        </div>
      ) : (
        <p className="hint">
          MeSHが取得できていません。EFetchが失敗した可能性があります。
        </p>
      )}
      {pubTypes.length > 0 && (
        <div className="pub-type-list">
          <strong>Publication Types：</strong>
          <p>{pubTypes.join("; ")}</p>
        </div>
      )}
    </div>
  );
}
