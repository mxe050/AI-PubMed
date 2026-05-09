// SR専用メインコンポーネント。
// 旧 StrategyWorkflow.tsx の sr-revision モードを完全に置き換える。
//
// ワークフロー:
//   Step 1: PICO入力（既存 srFields の P/I/C/O を個別state化）
//   Step 2: 類語提案プロンプト表示
//   Step 3: AI回答貼り付け → 検索語テーブルに反映
//   Step 4: インタラクティブ検索語テーブル + 研究デザイン/日付フィルター
//           + PubMed検索 + 結果テーブル + 構造化検索式
//           + AI分類プロンプトコピー + 分類結果表示（新タブ）

import { useMemo, useState } from "react";
import type { AppSettings, PubMedSearchResult } from "../types";
import { buildPrompt } from "../utils/buildPrompt";
import { srInitialPrompt } from "../prompts/systematicReview";
import {
  parseSrTermsFromAiResponse,
  type SrTermsByElement,
} from "../utils/parseSrTermsFromAiResponse";
import {
  buildSrSearchString,
  buildSrSearchStringPerElement,
} from "../utils/buildSrSearchString";
import {
  studyDesignFilters,
  applyStudyDesignFilter,
} from "../utils/cochraneFilters";
import type { StudyDesignFilterKey } from "../utils/cochraneFilters";
import { applySrDateRange } from "../utils/srDateRangeFilter";
import { buildEbmClassificationCopyText } from "../utils/buildEbmClassificationCopyText";
import { parseClassificationResponse } from "../utils/parseClassificationResponse";
import { renderClassificationNewTab } from "../utils/renderClassificationNewTab";
import { openPubMedWithQuery } from "../utils/pubmedUrl";
import { PromptDisplay } from "./PromptDisplay";
import { PubMedSearchBox } from "./PubMedSearchBox";
import { SrTermTable } from "./SrTermTable";
import { SrPubMedResultTable } from "./SrPubMedResultTable";
import { SrStructuredQueryAccordion } from "./SrStructuredQueryAccordion";

interface Props {
  settings: AppSettings;
  /** 「EBMタブで学習」リンクで遷移するためのコールバック（任意） */
  onNavigateToEbm?: () => void;
}

const EMPTY_TABLE: SrTermsByElement = { P: [], I: [], C: [], O: [] };

export function SrTab({ settings, onNavigateToEbm }: Props) {
  const [picoP, setPicoP] = useState("");
  const [picoI, setPicoI] = useState("");
  const [picoC, setPicoC] = useState("");
  const [picoO, setPicoO] = useState("");
  const [question, setQuestion] = useState("");
  const [knownPmids, setKnownPmids] = useState("");

  const [initialPrompt, setInitialPrompt] = useState("");
  const [aiResponse, setAiResponse] = useState("");
  const [parseMsg, setParseMsg] = useState<{
    kind: "ok" | "error";
    text: string;
  } | null>(null);

  const [termTable, setTermTable] = useState<SrTermsByElement>(EMPTY_TABLE);

  // Step 4 filters
  const [designKey, setDesignKey] = useState<StudyDesignFilterKey>("none");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  // PubMed result + classification
  const [pubmedResult, setPubmedResult] = useState<PubMedSearchResult | null>(
    null
  );
  const [classificationCopyMsg, setClassificationCopyMsg] = useState("");
  const [classificationAiResponse, setClassificationAiResponse] = useState("");
  const [classificationError, setClassificationError] = useState("");
  const [searchCopyMsg, setSearchCopyMsg] = useState("");
  const picoText = [picoP, picoI, picoC, picoO].some((v) => v.length > 0)
    ? [picoP, picoI, picoC, picoO].join("\n")
    : "";

  // 検索式の派生値
  const baseSearchString = useMemo(
    () => buildSrSearchString(termTable),
    [termTable]
  );
  const designFilter = studyDesignFilters.find((f) => f.key === designKey)!;
  const effectiveSearchString = useMemo(() => {
    if (!baseSearchString) return "";
    const withDesign = applyStudyDesignFilter(baseSearchString, designFilter);
    return applySrDateRange(withDesign, { fromDate, toDate });
  }, [baseSearchString, designFilter, fromDate, toDate]);

  const perElement = useMemo(
    () => buildSrSearchStringPerElement(termTable),
    [termTable]
  );

  function generateInitialPrompt() {
    if (!picoP.trim() && !picoI.trim()) {
      alert("最低限 P と I を入力してください。");
      return;
    }
    const prompt = buildPrompt(srInitialPrompt, {
      p: picoP || "未入力",
      i: picoI || "未入力",
      c: picoC || "未入力",
      o: picoO || "未入力",
      question: question || "未入力",
      knownPmids: knownPmids || "なし",
    });
    setInitialPrompt(prompt);
  }

  function setPicoFromText(value: string) {
    const lines = value.split(/\r?\n/);
    setPicoP(lines[0] ?? "");
    setPicoI(lines[1] ?? "");
    setPicoC(lines[2] ?? "");
    setPicoO(lines.slice(3).join("\n"));
  }

  function clearAll() {
    if (!confirm("入力内容・取得結果をすべてクリアして最初からやり直しますか？")) return;
    setPicoP("");
    setPicoI("");
    setPicoC("");
    setPicoO("");
    setQuestion("");
    setKnownPmids("");
    setInitialPrompt("");
    setAiResponse("");
    setParseMsg(null);
    setTermTable({ P: [], I: [], C: [], O: [] });
    setDesignKey("none");
    setFromDate("");
    setToDate("");
    setPubmedResult(null);
    setClassificationCopyMsg("");
    setClassificationAiResponse("");
    setClassificationError("");
    setSearchCopyMsg("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function applyTermsFromAi() {
    setParseMsg(null);
    const result = parseSrTermsFromAiResponse(aiResponse);
    if (!result.ok || !result.terms) {
      setParseMsg({
        kind: "error",
        text: `フォーマットが認識できませんでした：${result.reason}。手動でStep 4のテーブルに検索語を入力してください。`,
      });
      return;
    }
    setTermTable(result.terms);
    const total =
      result.terms.P.length +
      result.terms.I.length +
      result.terms.C.length +
      result.terms.O.length;
    const warnNote =
      result.warnings.length > 0
        ? `（警告: ${result.warnings.join(" / ")}）`
        : "";
    setParseMsg({
      kind: "ok",
      text: `${total} 件の検索語を Step 4 のテーブルに反映しました。${warnNote}`,
    });
    setTimeout(() => {
      document
        .getElementById("sr-step-4")
        ?.scrollIntoView({ behavior: "smooth" });
    }, 80);
  }

  async function copySearchString() {
    if (!effectiveSearchString) return;
    try {
      await navigator.clipboard.writeText(effectiveSearchString);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = effectiveSearchString;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    setSearchCopyMsg("コピーしました");
    setTimeout(() => setSearchCopyMsg(""), 1800);
  }

  async function copyClassificationPrompt() {
    if (!pubmedResult) return;
    const text = buildEbmClassificationCopyText(pubmedResult);
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    setClassificationCopyMsg(
      "コピーしました。外部AIに貼り付けてください"
    );
    setTimeout(() => setClassificationCopyMsg(""), 2500);
  }

  function showClassificationResult() {
    setClassificationError("");
    const parsed = parseClassificationResponse(classificationAiResponse);
    if (!parsed.ok) {
      setClassificationError(parsed.reason ?? "分類結果のパースに失敗しました");
      return;
    }
    const pico = [
      picoP && `P: ${picoP}`,
      picoI && `I: ${picoI}`,
      picoC && `C: ${picoC}`,
      picoO && `O: ${picoO}`,
    ]
      .filter(Boolean)
      .join(" / ");
    renderClassificationNewTab(parsed.categories, {
      rawQuestion: question,
      pico,
      searchString: effectiveSearchString,
      warnings: parsed.warnings,
    });
  }

  return (
    <div className="strategy-workflow sr-tab">
      <header className="strategy-header">
        <h2>システマティックレビュー（補助機能）</h2>
        <div className="ebm-clear-bar">
          <button className="btn btn-secondary" onClick={clearAll}>
            🗑 すべての入力・結果をクリアして最初からやり直す
          </button>
        </div>
      </header>
      <div className="strategy-description">
        <p>
          PICOに基づくSR、メタ解析、診療ガイドライン用の効果検索に使います。
          AIに類語を網羅的に提案させ、その結果を本アプリのインタラクティブな検索語テーブルで
          チェック ON/OFF・行追加しながら、リアルタイムに PubMed 検索式を組み立てます。
          最終的に PubMed で検索して結果を取得し、AI に研究デザイン別の分類を依頼します。
        </p>
        <p className="sr-existing-sr-tip">
          既存のシステマティックレビューの検索式を参考にすることを推奨します。
        </p>
        <p className="ai-format-warning" role="alert">
          高モデルで回答すると、複数の回答が得られ、自動抽出ができない場合がありますので、手動で入力してください。
        </p>
      </div>

      {/* Step 1: PICO入力 */}
      <section className="workflow-section">
        <h2>Step 1: PICO入力</h2>

        <div className="sr-prisma-note">
          <h4>📋 PRISMA より：SR における PICO の重要性</h4>
          <ul>
            <li>
              <strong>PRISMA 2020</strong> は SR の報告ガイドラインで、検索の<strong>透明性・再現性</strong>のために PICO 定義を必須としています。
            </li>
            <li>
              <strong>PICO は適格基準・検索戦略・データ抽出すべての基盤</strong>です。曖昧なまま検索を始めると後戻りが極めて困難になります。
            </li>
            <li>
              <strong>PRISMA-S（検索版）</strong>は検索式・データベース・検索日を全て記録することを求めており、PICO の明確化はその前提です。
            </li>
          </ul>
          <p className="hint" style={{ margin: "4px 0 0" }}>
            参考：
            <a
              href="https://www.prisma-statement.org/"
              target="_blank"
              rel="noreferrer"
            >
              PRISMA Statement (prisma-statement.org)
            </a>
          </p>
        </div>

        <div className="sr-pico-imperative">
          <p style={{ margin: "4px 0" }}>
            <strong>PICO作成に不安がある方は、</strong>
            {onNavigateToEbm ? (
              <button
                type="button"
                className="link-button"
                onClick={onNavigateToEbm}
              >
                「EBMのための検索」タブ
              </button>
            ) : (
              <span>「EBMのための検索」タブ</span>
            )}
            <strong>で学習してください。</strong>
            EBMタブには PICO 初心者向けの解説と、AIに PICO 案を考えてもらう機能があります。
          </p>
        </div>

        <div className="form-group">
          <label>臨床疑問（CQ・自然な日本語でOK）</label>
          <textarea
            rows={2}
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="例：高齢の心不全患者にSGLT2阻害薬を加えると、標準治療単独に比べて心不全入院や全死亡が減るか"
          />
        </div>

        <div className="form-group">
          <label>
            P/I/C/O（1行ずつ、P → I → C → O の順。P/Iは必須）
            <span className="required">*</span>
          </label>
          <textarea
            rows={5}
            value={picoText}
            onChange={(e) => setPicoFromText(e.target.value)}
            placeholder={`例：
60歳以上、HFrEF（LVEF≦40%）、外来通院中
SGLT2阻害薬（ダパグリフロジン10mg/日 または エンパグリフロジン10mg/日）の標準治療への追加
標準治療（ACE-I/ARB/β遮断薬/MRA）のみ。Cが不要なCQでは空行でOK。
心不全入院、全死亡、心血管死、QOL（KCCQ）`}
          />
        </div>
        <div className="form-group">
          <label>既知重要論文の PMID（任意・ベンチマーク用）</label>
          <textarea
            rows={1}
            value={knownPmids}
            onChange={(e) => setKnownPmids(e.target.value)}
            placeholder="例：33270928, 32865377, 32905714"
          />
        </div>

        <button className="btn btn-primary" onClick={generateInitialPrompt}>
          類語提案プロンプトを生成
        </button>
      </section>

      {/* Step 2: AIプロンプト */}
      {initialPrompt && (
        <section className="workflow-section">
          <h2>Step 2: AI用プロンプト（類語提案）</h2>
          <p className="hint">
            このプロンプトをコピーして ChatGPT / Claude / Gemini などに貼り付けてください。
            AI は P/I/C/O 各要素の検索語を <code>===TERMS_START===</code> 〜
            <code>===TERMS_END===</code> 形式で出力します。
          </p>
          <PromptDisplay prompt={initialPrompt} />
        </section>
      )}

      {/* Step 3: AI回答貼り付け → テーブル反映 */}
      {initialPrompt && (
        <section className="workflow-section">
          <h2>Step 3: AI回答の貼り付け → 検索語テーブルに反映</h2>
          <p className="hint">
            AIから返ってきた回答全体を貼り付け、「検索語テーブルに反映」を押してください。
            <code>===TERMS_START===</code> ブロックがパースされ、Step 4 の P/I/C/O テーブルに自動投入されます。
          </p>
          <textarea
            value={aiResponse}
            onChange={(e) => setAiResponse(e.target.value)}
            rows={10}
            placeholder="AIから返ってきた類語提案回答全体をここに貼り付け..."
            style={{ width: "100%" }}
          />
          <div className="step3-action">
            <button
              className="btn btn-primary"
              onClick={applyTermsFromAi}
              disabled={!aiResponse.trim()}
            >
              検索語テーブルに反映
            </button>
            {parseMsg && (
              <p
                className={
                  parseMsg.kind === "ok"
                    ? "pico-autofill-ok"
                    : "pico-autofill-err"
                }
              >
                {parseMsg.kind === "ok" ? "✅ " : "⚠ "}
                {parseMsg.text}
              </p>
            )}
          </div>
        </section>
      )}

      {/* Step 4: インタラクティブ検索語テーブル + 検索 + 分類 */}
      <section id="sr-step-4" className="workflow-section">
        <h2>Step 4: 検索語テーブル → PubMed検索 → AI分類</h2>

        <SrTermTable table={termTable} onChange={setTermTable} />

        {/* フィルター */}
        <div className="ebm-filter-block">
          <h4>研究デザインフィルター（任意）</h4>
          <p className="hint">
            出典：Cochrane Handbook for Systematic Reviews of Interventions, Version 6.5 (updated August 2024)
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

        <div className="ebm-filter-block">
          <h4>出版年月日フィルター（任意・片方だけでも可）</h4>
          <div className="sr-date-range">
            <label>
              開始日：
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
              />
            </label>
            <label>
              終了日：
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
              />
            </label>
            {(fromDate || toDate) && (
              <button
                type="button"
                className="btn btn-secondary btn-xs"
                onClick={() => {
                  setFromDate("");
                  setToDate("");
                }}
              >
                クリア
              </button>
            )}
          </div>
        </div>

        {/* 検索式（自動生成・読み取り専用） */}
        <div className="form-group">
          <label>PubMed検索式（テーブルから自動生成・リアルタイム更新）</label>
          <textarea
            value={effectiveSearchString}
            readOnly
            rows={5}
            style={{
              width: "100%",
              fontFamily:
                "'SF Mono', 'Fira Code', Consolas, 'Courier New', monospace",
              fontSize: "0.9rem",
              whiteSpace: "pre-wrap",
              background: "#f8fafc",
            }}
          />
          <div className="sr-search-string-tools">
            <p className="sr-search-string-warning">
              ⚠ <strong>PubMed Advanced Search Builder の Details を確認して、検索式を修正してください。</strong>{" "}
              各検索語が想定通り MeSH／フリーテキストに展開されているかを必ず確認してください。
            </p>
            <a
              className="btn btn-secondary btn-xs sr-mesh-link-btn"
              href="https://www.ncbi.nlm.nih.gov/mesh/"
              target="_blank"
              rel="noreferrer"
            >
              MeSHの確認（NCBI MeSH）
            </a>
          </div>
        </div>

        {/* 検索ボタン群 */}
        <div className="button-group">
          <PubMedSearchBox
            settings={settings}
            searchString={effectiveSearchString}
            onResult={(r) => setPubmedResult(r)}
            retmax={100}
            buttonLabel="PubMed APIで検索（最大100件・このアプリ内）"
          />
          <button
            type="button"
            className="btn btn-secondary"
            onClick={copySearchString}
            disabled={!effectiveSearchString}
          >
            {searchCopyMsg || "検索式をコピー"}
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => {
              if (!effectiveSearchString) return;
              void openPubMedWithQuery(effectiveSearchString, "advanced");
            }}
            disabled={!effectiveSearchString}
          >
            PubMed Advanced Search で開く（外部）
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => {
              if (!effectiveSearchString) return;
              void openPubMedWithQuery(effectiveSearchString, "regular");
            }}
            disabled={!effectiveSearchString}
          >
            PubMed 検索結果で開く（外部）
          </button>
        </div>
        <p className="hint" style={{ fontSize: "0.78rem" }}>
          ※ 検索式が長すぎる場合、URLに入りきらないことがあります。その場合は本アプリが
          自動的に検索式をクリップボードにコピーし、Advanced Search 画面（空の状態）を開きます。
          そのまま貼り付けて検索してください。
        </p>

        {/* 構造化検索式アコーディオン */}
        <SrStructuredQueryAccordion
          perElement={perElement}
          designFilterExpression={designFilter.expression}
        />

        {/* 検索結果 */}
        {pubmedResult && (
          <>
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

            <SrPubMedResultTable result={pubmedResult} />

            <div className="ebm-classify-result-block">
              <h4>AIの回答を貼り付け</h4>
              <p className="hint">
                上のプロンプトを外部AIに貼り付け、返ってきた回答を下に貼り付けてください。
                「分類結果を表示」ボタンで新しいブラウザタブに分類テーブルが開きます（CSVダウンロード機能付き）。
              </p>
              <textarea
                value={classificationAiResponse}
                onChange={(e) =>
                  setClassificationAiResponse(e.target.value)
                }
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
    </div>
  );
}
