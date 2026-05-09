import { useMemo, useState } from "react";
import type { AppSettings, PubMedSearchResult } from "../types";
import { buildPrompt } from "../utils/buildPrompt";
import { extractSearchString } from "../utils/extractSearchString";
import {
  ebmInitialPrompt,
  ebmPicoRefinementPrompt,
  ebmPicoBrainstormPrompt,
} from "../prompts/ebmStep2";
import { evaluatePicoCompleteness } from "../utils/evaluatePicoCompleteness";
import { parsePicoFromAiResponse } from "../utils/parsePicoFromAiResponse";
import { parseClassificationResponse } from "../utils/parseClassificationResponse";
import { renderClassificationNewTab } from "../utils/renderClassificationNewTab";
import { buildEbmClassificationCopyText } from "../utils/buildEbmClassificationCopyText";
import {
  studyDesignFilters,
  applyStudyDesignFilter,
} from "../utils/cochraneFilters";
import type { StudyDesignFilterKey } from "../utils/cochraneFilters";
import {
  pubDateFilters,
  applyPubDateFilter,
} from "../utils/publicationDateFilter";
import type { PubDateFilterKey } from "../utils/publicationDateFilter";
import { PromptDisplay } from "./PromptDisplay";
import { SearchStringInput } from "./SearchStringInput";
import { PubMedSearchBox } from "./PubMedSearchBox";
import { PubMedResultTable } from "./PubMedResultTable";

interface Props {
  settings: AppSettings;
  onPubMedFallbackToAi: (payload: { question: string; pico: string }) => void;
}

const purposeOptions = [
  { value: "treatment", label: "治療（Therapy）" },
  { value: "diagnosis", label: "診断（Diagnosis）" },
  { value: "prognosis", label: "予後（Prognosis）" },
  { value: "harm", label: "副作用・有害事象（Harm）" },
  { value: "guideline", label: "ガイドライン確認" },
  { value: "patient", label: "患者説明用" },
  { value: "research", label: "研究計画用" },
];

type PicoVariantKey = "A" | "B" | "C";
type SearchVariantKey = "A" | "B" | "C";

const picoVariantOptions: {
  key: PicoVariantKey;
  label: string;
  instruction: string;
}[] = [
  {
    key: "A",
    label: "PICO案 A：臨床判断に近い形（標準）",
    instruction:
      "PICO案 A：臨床判断に近い形（標準）の一つだけを作成してください。PICO案 B/C や代替案は出さないでください。",
  },
  {
    key: "B",
    label: "PICO案 B：患者説明・教育用（一般的・分かりやすい形）",
    instruction:
      "PICO案 B：患者説明・教育用（一般的・分かりやすい形）の一つだけを作成してください。PICO案 A/C や代替案は出さないでください。",
  },
  {
    key: "C",
    label: "PICO案 C：システマティックレビュー用（厳密・網羅的な形）",
    instruction:
      "PICO案 C：システマティックレビュー用（厳密・網羅的な形）の一つだけを作成してください。PICO案 A/B や代替案は出さないでください。",
  },
];

const searchVariantOptions: {
  key: SearchVariantKey;
  label: string;
  instruction: string;
}[] = [
  {
    key: "A",
    label: "検索案 A：臨床判断に近い形（標準）",
    instruction:
      "検索案 A：臨床判断に近い形（標準）の一つだけを作成してください。検索案 B/C や複数パターンは出さないでください。",
  },
  {
    key: "B",
    label: "検索案 B：患者説明・教育用（一般的・分かりやすい形）",
    instruction:
      "検索案 B：患者説明・教育用（一般的・分かりやすい形）の一つだけを作成してください。検索案 A/C や複数パターンは出さないでください。",
  },
  {
    key: "C",
    label: "検索案 C：システマティックレビュー用（厳密・網羅的な形）",
    instruction:
      "検索案 C：システマティックレビュー用（厳密・網羅的な形）の一つだけを作成してください。検索案 A/B や複数パターンは出さないでください。",
  },
];

export function EbmTab({ settings, onPubMedFallbackToAi }: Props) {
  const [rawQuestion, setRawQuestion] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [purpose, setPurpose] = useState("treatment");
  const [picoVariant, setPicoVariant] = useState<PicoVariantKey>("A");
  const [searchVariant, setSearchVariant] = useState<SearchVariantKey>("A");
  const [searchFocus, setSearchFocus] = useState("");

  // PICO fields (EBM Step 1 — required, but app falls back silently if blank)
  const [picoP, setPicoP] = useState("");
  const [picoI, setPicoI] = useState("");
  const [picoC, setPicoC] = useState("");
  const [picoO, setPicoO] = useState("");

  // PICO brainstorm sub-flow (now anchored under raw question)
  const [picoBrainstormPrompt, setPicoBrainstormPrompt] = useState("");
  const [picoBrainstormResponse, setPicoBrainstormResponse] = useState("");
  const [picoAutofillMsg, setPicoAutofillMsg] = useState<{
    kind: "ok" | "error";
    text: string;
  } | null>(null);

  const combinedPico = [
    picoP && `P: ${picoP}`,
    picoI && `I: ${picoI}`,
    picoC && `C: ${picoC}`,
    picoO && `O: ${picoO}`,
  ]
    .filter(Boolean)
    .join(" / ");
  const pico = combinedPico;
  const context = combinedPico;
  const picoText = [picoP, picoI, picoC, picoO].some((v) => v.length > 0)
    ? [picoP, picoI, picoC, picoO].join("\n")
    : "";
  const hasCorePico = Boolean(picoP.trim() && picoI.trim());

  const [initialPrompt, setInitialPrompt] = useState("");
  const [aiResponse, setAiResponse] = useState("");
  const [searchString, setSearchString] = useState("");
  const [pubmedResult, setPubmedResult] = useState<PubMedSearchResult | null>(
    null
  );

  // Step 4 filters (year + design)
  const [pubDateKey, setPubDateKey] = useState<PubDateFilterKey>("none");
  const [designKey, setDesignKey] = useState<StudyDesignFilterKey>("none");

  // Step 4 classification sub-flow
  const [classificationCopyMsg, setClassificationCopyMsg] = useState("");
  const [classificationAiResponse, setClassificationAiResponse] = useState("");
  const [classificationError, setClassificationError] = useState("");

  // PICO refinement sub-flow state (Step 1)
  const [picoRefinementPrompt, setPicoRefinementPrompt] = useState("");
  const [picoRefinedAiResponse, setPicoRefinedAiResponse] = useState("");
  const [picoCheckDismissed, setPicoCheckDismissed] = useState(false);

  const picoEval = evaluatePicoCompleteness(rawQuestion);
  const showPicoRefinement =
    rawQuestion.trim().length > 0 &&
    !hasCorePico &&
    picoEval.recommendRefinement &&
    !picoCheckDismissed;

  // 検索式にフィルターを適用したもの（API送信用）。表示は元の searchString のまま。
  const effectiveSearchString = useMemo(() => {
    if (!searchString.trim()) return "";
    const designFilter = studyDesignFilters.find((f) => f.key === designKey)!;
    const withDesign = applyStudyDesignFilter(searchString, designFilter);
    return applyPubDateFilter(withDesign, pubDateKey);
  }, [searchString, designKey, pubDateKey]);

  function setPicoFromText(value: string) {
    const lines = value.split(/\r?\n/);
    setPicoP(lines[0] ?? "");
    setPicoI(lines[1] ?? "");
    setPicoC(lines[2] ?? "");
    setPicoO(lines.slice(3).join("\n"));
  }

  function buildInitialPromptForVariant(variant: SearchVariantKey) {
    const purposeLabel =
      purposeOptions.find((p) => p.value === purpose)?.label ?? purpose;
    const selectedVariant =
      searchVariantOptions.find((opt) => opt.key === variant) ??
      searchVariantOptions[0];
    return buildPrompt(ebmInitialPrompt, {
      question: rawQuestion || "PICOに基づく臨床疑問",
      specialty: specialty || "未入力",
      context: context || "未入力",
      purpose: purposeLabel,
      searchVariantLabel: selectedVariant.label,
      searchVariantInstruction: selectedVariant.instruction,
      searchFocus: searchFocus.trim() || "なし",
    });
  }

  function generateInitialPrompt() {
    if (!rawQuestion.trim() && !hasCorePico) {
      alert("原質問、またはP/Iを含むPICOを入力してください。");
      return;
    }
    if (!hasCorePico && picoEval.recommendRefinement && !picoCheckDismissed) {
      const ok = confirm(
        `この疑問はPICO要素のうち以下が不足している可能性があります：\n\n${picoEval.missing.join("、")}\n\n下のPICO洗練サブフローで疑問を磨くことを強く推奨します。\n\nそれでもこのまま初回プロンプト生成に進みますか？\n\n（OK = このまま進む / キャンセル = 戻ってPICO洗練を行う）`
      );
      if (!ok) return;
    }
    setInitialPrompt(buildInitialPromptForVariant(searchVariant));
  }

  function handleSearchVariantChange(variant: SearchVariantKey) {
    setSearchVariant(variant);
    if (initialPrompt) {
      setInitialPrompt(buildInitialPromptForVariant(variant));
    }
  }

  function generatePicoRefinementPrompt() {
    const purposeLabel =
      purposeOptions.find((p) => p.value === purpose)?.label ?? purpose;
    const prompt = buildPrompt(ebmPicoRefinementPrompt, {
      question: rawQuestion,
      specialty: specialty || "未入力",
      context: context || "未入力",
      purpose: purposeLabel,
    });
    setPicoRefinementPrompt(prompt);
  }

  function buildPicoBrainstormPromptForVariant(variant: PicoVariantKey) {
    if (!rawQuestion.trim()) {
      alert("先に原質問を入力してください。");
      return "";
    }
    const purposeLabel =
      purposeOptions.find((p) => p.value === purpose)?.label ?? purpose;
    const selectedVariant =
      picoVariantOptions.find((opt) => opt.key === variant) ??
      picoVariantOptions[0];
    return buildPrompt(ebmPicoBrainstormPrompt, {
      question: rawQuestion,
      specialty: specialty || "未入力",
      purpose: purposeLabel,
      picoVariantLabel: selectedVariant.label,
      picoVariantInstruction: selectedVariant.instruction,
    });
  }

  function generatePicoBrainstormPrompt() {
    const prompt = buildPicoBrainstormPromptForVariant(picoVariant);
    if (!prompt) return;
    setPicoBrainstormPrompt(prompt);
  }

  function handlePicoVariantChange(variant: PicoVariantKey) {
    setPicoVariant(variant);
    if (picoBrainstormPrompt) {
      const prompt = buildPicoBrainstormPromptForVariant(variant);
      if (prompt) setPicoBrainstormPrompt(prompt);
    }
  }

  function autofillPicoFromAi() {
    setPicoAutofillMsg(null);
    const result = parsePicoFromAiResponse(picoBrainstormResponse);
    if (!result.ok || !result.pico) {
      setPicoAutofillMsg({
        kind: "error",
        text: `自動入力できませんでした：${result.reason}。手動でP/I/C/Oを入力してください。`,
      });
      return;
    }
    if (result.pico.p) setPicoP(result.pico.p);
    if (result.pico.i) setPicoI(result.pico.i);
    if (result.pico.c) setPicoC(result.pico.c);
    if (result.pico.o) setPicoO(result.pico.o);
    setPicoAutofillMsg({
      kind: "ok",
      text: "PICO を自動入力しました。必要に応じて手動で編集できます。",
    });
    setTimeout(() => setPicoAutofillMsg(null), 4000);
  }

  function extractSearchFromAi() {
    const extracted = extractSearchString(aiResponse);
    if (extracted) {
      setSearchString(extracted);
      setTimeout(() => {
        document
          .getElementById("ebm-step-pubmed")
          ?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    } else {
      alert(
        "検索式を自動抽出できませんでした。コードブロック（```text ... ```）が含まれているか確認してください。"
      );
    }
  }

  async function copyClassificationPrompt() {
    if (!pubmedResult) return;
    const text = buildEbmClassificationCopyText(pubmedResult);
    try {
      await navigator.clipboard.writeText(text);
      setClassificationCopyMsg("コピーしました。外部AIに貼り付けてください");
      setTimeout(() => setClassificationCopyMsg(""), 2500);
    } catch {
      // フォールバック
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setClassificationCopyMsg("コピーしました（フォールバック）");
      setTimeout(() => setClassificationCopyMsg(""), 2500);
    }
  }

  function showClassificationResult() {
    setClassificationError("");
    const parsed = parseClassificationResponse(classificationAiResponse);
    if (!parsed.ok) {
      setClassificationError(parsed.reason ?? "分類結果のパースに失敗しました");
      return;
    }
    renderClassificationNewTab(parsed.categories, {
      rawQuestion,
      pico,
      searchString: effectiveSearchString || searchString,
      warnings: parsed.warnings,
    });
  }

  function handlePubMedFallbackToAi() {
    if (!rawQuestion.trim() && !pico.trim()) {
      alert("先に原質問、またはPICOを入力してください。");
      return;
    }
    onPubMedFallbackToAi({
      question: rawQuestion.trim(),
      pico,
    });
  }

  function clearAll() {
    if (!confirm("入力内容・取得結果をすべてクリアして最初からやり直しますか？")) return;
    setRawQuestion("");
    setSpecialty("");
    setPurpose("treatment");
    setPicoVariant("A");
    setSearchVariant("A");
    setSearchFocus("");
    setPicoP("");
    setPicoI("");
    setPicoC("");
    setPicoO("");
    setPicoBrainstormPrompt("");
    setPicoBrainstormResponse("");
    setPicoAutofillMsg(null);
    setPicoCheckDismissed(false);
    setPicoRefinementPrompt("");
    setPicoRefinedAiResponse("");
    setInitialPrompt("");
    setAiResponse("");
    setSearchString("");
    setPubmedResult(null);
    setPubDateKey("none");
    setDesignKey("none");
    setClassificationAiResponse("");
    setClassificationCopyMsg("");
    setClassificationError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <div className="ebm-tab">
      <header className="ebm-header">
        <h2>EBMのための検索（補助機能・EBM Step 2 Navigator）</h2>
        <p className="hint">
          このアプリは <strong>EBM Step 2（情報検索）</strong>に特化したフローです。
          批判的吟味（Step 3）・推奨判断・治療方針決定は<strong>行いません</strong>。
          目的は、次のEBM Step 3に渡せる「文献候補リスト」を、AIとPubMedの往復で作ることです。
        </p>
        <p className="ai-format-warning" role="alert">
          高モデルで回答すると、複数の回答が得られ、自動抽出ができない場合がありますので、手動で入力してください。
        </p>
        <div className="ebm-design-note">
          <strong>本アプリの検索方針：</strong>
          PubMed検索式には<strong>研究デザインフィルター（publication type / 研究デザイン語）を含めません</strong>。
          P×I（×O）の主題ベースで広め1本を検索し、取得結果を後段でAIに依頼してEBMヒエラルキー
          （診療GL → SR → RCT → 非RCT → 非RCT以外の観察研究 → シミュレーション/基礎研究 → その他）の
          全階層に分類します。「ガイドラインがあればGL、なければSR、なければRCT、…」という読み進めは検索後に判定します。
        </div>
        <div className="ebm-clear-bar">
          <button className="btn btn-secondary" onClick={clearAll}>
            🗑 すべての入力・結果をクリアして最初からやり直す
          </button>
        </div>
      </header>

      {/* Sticky context bar */}
      {(rawQuestion || pico) && (
        <div className="ebm-sticky-bar">
          <div>
            <strong>原質問：</strong>
            {rawQuestion || "（未入力）"}
          </div>
          {pico && (
            <div>
              <strong>PICO：</strong>
              {pico}
            </div>
          )}
          <div>
            <strong>診療科：</strong>
            {specialty || "—"}
            <span style={{ marginLeft: 16 }}>
              <strong>目的：</strong>
              {purposeOptions.find((p) => p.value === purpose)?.label ?? purpose}
            </span>
          </div>
        </div>
      )}

      {/* Step 1: Raw question */}
      <section className="workflow-section">
        <h2>Step 1: 原質問の入力</h2>
        <p className="hint">
          原質問は加工せず、ユーザーが心の中で持っている疑問のまま記録します。
          画面上部にも常時表示され、AI往復で論点がドリフトしないようにします。
        </p>

        <div className="form-group">
          <label>
            原質問<span className="required">*</span>
          </label>
          <textarea
            rows={3}
            value={rawQuestion}
            onChange={(e) => setRawQuestion(e.target.value)}
            placeholder="例：高齢者の心不全でSGLT2阻害薬ってどのくらい有効？"
          />
        </div>

        {/* PICO Brainstorm section — moved here, directly under raw question */}
        <details className="pico-brainstorm-section">
          <summary>
            <strong>
              PICOが思いつかない場合：AIに案を考えてもらうプロンプトを生成
            </strong>
          </summary>
          <p className="hint">
            原質問・診療科・検索目的だけを使って、選択した種類のPICO案を一つだけ考えてもらうプロンプトを生成します。
            AI回答を貼り付けて「PICOを自動入力」を押すと、下のP/I/C/Oフィールドに自動でセットされます。
          </p>
          <div className="prompt-option-row">
            <button
              className="btn btn-secondary"
              onClick={generatePicoBrainstormPrompt}
            >
              PICO案ブレストプロンプトを生成
            </button>
            <div className="prompt-option-buttons" aria-label="作成するPICO案">
              {picoVariantOptions.map((opt) => (
                <button
                  key={opt.key}
                  type="button"
                  className={`option-chip ${picoVariant === opt.key ? "active" : ""}`}
                  onClick={() => handlePicoVariantChange(opt.key)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
          {picoBrainstormPrompt && (
            <>
              <PromptDisplay
                prompt={picoBrainstormPrompt}
                title="PICO案ブレストプロンプト"
              />
              <p className="hint">
                上のプロンプトを外部AIに貼り付け、返ってきた回答を下に貼り付けてください。
                AIの回答末尾に <code>===PICO_START===</code> ブロックが含まれていれば、
                「PICOを自動入力」ボタンで下のP/I/C/Oフィールドに自動セットされます。
              </p>
              <textarea
                value={picoBrainstormResponse}
                onChange={(e) => setPicoBrainstormResponse(e.target.value)}
                rows={10}
                placeholder="AIから返ってきたPICO案回答全体を貼り付け..."
                style={{ width: "100%" }}
              />
              <div className="step3-action">
                <button
                  className="btn btn-primary"
                  onClick={autofillPicoFromAi}
                  disabled={!picoBrainstormResponse.trim()}
                >
                  PICOを自動入力
                </button>
                {picoAutofillMsg && (
                  <p
                    className={
                      picoAutofillMsg.kind === "ok"
                        ? "pico-autofill-ok"
                        : "pico-autofill-err"
                    }
                  >
                    {picoAutofillMsg.kind === "ok" ? "✅ " : "⚠ "}
                    {picoAutofillMsg.text}
                  </p>
                )}
              </div>
            </>
          )}
        </details>

        <div className="form-group">
          <label>診療科</label>
          <input
            type="text"
            value={specialty}
            onChange={(e) => setSpecialty(e.target.value)}
            placeholder="例：循環器内科、総合診療、家庭医療"
          />
        </div>

        <div className="ebm-pico-imperative">
          <h4>⚠ EBM Step 1（臨床疑問の定式化）— 検索の質を決める最重要ステップ</h4>
          <p>
            EBMの第1ステップ「臨床疑問の定式化」は、検索の質を根本から決める最重要のステップです。
            原質問のままではなく、必ず以下のPICOに分解して入力してください。
          </p>
          <p>
            <strong>
              AIが便利だからといって、このステップをないがしろにする癖をつけてはいけません。
            </strong>{" "}
            面倒でも、PICOを必ず入力してください。
            EBMには必ずステップがあり、ステップを飛ばすと根拠の薄い検索になります。
          </p>
          <p>
            自分でPICOが想定できない場合は、上の「PICO案をAIに考えてもらうプロンプトを生成」を使ってください。
            AIで案を出してから、その案を「PICOを自動入力」ボタンで本欄に転記して進めてください。
          </p>
        </div>

        <h4>PICO（必須）</h4>
        <div className="form-group">
          <label>P/I/C/O（1行ずつ、P → I → C → O の順）</label>
          <textarea
            rows={5}
            value={picoText}
            onChange={(e) => setPicoFromText(e.target.value)}
            placeholder={`例：
80歳代の女性、HFrEF、eGFR 45、糖尿病あり、外来
SGLT2阻害薬（ダパグリフロジン10mg/日）
標準治療（ACE-I/ARB/β遮断薬）のみ
心不全入院、全死亡、QOL`}
          />
        </div>

        <div className="form-group">
          <label>検索目的</label>
          <select value={purpose} onChange={(e) => setPurpose(e.target.value)}>
            {purposeOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {showPicoRefinement && (
          <div className="pico-refinement-box">
            <h4>⚠ PICOに加えて、患者情報で必要なことを学ぼう</h4>
            <p>
              現在のPICOをより良くするために、追加で確認したい患者情報・検査値・問診内容を整理します：
            </p>
            <ul>
              {picoEval.missing.map((m) => (
                <li key={m}>{m}</li>
              ))}
              {rawQuestion.replace(/\s/g, "").length < 30 && (
                <li>質問が短すぎる可能性（30文字未満）</li>
              )}
            </ul>
            <p className="hint">
              下の「学習プロンプトを生成」を押し、得たプロンプトをAIに投げると、現在のPICOをEBM的に見直す観点と、
              追加で患者から聞くべきこと・確認すべき検査値が得られます。
              なお、現在の疑問でも問題ないと判断した場合は「このまま進める」で警告を消せます。
            </p>

            <div className="button-group">
              <button
                className="btn btn-primary"
                onClick={generatePicoRefinementPrompt}
              >
                学習プロンプトを生成
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => setPicoCheckDismissed(true)}
              >
                このまま進める（PICO洗練をスキップ）
              </button>
            </div>

            {picoRefinementPrompt && (
              <>
                <PromptDisplay
                  prompt={picoRefinementPrompt}
                  title="PICOと患者情報の学習プロンプト"
                />

                <h5 style={{ marginTop: 12 }}>
                  AIの回答を貼り付け（任意・参照用）
                </h5>
                <p className="hint">
                  AIから返ってきた回答をここに貼り付けると、現在のPICOに何を足して考えるべきかを見ながら検討できます。
                </p>
                <textarea
                  value={picoRefinedAiResponse}
                  onChange={(e) => setPicoRefinedAiResponse(e.target.value)}
                  rows={10}
                  placeholder="AIから返ってきた学習回答全体をここに貼り付け..."
                  style={{ width: "100%" }}
                />
              </>
            )}
          </div>
        )}

        <div className="prompt-option-row">
          <button className="btn btn-primary" onClick={generateInitialPrompt}>
            初回プロンプトを生成（PICO + 検索語 + 検索式案）
          </button>
          <div className="prompt-option-buttons" aria-label="作成する検索案">
            {searchVariantOptions.map((opt) => (
              <button
                key={opt.key}
                type="button"
                className={`option-chip ${searchVariant === opt.key ? "active" : ""}`}
                onClick={() => handleSearchVariantChange(opt.key)}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
        <div className="pubmed-fallback-box">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handlePubMedFallbackToAi}
          >
            PubMed断念AIに頼る
          </button>
          <p className="hint">
            どうしてもPubMed検索でヒットしない場合は、AIに頼りますが、必ずファクトチェックをしてください。
            また、PICOに問題があってヒットしない場合、そもそも学術論文がない場合もあります。
          </p>
        </div>
        <div className="form-group search-focus-field">
          <label>
            強調したいポイント
            <span className="label-note">
              （検索結果が自分の疑問とずれている場合は、ここに記入して再度作り直してください）
            </span>
          </label>
          <textarea
            rows={3}
            value={searchFocus}
            onChange={(e) => setSearchFocus(e.target.value)}
            placeholder="例：心不全入院よりもQOL改善を重視したい／外来高齢者に近い集団を優先したい／薬剤名ではなくクラス全体で拾いたい"
          />
        </div>
      </section>

      {/* Step 2: AI initial prompt */}
      {initialPrompt && (
        <section className="workflow-section">
          <h2>Step 2: AI用プロンプト</h2>
          <div className="prompt-option-buttons prompt-option-buttons-inline" aria-label="作成する検索案">
            {searchVariantOptions.map((opt) => (
              <button
                key={opt.key}
                type="button"
                className={`option-chip ${searchVariant === opt.key ? "active" : ""}`}
                onClick={() => handleSearchVariantChange(opt.key)}
              >
                {opt.label}
              </button>
            ))}
          </div>
          {searchFocus.trim() && (
            <div className="search-focus-preview">
              <strong>強調したいポイント：</strong>
              {searchFocus}
            </div>
          )}
          <p className="hint">
            このプロンプトをコピーしてChatGPT / Claude /
            Geminiなどに貼り付けてください。
            AIはPICO・検索語・PubMed検索式案を、情報源ヒエラルキー別（GL/SR/RCT/Broad）に出力します。
          </p>
          <PromptDisplay prompt={initialPrompt} />
        </section>
      )}

      {/* Step 3: AI response paste */}
      {initialPrompt && (
        <section className="workflow-section">
          <h2>Step 3: AI回答の貼り付け</h2>
          <textarea
            value={aiResponse}
            onChange={(e) => setAiResponse(e.target.value)}
            rows={10}
            placeholder="AIから返ってきた回答全体をここに貼り付け..."
            style={{ width: "100%" }}
          />
          {pico && (
            <div className="form-group" style={{ marginTop: 12 }}>
              <label>Step 1で入力されたPICO（後段プロンプトに自動投入）</label>
              <div className="pico-preview">{pico}</div>
            </div>
          )}
          {aiResponse && (
            <div className="step3-action">
              <p className="hint">
                AI回答に検索式（コードブロック）が含まれていれば、ボタン1つでStep 4の検索式欄に流し込みます。
              </p>
              <button className="btn btn-primary" onClick={extractSearchFromAi}>
                AI回答から検索式を抽出してStep 4へ
              </button>
            </div>
          )}
        </section>
      )}

      {/* Step 4: PubMed search — broad / no design filter, optional year/design narrowing */}
      {aiResponse && (
        <section id="ebm-step-pubmed" className="workflow-section">
          <h2>Step 4: PubMed検索（広め・研究デザイン非限定）</h2>
          <div className="ebm-no-filter-note">
            <strong>⚠ 基本方針：</strong>
            研究デザインフィルターは入れません。P×I（×O）の主題ベースで広め1本を検索します。
            研究デザイン別の分類は<strong>検索後にAIで行います</strong>。
            ただし、検索結果があまりにも多い場合は、下の出版年・研究デザインフィルターで絞り込みができます。
          </div>

          <SearchStringInput
            value={searchString}
            onChange={setSearchString}
          />

          {searchString && (
            <>
              {/* Publication year filter */}
              <div className="ebm-filter-block">
                <h4>出版年フィルター（任意）</h4>
                <div className="ebm-filter-buttons" role="radiogroup" aria-label="出版年">
                  {pubDateFilters.map((f) => (
                    <button
                      key={f.key}
                      type="button"
                      role="radio"
                      aria-checked={pubDateKey === f.key}
                      className={`ebm-filter-btn ${pubDateKey === f.key ? "active" : ""}`}
                      onClick={() => setPubDateKey(f.key)}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Study design filter */}
              <div className="ebm-filter-block">
                <h4>研究デザインフィルター（任意・通常は使わない）</h4>
                <p className="hint">
                  通常は使わない設定です。検索結果が多すぎる場合のみ、絞り込みに使ってください。
                  選択中のフィルターはAPI送信時のみ付加され、上の検索式テキスト自体は変更されません。
                </p>
                <div className="ebm-filter-buttons" role="radiogroup" aria-label="研究デザイン">
                  {studyDesignFilters.map((f) => (
                    <button
                      key={f.key}
                      type="button"
                      role="radio"
                      aria-checked={designKey === f.key}
                      className={`ebm-filter-btn ${designKey === f.key ? "active" : ""}`}
                      onClick={() => setDesignKey(f.key)}
                      title={f.description}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              {(pubDateKey !== "none" || designKey !== "none") && (
                <div className="form-group">
                  <label>API送信される実際の検索式（フィルター適用後・参照用）</label>
                  <pre className="search-preview">{effectiveSearchString}</pre>
                </div>
              )}

              <PubMedSearchBox
                settings={settings}
                searchString={effectiveSearchString}
                onResult={(r) => setPubmedResult(r)}
                retmax={100}
              />
            </>
          )}

          {pubmedResult && (
            <>
              {/* Classification copy + new-tab flow */}
              <div className="ebm-classification-bar">
                <button
                  className="btn btn-primary"
                  onClick={copyClassificationPrompt}
                  type="button"
                >
                  AIで研究デザイン別に分類する（プロンプト＋結果をコピー）
                </button>
                {classificationCopyMsg && (
                  <span className="ebm-copy-feedback">
                    ✅ {classificationCopyMsg}
                  </span>
                )}
              </div>

              <PubMedResultTable
                result={pubmedResult}
                selectedPmids={[]}
                onToggle={() => {}}
              />

              {/* AI response paste + show classification */}
              <div className="ebm-classify-result-block">
                <h4>AIの回答を貼り付け</h4>
                <p className="hint">
                  上のプロンプトを外部AIに貼り付け、返ってきた回答を下に貼り付けてください。
                  「分類結果を表示」ボタンで新しいブラウザタブに分類テーブルが開きます。
                </p>
                <textarea
                  value={classificationAiResponse}
                  onChange={(e) => setClassificationAiResponse(e.target.value)}
                  rows={10}
                  placeholder="AIから返ってきた分類回答全体をここに貼り付け..."
                  style={{ width: "100%" }}
                />
                <div className="step3-action">
                  <button
                    className="btn btn-primary"
                    onClick={showClassificationResult}
                    disabled={!classificationAiResponse.trim()}
                  >
                    分類結果を表示（新しいブラウザタブ）
                  </button>
                </div>
                {classificationError && (
                  <div className="error-box" role="alert">
                    <p>⚠ {classificationError}</p>
                  </div>
                )}
              </div>
            </>
          )}
        </section>
      )}
    </div>
  );
}
