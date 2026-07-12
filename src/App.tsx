import { lazy, Suspense, useCallback, useEffect, useState } from "react";
import type { AppSettings } from "./types";
import { loadSettings } from "./utils/settingsStorage";
import { StrategyWorkflow } from "./components/StrategyWorkflow";
import { topicInitialPrompt, topicFields } from "./prompts/topicExploration";
import {
  counterEvidencePrompt,
  counterEvidenceFields,
} from "./prompts/counterEvidence";
import "./App.css";

const HowToUseTab = lazy(() =>
  import("./components/HowToUseTab").then((module) => ({ default: module.HowToUseTab }))
);
const FactCheckTab = lazy(() =>
  import("./components/FactCheckTab").then((module) => ({ default: module.FactCheckTab }))
);
const QuickEvidenceTab = lazy(() =>
  import("./components/QuickEvidenceTab").then((module) => ({ default: module.QuickEvidenceTab }))
);
const EbmTab = lazy(() =>
  import("./components/EbmTab").then((module) => ({ default: module.EbmTab }))
);
const SrTab = lazy(() =>
  import("./components/SrTab").then((module) => ({ default: module.SrTab }))
);
const PubMedToolTab = lazy(() =>
  import("./components/PubMedToolTab").then((module) => ({ default: module.PubMedToolTab }))
);
const HarmsSearchTab = lazy(() =>
  import("./components/HarmsSearchTab").then((module) => ({ default: module.HarmsSearchTab }))
);
const GradeExplainerTab = lazy(() =>
  import("./components/GradeExplainerTab").then((module) => ({ default: module.GradeExplainerTab }))
);

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

function tabFromHash(): TabType {
  const value = window.location.hash.replace(/^#/, "") as TabType;
  return tabs.some((tab) => tab.key === value) ? value : "how_to_use";
}

type TopicSearchMode = "normal" | "counter";

interface TopicPrefill {
  key: number;
  values: Record<string, string>;
}

export default function App() {
  const [activeTab, setActiveTab] = useState<TabType>(tabFromHash);
  const [visitedTabs, setVisitedTabs] = useState<Set<TabType>>(
    () => new Set([tabFromHash()])
  );
  const [settings, setSettings] = useState<AppSettings>(loadSettings);
  const [topicMode, setTopicMode] = useState<TopicSearchMode>("normal");
  const [topicPrefill, setTopicPrefill] = useState<TopicPrefill | null>(null);

  const showTab = useCallback((nextTab: TabType) => {
    setActiveTab(nextTab);
    setVisitedTabs((previous) => {
      if (previous.has(nextTab)) return previous;
      const next = new Set(previous);
      next.add(nextTab);
      return next;
    });
  }, []);

  useEffect(() => {
    window.history.replaceState(null, "", `#${activeTab}`);
  }, [activeTab]);

  useEffect(() => {
    const syncFromHash = () => showTab(tabFromHash());
    window.addEventListener("hashchange", syncFromHash);
    return () => window.removeEventListener("hashchange", syncFromHash);
  }, [showTab]);

  function sendEbmToTopicSearch(payload: {
    question: string;
    pico: string;
    focus: string;
  }) {
    const parts = [
      payload.question && `【現質問】\n${payload.question}`,
      payload.pico && `【PICO】\n${payload.pico}`,
      payload.focus && `【強調したいポイント】\n${payload.focus}`,
      "PubMed検索で十分にヒットしなかったため、PubMedだけでは拾いにくい本文内証拠や関連論点も含めて探索してください。候補論文は必ず実在確認・PMID確認を行い、未確認候補と確認済み候補を分けてください。",
    ].filter(Boolean);
    setTopicMode("normal");
    setTopicPrefill({
      key: Date.now(),
      values: { question: parts.join("\n\n") },
    });
    showTab("topic_exploration");
  }

  return (
    <div className="app">
      <a className="skip-link" href="#main-content">本文へ移動</a>
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
            医療情報では、ハルシネーションを限りなくゼロに近づける必要があります。本アプリは未検証情報を明示し、PubMedによる書誌確認と、人間による原典確認を支援します。正確性を保証するものではありません。
            低モデルでは、ファクトチェックでハルシネーションが増える場合があります。
          </strong>
        </p>
      </header>

      <nav className="tab-nav" aria-label="機能を選ぶ">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            className={`tab-button tab-kind-${tab.kind} ${activeTab === tab.key ? "active" : ""}`}
            onClick={() => showTab(tab.key)}
            aria-pressed={activeTab === tab.key}
          >
            {tab.kind === "main" && <span className="tab-main-dot" aria-hidden="true">●</span>}
            {tab.label}
          </button>
        ))}
      </nav>

      <main className="app-main" id="main-content" tabIndex={-1}>
        <Suspense fallback={<div className="tab-loading" role="status">機能を読み込んでいます…</div>}>
        <div className="tab-panel" hidden={activeTab !== "how_to_use"}>
          {visitedTabs.has("how_to_use") && (
            <HowToUseTab settings={settings} onSettingsChange={setSettings} />
          )}
        </div>

        <div className="tab-panel" hidden={activeTab !== "fact_check"}>
          {visitedTabs.has("fact_check") && <FactCheckTab settings={settings} />}
        </div>

        <div className="tab-panel" hidden={activeTab !== "topic_exploration"}>
          <>
            <div className="topic-mode-switch" role="tablist" aria-label="検索モード">
              <button
                role="tab"
                aria-selected={topicMode === "normal"}
                className={`topic-mode-btn ${topicMode === "normal" ? "active" : ""}`}
                onClick={() => setTopicMode("normal")}
                title="質問の意味を確認し、支持・反対・限定・修正を中立に探索します"
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
                質問の意味を一度確認してから、支持・反対・条件付き限定・原典との差を
                <strong>中立に探索</strong>します。入力欄は1つのままです。
                <br />
                <strong>
                  💡 Geminiの高速モードなどでは、「開始します・そのままお待ちください。」で止まるため、「続けて」と入力してください。
                </strong>
              </p>
            )}

            <StrategyWorkflow
              key={`topic-shared-${topicPrefill?.key ?? 0}`}
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
                      反証が見つかっても研究の質が下がるわけではありません。通常検索の中立探索に加え、反証検索で反対側を深掘りすることで、より包括的な文献レビューになります。
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
                      仮説を支持する論文だけに寄せず、反対・限定・修正・原典との差も同時に確認します。
                      地域名タイトル・地域誌・非英語圏著者・低被引用などを機械的に除外しません。
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
                          単純な評価語だけではヒットしにくいため、「Winter / Pell &amp; Gregory
                          の下顎第三大臼歯分類を、<strong>分類そのものを誤解</strong>
                          して使っている論文があることが記載されている、英語の論文を探して。
                          例えば、ある別の基準として、
                          <em>イロハニが原文なのに、誤解してイロニと思い込んで使っている</em>
                          例が記載されている論文を探して。」とすると
                          といった関係表現へ置き換えると、発見可能性が上がります。
                          このプロンプトは、このような
                          <strong>揺らぎを網羅した検索</strong>
                          ができるように調整しています。
                        </li>
                        <li>
                          このような疑問は臨床疑問として PICO
                          形式にしにくいため、PubMed検索に加えて、全文検索・引用追跡ができる
                          <strong>AIやWeb検索を補完的に使う</strong>と有用です。
                        </li>
                      </ol>
                    </details>
                  </>
                )
              }
              mode="topic-synthesis"
              prefillValues={topicPrefill?.values}
              prefillKey={topicPrefill?.key}
            />
          </>
        </div>

        <div className="tab-panel" hidden={activeTab !== "quick_evidence"}>
          {visitedTabs.has("quick_evidence") && <QuickEvidenceTab settings={settings} />}
        </div>

        <div className="tab-panel" hidden={activeTab !== "ebm_search"}>
          {visitedTabs.has("ebm_search") && (
            <EbmTab settings={settings} onPubMedFallbackToAi={sendEbmToTopicSearch} />
          )}
        </div>

        <div className="tab-panel" hidden={activeTab !== "systematic_review"}>
          {visitedTabs.has("systematic_review") && (
            <SrTab settings={settings} />
          )}
        </div>

        <div className="tab-panel" hidden={activeTab !== "pubmed_tool"}>
          {visitedTabs.has("pubmed_tool") && <PubMedToolTab />}
        </div>

        <div className="tab-panel" hidden={activeTab !== "harms_search"}>
          {visitedTabs.has("harms_search") && <HarmsSearchTab />}
        </div>

        <div className="tab-panel" hidden={activeTab !== "grade_explainer"}>
          {visitedTabs.has("grade_explainer") && <GradeExplainerTab />}
        </div>
        </Suspense>
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
