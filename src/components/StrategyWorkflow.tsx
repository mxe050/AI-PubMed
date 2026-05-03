import { useState } from "react";
import type { AppSettings, PubMedSearchResult } from "../types";
import { buildPrompt } from "../utils/buildPrompt";
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
}

interface Props {
  settings: AppSettings;
  fields: FieldDef[];
  promptTemplate: string;
  description: string;
}

export function StrategyWorkflow({
  settings,
  fields,
  promptTemplate,
  description,
}: Props) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [generatedPrompt, setGeneratedPrompt] = useState("");
  const [aiResponse, setAiResponse] = useState("");
  const [searchString, setSearchString] = useState("");
  const [pubmedResult, setPubmedResult] = useState<PubMedSearchResult | null>(
    null
  );
  const [selectedPmids, setSelectedPmids] = useState<string[]>([]);

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
    const codeBlockMatch = aiResponse.match(/```(?:text)?\s*\n([\s\S]*?)```/);
    if (codeBlockMatch) {
      setSearchString(codeBlockMatch[1].trim());
    } else {
      const lines = aiResponse.split("\n");
      const searchLine = lines.find(
        (line) =>
          line.includes("[mh]") ||
          line.includes("[tiab]") ||
          line.includes("[pt]") ||
          (line.includes("AND") && line.includes("OR"))
      );
      if (searchLine) {
        setSearchString(searchLine.trim());
      } else {
        alert(
          "検索式を自動抽出できませんでした。AI回答からコピーして検索式欄に直接貼り付けてください。"
        );
      }
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

  const question = values.question || "";

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
          {aiResponse && (
            <PmidVerifier settings={settings} aiResponse={aiResponse} />
          )}
        </section>
      )}

      {aiResponse && (
        <section className="workflow-section">
          <h2>Step 4: PubMed検索</h2>
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
          <h2>Step 5: 検索結果</h2>
          <PubMedResultTable
            result={pubmedResult}
            selectedPmids={selectedPmids}
            onToggle={handleTogglePmid}
          />
        </section>
      )}

      {pubmedResult && (
        <section className="workflow-section">
          <h2>Step 6: 改善プロンプト</h2>
          <RevisionPromptGenerator
            question={question}
            executedSearchString={searchString}
            pubmedResult={pubmedResult}
          />
        </section>
      )}
    </div>
  );
}
