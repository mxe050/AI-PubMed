import { useState } from "react";
import type { SrEligibilityCriteria } from "../utils/parseSrEligibilityResponse";

interface Props {
  criteria: SrEligibilityCriteria;
  onChange: (criteria: SrEligibilityCriteria) => void;
}

type ArrayKey =
  | "studyDesigns"
  | "settings"
  | "timing"
  | "inclusion"
  | "exclusion"
  | "screeningQuestions"
  | "searchNotes";

const ARRAY_FIELDS: Array<{ key: ArrayKey; label: string; help?: string }> = [
  {
    key: "studyDesigns",
    label: "対象とする研究デザインの特徴",
    help: "デザイン名だけでなく、比較群・割付・介入開始時点・追跡・効果推定の特徴で確認します。",
  },
  { key: "settings", label: "診療場面・施設・地域" },
  { key: "timing", label: "介入時期・追跡期間" },
  { key: "inclusion", label: "組入れ基準" },
  { key: "exclusion", label: "除外基準" },
  {
    key: "screeningQuestions",
    label: "スクリーニング判定質問",
    help: "タイトル・抄録／全文を Yes・No・Unclear で判定する質問として使えます。",
  },
  {
    key: "searchNotes",
    label: "検索設計で残った注意点",
    help: "検索式に入れない概念、未解決の境界、感度を落とす可能性を確認します。",
  },
];

export function SrEligibilitySummary({ criteria, onChange }: Props) {
  const [copyMessage, setCopyMessage] = useState("");

  function updateText(key: "p" | "i" | "c" | "o" | "methodsText", value: string) {
    onChange({ ...criteria, [key]: value });
  }

  function updateArray(key: ArrayKey, value: string) {
    onChange({
      ...criteria,
      [key]: value
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean),
    });
  }

  async function copyMethods() {
    if (!criteria.methodsText) return;
    try {
      await navigator.clipboard.writeText(criteria.methodsText);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = criteria.methodsText;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
    }
    setCopyMessage("Methods記載案をコピーしました");
    setTimeout(() => setCopyMessage(""), 1800);
  }

  return (
    <div className="sr-eligibility-summary">
      <div className="sr-final-pico-grid">
        {(["p", "i", "c", "o"] as const).map((key) => (
          <label className={`sr-final-pico-card sr-final-${key}`} key={key}>
            <strong>{key.toUpperCase()}</strong>
            <textarea
              rows={3}
              value={criteria[key]}
              onChange={(event) => updateText(key, event.target.value)}
            />
          </label>
        ))}
      </div>

      <div className="sr-criteria-editor-grid">
        {ARRAY_FIELDS.map((field) => (
          <label className="sr-criteria-editor" key={field.key}>
            <strong>{field.label}</strong>
            {field.help && <span className="hint">{field.help}</span>}
            <textarea
              rows={Math.max(3, criteria[field.key].length)}
              value={criteria[field.key].join("\n")}
              onChange={(event) => updateArray(field.key, event.target.value)}
              placeholder="1行に1項目"
            />
          </label>
        ))}
      </div>

      <label className="sr-methods-editor">
        <strong>論文・プロトコルのMethodsに使える適格基準記載案</strong>
        <textarea
          rows={7}
          value={criteria.methodsText}
          onChange={(event) => updateText("methodsText", event.target.value)}
        />
      </label>
      <div className="step3-action">
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={() => void copyMethods()}
          disabled={!criteria.methodsText}
        >
          Methods記載案をコピー
        </button>
        {copyMessage && <span className="ebm-copy-feedback">{copyMessage}</span>}
      </div>

      {criteria.sourceOptionIds.length > 0 && (
        <p className="hint">
          採用定義ID：{criteria.sourceOptionIds.join(" / ")}。投稿前に各IDの原典と本文を再確認してください。
        </p>
      )}
    </div>
  );
}
