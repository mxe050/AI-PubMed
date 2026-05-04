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
} from "../prompts/ebmStep2";
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
  const [context, setContext] = useState("");
  const [purpose, setPurpose] = useState("treatment");
  const [pico, setPico] = useState("");

  const [initialPrompt, setInitialPrompt] = useState("");
  const [aiResponse, setAiResponse] = useState("");
  const [searchString, setSearchString] = useState("");
  const [pubmedResult, setPubmedResult] = useState<PubMedSearchResult | null>(
    null
  );

  function generateInitialPrompt() {
    if (!rawQuestion.trim()) {
      alert("原質問を入力してください。");
      return;
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

  function applyHierarchyFilter(filter: string) {
    if (!searchString.trim()) {
      alert("先に基本検索式を入力してください。");
      return;
    }
    const cleaned = searchString.trim().replace(/\s*AND\s*\([^)]*\[pt\][^)]*\)\s*$/i, "");
    setSearchString(`${cleaned} AND (${filter})`);
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
        <h2>EBMのための検索（EBM Step 2 Navigator）</h2>
        <p className="hint">
          このアプリは <strong>EBM Step 2（情報検索）</strong>に特化したフローです。
          批判的吟味（Step 3）・推奨判断・治療方針決定は<strong>行いません</strong>。
          目的は、次のEBM Step 3に渡せる「文献候補リスト」を、AIとPubMedの往復で作ることです。
        </p>
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

        <div className="form-group">
          <label>患者背景・状況</label>
          <textarea
            rows={2}
            value={context}
            onChange={(e) => setContext(e.target.value)}
            placeholder="例：80歳代の女性、HFrEF、eGFR 45、糖尿病あり、外来"
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
          <div className="form-group" style={{ marginTop: 12 }}>
            <label>PICOをここに転記（任意・後段プロンプトに使用）</label>
            <textarea
              rows={2}
              value={pico}
              onChange={(e) => setPico(e.target.value)}
              placeholder="例：P 高齢心不全患者 / I SGLT2阻害薬 / C 標準治療 / O 心不全入院・全死亡"
            />
          </div>
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

      {/* Step 4: PubMed search with hierarchy filter buttons */}
      {aiResponse && (
        <section id="ebm-step-pubmed" className="workflow-section">
          <h2>Step 4: PubMed検索（情報源ヒエラルキー）</h2>
          <p className="hint">
            EBM Step 2のヒエラルキーに従って、上位（GL/SR）から検索します。
            下のボタンで現在の検索式に文献タイプフィルターを追加できます。
          </p>

          <SearchStringInput
            value={searchString}
            onChange={setSearchString}
          />

          <div className="ebm-hierarchy-buttons">
            <button
              className="btn btn-secondary btn-small"
              onClick={() =>
                applyHierarchyFilter("guideline[pt] OR practice guideline[pt]")
              }
            >
              + ガイドライン
            </button>
            <button
              className="btn btn-secondary btn-small"
              onClick={() =>
                applyHierarchyFilter(
                  "systematic review[pt] OR meta-analysis[pt]"
                )
              }
            >
              + SR / メタ解析
            </button>
            <button
              className="btn btn-secondary btn-small"
              onClick={() =>
                applyHierarchyFilter(
                  "randomized controlled trial[pt] OR randomized[tiab] OR placebo[tiab]"
                )
              }
            >
              + RCT
            </button>
            <button
              className="btn btn-secondary btn-small"
              onClick={() =>
                applyHierarchyFilter(
                  'cohort[tiab] OR "case-control"[tiab] OR observational[tiab] OR registry[tiab]'
                )
              }
            >
              + 観察研究
            </button>
            <button
              className="btn btn-secondary btn-small"
              onClick={() =>
                applyHierarchyFilter('"last 5 years"[dp] OR "last 5 years"[edat]')
              }
            >
              + 直近5年
            </button>
            <button
              className="btn btn-secondary btn-small"
              onClick={() =>
                applyHierarchyFilter("humans[mh] NOT (animals[mh] NOT humans[mh])")
              }
            >
              + Humanのみ
            </button>
          </div>

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
              <h3>5-B. PubMed終了版プロンプト（AIが検索式を磨く）</h3>
              <span className="prompt-tag prompt-tag-safe">
                ✓ ハルシネーション低リスク
              </span>
            </div>
            <div className="pubmed-ending-note">
              <strong>特徴：</strong>
              このバージョンではAIに最終回答を作らせず、
              <strong>改善された検索式（一文）</strong>のみを出させます。
              抽出した検索式をStep 4に戻してPubMedで再実行することで、PubMed側が最終的な文献リストを返します。
              AIによる文献捏造のリスクが構造的に低くなります。
            </div>
            {pubmedEndingPromptText && (
              <PromptDisplay
                prompt={pubmedEndingPromptText}
                title="PubMed終了版プロンプト"
              />
            )}
            <div className="next-step-hint">
              <h4>このプロンプトの次にすること</h4>
              <ol>
                <li>上のプロンプトをコピー → ChatGPT / Claude / Geminiに貼り付け</li>
                <li>AIから改善された検索式（一文）を取得</li>
                <li>
                  Step 4の検索式欄に貼り付けて、PubMedで再検索（reload Step 4）
                </li>
                <li>必要なら本ページのStep 5を再度実行（iteration）</li>
                <li>
                  最終的に得られたPubMedヒットリストを次のEBM Step 3（批判的吟味）に渡す
                </li>
              </ol>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
