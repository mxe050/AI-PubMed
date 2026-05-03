import { useState } from "react";
import type { AppSettings, StrategyType } from "./types";
import { loadSettings } from "./utils/settingsStorage";
import { SettingsPanel } from "./components/SettingsPanel";
import { StrategyWorkflow } from "./components/StrategyWorkflow";
import { GradeTab } from "./components/GradeTab";
import { topicInitialPrompt, topicFields } from "./prompts/topicExploration";
import { srInitialPrompt, srFields } from "./prompts/systematicReview";
import "./App.css";

type TabType = StrategyType | "settings";

const tabs: { key: TabType; label: string }[] = [
  { key: "topic_exploration", label: "トピック探索" },
  { key: "systematic_review", label: "システマティックレビュー" },
  { key: "grade_adolopment", label: "GRADE-ADOLOPMENT" },
  { key: "settings", label: "設定" },
];

export default function App() {
  const [activeTab, setActiveTab] = useState<TabType>("topic_exploration");
  const [settings, setSettings] = useState<AppSettings>(loadSettings);

  return (
    <div className="app">
      <header className="app-header">
        <h1>AI支援 PubMed検索プロンプト支援ツール</h1>
        <p className="app-subtitle">
          AI APIには一切通信しません。PubMed公式API（NCBI E-utilities）のみを使用します。
        </p>
      </header>

      <nav className="tab-nav">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            className={`tab-button ${activeTab === tab.key ? "active" : ""}`}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      <main className="app-main">
        {activeTab === "topic_exploration" && (
          <StrategyWorkflow
            settings={settings}
            fields={topicFields}
            promptTemplate={topicInitialPrompt}
            description="概念探索、用語法、分類体系、歴史的経緯、論争点など、PubMedの抄録だけでは拾いきれないトピックに使います。PubMedで候補文献を集め、AIで論文の考察まで含めた最終回答を統合します。"
            mode="topic-synthesis"
          />
        )}

        {activeTab === "systematic_review" && (
          <StrategyWorkflow
            settings={settings}
            fields={srFields}
            promptTemplate={srInitialPrompt}
            description="PICOに基づくSR、メタ解析、診療ガイドライン用の効果検索に使います。最終的に必ずPubMedで完結し、査読（PRESS/PRISMA-S）通過品質の検索式を作ります。"
            mode="sr-revision"
          />
        )}

        {activeTab === "grade_adolopment" && <GradeTab settings={settings} />}

        {activeTab === "settings" && (
          <SettingsPanel
            initialSettings={settings}
            onChange={setSettings}
          />
        )}
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
