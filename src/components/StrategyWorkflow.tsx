import { useState } from "react";
import type { AppSettings, PubMedSearchResult } from "../types";
import { buildPrompt } from "../utils/buildPrompt";
import { buildApiFeedbackBlock } from "../utils/buildApiFeedbackBlock";
import { buildAbstractsBlock } from "../utils/buildAbstractsBlock";
import { extractSearchString } from "../utils/extractSearchString";
import { srRevisionPrompt } from "../prompts/revision";
import {
  topicPlainEnhancedPrompt,
  topicSimplePrompt,
} from "../prompts/topicExploration";
import {
  studyDesignFilters,
  applyStudyDesignFilter,
} from "../utils/cochraneFilters";
import type { StudyDesignFilterKey } from "../utils/cochraneFilters";
import { FormFields } from "./FormFields";
import { PromptDisplay } from "./PromptDisplay";
import { AiResponseInput } from "./AiResponseInput";
import { SearchStringInput } from "./SearchStringInput";
import { PubMedSearchBox } from "./PubMedSearchBox";
import { PubMedResultTable } from "./PubMedResultTable";

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

        {mode === "sr-revision" && (
          <div className="sr-pico-imperative">
            <h4>📋 SR の PICO は EBM の PICO とは違います（必読）</h4>
            <p>
              システマティックレビューにおける PICO は、<strong>EBM の臨床判断用 PICO とは目的が異なります</strong>。
              SR の PICO は <strong>適格基準（eligibility criteria）と検索戦略の中核</strong>を成し、後の研究選定・抽出・合成のすべての基盤になります。
              一度決めた PICO は、プロトコル登録（PROSPERO 等）後は変更が困難で、
              レビュー全体の妥当性に直接影響します。
            </p>
            <p>
              <strong>Cochrane Handbook v6.5（2024）Chapter 2「Determining the scope of the review and the questions it will address」</strong>
              および <strong>PRISMA 2020（Page MJ et al., BMJ 2021;372:n71）／PRISMA-S（Rethlefsen ML et al., Syst Rev 2021;10:39）</strong>
              は、SR における PICO の明確化が、検索の感度・透明性・再現性を担保する最重要要件であることを示しています。
            </p>
            <p>
              <strong>O（アウトカム）は検索式には含めません</strong>。
              Cochrane Handbook は、O を検索式に含めると感度が著しく落ちる（重要文献を取りこぼす）ため、検索結果から後段で抽出する方針を推奨しています。
              本アプリでもこの方針に従い、O は事前に明確化しつつ、検索式の構築には用いません。
            </p>
            <p>
              <strong>研究デザインフィルター（S）も検索の途中段階では含めません</strong>。
              最終段階で Cochrane Handbook 由来の高感度フィルター（診療ガイドライン / SR / RCT / 非RCT）を別途適用します。
            </p>
            <p className="warning-text">
              ⚠ 面倒でも、P・I・C は必ず明示的に分解して入力してください。
              SR は「PICO が曖昧なまま検索を始めると、後戻りが極めて困難」になる作業です。
            </p>
          </div>
        )}

        <FormFields
          fields={fields}
          values={values}
          onChange={handleFieldChange}
        />
        <button className="btn btn-primary" onClick={handleGeneratePrompt}>
          プロンプトを生成
        </button>
      </section>

      {generatedPrompt && mode === "sr-revision" && (
        <section className="workflow-section">
          <h2>Step 2: AI用プロンプト</h2>
          <PromptDisplay prompt={generatedPrompt} />
          <p className="hint">
            このプロンプトをコピーしてChatGPT / Claude / Geminiなどに貼り付けてください。
          </p>
        </section>
      )}

      {generatedPrompt && mode === "topic-synthesis" && values.question && (
        <section className="workflow-section">
          <h2>Step 2: 2本のプロンプト（このアプリの本体）</h2>
          <p className="hint">
            <strong>トピック探索の本体です。</strong>
            ここから先は2つのプロンプトを並列に提示します。性質が異なるため、目的に応じて使い分けてください。
            完了後の検証は <strong>「AI出力ファクトチェック」タブ</strong> で行えます。
          </p>

          {/* Prompt A: Simple intuitive */}
          <div className="prompt-card prompt-card-plain">
            <div className="prompt-card-header">
              <h3>プロンプトA：シンプル直感版（質問そのまま）</h3>
              <span className="prompt-tag prompt-tag-terminal">→ ここで終了（必要に応じて検証）</span>
            </div>
            <details>
              <summary><strong>このプロンプトの位置づけ（クリックで詳細）</strong></summary>
              <ul>
                <li>
                  ユーザーの<strong>元の質問文をほぼそのままAIにぶつける</strong>最小プロンプトです。
                  ハルシネーション抑制とラベル付与の指示だけを最小限に追加しています。
                </li>
                <li>
                  <strong>直感を重視するため</strong>のプロンプトです。アプリ側で構造化・分解・連想パスの誘導を入れず、AIモデルの「地力」をそのまま使います。
                </li>
                <li>
                  <strong>高性能モデル（GPT-5 / Claude Opus / Gemini Pro 等）であれば、これだけでも良い結果が出る可能性</strong>があります。プロンプトBの構造化指示が逆にバイアスになるケースを避けるための受け皿です。
                </li>
                <li>
                  下のプロンプトBの結果と<strong>見比べる</strong>ことで、構造化が効いているか／効きすぎているかを判断できます。
                </li>
              </ul>
            </details>
            <PromptDisplay
              prompt={buildPrompt(topicSimplePrompt, {
                question: values.question,
              })}
              title="プロンプトA：シンプル直感版"
            />
          </div>

          {/* Prompt B: Detailed Discussion-buried */}
          <div className="prompt-card prompt-card-synthesis">
            <div className="prompt-card-header">
              <h3>プロンプトB：詳細版（Discussion 埋没型を狙う作り込み）</h3>
              <span className="prompt-tag prompt-tag-continues">→ ここで終了（必要に応じて検証）</span>
            </div>
            <details>
              <summary><strong>このプロンプトの位置づけ（クリックで詳細）</strong></summary>
              <ul>
                <li>
                  <strong>言葉の揺らぎを含めて、ユーザーがトピックを完璧に言語化できなくても、的確に結果が返ってくるよう作り込んだ</strong>プロンプトです。
                </li>
                <li>
                  PubMed のタイトル・抄録検索では構造的に拾えない<strong>本文埋没型情報</strong>（Discussion / 序論 / Methods / Limitations / 脚注に書かれた批判・運用差・歴史的経緯）を、AI の訓練知識から連想的に引き出します。
                </li>
                <li>
                  質問タイプ判定（衰退理由型 / 誤用指摘型 / 評価変化型 / 運用差検出型 など）→ 視点シフト → 連想パス（著者・誌・地域・時代・後継概念）→ 候補列挙 → 本文内詳細抽出 → 統合まとめ、の順で出力されます。
                </li>
                <li>
                  各候補論文には<strong>「選定理由」が毎件異なる切り口で</strong>書かれます。単調な繰り返しにならず、読み物としても楽しめる粒度を目指しています。
                </li>
                <li>
                  内容は簡潔な日本語で要約されます。記憶からの呼び出しなのでファクトチェックタブでの照合は推奨されます。
                </li>
              </ul>
            </details>
            <PromptDisplay
              prompt={buildPrompt(topicPlainEnhancedPrompt, {
                question: values.question,
              })}
              title="プロンプトB：詳細版"
            />
          </div>

          <p className="warning-text">
            ⚠ どちらのプロンプトの結果も、網羅的な検索ではありません。重要な判断にはPubMedや原文での確認を併用してください。
          </p>
        </section>
      )}

      {generatedPrompt && mode === "sr-revision" && (
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

      {/* Iteration steps: SR mode only (each iteration = PubMed search +
          revision prompt + AI response paste with extract). Topic mode
          completes at Step 2 (plain multi-angle prompt). */}
      {aiResponse &&
        mode === "sr-revision" &&
        iterations.map((iter, idx) => (
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
        ))}

      {/* Final stage: study design filter selection (SR only).
          Available once at least one iteration has produced a search
          string. Applies a Cochrane Handbook-derived high-sensitivity
          filter to the latest search string. */}
      {mode === "sr-revision" &&
        iterations.length > 0 &&
        iterations[iterations.length - 1].searchString && (
          <SrFinalDesignFilter
            settings={settings}
            baseSearchString={
              iterations[iterations.length - 1].searchString
            }
            stepNumber={4 + iterations.length * 3}
          />
        )}
    </div>
  );
}

/* ========== Final design filter step (SR mode only) ========== */

function SrFinalDesignFilter({
  settings,
  baseSearchString,
  stepNumber,
}: {
  settings: AppSettings;
  baseSearchString: string;
  stepNumber: number;
}) {
  const [selectedKey, setSelectedKey] = useState<StudyDesignFilterKey>("none");
  const [pubmedResult, setPubmedResult] = useState<PubMedSearchResult | null>(
    null
  );

  const filter = studyDesignFilters.find((f) => f.key === selectedKey)!;
  const finalQuery = applyStudyDesignFilter(baseSearchString, filter);

  return (
    <section className="workflow-section">
      <h2>Step {stepNumber}: 研究デザインフィルターの最終適用</h2>
      <p className="hint">
        ここまで作成した検索式（最新イテレーションの検索式）に、
        <strong>Cochrane Handbook 由来の高感度フィルター</strong>
        を最終段階で適用します。
        SR の方針として、研究デザインフィルターは検索式構築の途中段階では適用せず、
        感度を最大化した検索式を完成させてから最後に適用します。
      </p>
      <p className="hint">
        フィルターの出典は <strong>Cochrane Handbook for Systematic Reviews of
        Interventions, Version 6.5 (updated August 2024), Chapter 4
        "Searching for and selecting studies"</strong> です。
        プロンプト本文には出典情報を含めず、本フィルターのコードに出典を記録しています。
      </p>

      <div className="form-group">
        <label>研究デザインフィルター</label>
        <select
          value={selectedKey}
          onChange={(e) =>
            setSelectedKey(e.target.value as StudyDesignFilterKey)
          }
        >
          {studyDesignFilters.map((f) => (
            <option key={f.key} value={f.key}>
              {f.label}
            </option>
          ))}
        </select>
        <p className="hint">{filter.description}</p>
        {filter.source && (
          <p className="hint" style={{ fontSize: "0.78rem", fontStyle: "italic" }}>
            出典：{filter.source}
          </p>
        )}
      </div>

      <h4>最終検索式（フィルター適用後）</h4>
      <pre className="search-preview">{finalQuery}</pre>

      <PubMedSearchBox
        settings={settings}
        searchString={finalQuery}
        onResult={(r) => setPubmedResult(r)}
        retmax={20}
        buttonLabel="フィルター適用版でPubMed検索"
      />

      {pubmedResult && (
        <PubMedResultTable
          result={pubmedResult}
          selectedPmids={[]}
          onToggle={() => {}}
        />
      )}
    </section>
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
