import { useMemo, useState } from "react";
import type { AppSettings, PubMedSearchResult } from "../types";
import { buildPrompt } from "../utils/buildPrompt";
import { extractSearchString } from "../utils/extractSearchString";
import {
  ebmInitialPrompt,
  ebmPicoRefinementPrompt,
  ebmPicoBrainstormPrompt,
} from "../prompts/ebmStep2";
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
import { PicoGuide } from "./PicoGuide";
import { WorkflowNav } from "./WorkflowNav";

interface Props {
  settings: AppSettings;
  onPubMedFallbackToAi: (payload: {
    question: string;
    pico: string;
    focus: string;
  }) => void;
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
  const hasCorePico = Boolean(picoP.trim() && picoI.trim());

  const [initialPrompt, setInitialPrompt] = useState("");
  const [aiResponse, setAiResponse] = useState("");
  const [responsePrompt, setResponsePrompt] = useState("");
  const [searchString, setSearchString] = useState("");
  const [pubmedResult, setPubmedResult] = useState<PubMedSearchResult | null>(
    null
  );
  const [resultPrompt, setResultPrompt] = useState("");

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

  // 検索式にフィルターを適用したもの（API送信用）。表示は元の searchString のまま。
  const effectiveSearchString = useMemo(() => {
    if (!searchString.trim()) return "";
    const designFilter = studyDesignFilters.find((f) => f.key === designKey)!;
    const withDesign = applyStudyDesignFilter(searchString, designFilter);
    return applyPubDateFilter(withDesign, pubDateKey);
  }, [searchString, designKey, pubDateKey]);

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
    setInitialPrompt(buildInitialPromptForVariant(searchVariant));
  }

  const initialPromptIsStale = Boolean(initialPrompt &&
    initialPrompt !== buildInitialPromptForVariant(searchVariant));
  const responseIsStale = Boolean(aiResponse &&
    (initialPromptIsStale || responsePrompt !== initialPrompt));
  const resultIsStale = Boolean(pubmedResult &&
    (initialPromptIsStale || responseIsStale || resultPrompt !== buildInitialPromptForVariant(searchVariant) ||
      pubmedResult.query !== effectiveSearchString));

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
      currentPico: combinedPico || "まだ未入力",
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
    if (resultIsStale) return;
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
    if (resultIsStale) return;
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
    if (!rawQuestion.trim() && !pico.trim() && !searchFocus.trim()) {
      alert("先に原質問、PICO、または強調したいポイントを入力してください。");
      return;
    }
    onPubMedFallbackToAi({
      question: rawQuestion.trim(),
      pico,
      focus: searchFocus.trim(),
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
    setPicoRefinementPrompt("");
    setPicoRefinedAiResponse("");
    setInitialPrompt("");
    setAiResponse("");
    setResponsePrompt("");
    setSearchString("");
    setPubmedResult(null);
    setResultPrompt("");
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
        <h2>EBMのための検索</h2>
        <p className="hint">
          臨床で感じた疑問を整理し、批判的吟味に進むための文献を探します。
          まだPICOが決まっていなくても、短い疑問から始められます。
        </p>
        <details className="ebm-scope-details">
          <summary>検索の方針と、この画面で行わないこと</summary>
        <p className="ai-format-warning">
          外部AIが指定形式以外の説明や複数案を追加すると、自動抽出できない場合があります。
          その場合は、回答内のPICOと検索式を確認して手動で入力してください。
        </p>
        <div className="ebm-design-note">
          <strong>本アプリの検索方針：</strong>
          PubMed検索式には<strong>研究デザインフィルター（publication type / 研究デザイン語）を含めません</strong>。
          P×I（×O）の主題ベースで広め1本を検索し、取得結果を後段でAIに依頼してEBMヒエラルキー
          （診療GL → SR → RCT → 非RCT → 非RCT以外の観察研究 → シミュレーション/基礎研究 → その他）の
          全階層に分類します。「ガイドラインがあればGL、なければSR、なければRCT、…」という読み進めは検索後に判定します。
        </div>
        <p className="hint">対象はEBM Step 2（情報検索）です。論文の批判的吟味・推奨判断・患者への適用は別に行ってください。</p>
        </details>
        <div className="ebm-clear-bar">
          <button className="btn btn-reset" onClick={clearAll}>
            🗑 すべての入力・結果をクリアして最初からやり直す
          </button>
        </div>
      </header>

      <WorkflowNav
        label="EBM検索の手順"
        steps={[
          { id: "ebm-question-step", label: "疑問を整理", available: true },
          { id: "ebm-prompt-step", label: "AIへ渡す", available: !!initialPrompt },
          { id: "ebm-response-step", label: "回答を戻す", available: !!initialPrompt },
          { id: "ebm-step-pubmed", label: "PubMedで検索", available: !!aiResponse },
        ]}
        current={initialPromptIsStale ? "ebm-question-step" : responseIsStale ? "ebm-response-step" : searchString ? "ebm-step-pubmed" : aiResponse ? "ebm-response-step" : initialPrompt ? "ebm-prompt-step" : "ebm-question-step"}
        nextAction={initialPromptIsStale ? "変更後の入力でプロンプトを作り直す" : responseIsStale ? "最新プロンプトへのAI回答を貼り付け直す" : searchString ? "検索式を確認してPubMedで実行する" : aiResponse ? "AI回答から検索式を抽出する" : initialPrompt ? "全文をコピーして外部AIへ。回答はStep 3に貼り付ける" : "知りたいことを1文で書き、PICOを整理する"}
      />
      {initialPromptIsStale && (
        <div className="pico-gentle-note" role="status">
          疑問・PICO・検索の方針が、プロンプトを作った時点から変わっています。
          <button type="button" className="text-button" onClick={generateInitialPrompt}>現在の入力でプロンプトを作り直す</button>
        </div>
      )}

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
      <section id="ebm-question-step" className="workflow-section">
        <h2>Step 1：知りたいことを整理する</h2>
        <p className="hint">
          専門用語でなくてかまいません。まず疑問をそのまま書いてください。
          患者名・生年月日・IDなど、個人を特定する情報は入力しないでください。
        </p>

        <div className="form-group">
          <label htmlFor="ebm-raw-question">
            原質問<span className="required">*</span>
          </label>
          <textarea
            id="ebm-raw-question"
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
              まだPICOにできない：原質問からAIと整理する
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
          <label htmlFor="ebm-specialty">診療科（任意）</label>
          <input
            id="ebm-specialty"
            type="text"
            value={specialty}
            onChange={(e) => setSpecialty(e.target.value)}
            placeholder="例：循環器内科、総合診療、家庭医療"
          />
        </div>

        <div className="pico-section-heading">
          <h3>PICOで疑問の輪郭をつくる</h3>
          <p>自分の疑問と合っているか、最後はご自身で確認してください。AIが補った内容は事実ではなく「案」です。</p>
        </div>
        <PicoGuide />
        <div className="pico-coach-grid">
          {[
            { key: "p", label: "P：誰について", hint: "対象の患者・疾患・状況", placeholder: "例：成人の慢性腰痛患者", value: picoP, set: setPicoP },
            { key: "i", label: "I：何を調べるか", hint: "治療・検査・曝露・予後因子", placeholder: "例：運動療法", value: picoI, set: setPicoI },
            { key: "c", label: "C：何と比べるか", hint: "比較がない疑問では任意", placeholder: "例：通常診療 / 比較なし", value: picoC, set: setPicoC },
            { key: "o", label: "O：何を知りたいか", hint: "患者にとって重要な結果", placeholder: "例：痛み・日常生活・QOL", value: picoO, set: setPicoO },
          ].map((field) => (
            <div className={`pico-coach-field pico-coach-${field.key}`} key={field.key}>
              <label htmlFor={`ebm-pico-${field.key}`}>{field.label}</label>
              <small id={`ebm-pico-${field.key}-hint`}>{field.hint}</small>
              <textarea id={`ebm-pico-${field.key}`} rows={3}
                aria-describedby={`ebm-pico-${field.key}-hint`}
                value={field.value} onChange={(event) => field.set(event.target.value)} placeholder={field.placeholder} />
            </div>
          ))}
        </div>
        <div className="pico-comparison-presets">
          <label htmlFor="ebm-comparison-preset">Cの入力候補</label>
          <select id="ebm-comparison-preset" value="" onChange={(event) => {
            const value = event.target.value;
            if (value) setPicoC((current) => current.trim() ? `${current} / ${value}` : value);
          }}>
            <option value="">候補を選んで追加（自由入力も可）</option>
            {["通常診療", "プラセボ", "他の治療", "比較なし", "未定（要検討）"].map((value) => <option key={value}>{value}</option>)}
          </select>
        </div>
        {!hasCorePico && rawQuestion.trim() && (
          <p className="pico-gentle-note">まず「誰について」と「何を調べるか」を考えてみましょう。迷った点は、上の「原質問からAIと整理する」で候補を出せます。</p>
        )}

        <div className="form-group">
          <label htmlFor="ebm-search-purpose">検索目的</label>
          <select
            id="ebm-search-purpose"
            value={purpose}
            onChange={(e) => setPurpose(e.target.value)}
          >
            {purposeOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {(rawQuestion || pico) && (
          <details className="pico-refinement-box">
            <summary>疑問をもう一段深めたい：追加で確認する情報（任意）</summary>
            <p>
              現在のPICOをより良くするために、追加で確認したい患者情報・検査値・問診内容を整理します：
            </p>
            <p className="hint">
              下の「学習プロンプトを生成」を押し、得たプロンプトをAIに投げると、現在のPICOをEBM的に見直す観点と、
              追加で患者から聞くべきこと・確認すべき検査値が得られます。
              分からない情報は無理に埋めず、確認が必要な点として残してください。
            </p>

            <div className="button-group">
              <button
                className="btn btn-primary"
                onClick={generatePicoRefinementPrompt}
              >
                学習プロンプトを生成
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
          </details>
        )}

        <div className="prompt-option-row">
          <button className="btn btn-primary" onClick={generateInitialPrompt}>
            次へ：検索プロンプトを作る
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
        <div className="pubmed-fallback-box">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handlePubMedFallbackToAi}
          >
            本文・別の表現から探す
          </button>
          <p className="hint">
            どうしてもPubMed検索でヒットしない場合は、AIに頼りますが、必ずファクトチェックをしてください。
            また、PICOに問題があってヒットしない場合、そもそも学術論文がない場合もあります。
          </p>
        </div>
      </section>

      {/* Step 2: AI initial prompt */}
      {initialPrompt && (
        <section id="ebm-prompt-step" className="workflow-section">
          <h2>Step 2：プロンプトを外部AIへ渡す</h2>
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
            AIが提案した検索語と、研究デザインで絞らない検索式を確認します。
          </p>
          <PromptDisplay prompt={initialPrompt} />
        </section>
      )}

      {/* Step 3: AI response paste */}
      {initialPrompt && (
        <section id="ebm-response-step" className="workflow-section">
          <h2>Step 3：AI回答を戻し、検索式を取り出す</h2>
          <textarea
            aria-label="検索式を含むAI回答"
            value={aiResponse}
            onChange={(e) => {
              setAiResponse(e.target.value);
              setResponsePrompt(initialPrompt);
            }}
            rows={10}
            placeholder="AIから返ってきた回答全体をここに貼り付け..."
            style={{ width: "100%" }}
          />
          {responseIsStale && <p className="warning-text" role="status">この回答は以前のプロンプトに対応しています。最新のプロンプトで外部AIに質問し、回答を貼り付け直してください。</p>}
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
              <button className="btn btn-primary" disabled={initialPromptIsStale || responseIsStale} onClick={extractSearchFromAi}>
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
                key={effectiveSearchString}
                settings={settings}
                searchString={effectiveSearchString}
                onResult={(r) => {
                  setPubmedResult(r);
                  setResultPrompt(buildInitialPromptForVariant(searchVariant));
                  setClassificationAiResponse("");
                  setClassificationCopyMsg("");
                  setClassificationError("");
                }}
                retmax={100}
              />
            </>
          )}

          {pubmedResult && (
            <>
              {resultIsStale && <p className="warning-text" role="status">入力または検索条件が変わっています。表示中の結果は前の条件のものです。検索式を見直し、再検索してから分類してください。</p>}
              {/* Classification copy + new-tab flow */}
              <div className="ebm-classification-bar">
                <button
                  className="btn btn-primary"
                  onClick={copyClassificationPrompt}
                  type="button"
                  disabled={resultIsStale}
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
                    disabled={!classificationAiResponse.trim() || resultIsStale}
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
