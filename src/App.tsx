import { useState } from "react";
import type { AppSettings } from "./types";
import { loadSettings } from "./utils/settingsStorage";
import { HowToUseTab } from "./components/HowToUseTab";
import { FactCheckTab } from "./components/FactCheckTab";
import { StrategyWorkflow } from "./components/StrategyWorkflow";
import { EbmTab } from "./components/EbmTab";
import { GradeExplainerTab } from "./components/GradeExplainerTab";
import { PubMedToolTab } from "./components/PubMedToolTab";
import { topicInitialPrompt, topicFields } from "./prompts/topicExploration";
import { srInitialPrompt, srFields } from "./prompts/systematicReview";
import "./App.css";

type TabType =
  | "how_to_use"
  | "fact_check"
  | "topic_exploration"
  | "ebm_search"
  | "systematic_review"
  | "pubmed_tool"
  | "grade_explainer";

type TabKind = "main" | "supp" | "meta";

const tabs: { key: TabType; label: string; kind: TabKind }[] = [
  { key: "how_to_use", label: "使い方・設定", kind: "meta" },
  { key: "fact_check", label: "AI出力ファクトチェック", kind: "main" },
  { key: "topic_exploration", label: "PubMedで見逃しやすい論文検索", kind: "main" },
  { key: "ebm_search", label: "EBMのための検索", kind: "supp" },
  { key: "systematic_review", label: "システマティックレビュー", kind: "supp" },
  { key: "pubmed_tool", label: "PubMed Tool", kind: "supp" },
  { key: "grade_explainer", label: "GRADE-ADOLOPMENT解説", kind: "supp" },
];

export default function App() {
  const [activeTab, setActiveTab] = useState<TabType>("how_to_use");
  const [settings, setSettings] = useState<AppSettings>(loadSettings);

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
          <StrategyWorkflow
            title="PubMedで見逃しやすい論文検索（メイン機能）"
            settings={settings}
            fields={topicFields}
            promptTemplate={topicInitialPrompt}
            description={
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
            }
            mode="topic-synthesis"
          />
        )}

        {activeTab === "ebm_search" && <EbmTab settings={settings} />}

        {activeTab === "systematic_review" && (
          <StrategyWorkflow
            title="システマティックレビュー（補助機能）"
            settings={settings}
            fields={srFields}
            promptTemplate={srInitialPrompt}
            description={
              <>
                <p>
                  PICOに基づくSR、メタ解析、診療ガイドライン用の効果検索に使います。最終的に必ずPubMedで完結し、査読（PRESS
                  / PRISMA-S）通過品質の検索式と、その構築理由の解説を作ります。
                </p>
                <p className="sr-brushup-note">
                  EBMのための検索と異なり、一度PubMedで検索した結果を加えてAIで検索式をブラッシュアップ（Brush
                  up）してから、再度PubMedで検索をします。
                </p>
              </>
            }
            mode="sr-revision"
          />
        )}

        {activeTab === "pubmed_tool" && <PubMedToolTab />}

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
