// SR専用メインコンポーネント。
// 旧 StrategyWorkflow.tsx の sr-revision モードを完全に置き換える。
//
// ワークフロー:
//   Step 1-6: PICO案 → 定義・原典 → 適格基準 → 類義語
//   Step 7: インタラクティブ検索語テーブル + 研究デザインフィルター
//           + PubMed検索 + 結果テーブル + 構造化検索式
//           + AI分類プロンプトコピー + 分類結果表示（新タブ）

import { useMemo, useState } from "react";
import type { AppSettings, PubMedSearchResult } from "../types";
import type { SrTermsByElement } from "../utils/parseSrTermsFromAiResponse";
import {
  buildSrSearchString,
  buildSrSearchStringPerElement,
} from "../utils/buildSrSearchString";
import {
  studyDesignFilters,
  applyStudyDesignFilter,
  appendAnimalOnlyExclusion,
} from "../utils/cochraneFilters";
import type { StudyDesignFilterKey } from "../utils/cochraneFilters";
import { buildEbmClassificationCopyText } from "../utils/buildEbmClassificationCopyText";
import { parseClassificationResponse } from "../utils/parseClassificationResponse";
import { renderClassificationNewTab } from "../utils/renderClassificationNewTab";
import { openPubMedWithQuery } from "../utils/pubmedUrl";
import { parseKnownPmids } from "../utils/knownPmidBenchmark";
import { PubMedSearchBox } from "./PubMedSearchBox";
import { SrPubMedDetailsChecker } from "./SrPubMedDetailsChecker";
import { SrTermTable } from "./SrTermTable";
import { SrPubMedResultTable } from "./SrPubMedResultTable";
import { SrStructuredQueryAccordion } from "./SrStructuredQueryAccordion";
import {
  SrPreparationWorkflow,
  type SrPicoValue,
} from "./SrPreparationWorkflow";

interface Props {
  settings: AppSettings;
}

const EMPTY_TABLE: SrTermsByElement = { P: [], I: [], C: [], O: [] };
export function SrTab({ settings }: Props) {
  const [picoP, setPicoP] = useState("");
  const [picoI, setPicoI] = useState("");
  const [picoC, setPicoC] = useState("");
  const [picoO, setPicoO] = useState("");
  const [question, setQuestion] = useState("");
  const [knownPmids, setKnownPmids] = useState("");

  const [termTable, setTermTable] = useState<SrTermsByElement>(EMPTY_TABLE);
  const [searchAdvice, setSearchAdvice] = useState<string[]>([]);
  const [termWarnings, setTermWarnings] = useState<string[]>([]);
  const [preparationKey, setPreparationKey] = useState(0);
  const [manualSearchOpen, setManualSearchOpen] = useState(false);

  // Step 7 filters
  const [designKey, setDesignKey] = useState<StudyDesignFilterKey>("none");

  // PubMed result + classification
  const [pubmedResult, setPubmedResult] = useState<PubMedSearchResult | null>(
    null
  );
  const [classificationCopyMsg, setClassificationCopyMsg] = useState("");
  const [classificationAiResponse, setClassificationAiResponse] = useState("");
  const [classificationError, setClassificationError] = useState("");
  const [searchCopyMsg, setSearchCopyMsg] = useState("");
  const [filterCopyMsg, setFilterCopyMsg] = useState("");
  const parsedKnownPmids = useMemo(
    () => parseKnownPmids(knownPmids),
    [knownPmids]
  );

  // 検索式の派生値
  const baseSearchString = useMemo(
    () => buildSrSearchString(termTable),
    [termTable]
  );
  const designFilter = studyDesignFilters.find((f) => f.key === designKey)!;
  const effectiveSearchString = useMemo(() => {
    if (!baseSearchString) return "";
    const withDesign = applyStudyDesignFilter(baseSearchString, designFilter);
    return appendAnimalOnlyExclusion(withDesign);
  }, [baseSearchString, designFilter]);

  const currentBenchmarkKey = parsedKnownPmids.pmids.join(",");
  const resultBenchmarkKey =
    pubmedResult?.knownPmidBenchmark?.requestedPmids.join(",") ?? "";
  const isResultStale = Boolean(
    pubmedResult &&
      (pubmedResult.query !== effectiveSearchString ||
        resultBenchmarkKey !== currentBenchmarkKey)
  );

  const perElement = useMemo(
    () => buildSrSearchStringPerElement(termTable),
    [termTable]
  );
  const hasTermRows = Object.values(termTable).some((rows) => rows.length > 0);

  function clearAll() {
    if (!confirm("入力内容・取得結果をすべてクリアして最初からやり直しますか？")) return;
    setPicoP("");
    setPicoI("");
    setPicoC("");
    setPicoO("");
    setQuestion("");
    setKnownPmids("");
    setTermTable({ P: [], I: [], C: [], O: [] });
    setSearchAdvice([]);
    setTermWarnings([]);
    setPreparationKey((value) => value + 1);
    setManualSearchOpen(false);
    setDesignKey("none");
    setPubmedResult(null);
    setClassificationCopyMsg("");
    setClassificationAiResponse("");
    setClassificationError("");
    setSearchCopyMsg("");
    setFilterCopyMsg("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function setPico(value: SrPicoValue) {
    setPicoP(value.p);
    setPicoI(value.i);
    setPicoC(value.c);
    setPicoO(value.o);
  }

  function handleTermsReady(
    terms: SrTermsByElement,
    advice: string[],
    warnings: string[]
  ) {
    setTermTable(terms);
    setSearchAdvice(advice);
    setTermWarnings(warnings);
    setPubmedResult(null);
    setTimeout(() => {
      document
        .getElementById("sr-step-search")
        ?.scrollIntoView({ behavior: "smooth" });
    }, 80);
  }

  function invalidatePreparedSearch() {
    setTermTable({ P: [], I: [], C: [], O: [] });
    setSearchAdvice([]);
    setTermWarnings([]);
    setPubmedResult(null);
    setManualSearchOpen(false);
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

  async function copyFilterText(text: string, message: string) {
    if (!text) return;
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
    setFilterCopyMsg(message);
    setTimeout(() => setFilterCopyMsg(""), 2000);
  }

  async function copyClassificationPrompt() {
    if (!pubmedResult || isResultStale) return;
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
          このタブだけで、レビュー疑問のPICO案、定義と原典の比較、操作的な適格基準、
          類義語候補、PubMed検索式、既知論文の回収確認まで順に作成できます。
          AIは候補作成に使い、定義・根拠・検索語は画面上で人が選択・編集してから次へ渡します。
        </p>
        <p className="sr-existing-sr-tip">
          既存SRの完全な検索式がある場合は、Step 6へ出典とともに貼り付けて再利用できます。
        </p>
        <p className="ai-format-warning" role="note">
          AIが提示した文献・PMID・DOI・MeSHは原典で照合してください。本機能は情報専門家による検索戦略設計・PRESSレビューを代替しません。
        </p>
      </div>

      <SrPreparationWorkflow
        key={preparationKey}
        question={question}
        onQuestionChange={setQuestion}
        pico={{ p: picoP, i: picoI, c: picoC, o: picoO }}
        onPicoChange={setPico}
        knownPmids={knownPmids}
        onKnownPmidsChange={setKnownPmids}
        onTermsReady={handleTermsReady}
        onSearchInputsChanged={invalidatePreparedSearch}
      />

      {/* Step 7: インタラクティブ検索語テーブル + 検索 + 分類 */}
      {hasTermRows || manualSearchOpen ? (
      <section id="sr-step-search" className="workflow-section">
        <h2>Step 7：検索語テーブル → PubMed検索 → AI分類</h2>

        {searchAdvice.length > 0 && (
          <div className="sr-search-advice" role="note">
            <h4>今回の検索表を調整するためのAI助言</h4>
            <ul>
              {searchAdvice.map((item, index) => (
                <li key={`${item}-${index}`}>{item}</li>
              ))}
            </ul>
            <p className="hint">
              AI助言は候補です。MeSH Database、PubMed Search Details、既知重要論文の回収、PRESSレビューで人が検証してください。
            </p>
          </div>
        )}
        {termWarnings.length > 0 && (
          <div className="sr-term-warnings" role="status">
            <strong>自動反映時の確認事項：</strong>
            <ul>
              {termWarnings.map((warning, index) => (
                <li key={`${warning}-${index}`}>{warning}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="sr-concept-selection-guide" role="note">
          <div className="sr-guide-heading">
            <span>感度を守る</span>
            <h3>C（比較対照）は、明確でも検索式へ入れないことがあります</h3>
          </div>
          <p>
            Cは適格基準として重要でも、論文のタイトル・抄録や索引に十分書かれていないことがあります。
            CをANDで追加すると検索漏れが増えるため、まずPとIを中心に検索し、Cはスクリーニングで確認する方法を検討してください。
          </p>
          <ul>
            <li>
              <strong>Cを入れない方がよいことが多い場面：</strong>
              もともと文献が少ない領域、新しい治療法、比較対照の表現が研究ごとに異なる場合。
            </li>
            <li>
              <strong>キー論文が見つからないとき：</strong>
              Pを狭くしすぎていないか、Cを追加したことが原因でないかを最初に見直します。
              例えば、本来は「顎欠損」全体が対象なのに、症例の多い「上顎欠損」だけをPにしていないか確認します。
            </li>
          </ul>
        </div>

        <SrTermTable table={termTable} onChange={setTermTable} />

        {/* フィルター */}
        <div className="ebm-filter-block">
          <h4>文献タイプ／研究デザインフィルター（任意）</h4>
          <p className="hint">
            根拠は選択肢ごとに異なります。Cochrane の検証済み PubMed
            フィルターは RCT の感度最大版です。その他を Cochrane
            由来とは表示しません。
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
              >
                {f.label}
              </button>
            ))}
          </div>
          <div className="filter-evidence-card" aria-live="polite">
            <div className="filter-evidence-heading">
              <strong>{designFilter.label}</strong>
              <span className="filter-evidence-badge">
                {designFilter.evidenceBadge}
              </span>
            </div>
            <p>{designFilter.description}</p>
            {designFilter.source && (
              <p className="filter-source">
                <span>根拠：</span>
                {designFilter.sourceUrl ? (
                  <a href={designFilter.sourceUrl} target="_blank" rel="noreferrer">
                    {designFilter.source}
                  </a>
                ) : (
                  designFilter.source
                )}
              </p>
            )}
            {designFilter.additionalSources &&
              designFilter.additionalSources.length > 0 && (
                <div className="filter-additional-sources">
                  <span>関連する方法論・専用情報源：</span>
                  <ul>
                    {designFilter.additionalSources.map((source) => (
                      <li key={source.url}>
                        <a href={source.url} target="_blank" rel="noreferrer">
                          {source.label}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            {designFilter.caution && (
              <p className="filter-caution">注意：{designFilter.caution}</p>
            )}
            {(designFilter.methodsTemplate || designFilter.references) && (
              <details className="filter-reporting-details">
                <summary>論文のMethods記載例・参考文献</summary>
                {designFilter.methodsTemplate && (
                  <div>
                    <h5>Methods記載例</h5>
                    <p>{designFilter.methodsTemplate}</p>
                    <button
                      type="button"
                      className="btn btn-secondary btn-xs"
                      onClick={() => void copyFilterText(designFilter.methodsTemplate ?? "", "Methods記載例をコピーしました")}
                    >
                      Methods記載例をコピー
                    </button>
                  </div>
                )}
                {designFilter.references && designFilter.references.length > 0 && (
                  <div>
                    <h5>参考文献（Vancouver形式）</h5>
                    <ol>
                      {designFilter.references.map((reference) => (
                        <li key={reference.url}>
                          {reference.citation}{" "}
                          <a href={reference.url} target="_blank" rel="noreferrer">原典</a>
                        </li>
                      ))}
                    </ol>
                    <button
                      type="button"
                      className="btn btn-secondary btn-xs"
                      onClick={() => void copyFilterText(
                        designFilter.references?.map((reference) => reference.citation).join("\n") ?? "",
                        "参考文献をコピーしました"
                      )}
                    >
                      参考文献をコピー
                    </button>
                  </div>
                )}
              </details>
            )}
            {filterCopyMsg && <p role="status" aria-live="polite" className="ebm-copy-feedback">{filterCopyMsg}</p>}
            <details>
              <summary>検索式への追加内容</summary>
              <code className="filter-expression">
                {designFilter.expression || "追加なし（研究デザインで絞り込まない）"}
              </code>
            </details>
          </div>
        </div>

        {/* 検索式（自動生成・読み取り専用） */}
        <div className="form-group">
          <label htmlFor="sr-effective-query">PubMed検索式（テーブルから自動生成・リアルタイム更新）</label>
          <textarea
            id="sr-effective-query"
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
        </div>

        <div
          className="sr-details-required-card"
          role="note"
          aria-labelledby="sr-details-required-title"
        >
          <div className="sr-guide-heading">
            <span>必須確認</span>
            <h3 id="sr-details-required-title">
              PubMedで実際に検索し、Advanced Search BuilderのDetailsを開いてください
            </h3>
          </div>
          <p>
            検索式が完成したら、アプリ内の確認だけで終えず、最終版をPubMedで実際に検索します。
          </p>
          <ol>
            <li>下の「PubMed Advanced Search で開く」から検索を実行する。</li>
            <li>Advanced Search BuilderのHistoryで、実行した検索式のDetailsを開く。</li>
            <li>
              <strong>Warningsが表示されていないことを必ず確認する。</strong>
              あわせて、各語が意図したMeSH・自由語・フィールドタグとして解釈されているかを確認する。
            </li>
          </ol>
          <p className="sr-details-warning-explanation">
            Warningsには、構文エラー、見つからない語、無効なフィールドタグなどが示されます。
            1件でも表示された場合は、検索式を修正してからもう一度検索してください。
          </p>
          <div className="sr-guidance-links">
            <a
              className="btn btn-secondary btn-xs sr-mesh-link-btn"
              href="https://www.ncbi.nlm.nih.gov/mesh/"
              target="_blank"
              rel="noreferrer"
            >
              MeSHの確認（NCBI MeSH）
            </a>
            <a
              className="btn btn-secondary btn-xs sr-mesh-link-btn"
              href="https://pubmed.ncbi.nlm.nih.gov/help/#viewing-the-search-details"
              target="_blank"
              rel="noreferrer"
            >
              PubMed Help：Search Details
            </a>
          </div>
        </div>

        <SrPubMedDetailsChecker
          settings={settings}
          query={effectiveSearchString}
        />

        {/* 検索ボタン群 */}
        <div className="sr-preview-notice" role="note">
          <strong>アプリ内表示は Best Match 上位100件のプレビューです。</strong>
          <span>
            システマティックレビューの全件スクリーニングではありません。全件確認・保存は
            「PubMed Advanced Search で開く」を使用してください。
          </span>
        </div>
        <div className="button-group">
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
            onClick={copySearchString}
            disabled={!effectiveSearchString}
          >
            {searchCopyMsg || "検索式をコピー"}
          </button>
          <PubMedSearchBox
            settings={settings}
            searchString={effectiveSearchString}
            onResult={(r) => setPubmedResult(r)}
            retmax={100}
            buttonLabel="上位100件をプレビュー"
            buttonVariant="secondary"
            benchmarkPmids={parsedKnownPmids.pmids}
            queryKind={
              designKey === "guideline"
                ? "cpg"
                : designKey === "systematic_review"
                  ? "sr"
                  : "general"
            }
            retrievalSource={
              designKey === "guideline"
                ? "CPG"
                : designKey === "systematic_review"
                  ? "SR"
                  : undefined
            }
            allowFullIdExport={
              designKey === "guideline" ||
              designKey === "systematic_review" ||
              designKey === "guideline_or_systematic_review"
            }
          />
        </div>
        <p className="hint" style={{ fontSize: "0.78rem" }}>
          ※ 検索式が長すぎる場合、URLに入りきらないことがあります。その場合は本アプリが
          自動的に検索式をクリップボードにコピーし、Advanced Search 画面（空の状態）を開きます。
          そのまま貼り付けて検索してください。
        </p>

        <section
          className="sr-after-search-guide"
          aria-labelledby="sr-after-search-title"
        >
          <div className="sr-guide-heading">
            <span>検索式完成後</span>
            <h3 id="sr-after-search-title">確定前と論文記載前に行う3つの作業</h3>
          </div>
          <div className="sr-after-search-grid">
            <article>
              <span className="sr-guide-number">1</span>
              <h4>キー論文が回収できるか確認</h4>
              <p>
                事前に用意したキー論文が検索結果に含まれるか確認し、含まれなければ検索式を調整します。
                ただし、キー論文だけに合う式へ過度に調整せず、他の適格研究も広く拾える感度を保ちます。
              </p>
              <p>
                見つからない場合は、Pの定義を狭めすぎていないか、Cを入れたことが原因でないか、
                MeSH・自由語・フィールドタグに漏れがないかを順に確認します。
              </p>
            </article>
            <article>
              <span className="sr-guide-number">2</span>
              <h4>検索期間（出版年制限）の根拠を確認</h4>
              <p>
                原則として、都合のよい年数で出版年を制限しません。
                疾患概念、診断定義、介入、または診療実態が過去とは明確に異なり、
                それ以前の研究が適格になり得ないと説明できる場合に限って期間制限を検討します。
              </p>
              <p>
                制限する場合は、開始年・終了年、使用した日付フィールド、根拠となる承認日・定義改訂・論文等を記録し、論文で理由を説明します。
              </p>
            </article>
            <article>
              <span className="sr-guide-number">3</span>
              <h4>P・I・必要時のみC・研究デザインを分けて実行</h4>
              <p>
                上の一括検索式だけを保存して終わらず、P、I、必要な場合のみC、研究デザインフィルターを
                PubMed Advanced SearchのHistoryへ別々の行として登録し、最後にANDで結合します。
              </p>
              <p>
                各概念内の類義語はORでまとめます。Oは通常、検索式へ含めずスクリーニングで確認します。
              </p>
            </article>
          </div>
          <div className="sr-reporting-reminder">
            <strong>論文・補足資料に残すもの</strong>
            <p>
              データベースとプラットフォーム、P・I・C・研究デザインの各行、最後のAND結合式、検索日、各行の件数、
              使用した期間制限・フィルターとその理由を、実際に実行したとおり保存して記載します。
            </p>
          </div>
          <p className="sr-guidance-sources">
            方法論の確認：{" "}
            <a
              href="https://www.cochrane.org/authors/handbooks-and-manuals/handbook/current/chapter-04"
              target="_blank"
              rel="noreferrer"
            >
              Cochrane Handbook Chapter 4
            </a>
            {" / "}
            <a
              href="https://systematicreviewsjournal.biomedcentral.com/articles/10.1186/s13643-020-01542-z"
              target="_blank"
              rel="noreferrer"
            >
              PRISMA-S
            </a>
          </p>
        </section>

        {/* 構造化検索式アコーディオン */}
        <SrStructuredQueryAccordion
          perElement={perElement}
          designFilterExpression={designFilter.expression}
        />

        {/* 検索結果 */}
        {pubmedResult && (
          <>
            {isResultStale && (
              <div className="sr-stale-warning" role="alert">
                検索条件または既知PMIDが前回の結果から変更されています。現在の条件で再検索してから分類してください。
              </div>
            )}
            <div className="ebm-classification-bar">
              <button
                className="btn btn-primary"
                onClick={copyClassificationPrompt}
                type="button"
                disabled={isResultStale}
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
      ) : (
        <section id="sr-step-search" className="workflow-section sr-search-collapsed">
          <h2>Step 7：検索語テーブル → PubMed検索 → AI分類</h2>
          <p>
            Step 6でAIの類義語回答を読み込むと、ここに検索語テーブルが自動表示されます。
          </p>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => setManualSearchOpen(true)}
          >
            上級者：検索語を手入力して開始
          </button>
        </section>
      )}
    </div>
  );
}
