import { useState } from "react";
import type { AppSettings } from "./types";
import { loadSettings } from "./utils/settingsStorage";
import { HowToUseTab } from "./components/HowToUseTab";
import { FactCheckTab } from "./components/FactCheckTab";
import { StrategyWorkflow } from "./components/StrategyWorkflow";
import { EbmTab } from "./components/EbmTab";
import { GradeExplainerTab } from "./components/GradeExplainerTab";
import { PubMedToolTab } from "./components/PubMedToolTab";
import { QuickEvidenceTab } from "./components/QuickEvidenceTab";
import { SrTab } from "./components/SrTab";
import { HarmsSearchTab } from "./components/HarmsSearchTab";
import { topicInitialPrompt, topicFields } from "./prompts/topicExploration";
import {
  counterEvidencePrompt,
  counterEvidenceFields,
} from "./prompts/counterEvidence";
import "./App.css";

type TabType =
  | "how_to_use"
  | "fact_check"
  | "topic_exploration"
  | "quick_evidence"
  | "ebm_search"
  | "systematic_review"
  | "pubmed_tool"
  | "harms_search"
  | "grade_explainer";

type TabKind = "main" | "supp" | "meta";

const tabs: { key: TabType; label: string; kind: TabKind }[] = [
  { key: "how_to_use", label: "使い方・設定", kind: "meta" },
  { key: "fact_check", label: "AI出力ファクトチェック", kind: "main" },
  { key: "topic_exploration", label: "質問ズレ/PubMed検索漏れ", kind: "main" },
  { key: "quick_evidence", label: "ちょっと調べたい", kind: "main" },
  { key: "ebm_search", label: "EBMのための検索", kind: "supp" },
  { key: "systematic_review", label: "システマティックレビュー", kind: "supp" },
  { key: "pubmed_tool", label: "PubMed Tool", kind: "supp" },
  { key: "harms_search", label: "害の検索", kind: "supp" },
  { key: "grade_explainer", label: "GRADE-ADOLOPMENT解説", kind: "supp" },
];

type TopicSearchMode = "normal" | "counter";

export default function App() {
  const [activeTab, setActiveTab] = useState<TabType>("how_to_use");
  const [settings, setSettings] = useState<AppSettings>(loadSettings);
  const [topicMode, setTopicMode] = useState<TopicSearchMode>("normal");

  return (
    <div className="app">
      <header className="app-header">
        <h1>医療関係者のためのAI検索（PubMed・SR）</h1>
        <p className="app-subtitle">
          AI APIには一切通信しません。PubMed公式API（NCBI E-utilities）のみを使用します。
        </p>
        <p className="app-subtitle app-subtitle-warning">
          ⚠ AIモデルは日々進化・変化しています。本アプリで生成したプロンプトを外部AIに渡す方法より、
          外部AIで直接トピック検索やファクトチェックを行った方が正確な回答になる場合もあります。
          またAIモデルの仕様変更により、出力の品質や形式が変わることがあります。
          本アプリの結果を盲信せず、最終判断は必ず人間が行ってください。
          <br />
          <strong>
            ハルシネーションは、ほほ無いではダメで、ゼロでなければなりません。
            低モデルでは、ファクトチェックでハルシネーションが増える場合があります。
          </strong>
        </p>
      </header>

      <nav className="tab-nav">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            className={`tab-button tab-kind-${tab.kind} ${activeTab === tab.key ? "active" : ""}`}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.kind === "main" && <span className="tab-main-dot" aria-hidden="true">●</span>}
            {tab.label}
          </button>
        ))}
      </nav>

      <main className="app-main">
        {activeTab === "how_to_use" && (
          <HowToUseTab
            settings={settings}
            onSettingsChange={setSettings}
          />
        )}

        {activeTab === "fact_check" && <FactCheckTab settings={settings} />}

        {activeTab === "topic_exploration" && (
          <>
            <div className="topic-mode-switch" role="tablist" aria-label="検索モード">
              <button
                role="tab"
                aria-selected={topicMode === "normal"}
                className={`topic-mode-btn ${topicMode === "normal" ? "active" : ""}`}
                onClick={() => setTopicMode("normal")}
                title="既存のプロンプトを使い、ユーザーの仮説を支持・裏付ける論文を探します"
              >
                📖 通常検索
              </button>
              <button
                role="tab"
                aria-selected={topicMode === "counter"}
                className={`topic-mode-btn topic-mode-btn-counter ${topicMode === "counter" ? "active" : ""}`}
                onClick={() => setTopicMode("counter")}
                title="新しいプロンプトを使い、ユーザーの仮説に反論・修正・限定する論文を探します"
              >
                ⚖️ 反証検索
              </button>
            </div>

            {topicMode === "counter" && (
              <p className="topic-mode-counter-intro">
                このモードは確証バイアスを防ぐための機能です。
                あなたの仮説や疑問に対して、反対の立場・反論・修正を示している論文を探します。
                反対のエビデンスを把握することで、より強固な文献レビューが可能になります。
                <br />
                <strong>
                  💡 Geminiの高速モードなどでは、「開始します・そのままお待ちください。」で止まるため、「続けて」と入力してください。
                </strong>
              </p>
            )}

            {topicMode === "normal" && (
              <p className="topic-mode-normal-intro">
                <strong>
                  💡 Geminiの高速モードなどでは、「開始します・そのままお待ちください。」で止まるため、「続けて」と入力してください。
                </strong>
              </p>
            )}

            <StrategyWorkflow
              key="topic-shared"
              title={
                topicMode === "counter"
                  ? "質問ズレ/PubMed検索漏れ（反証パラレル検索）"
                  : "質問ズレ/PubMed検索漏れ（メイン機能）"
              }
              settings={settings}
              fields={
                topicMode === "counter" ? counterEvidenceFields : topicFields
              }
              promptTemplate={
                topicMode === "counter"
                  ? counterEvidencePrompt
                  : topicInitialPrompt
              }
              description={
                topicMode === "counter" ? (
                  <>
                    <p>
                      <strong>確証バイアス（自分の仮説に都合の良い証拠ばかり集めてしまう傾向）</strong>
                      を防ぐためのモードです。あなたの仮説や前提を
                      <strong>否定・反論・修正・限定する論文</strong>
                      だけを探索します。反対のエビデンスを把握することで、よりバランスの取れた文献レビューが可能になります。
                    </p>
                    <p>探索される論文の例：</p>
                    <ul>
                      <li>仮説と反対の結果を示している研究（直接反論）</li>
                      <li>「特定の条件でのみ正しい」と限定している研究（条件付き限定）</li>
                      <li>同じ現象を別の機序・別の理論で説明する研究（別解釈）</li>
                      <li>同じ手法で再現できなかった研究（再現失敗）</li>
                      <li>方法論上の問題を指摘する論文（方法論批判）</li>
                      <li>主流説の根拠の弱さを示す論文（エビデンス不十分）</li>
                    </ul>
                    <p>
                      各論文には <strong>反証の種類</strong>（直接反論／条件付き限定／別解釈／再現失敗／方法論批判／エビデンス不十分）と
                      <strong>反証の強さ</strong>（強い／中程度／弱い）が付記されます。
                      反証が見つかっても研究の質が下がるわけではありません。むしろ、通常検索（支持側）と反証検索（反対側）の両方の結果を比較することで、より包括的な文献レビューになります。
                    </p>
                    <details className="topic-example-box">
                      <summary>
                        <strong>たとえばどんな場面で使う？（クリックで詳細）</strong>
                      </summary>
                      <p>
                        例：「Winter / Pell &amp; Gregory 分類は誤って使われている」
                        という主張に対して、「いや、正しく使われている」「誤用とされる例の方がむしろ誤読である」「特定の地域や時期だけの問題で全体ではない」といった
                        <strong>反論側の論文</strong>を探します。
                      </p>
                      <p>
                        通常検索で得られた論文と、このモードで得られた反証論文の両方を読むことで、その論点が
                        <strong>どこまで合意で、どこから論争中か</strong>が明確になります。
                      </p>
                    </details>
                  </>
                ) : (
                  <>
                    <p>
                      PubMedのタイトル・抄録検索では見落とされる、本文内証拠（Discussion
                      / Methods / Results / Limitations / Table / Figure /
                      参考文献にある批判・比較・改変・限界・代替分類への言及）を持つ論文を探します。
                      地域名タイトル・地域誌・非英語圏著者・低被引用などを除外せず、見落としリスクの高い論文を意図的に拾い上げます。
                    </p>
                    <details className="topic-example-box">
                      <summary>
                        <strong>たとえばどんな場面で使う？（クリックで詳細）</strong>
                      </summary>
                      <p>
                        「そういえば最近、Winter / Pell &amp; Gregory
                        を間違って引用しているサイトが多いな。原文読んでないんだろうな〜。そのようなことが記載されている論文ってあるのかな。
                        『Winter / Pell &amp; Gregory の下顎第三大臼歯分類が
                        “誤って使われている” と指摘している論文を探して』で
                        AIで聞いてみるか？」
                      </p>
                      <p>→ 問題点が3つあります：</p>
                      <ol>
                        <li>
                          この回答の論文は <em>Jaroń 2021</em>{" "}
                          ですが、その記載は <strong>考察（Discussion）</strong>{" "}
                          のところに書かれており、PubMed
                          のタイトル・抄録検索では拾えません。
                        </li>
                        <li>
                          このプロンプトでは Opus 4.7
                          でもヒットせず、「Winter / Pell &amp; Gregory
                          の下顎第三大臼歯分類を、<strong>分類そのものを誤解</strong>
                          して使っている論文があることが記載されている、英語の論文を探して。
                          例えば、ある別の基準として、
                          <em>イロハニが原文なのに、誤解してイロニと思い込んで使っている</em>
                          例が記載されている論文を探して。」とすると
                          <strong>ドンピシャでヒットします</strong>。
                          このプロンプトの変換は、このような
                          <strong>揺らぎを網羅した検索</strong>
                          ができるように調整しています。
                        </li>
                        <li>
                          このような疑問は臨床疑問として PICO
                          形式にできないため、PubMed より <strong>AIで直接検索</strong>
                          する方が便利です。
                        </li>
                      </ol>
                    </details>
                  </>
                )
              }
              mode="topic-synthesis"
            />
          </>
        )}

        {activeTab === "quick_evidence" && (
          <QuickEvidenceTab settings={settings} />
        )}

        {activeTab === "ebm_search" && <EbmTab settings={settings} />}

        {activeTab === "systematic_review" && (
          <SrTab
            settings={settings}
            onNavigateToEbm={() => setActiveTab("ebm_search")}
          />
        )}

        {activeTab === "pubmed_tool" && <PubMedToolTab />}

        {activeTab === "harms_search" && <HarmsSearchTab />}

        {activeTab === "grade_explainer" && <GradeExplainerTab />}
      </main>

      <footer className="app-footer">
        <p>
          本アプリはAI API（OpenAI、Claude、Gemini等）には一切通信しません。
          PubMed検索にはNCBI公式E-utilities APIを使用しています。
        </p>
      </footer>
    </div>
  );
}
