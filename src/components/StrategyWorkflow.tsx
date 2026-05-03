import { useState } from "react";
import type { AppSettings, PubMedSearchResult } from "../types";
import { buildPrompt } from "../utils/buildPrompt";
import { buildApiFeedbackBlock } from "../utils/buildApiFeedbackBlock";
import { buildAbstractsBlock } from "../utils/buildAbstractsBlock";
import { extractSearchString } from "../utils/extractSearchString";
import { srRevisionPrompt } from "../prompts/revision";
import { topicPlainEnhancedPrompt } from "../prompts/topicExploration";
import { FormFields } from "./FormFields";
import { PromptDisplay } from "./PromptDisplay";
import { AiResponseInput } from "./AiResponseInput";
import { SearchStringInput } from "./SearchStringInput";
import { PubMedSearchBox } from "./PubMedSearchBox";
import { PubMedResultTable } from "./PubMedResultTable";
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

interface SrIteration {
  id: string;
  searchString: string;
  pubmedResult: PubMedSearchResult | null;
  revisionInputs: {
    relevantCount: string;
    noiseDescription: string;
    additionalKeywords: string;
    termsToRemove: string;
    userGoal: string;
  };
  revisionPrompt: string;
  revisedAiResponse: string;
}

const emptyRevisionInputs = {
  relevantCount: "",
  noiseDescription: "",
  additionalKeywords: "",
  termsToRemove: "",
  userGoal: "",
};

function makeIteration(searchString = ""): SrIteration {
  return {
    id: crypto.randomUUID(),
    searchString,
    pubmedResult: null,
    revisionInputs: { ...emptyRevisionInputs },
    revisionPrompt: "",
    revisedAiResponse: "",
  };
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
  const [iterations, setIterations] = useState<SrIteration[]>([
    makeIteration(),
  ]);

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
    setGeneratedPrompt(buildPrompt(promptTemplate, values));
  }

  function extractSearchStringFromInitialAi() {
    const extracted = extractSearchString(aiResponse);
    if (extracted) {
      updateIteration(0, { searchString: extracted });
      setTimeout(() => {
        document
          .getElementById(`step-pubmed-0`)
          ?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    } else {
      alert(
        "検索式を自動抽出できませんでした。AI回答からコピーして検索式欄に直接貼り付けてください。"
      );
    }
  }

  function updateIteration(index: number, partial: Partial<SrIteration>) {
    setIterations((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], ...partial };
      return next;
    });
  }

  function spawnNextIteration(fromIndex: number, searchString: string) {
    setIterations((prev) => {
      // truncate to fromIndex+1, then append new iteration
      const trimmed = prev.slice(0, fromIndex + 1);
      return [...trimmed, makeIteration(searchString)];
    });
    setTimeout(() => {
      document
        .getElementById(`step-pubmed-${fromIndex + 1}`)
        ?.scrollIntoView({ behavior: "smooth" });
    }, 200);
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
            このプロンプトをコピーしてChatGPT / Claude / Geminiなどに貼り付けてください。
          </p>

          {mode === "topic-synthesis" && values.question && (
            <div className="step2-secondary-prompt">
              <PromptDisplay
                prompt={buildPrompt(topicPlainEnhancedPrompt, {
                  question: values.question,
                })}
                title="プレーン多角分解版（任意・先に試せる版）"
              />
              <p className="warning-text">
                ⚠ このプロンプトで一度AIに検索（質問）すると、自分の知りたい結果が出る場合があります。
                ただし、それは網羅的な検索ではないので、それだけで判断しないこと。
                必ず後段のPubMed検索＋統合プロンプト（プロンプト3）と合わせて利用してください。
              </p>
            </div>
          )}
        </section>
      )}

      {generatedPrompt && (
        <section className="workflow-section">
          <h2>Step 3: AI回答の貼り付け</h2>
          <AiResponseInput value={aiResponse} onChange={setAiResponse} />

          {aiResponse && (
            <div className="step3-action">
              <p className="hint">
                AI回答に検索式（コードブロック）が含まれていれば、ボタン1つで次のStepの検索式欄に流し込みます。
              </p>
              <button
                className="btn btn-primary"
                onClick={extractSearchStringFromInitialAi}
              >
                AI回答から検索式を抽出して次のStepへ
              </button>
            </div>
          )}
        </section>
      )}

      {/* Iteration steps: each iteration has 3 explicit numbered steps for SR,
          or just 2 (PubMed + synthesis) for topic */}
      {aiResponse &&
        iterations.map((iter, idx) =>
          mode === "topic-synthesis" ? (
            <TopicIterationBlock
              key={iter.id}
              settings={settings}
              question={question}
              iteration={iter}
              stepBase={4 + idx * 2}
              onUpdate={(p) => updateIteration(idx, p)}
            />
          ) : (
            <SrIterationBlock
              key={iter.id}
              settings={settings}
              question={question}
              iteration={iter}
              iterationIndex={idx}
              stepBase={4 + idx * 3}
              onUpdate={(p) => updateIteration(idx, p)}
              onSpawnNext={(s) => spawnNextIteration(idx, s)}
              hasNext={idx < iterations.length - 1}
            />
          )
        )}
    </div>
  );
}

/* ========== Topic Iteration (PubMed + Synthesis) ========== */

function TopicIterationBlock({
  settings,
  question,
  iteration,
  stepBase,
  onUpdate,
}: {
  settings: AppSettings;
  question: string;
  iteration: SrIteration;
  stepBase: number;
  onUpdate: (p: Partial<SrIteration>) => void;
}) {
  return (
    <>
      <section
        id={`step-pubmed-0`}
        className="workflow-section"
      >
        <h2>Step {stepBase}: PubMed検索</h2>
        <SearchStringInput
          value={iteration.searchString}
          onChange={(v) => onUpdate({ searchString: v })}
        />
        {iteration.searchString && (
          <PubMedSearchBox
            settings={settings}
            searchString={iteration.searchString}
            onResult={(result) => onUpdate({ pubmedResult: result })}
          />
        )}
        {iteration.pubmedResult && (
          <>
            <PubMedResultTable
              result={iteration.pubmedResult}
              selectedPmids={[]}
              onToggle={() => {}}
            />
            <MeshObservationGuide pubmedResult={iteration.pubmedResult} />
          </>
        )}
      </section>

      {iteration.pubmedResult && (
        <section className="workflow-section">
          <h2>Step {stepBase + 1}: 3本のAIプロンプト</h2>
          <p className="hint">
            元の疑問の「本質」を保ったまま、複数の視点でAIから回答を得ます。
            プレーン版、プレーン強化版、PubMed統合版の3本を提示します。
          </p>
          <TopicSynthesisGenerator
            question={question}
            executedSearchString={iteration.searchString}
            pubmedResult={iteration.pubmedResult}
          />
        </section>
      )}
    </>
  );
}

/* ========== SR Iteration (PubMed + Revision Prompt + AI Response Extract) ========== */

function SrIterationBlock({
  settings,
  question,
  iteration,
  iterationIndex,
  stepBase,
  onUpdate,
  onSpawnNext,
  hasNext,
}: {
  settings: AppSettings;
  question: string;
  iteration: SrIteration;
  iterationIndex: number;
  stepBase: number;
  onUpdate: (p: Partial<SrIteration>) => void;
  onSpawnNext: (searchString: string) => void;
  hasNext: boolean;
}) {
  const iterationLabel = iterationIndex === 0 ? "初回" : `${iterationIndex + 1}回目`;

  function handleGenerateRevisionPrompt() {
    if (!iteration.pubmedResult) return;
    const prompt = buildPrompt(srRevisionPrompt, {
      question,
      executedSearchString: iteration.searchString,
      apiFeedbackBlock: buildApiFeedbackBlock(iteration.pubmedResult),
      abstractsBlock: buildAbstractsBlock(iteration.pubmedResult),
      resultCount: String(iteration.pubmedResult.count),
      relevantCountTop20: iteration.revisionInputs.relevantCount || "未入力",
      noiseDescription: iteration.revisionInputs.noiseDescription || "未入力",
      additionalKeywords: iteration.revisionInputs.additionalKeywords || "未入力",
      termsToRemove: iteration.revisionInputs.termsToRemove || "未入力",
      userGoal: iteration.revisionInputs.userGoal || "未入力",
    });
    onUpdate({ revisionPrompt: prompt });
  }

  function handleExtractAndProceed() {
    const extracted = extractSearchString(iteration.revisedAiResponse);
    if (extracted) {
      onSpawnNext(extracted);
    } else {
      alert(
        "改善された検索式を自動抽出できませんでした。AI回答からコピーして手動で次の検索式欄に貼り付けてください。"
      );
    }
  }

  return (
    <>
      {/* Step (4 + 3N): PubMed検索 */}
      <section
        id={`step-pubmed-${iterationIndex}`}
        className="workflow-section"
      >
        <h2>
          Step {stepBase}: PubMed検索
          <span className="iteration-badge">{iterationLabel}</span>
        </h2>
        <SearchStringInput
          value={iteration.searchString}
          onChange={(v) => onUpdate({ searchString: v })}
        />
        {iteration.searchString && (
          <PubMedSearchBox
            settings={settings}
            searchString={iteration.searchString}
            onResult={(result) => onUpdate({ pubmedResult: result })}
          />
        )}
        {iteration.pubmedResult && (
          <>
            <PubMedResultTable
              result={iteration.pubmedResult}
              selectedPmids={[]}
              onToggle={() => {}}
            />
            <MeshObservationGuide pubmedResult={iteration.pubmedResult} />
          </>
        )}
      </section>

      {/* Step (5 + 3N): 改善プロンプト */}
      {iteration.pubmedResult && (
        <section className="workflow-section">
          <h2>
            Step {stepBase + 1}: 改善プロンプト生成
            <span className="iteration-badge">{iterationLabel}</span>
          </h2>
          <p className="hint">
            上位文献のタイトル・抄録・付与MeSH・Publication
            Types・Query Translationが改善プロンプトに自動挿入されます。
            AIは付与MeSHから同義語を発見し、抄録から漏れている自由語を補い、
            <strong>査読（PRESS / PRISMA-S）通過品質</strong>の検索式を作成します。
          </p>

          <h4>改善プロンプトに含める評価（任意）</h4>
          <div className="form-group">
            <label>上位20件中、関連が高そうな件数</label>
            <input
              type="text"
              value={iteration.revisionInputs.relevantCount}
              onChange={(e) =>
                onUpdate({
                  revisionInputs: {
                    ...iteration.revisionInputs,
                    relevantCount: e.target.value,
                  },
                })
              }
              placeholder="例：8件"
            />
          </div>
          <div className="form-group">
            <label>ノイズとして多かった内容</label>
            <textarea
              rows={2}
              value={iteration.revisionInputs.noiseDescription}
              onChange={(e) =>
                onUpdate({
                  revisionInputs: {
                    ...iteration.revisionInputs,
                    noiseDescription: e.target.value,
                  },
                })
              }
              placeholder="例：動物実験が多い、小児の論文が混入している"
            />
          </div>
          <div className="form-group">
            <label>追加したい検索語</label>
            <textarea
              rows={2}
              value={iteration.revisionInputs.additionalKeywords}
              onChange={(e) =>
                onUpdate({
                  revisionInputs: {
                    ...iteration.revisionInputs,
                    additionalKeywords: e.target.value,
                  },
                })
              }
            />
          </div>
          <div className="form-group">
            <label>除外したい検索語</label>
            <textarea
              rows={2}
              value={iteration.revisionInputs.termsToRemove}
              onChange={(e) =>
                onUpdate({
                  revisionInputs: {
                    ...iteration.revisionInputs,
                    termsToRemove: e.target.value,
                  },
                })
              }
            />
          </div>
          <div className="form-group">
            <label>希望</label>
            <textarea
              rows={2}
              value={iteration.revisionInputs.userGoal}
              onChange={(e) =>
                onUpdate({
                  revisionInputs: {
                    ...iteration.revisionInputs,
                    userGoal: e.target.value,
                  },
                })
              }
              placeholder="例：件数を500件以下に絞りたい"
            />
          </div>

          <button
            className="btn btn-primary"
            onClick={handleGenerateRevisionPrompt}
          >
            改善プロンプトを生成
          </button>

          {iteration.revisionPrompt && (
            <PromptDisplay
              prompt={iteration.revisionPrompt}
              title="改善プロンプト"
            />
          )}
        </section>
      )}

      {/* Step (6 + 3N): AI改善回答 paste + 抽出 */}
      {iteration.revisionPrompt && (
        <section className="workflow-section">
          <h2>
            Step {stepBase + 2}: AI改善回答の貼り付け
            <span className="iteration-badge">{iterationLabel}</span>
          </h2>
          <p className="hint">
            上の改善プロンプトを外部AIに貼り付け、返ってきた改善回答全体をここに貼り付けてください。
            「AI回答から検索式を抽出して次のStepへ」を押すと、抽出された検索式で次のPubMed検索ステップが自動的に開きます。
          </p>
          <textarea
            value={iteration.revisedAiResponse}
            onChange={(e) =>
              onUpdate({ revisedAiResponse: e.target.value })
            }
            rows={10}
            placeholder="AIから返ってきた改善回答全体をここに貼り付け..."
            style={{ width: "100%" }}
          />
          {iteration.revisedAiResponse && (
            <div className="step3-action">
              <p className="hint">
                {hasNext
                  ? "次のPubMed検索ステップは既に開かれています。再抽出すると上書きされます。"
                  : "次のPubMed検索ステップが新たに開きます。"}
              </p>
              <button
                className="btn btn-primary"
                onClick={handleExtractAndProceed}
              >
                AI回答から検索式を抽出して次のStepへ
              </button>
            </div>
          )}
        </section>
      )}
    </>
  );
}

/* ========== MeSH observation guide ========== */

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
      <h4>付与MeSH・抄録・Publication Types（自動取得・次ステップへ自動挿入）</h4>
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
        <p className="hint">MeSHが取得できていません。</p>
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
