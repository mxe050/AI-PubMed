import { useState } from "react";
import type { AppSettings } from "./types";
import { loadSettings } from "./utils/settingsStorage";
import { HowToUseTab } from "./components/HowToUseTab";
import { FactCheckTab } from "./components/FactCheckTab";
import { StrategyWorkflow } from "./components/StrategyWorkflow";
import { EbmTab } from "./components/EbmTab";
import { GradeExplainerTab } from "./components/GradeExplainerTab";
import { topicInitialPrompt, topicFields } from "./prompts/topicExploration";
import { srInitialPrompt, srFields } from "./prompts/systematicReview";
import "./App.css";

type TabType =
  | "how_to_use"
  | "fact_check"
  | "topic_exploration"
  | "ebm_search"
  | "systematic_review"
  | "grade_explainer";

type TabKind = "main" | "supp" | "meta";

const tabs: { key: TabType; label: string; kind: TabKind }[] = [
  { key: "how_to_use", label: "使い方・設定", kind: "meta" },
  { key: "fact_check", label: "AI出力ファクトチェック", kind: "main" },
  { key: "topic_exploration", label: "トピック探索", kind: "main" },
  { key: "ebm_search", label: "EBMのための検索", kind: "supp" },
  { key: "systematic_review", label: "システマティックレビュー", kind: "supp" },
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
      <p className="tab-legend">
        <span className="tab-main-dot" aria-hidden="true">●</span>
        がメイン機能（AI出力ファクトチェック・トピック探索）。EBM検索・SR・GRADEは補助です。
      </p>

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
            settings={settings}
            fields={topicFields}
            promptTemplate={topicInitialPrompt}
            description="概念探索、用語法、分類体系、歴史的経緯、論争点など、PubMedの抄録だけでは拾いきれないトピックに使います。PubMedで候補文献を集め、AIで論文の考察まで含めた最終回答を統合します。最後にPubMedで全PMIDを実在確認＋抄録取得してハルシネーションを検出します。"
            mode="topic-synthesis"
          />
        )}

        {activeTab === "ebm_search" && <EbmTab settings={settings} />}

        {activeTab === "systematic_review" && (
          <StrategyWorkflow
            settings={settings}
            fields={srFields}
            promptTemplate={srInitialPrompt}
            description="PICOに基づくSR、メタ解析、診療ガイドライン用の効果検索に使います。最終的に必ずPubMedで完結し、査読（PRESS / PRISMA-S）通過品質の検索式と、その構築理由の解説を作ります。"
            mode="sr-revision"
          />
        )}

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
