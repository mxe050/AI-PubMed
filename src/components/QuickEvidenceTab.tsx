import { useState } from "react";
import type { AppSettings } from "../types";
import { buildPrompt } from "../utils/buildPrompt";
import { quickEvidenceModes } from "../prompts/quickEvidence";
import type { QuickEvidenceMode } from "../prompts/quickEvidence";
import { PromptDisplay } from "./PromptDisplay";

interface Props {
  // settings は他タブと統一するため受け取るが、本タブでは未使用
  // （AI APIには通信せず、プロンプトをコピーする方式のため）
  settings: AppSettings;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function QuickEvidenceTab(_props: Props) {
  const [mode, setMode] = useState<QuickEvidenceMode>("quick");
  const [questionText, setQuestionText] = useState("");
  const [generatedPrompt, setGeneratedPrompt] = useState("");

  const currentMode =
    quickEvidenceModes.find((m) => m.key === mode) ?? quickEvidenceModes[0];

  function handleGenerate() {
    if (!questionText.trim()) {
      alert("入力欄に質問を入力してください。");
      return;
    }
    const prompt = buildPrompt(currentMode.promptTemplate, {
      question: questionText,
    });
    setGeneratedPrompt(prompt);
    setTimeout(() => {
      document
        .getElementById("quick-evidence-output")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 80);
  }

  return (
    <div className="strategy-workflow quick-evidence-tab">
      <header className="strategy-header">
        <h2>
          <span className="tab-main-dot" aria-hidden="true">
            ●
          </span>
          ちょっと調べたい
        </h2>
      </header>

      <div className="strategy-description">
        <p>
          臨床現場で生まれる素朴な疑問・違和感を、6つのモードで素早く外部AIに渡すためのプロンプトを作ります。
          AI APIには通信しません。質問を入力してモードを選び、生成されたプロンプトをコピーして
          ChatGPT / Claude / Gemini などに貼り付けてください。
        </p>
      </div>

      <section className="workflow-section">
        <h2>Step 1: モードを選ぶ</h2>
        <div className="quick-evidence-mode-bar" role="tablist" aria-label="モード選択">
          {quickEvidenceModes.map((m) => (
            <button
              key={m.key}
              type="button"
              role="tab"
              aria-selected={mode === m.key}
              className={`quick-evidence-mode-btn ${
                mode === m.key ? "active" : ""
              }`}
              onClick={() => setMode(m.key)}
            >
              <span className="quick-evidence-mode-icon" aria-hidden="true">
                {m.icon}
              </span>
              <span className="quick-evidence-mode-label">{m.label}</span>
            </button>
          ))}
        </div>
        <p className="quick-evidence-mode-desc">{currentMode.description}</p>
      </section>

      <section className="workflow-section">
        <h2>Step 2: 入力</h2>
        <div className="form-fields">
          <div className="form-group">
            <label htmlFor="quick-evidence-question">
              {currentMode.inputLabel}
              <span className="required">*</span>
            </label>
            <textarea
              id="quick-evidence-question"
              value={questionText}
              onChange={(e) => setQuestionText(e.target.value)}
              rows={5}
              placeholder={currentMode.placeholder}
            />
          </div>
        </div>
        <button className="btn btn-primary" onClick={handleGenerate}>
          プロンプトを生成
        </button>
      </section>

      {generatedPrompt && (
        <section
          id="quick-evidence-output"
          className="workflow-section"
        >
          <h2>Step 3: プロンプトをコピーして外部AIへ</h2>
          <div className="prompt-card">
            <div className="prompt-card-header">
              <h3>
                {currentMode.icon} {currentMode.label}モード プロンプト
              </h3>
            </div>
            <PromptDisplay
              prompt={generatedPrompt}
              title={`${currentMode.label}モード プロンプト`}
            />
          </div>

          {currentMode.emphasizeHallucinationCheck ? (
            <div className="hallucination-check-imperative">
              <h4>⚠ 必ず「AI出力ファクトチェック」タブでハルシネーションチェックを行ってください</h4>
              <p>
                このモードのプロンプトは、AI回答の末尾に
                <code>===PMIDS_START===</code> 〜 <code>===PMIDS_END===</code>
                ブロックを含む構造化された PMID リストを出させます。
                AI回答全文（または PMID リストブロックだけ）を
                <strong>「AI出力ファクトチェック」タブ</strong>
                に貼り付けると、PMID の実在確認・抄録取得・撤回警告を一括で実行できます。
              </p>
              <p className="hallucination-check-imperative-strong">
                医療情報は「ほぼハルシネーションがない」ではダメで、「ハルシネーションゼロ」でなければなりません。
                必ず実在確認を行ってください。
              </p>
            </div>
          ) : (
            <p className="warning-text">
              ⚠ 結果は外部AIの訓練知識からの想起を含み、論文の捏造（ハルシネーション）が起きる可能性があります。
              重要な判断には「AI出力ファクトチェック」タブでPMID実在確認・抄録取得・URL確認を必ず行ってください。
            </p>
          )}
        </section>
      )}
    </div>
  );
}
