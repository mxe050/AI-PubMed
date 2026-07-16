import { useState } from "react";
import type { SrEligibilityCriteria } from "../utils/parseSrEligibilityResponse";

interface Props {
  criteria: SrEligibilityCriteria;
  onChange: (criteria: SrEligibilityCriteria) => void;
  question?: string;
}

type ArrayKey =
  | "populationNotes"
  | "studyDesigns"
  | "settings"
  | "timing"
  | "inclusion"
  | "exclusion"
  | "screeningQuestions"
  | "searchNotes";

const ARRAY_FIELDS: Array<{ key: ArrayKey; label: string; help?: string }> = [
  {
    key: "populationNotes",
    label: "複合P・部分的に適格な集団の扱い",
    help: "P1・P2の一部だけを満たす研究、混合集団、サブグループデータをどう扱うかを事前に記録します。",
  },
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

function formatList(items: string[], emptyLabel = "指定なし"): string {
  return items.length > 0
    ? items.map((item) => `・${item}`).join("\n")
    : `・${emptyLabel}`;
}

function formatDefinitionReferences(criteria: SrEligibilityCriteria): string {
  if (criteria.definitionReferences.length === 0) {
    return "・根拠文献未確認（採用前に定義候補の原典を確認してください）";
  }

  return criteria.definitionReferences
    .map((reference, index) => {
      const elements = Array.from(
        new Set(
          reference.optionIds
            .map((id) => {
              const normalized = id.trim().toUpperCase();
              if (/^P1[-_]/.test(normalized)) return "P1";
              if (/^P2[-_]/.test(normalized)) return "P2";
              return normalized.charAt(0);
            })
            .filter((element) => ["P", "P1", "P2", "I", "C", "O"].includes(element))
        )
      );
      const identifiers = [
        reference.pmid ? `PMID: ${reference.pmid}` : "",
        reference.doi ? `doi: ${reference.doi}` : "",
        reference.url ? `URL: ${reference.url}` : "",
      ].filter(Boolean);
      const citation = reference.citation || "書誌情報未記載";
      return `${index + 1}. ${citation}${
        elements.length > 0 ? `\n   定義との対応: ${elements.join(" / ")}` : ""
      }${
        identifiers.length > 0 ? `\n   ${identifiers.join(" / ")}` : ""
      }`;
    })
    .join("\n");
}

function buildShareText(
  criteria: SrEligibilityCriteria,
  question: string
): string {
  return `システマティックレビューの研究選択基準（案）

【レビューの臨床疑問】
${question.trim() || "未記載"}

【レビューPICO】
P（対象集団）：${criteria.p || "未記載"}
${
  criteria.populationMode === "multiple"
    ? `P1（主となる集団・疾患）：${criteria.p1 || "未記載"}\nP2（追加条件・特性）：${criteria.p2 || "未記載"}\n※P1/P2は検索概念の整理です。適格性は上記のP全体で判定します。`
    : `Pの検索概念：${criteria.p1 || criteria.p || "未記載"}`
}
I（介入・曝露）：${criteria.i || "未記載"}
C（比較対照）：${criteria.c || "指定なし"}
O（アウトカム）：${criteria.o || "指定なし"}

【対象とする研究デザイン】
${formatList(criteria.studyDesigns)}

【診療場面・施設・地域】
${formatList(criteria.settings)}

【介入時期・追跡期間】
${formatList(criteria.timing)}

【組入れ基準】
${formatList(criteria.inclusion)}

【複合P・部分的に適格な集団の扱い】
${formatList(criteria.populationNotes, "該当なし・未設定")}

【除外基準】
${formatList(criteria.exclusion)}

【スクリーニング時の確認項目】
${formatList(criteria.screeningQuestions)}

【論文・プロトコルのMethods記載案】
${criteria.methodsText || "未作成"}

【検索設計上の注意点】
${formatList(criteria.searchNotes, "特記事項なし")}

【採用したPICO定義の根拠文献】
${formatDefinitionReferences(criteria)}

※本案は共同研究者間で確認し、プロトコル登録・スクリーニング開始・論文投稿前に、採用した定義と原典を再確認してください。`;
}

export function SrEligibilitySummary({ criteria, onChange, question = "" }: Props) {
  const [copyMessage, setCopyMessage] = useState("");
  const shareText = buildShareText(criteria, question);

  function updateText(
    key: "p" | "p1" | "p2" | "i" | "c" | "o" | "methodsText",
    value: string
  ) {
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

  async function copyShareText() {
    try {
      await navigator.clipboard.writeText(shareText);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = shareText;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
    }
    setCopyMessage("選択基準の全文をコピーしました");
    setTimeout(() => setCopyMessage(""), 1800);
  }

  return (
    <div className="sr-eligibility-summary">
      <div className="sr-share-ready-card">
        <div className="sr-share-ready-heading">
          <div>
            <h3>共同研究者への共有・論文草案への貼り付け用</h3>
            <p>
              PICO、選択基準、採用した定義の根拠文献を一つの文書にまとめています。メール、会議資料、プロトコル・論文草案へそのまま貼り付けられます。
            </p>
          </div>
          <span>一括表示</span>
        </div>
        <div className="sr-share-document" aria-label="共有・草案用の研究選択基準">
          <pre>{shareText}</pre>
        </div>
      </div>

      <div className="step3-action sr-share-copy-action">
        <button
          type="button"
          className="btn btn-secondary btn-copy sr-copy-criteria-btn"
          onClick={() => void copyShareText()}
        >
          選択基準の全文をコピー
        </button>
        {copyMessage && <span className="ebm-copy-feedback">{copyMessage}</span>}
      </div>

      <details className="sr-eligibility-edit-details">
        <summary>必要な場合のみ、PICO・選択基準を個別に修正する</summary>
        <p className="hint">
          ここを編集すると、上の共有・草案用文書へリアルタイムに反映されます。
          {criteria.sourceOptionIds.length > 0 && (
            <> 採用定義ID：{criteria.sourceOptionIds.join(" / ")}。</>
          )}
        </p>

        <div className="sr-eligibility-reference-note">
          <strong>共有文書へ引き継いだ定義の根拠文献</strong>
          {criteria.definitionReferences.length > 0 ? (
            <ol>
              {criteria.definitionReferences.map((reference, index) => (
                <li key={`${reference.pmid || reference.doi || reference.url || reference.citation}-${index}`}>
                  {reference.optionIds.length > 0 && (
                    <>［{reference.optionIds.join(" / ")}］</>
                  )}
                  {reference.citation || "書誌情報未記載"}
                  {reference.pmid && <>（PMID: {reference.pmid}）</>}
                </li>
              ))}
            </ol>
          ) : (
            <p>採用した定義候補に根拠文献がありません。Step 3へ戻って原典を確認してください。</p>
          )}
          <p className="hint">
            ここにはStep 3で選択した定義候補の文献だけを表示します。適格基準作成AIが新たに挙げた文献は採用しません。
          </p>
        </div>

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

        {criteria.populationMode === "multiple" && (
          <div className="sr-final-population-grid">
            <label className="sr-final-pico-card sr-final-p">
              <strong>P1（主となる集団・疾患）</strong>
              <textarea
                rows={3}
                value={criteria.p1}
                onChange={(event) => updateText("p1", event.target.value)}
              />
            </label>
            <label className="sr-final-pico-card sr-final-p">
              <strong>P2（追加条件・特性）</strong>
              <textarea
                rows={3}
                value={criteria.p2}
                onChange={(event) => updateText("p2", event.target.value)}
              />
            </label>
          </div>
        )}

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
      </details>
    </div>
  );
}
