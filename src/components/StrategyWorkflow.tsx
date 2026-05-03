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
import { RevisionPromptGenerator } from "./RevisionPromptGenerator";
import { TopicSynthesisGenerator } from "./TopicSynthesisGenerator";

interface FieldDef {
  key: string;
  label: string;
  required: boolean;
  multiline: boolean;
  type?: "select";
  options?: { value: string; label: string }[];
  placeholder?: string;
}

export type WorkflowMode = "topic-synthesis" | "sr-revision";

interface Props {
  settings: AppSettings;
  fields: FieldDef[];
  promptTemplate: string;
  description: string;
  mode: WorkflowMode;
}

export function StrategyWorkflow({
  settings,
  fields,
  promptTemplate,
  description,
  mode,
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
            <div className="step3-action">
              <p className="hint">
                AI回答に検索式（コードブロック）が含まれていれば、ボタン1つでStep 4の検索式欄に流し込めます。
                PMIDの実在確認は、PubMed検索後の最終ステップ（Step 6）で行います。
              </p>
              <button
                className="btn btn-primary"
                onClick={extractSearchStringFromAi}
              >
                AI回答から検索式を抽出してStep 4へ
              </button>
            </div>
          )}
        </section>
      )}

      {aiResponse && (
        <section id="step-4-pubmed" className="workflow-section">
          <h2>
            Step 4: PubMed検索
            {iterationCount > 0 && (
              <span className="iteration-badge">
                改善ループ {iterationCount} 回目
              </span>
            )}
          </h2>
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

      {pubmedResult && mode === "topic-synthesis" && (
        <section className="workflow-section">
          <h2>Step 6: AIに統合させる（最終回答）</h2>
          <p className="hint">
            トピック探索では、PubMed検索結果（タイトル・抄録・MeSH）をAIに戻し、
            AIの訓練データに含まれる「考察セクションの知識」と統合して最終回答を作ります。
            これがこのアプリの本来の目的です。
          </p>
          <TopicSynthesisGenerator
            settings={settings}
            question={question}
            executedSearchString={searchString}
            pubmedResult={pubmedResult}
          />
        </section>
      )}

      {pubmedResult && mode === "sr-revision" && (
        <section className="workflow-section">
          <h2>Step 6: 改善プロンプト → AIに戻して査読品質の検索式に</h2>
          <p className="hint">
            上位文献の<strong>タイトル・抄録・付与MeSH・Publication Types・Query Translation</strong>
            が改善プロンプトに自動挿入されます。
            AIは付与MeSHから同義語を発見し、抄録から漏れている自由語を補い、
            <strong>査読（PRESS / PRISMA-S）通過品質</strong>の検索式を作成します。
            AIの改善回答から最終検索式を抽出して、再度PubMedで検索できます。これを繰り返して精度を上げてください。
          </p>
          <RevisionPromptGenerator
            question={question}
            executedSearchString={searchString}
            pubmedResult={pubmedResult}
            onApplyRevisedSearchString={handleApplyRevisedSearchString}
            useSrPrompt
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
  const abstractsCount = pubmedResult.articles.filter(
    (a) => a.abstractText
  ).length;

  return (
    <div className="mesh-observation-guide">
      <h4>付与MeSH・抄録・Publication Types（自動取得）</h4>
      <p className="hint">
        以下は検索結果上位から自動収集された情報です。Step
        6の改善プロンプトに自動的に含まれるため、手動でPubMedからコピーする必要はありません。
      </p>
      <p>
        <strong>抄録取得済み:</strong> {abstractsCount} /{" "}
        {pubmedResult.articles.length} 件
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
