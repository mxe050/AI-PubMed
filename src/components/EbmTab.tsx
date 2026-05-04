import { useState } from "react";
import type { AppSettings, PubMedSearchResult } from "../types";
import { buildPrompt } from "../utils/buildPrompt";
import { buildApiFeedbackBlock } from "../utils/buildApiFeedbackBlock";
import { buildAbstractsBlock } from "../utils/buildAbstractsBlock";
import { extractSearchString } from "../utils/extractSearchString";
import {
  ebmInitialPrompt,
  ebmAiEndingPrompt,
  ebmPubmedEndingPrompt,
  ebmClassificationPrompt,
  ebmPicoRefinementPrompt,
  ebmPicoBrainstormPrompt,
} from "../prompts/ebmStep2";
import { buildArticleListForClassification } from "../utils/buildArticleListForClassification";
import { evaluatePicoCompleteness } from "../utils/evaluatePicoCompleteness";
import {
  studyDesignFilters,
  applyStudyDesignFilter,
} from "../utils/cochraneFilters";
import type { StudyDesignFilterKey } from "../utils/cochraneFilters";
import { PromptDisplay } from "./PromptDisplay";
import { SearchStringInput } from "./SearchStringInput";
import { PubMedSearchBox } from "./PubMedSearchBox";
import { PubMedResultTable } from "./PubMedResultTable";

interface Props {
  settings: AppSettings;
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

export function EbmTab({ settings }: Props) {
  const [rawQuestion, setRawQuestion] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [purpose, setPurpose] = useState("treatment");

  // PICO fields (EBM Step 1 — required, but app falls back silently if blank)
  const [picoP, setPicoP] = useState("");
  const [picoI, setPicoI] = useState("");
  const [picoC, setPicoC] = useState("");
  const [picoO, setPicoO] = useState("");
  const [showPicoBrainstorm, setShowPicoBrainstorm] = useState(false);
  const [picoBrainstormPrompt, setPicoBrainstormPrompt] = useState("");
  const [picoBrainstormResponse, setPicoBrainstormResponse] = useState("");

  const combinedPico = [
    picoP && `P: ${picoP}`,
    picoI && `I: ${picoI}`,
    picoC && `C: ${picoC}`,
    picoO && `O: ${picoO}`,
  ]
    .filter(Boolean)
    .join(" / ");
  const pico = combinedPico;
  const context = combinedPico; // Use PICO as the patient context block in prompts

  const [initialPrompt, setInitialPrompt] = useState("");
  const [aiResponse, setAiResponse] = useState("");
  const [searchString, setSearchString] = useState("");
  const [pubmedResult, setPubmedResult] = useState<PubMedSearchResult | null>(
    null
  );

  // 5-B sub-flow state
  const [pubmedEndingAiResponse, setPubmedEndingAiResponse] = useState("");
  const [extractedRevisedSearch, setExtractedRevisedSearch] = useState("");
  const [revisedSearchFilterKey, setRevisedSearchFilterKey] =
    useState<StudyDesignFilterKey>("none");
  const [revisedSearchCopyMsg, setRevisedSearchCopyMsg] = useState("");
  const [pubmedResultRound2, setPubmedResultRound2] =
    useState<PubMedSearchResult | null>(null);

  // PICO refinement sub-flow state (Step 1)
  const [picoRefinementPrompt, setPicoRefinementPrompt] = useState("");
  const [picoRefinedAiResponse, setPicoRefinedAiResponse] = useState("");
  const [picoCheckDismissed, setPicoCheckDismissed] = useState(false);

  const picoEval = evaluatePicoCompleteness(rawQuestion);
  const showPicoRefinement =
    rawQuestion.trim().length > 0 &&
    picoEval.recommendRefinement &&
    !picoCheckDismissed;

  function generateInitialPrompt() {
    if (!rawQuestion.trim()) {
      alert("原質問を入力してください。");
      return;
    }
    if (picoEval.recommendRefinement && !picoCheckDismissed) {
      const ok = confirm(
        `この疑問はPICO要素のうち以下が不足している可能性があります：\n\n${picoEval.missing.join("、")}\n\n下のPICO洗練サブフローで疑問を磨くことを強く推奨します。\n\nそれでもこのまま初回プロンプト生成に進みますか？\n\n（OK = このまま進む / キャンセル = 戻ってPICO洗練を行う）`
      );
      if (!ok) return;
    }
    const purposeLabel =
      purposeOptions.find((p) => p.value === purpose)?.label ?? purpose;
    const prompt = buildPrompt(ebmInitialPrompt, {
      question: rawQuestion,
      specialty: specialty || "未入力",
      context: context || "未入力",
      purpose: purposeLabel,
    });
    setInitialPrompt(prompt);
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

  function generatePicoBrainstormPrompt() {
    if (!rawQuestion.trim()) {
      alert("先に原質問を入力してください。");
      return;
    }
    const purposeLabel =
      purposeOptions.find((p) => p.value === purpose)?.label ?? purpose;
    const prompt = buildPrompt(ebmPicoBrainstormPrompt, {
      question: rawQuestion,
      specialty: specialty || "未入力",
      purpose: purposeLabel,
    });
    setPicoBrainstormPrompt(prompt);
    setShowPicoBrainstorm(true);
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
        "検索式を自動抽出できませんでした。コードブロック（\\`\\`\\`text ... \\`\\`\\`）が含まれているか確認してください。"
      );
    }
  }

  function extractRevisedSearchFromAi() {
    const extracted = extractSearchString(pubmedEndingAiResponse);
    if (extracted) {
      setExtractedRevisedSearch(extracted);
    } else {
      alert(
        "改善検索式を自動抽出できませんでした。AI回答に\\`\\`\\`text コードブロックが含まれているか確認してください。"
      );
    }
  }

  function buildClassificationPromptText(): string {
    if (!pubmedResultRound2) return "";
    return buildPrompt(ebmClassificationPrompt, {
      searchString: finalRevisedSearch,
      totalCount: String(pubmedResultRound2.count),
      count: String(
        Math.min(pubmedResultRound2.articles.length, 100)
      ),
      articleList: buildArticleListForClassification(pubmedResultRound2, 100),
    });
  }

  function clearAll() {
    if (!confirm("入力内容・取得結果をすべてクリアして最初からやり直しますか？")) return;
    setRawQuestion("");
    setSpecialty("");
    setPurpose("treatment");
    setPicoP("");
    setPicoI("");
    setPicoC("");
    setPicoO("");
    setShowPicoBrainstorm(false);
    setPicoBrainstormPrompt("");
    setPicoBrainstormResponse("");
    setPicoCheckDismissed(false);
    setPicoRefinementPrompt("");
    setPicoRefinedAiResponse("");
    setInitialPrompt("");
    setAiResponse("");
    setSearchString("");
    setPubmedResult(null);
    setPubmedEndingAiResponse("");
    setExtractedRevisedSearch("");
    setRevisedSearchFilterKey("none");
    setRevisedSearchCopyMsg("");
    setPubmedResultRound2(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const revisedSearchFilter = studyDesignFilters.find(
    (f) => f.key === revisedSearchFilterKey
  )!;
  const finalRevisedSearch = applyStudyDesignFilter(
    extractedRevisedSearch,
    revisedSearchFilter
  );

  function copyFinalRevisedSearch() {
    if (!finalRevisedSearch) return;
    navigator.clipboard.writeText(finalRevisedSearch).then(() => {
      setRevisedSearchCopyMsg("コピーしました");
      setTimeout(() => setRevisedSearchCopyMsg(""), 1800);
    });
  }

  const aiEndingPromptText =
    pubmedResult &&
    buildPrompt(ebmAiEndingPrompt, {
      question: rawQuestion,
      pico: pico || "（PICOはAI回答から手動でコピーしてください）",
      searchString,
      purpose:
        purposeOptions.find((p) => p.value === purpose)?.label ?? purpose,
      apiFeedbackBlock: buildApiFeedbackBlock(pubmedResult),
      abstractsBlock: buildAbstractsBlock(pubmedResult),
    });

  const pubmedEndingPromptText =
    pubmedResult &&
    buildPrompt(ebmPubmedEndingPrompt, {
      question: rawQuestion,
      pico: pico || "（PICOはAI回答から手動でコピーしてください）",
      searchString,
      purpose:
        purposeOptions.find((p) => p.value === purpose)?.label ?? purpose,
      apiFeedbackBlock: buildApiFeedbackBlock(pubmedResult),
      abstractsBlock: buildAbstractsBlock(pubmedResult),
    });

  return (
    <div className="ebm-tab">
      <header className="ebm-header">
        <h2>EBMのための検索（補助機能・EBM Step 2 Navigator）</h2>
        <p className="hint">
          このアプリは <strong>EBM Step 2（情報検索）</strong>に特化したフローです。
          批判的吟味（Step 3）・推奨判断・治療方針決定は<strong>行いません</strong>。
          目的は、次のEBM Step 3に渡せる「文献候補リスト」を、AIとPubMedの往復で作ることです。
        </p>
        <div className="ebm-design-note">
          <strong>本アプリの検索方針：</strong>
          PubMed検索式には<strong>研究デザインフィルター（publication type / 研究デザイン語）を含めません</strong>。
          P×I（×O）の主題ベースで広め1本を検索し、取得結果を後段（Step 5）でEBMヒエラルキー
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
            自分でPICOが想定できない場合は、下の「PICO案をAIに考えてもらうプロンプトを生成」を使ってください。
            AIで案を出してから、その案を本欄に転記して進めてください。
          </p>
        </div>

        <h4>PICO（必須）</h4>
        <div className="form-group">
          <label>P（対象患者・状況）</label>
          <textarea
            rows={2}
            value={picoP}
            onChange={(e) => setPicoP(e.target.value)}
            placeholder="例：80歳代の女性、HFrEF、eGFR 45、糖尿病あり、外来"
          />
        </div>
        <div className="form-group">
          <label>I（介入・曝露）</label>
          <textarea
            rows={2}
            value={picoI}
            onChange={(e) => setPicoI(e.target.value)}
            placeholder="例：SGLT2阻害薬（ダパグリフロジン10mg/日）"
          />
        </div>
        <div className="form-group">
          <label>C（比較）</label>
          <textarea
            rows={2}
            value={picoC}
            onChange={(e) => setPicoC(e.target.value)}
            placeholder="例：標準治療（ACE-I/ARB/β遮断薬）のみ"
          />
        </div>
        <div className="form-group">
          <label>O（アウトカム）</label>
          <textarea
            rows={2}
            value={picoO}
            onChange={(e) => setPicoO(e.target.value)}
            placeholder="例：心不全入院、全死亡、QOL"
          />
        </div>

        <details className="pico-brainstorm-section">
          <summary>
            <strong>
              PICOが思いつかない場合：AIに案を考えてもらうプロンプトを生成
            </strong>
          </summary>
          <p className="hint">
            原質問・診療科・検索目的だけを使って、AIにPICO案を3パターン考えてもらうプロンプトを生成します。
            AIで案を出してから、上のP/I/C/Oフィールドに転記してください。
          </p>
          <button
            className="btn btn-secondary"
            onClick={generatePicoBrainstormPrompt}
          >
            PICO案ブレストプロンプトを生成
          </button>
          {showPicoBrainstorm && picoBrainstormPrompt && (
            <>
              <PromptDisplay
                prompt={picoBrainstormPrompt}
                title="PICO案ブレストプロンプト"
              />
              <p className="hint">
                上のプロンプトを外部AIに貼り付け、返ってきた回答を下に貼り付けて参照しながら、上のP/I/C/Oに記入してください。
              </p>
              <textarea
                value={picoBrainstormResponse}
                onChange={(e) => setPicoBrainstormResponse(e.target.value)}
                rows={10}
                placeholder="AIから返ってきたPICO案回答全体を参照用に貼り付け..."
                style={{ width: "100%" }}
              />
            </>
          )}
        </details>

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
            <h4>⚠ PICO適合度のチェック</h4>
            <p>
              入力された疑問は、PubMed検索に進む前に以下の要素を補強することを推奨します：
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
              下の「PICO洗練プロンプトを生成」を押し、得たプロンプトをAIに投げると、PICOを補った洗練疑問文（3パターン）が得られます。
              気に入った洗練版を上の「原質問」欄にコピー上書きして、再度「初回プロンプトを生成」に進んでください。
              なお、現在の疑問でも問題ないと判断した場合は「このまま進める」で警告を消せます。
            </p>

            <div className="button-group">
              <button
                className="btn btn-primary"
                onClick={generatePicoRefinementPrompt}
              >
                PICO洗練プロンプトを生成
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
                  title="PICO洗練プロンプト"
                />

                <h5 style={{ marginTop: 12 }}>
                  AIの洗練回答を貼り付け（任意・参照用）
                </h5>
                <p className="hint">
                  AIから返ってきた回答をここに貼り付けると、3パターンの洗練疑問文を見ながら検討できます。
                  気に入ったものを<strong>上の「原質問」欄にコピー上書き</strong>してから「初回プロンプトを生成」を押してください。
                </p>
                <textarea
                  value={picoRefinedAiResponse}
                  onChange={(e) => setPicoRefinedAiResponse(e.target.value)}
                  rows={10}
                  placeholder="AIから返ってきたPICO洗練回答全体をここに貼り付け..."
                  style={{ width: "100%" }}
                />
              </>
            )}
          </div>
        )}

        <button className="btn btn-primary" onClick={generateInitialPrompt}>
          初回プロンプトを生成（PICO + 検索語 + 検索式案）
        </button>
      </section>

      {/* Step 2: AI initial prompt */}
      {initialPrompt && (
        <section className="workflow-section">
          <h2>Step 2: AI用プロンプト</h2>
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

      {/* Step 4: PubMed search — broad / no design filter */}
      {aiResponse && (
        <section id="ebm-step-pubmed" className="workflow-section">
          <h2>Step 4: PubMed検索（広め・研究デザイン非限定）</h2>
          <div className="ebm-no-filter-note">
            <strong>⚠ 研究デザインフィルターは入れません。</strong>
            P×I（×O）の主題ベースで広め1本を検索します。
            ヒエラルキー別の分類は Step 5 で行うため、この段階で
            guideline[pt] / systematic review[pt] / randomized[tiab] などを足さないでください。
          </div>

          <SearchStringInput
            value={searchString}
            onChange={setSearchString}
          />

          {searchString && (
            <PubMedSearchBox
              settings={settings}
              searchString={searchString}
              onResult={(r) => setPubmedResult(r)}
            />
          )}

          {pubmedResult && (
            <PubMedResultTable
              result={pubmedResult}
              selectedPmids={[]}
              onToggle={() => {}}
            />
          )}
        </section>
      )}

      {/* Step 5: Two ending prompts */}
      {pubmedResult && (
        <section className="workflow-section">
          <h2>Step 5: 2つの終わり方（AI終了版 / PubMed終了版）</h2>
          <div className="ebm-two-endings-explainer">
            <h3>なぜ2つ用意したか？</h3>
            <p>
              EBM Step 2で「最終的に何を成果物にするか」によって、AIに任せる範囲が変わります。
              本アプリでは <strong>AI終了版</strong>と <strong>PubMed終了版</strong> の2つを並列で生成し、
              ユーザーが目的に応じて選べるようにしました。
            </p>
            <table className="ebm-comparison">
              <thead>
                <tr>
                  <th></th>
                  <th>AI終了版</th>
                  <th>PubMed終了版</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <th>最終成果物</th>
                  <td>AIが整理した文献候補リスト（文献タイプ別）</td>
                  <td>PubMedで再実行する改善検索式</td>
                </tr>
                <tr>
                  <th>ハルシネーション・リスク</th>
                  <td>
                    <strong>あり</strong>
                    （AIが文献を要約・整理するため、捏造PMID・誤帰属が混入しうる）
                  </td>
                  <td>
                    <strong>構造的に低い</strong>
                    （AIは検索式を出すだけ。実際の文献はPubMed側が返す）
                  </td>
                </tr>
                <tr>
                  <th>必須の後処理</th>
                  <td>
                    <strong>必ず</strong>「AI出力ファクトチェック」タブでPMID・引用の実在確認
                  </td>
                  <td>PubMed APIで再検索してヒット件数・上位文献を確認</td>
                </tr>
                <tr>
                  <th>適している場面</th>
                  <td>
                    急いで全体像を把握したい、AIで一旦俯瞰したい、論文タイプ別に整理が欲しい
                  </td>
                  <td>
                    査読・SR・公式記録を残したい、検索式の透明性が必要、ハルシネーション混入を構造的に避けたい
                  </td>
                </tr>
                <tr>
                  <th>EBM原理との整合</th>
                  <td>
                    Step 3（批判的吟味）には進めないので、「整理に留める」設計
                  </td>
                  <td>
                    AIは「検索を助ける」のみ、PubMedが「実在確認を担う」、人間が「問いを保つ」
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* AI-ending */}
          <div className="prompt-card prompt-card-ai-ending">
            <div className="prompt-card-header">
              <h3>5-A. AI終了版プロンプト（AIが文献候補を整理）</h3>
              <span className="prompt-tag prompt-tag-warn">
                ⚠ 必ずファクトチェックタブへ
              </span>
            </div>
            <div className="ai-ending-warning">
              <strong>重要：</strong>
              このバージョンでは、AIが文献を整理した結果（PMID付きリスト）が最終回答になります。
              AIは存在しないPMIDを混入させる可能性があるため、
              <strong>「AI出力ファクトチェック」タブで必ずPMID実在確認＋抄録取得</strong>を行ってください。
              これを怠るとEBMとして致命的なエラーになります。
            </div>
            {aiEndingPromptText && (
              <PromptDisplay prompt={aiEndingPromptText} title="AI終了版プロンプト" />
            )}
            <div className="next-step-hint">
              <h4>このプロンプトの次にすること</h4>
              <ol>
                <li>上のプロンプトをコピー → ChatGPT / Claude / Geminiに貼り付け</li>
                <li>AIから文献タイプ別の整理回答を取得</li>
                <li>
                  <strong>「AI出力ファクトチェック」タブ</strong>に回答全文を貼り付け
                </li>
                <li>全PMIDの実在確認＋抄録取得＋URL確認を実行</li>
                <li>
                  捏造PMIDが見つかった場合、AI回答内のその引用は無効として扱う
                </li>
                <li>確認済み文献候補リストを次のEBM Step 3（批判的吟味）に渡す</li>
              </ol>
            </div>
          </div>

          {/* PubMed-ending */}
          <div className="prompt-card prompt-card-pubmed-ending">
            <div className="prompt-card-header">
              <h3>5-B-1. PubMed終了版プロンプト（AIが検索式を磨く）</h3>
              <span className="prompt-tag prompt-tag-safe">
                ✓ ハルシネーション低リスク
              </span>
            </div>
            <div className="pubmed-ending-note">
              <strong>特徴：</strong>
              このバージョンではAIに最終回答を作らせず、
              <strong>改善された検索式（一文）</strong>のみを出させます。
              抽出した検索式でPubMed再検索 → 結果を文献タイプ別に分類、まで
              <strong>このページ内で完結</strong>します（Step 4に戻る必要はありません）。
              AIによる文献捏造のリスクが構造的に低くなります。
            </div>
            {pubmedEndingPromptText && (
              <PromptDisplay
                prompt={pubmedEndingPromptText}
                title="5-B-1. PubMed終了版プロンプト"
              />
            )}

            {/* 5-B-2: AI回答貼付＋抽出 */}
            <h4 style={{ marginTop: 16 }}>
              5-B-2. AI回答を貼り付け → 改善検索式を抽出
            </h4>
            <p className="hint">
              5-B-1のプロンプトを外部AIに貼り付けて得た回答を、ここに貼り戻してください。
              ボタン1つで最終推奨検索式（コードブロック内の一文）を抽出します。
            </p>
            <textarea
              value={pubmedEndingAiResponse}
              onChange={(e) => setPubmedEndingAiResponse(e.target.value)}
              rows={10}
              placeholder="AIから返ってきた改善回答全体をここに貼り付け..."
              style={{ width: "100%" }}
            />
            {pubmedEndingAiResponse && (
              <div className="step3-action">
                <button
                  className="btn btn-primary"
                  onClick={extractRevisedSearchFromAi}
                >
                  改善検索式を抽出
                </button>
              </div>
            )}

            {extractedRevisedSearch && (
              <>
                <div className="extracted-revised">
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: 6,
                    }}
                  >
                    <h4 style={{ margin: 0 }}>抽出された改善検索式（編集可）</h4>
                  </div>
                  <textarea
                    value={extractedRevisedSearch}
                    onChange={(e) => setExtractedRevisedSearch(e.target.value)}
                    rows={5}
                    style={{
                      width: "100%",
                      fontFamily:
                        "'SF Mono', 'Fira Code', Consolas, 'Courier New', monospace",
                      fontSize: "0.9rem",
                      whiteSpace: "pre-wrap",
                    }}
                  />

                  <div className="form-group" style={{ marginTop: 12 }}>
                    <label>研究デザインフィルター（任意）</label>
                    <select
                      value={revisedSearchFilterKey}
                      onChange={(e) =>
                        setRevisedSearchFilterKey(
                          e.target.value as StudyDesignFilterKey
                        )
                      }
                    >
                      {studyDesignFilters.map((f) => (
                        <option key={f.key} value={f.key}>
                          {f.label}
                        </option>
                      ))}
                    </select>
                    <p className="hint">{revisedSearchFilter.description}</p>
                    {revisedSearchFilter.source && (
                      <p
                        className="hint"
                        style={{ fontSize: "0.78rem", fontStyle: "italic" }}
                      >
                        出典：{revisedSearchFilter.source}
                      </p>
                    )}
                  </div>

                  {revisedSearchFilterKey !== "none" && (
                    <div className="form-group">
                      <label>フィルター適用後の最終検索式（プレビュー）</label>
                      <pre className="search-preview">{finalRevisedSearch}</pre>
                    </div>
                  )}
                </div>

                {/* 5-B-3: 抽出検索式でPubMed再検索 */}
                <h4 style={{ marginTop: 16 }}>
                  5-B-3. この検索式でPubMed再検索（最大100件）
                </h4>
                <p className="hint">
                  抽出された検索式（フィルター適用済み）で、このページ内のPubMed APIで再検索します。
                  分類プロンプトに使うため、最大100件まで取得します。
                </p>

                <div className="button-group">
                  <button
                    className="btn btn-secondary"
                    type="button"
                    onClick={copyFinalRevisedSearch}
                    disabled={!finalRevisedSearch}
                  >
                    {revisedSearchCopyMsg || "検索式をコピー"}
                  </button>
                  <button
                    className="btn btn-secondary"
                    type="button"
                    onClick={() => {
                      if (!finalRevisedSearch) return;
                      const url = `https://pubmed.ncbi.nlm.nih.gov/advanced/?term=${encodeURIComponent(finalRevisedSearch)}`;
                      window.open(url, "_blank", "noopener,noreferrer");
                    }}
                    disabled={!finalRevisedSearch}
                  >
                    PubMed Advanced Search で開く（外部）
                  </button>
                  <button
                    className="btn btn-secondary"
                    type="button"
                    onClick={() => {
                      if (!finalRevisedSearch) return;
                      const url = `https://pubmed.ncbi.nlm.nih.gov/?term=${encodeURIComponent(finalRevisedSearch)}`;
                      window.open(url, "_blank", "noopener,noreferrer");
                    }}
                    disabled={!finalRevisedSearch}
                  >
                    PubMed 検索結果で開く（外部）
                  </button>
                </div>

                <PubMedSearchBox
                  settings={settings}
                  searchString={finalRevisedSearch}
                  onResult={(r) => setPubmedResultRound2(r)}
                  retmax={100}
                  buttonLabel="PubMed APIで再検索（最大100件・このアプリ内）"
                />
                {pubmedResultRound2 && (
                  <PubMedResultTable
                    result={pubmedResultRound2}
                    selectedPmids={[]}
                    onToggle={() => {}}
                  />
                )}
              </>
            )}

            {/* 5-B-4: 分類プロンプト */}
            {pubmedResultRound2 && (
              <>
                <h4 style={{ marginTop: 16 }}>
                  5-B-4. 取得結果（最大100件）を文献タイプ別に分類するプロンプト
                </h4>
                <p className="hint">
                  PubMed再検索で取得した{" "}
                  <strong>
                    {Math.min(pubmedResultRound2.articles.length, 100)}
                  </strong>{" "}
                  件（PubMed側ヒット {pubmedResultRound2.count.toLocaleString()} 件中の上位）を、
                  AIに「ガイドライン / SR・メタ解析 / RCT / 観察研究 / 基礎研究 / その他 / 不明」で分類させるプロンプトを生成します。
                  分類はPubMedから取得したPub Type / MeSHのみに基づくため、捏造リスクは構造的にありません。
                </p>
                <PromptDisplay
                  prompt={buildClassificationPromptText()}
                  title="文献タイプ分類プロンプト（コピー用）"
                />
                <div className="next-step-hint">
                  <h4>このプロンプトの次にすること</h4>
                  <ol>
                    <li>上のプロンプトをコピー → ChatGPT / Claude / Geminiに貼り付け</li>
                    <li>AIから文献タイプ別の分類結果を取得</li>
                    <li>
                      EBM Step 2ヒエラルキーの上位（ガイドライン / SR /
                      RCT）から優先的に読む文献を選定
                    </li>
                    <li>
                      選定した文献を次のEBM Step 3（批判的吟味）に渡す
                    </li>
                  </ol>
                </div>
              </>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
