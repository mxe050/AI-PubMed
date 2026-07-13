// topic_exploration（質問ズレ/PubMed検索漏れ）専用ワークフロー。
// SR タブ（旧 mode="sr-revision"）は SrTab.tsx に分離されたため、
// このコンポーネントは "topic-synthesis" 1モードのみを扱う。
//
// フロー:
//   Step 1: PICO/質問入力（fields は呼び出し側から topicFields / counterEvidenceFields）
//   Step 2: プロンプト表示（コピーして外部AIへ）
// それ以降のステップは無し（topic は AI による論文探索結果をユーザーが
// ファクトチェックタブで検証する設計）。

import { useState, type ReactNode } from "react";
import type { AppSettings } from "../types";
import { buildPrompt } from "../utils/buildPrompt";
import { FormFields } from "./FormFields";
import { PromptDisplay } from "./PromptDisplay";

interface FieldDef {
  key: string;
  label: string;
  required: boolean;
  multiline: boolean;
  type?: "select";
  options?: { value: string; label: string }[];
  placeholder?: string;
  quickFillOptions?: string[];
}

export type WorkflowMode = "topic-synthesis";

interface Props {
  settings: AppSettings;
  fields: FieldDef[];
  promptTemplate: string;
  description: ReactNode;
  mode: WorkflowMode;
  /** Tab title shown as a header (matches other tabs' header style). */
  title?: string;
  prefillValues?: Record<string, string>;
  prefillKey?: number;
}

export function StrategyWorkflow({
  fields,
  promptTemplate,
  description,
  title,
  prefillValues,
}: Props) {
  const [values, setValues] = useState<Record<string, string>>(
    () => prefillValues ?? {}
  );
  const [generatedPrompt, setGeneratedPrompt] = useState("");

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

  function handleClear() {
    if (!confirm("入力内容と生成プロンプトをすべてクリアしますか？")) return;
    setValues({});
    setGeneratedPrompt("");
  }

  return (
    <div className="strategy-workflow">
      {title && (
        <header className="strategy-header">
          <h2>
            <span className="tab-main-dot" aria-hidden="true">
              ●
            </span>
            {title}
          </h2>
        </header>
      )}
      <div className="strategy-description">{description}</div>

      <section className="workflow-section">
        <h2>Step 1: 入力</h2>
        <FormFields
          fields={fields}
          values={values}
          onChange={handleFieldChange}
        />
        <div className="button-group">
          <button className="btn btn-primary" onClick={handleGeneratePrompt}>
            プロンプトを生成
          </button>
          <button className="btn btn-reset" onClick={handleClear}>
            🗑 すべてクリア
          </button>
        </div>
      </section>

      {generatedPrompt && values.question && (
        <section className="workflow-section">
          <h2>Step 2: プロンプトを外部AIに渡す</h2>

          <div className="prompt-recommendation-banner">
            <h4>📌 質問ズレ/PubMed検索漏れプロンプト</h4>
            <p>
              最初に検索方向を大きく変える確認質問を1つ返し、その後、
              PubMedのタイトル・抄録検索では届きにくい
              <strong>
                本文内証拠（Discussion / Methods / Results / Limitations / Table /
                Figure / 参考文献）
              </strong>
              を探索します。支持・反対・限定・修正を中立に確認し、書誌確認済み、
              全文証拠確認済み、探索手掛かりを分けて表示させます。
            </p>
            <p className="hint">
              回答は必ず{" "}
              <strong>「AI出力ファクトチェック」タブ</strong>{" "}
              でPMID実在確認・抄録取得・URL確認をしてください。
            </p>
          </div>

          <div className="prompt-card prompt-card-synthesis">
            <div className="prompt-card-header">
              <h3>質問ズレ/PubMed検索漏れプロンプト</h3>
              <span className="prompt-tag prompt-tag-continues">
                本文内証拠重視
              </span>
            </div>
            <PromptDisplay
              prompt={generatedPrompt}
              title="質問ズレ/PubMed検索漏れプロンプト"
            />
          </div>

          <p className="warning-text">
            ⚠
            外部AIがWeb・全文を利用できない場合は、検索結果ではなく検索手順だけが返ることがあります。
            回答は網羅的検索ではないため、必ず「AI出力ファクトチェック」と原文確認を併用してください。
          </p>
        </section>
      )}
    </div>
  );
}
