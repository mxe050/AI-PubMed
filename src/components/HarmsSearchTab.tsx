// 「害の検索」タブ
// 実践用のPubMed検索式ビルダーと、方法論を詳述した長文レポートを掲載。
// レポート本文は保持し、見出し構造・コードブロック・参考文献リストで読みやすくする。

import { useState } from "react";
import {
  buildHarmsSearchQuery,
  type HarmsInterventionType,
  type HarmsSearchMode,
} from "../utils/harmsSearch";
import { openPubMedWithQuery } from "../utils/pubmedUrl";

const HARMS_SEARCH_MODES: Array<{
  key: HarmsSearchMode;
  label: string;
  description: string;
}> = [
  {
    key: "known",
    label: "既知の重要な害（推奨）",
    description:
      "害が分かっている場合は、診断名・症状名・検査異常などの具体語を優先します。害が空欄なら一般的な害用語で補います。",
  },
  {
    key: "broad",
    label: "未知の害・シグナル探索",
    description:
      "一般的な害のMeSH副標目と自由語を広くOR結合します。探索向けで、ノイズが増えても未知の表現を拾いたい場合に使います。",
  },
  {
    key: "rare",
    label: "稀・遅発性の重篤な害（補足）",
    description:
      "症例報告、観察研究、レジストリ、市販後監視などを追加します。この式だけで完結させず、研究デザインを限定しない主検索も必ず併用します。",
  },
];

const HARMS_INTERVENTION_TYPES: Array<{
  key: HarmsInterventionType;
  label: string;
  evidence: string;
  sourceUrl: string;
}> = [
  {
    key: "drug",
    label: "薬剤",
    evidence:
      "感度重視モードはOvid MEDLINE検証セットで相対再現率90%。PubMed変換後の絶対感度ではありません。",
    sourceUrl:
      "https://eprints.whiterose.ac.uk/id/eprint/185209/3/Health_Info_Libraries_J_2022_Golder_Updated_generic_search_filters_for_finding_studies_of_adverse_drug_effects_in.pdf",
  },
  {
    key: "surgery",
    label: "手術・手技",
    evidence:
      "MEDLINE検証セットの相対再現率87%、具体的害を加えた後解析で93%。",
    sourceUrl: "https://pmc.ncbi.nlm.nih.gov/articles/PMC6055664/",
  },
  {
    key: "device",
    label: "医療機器",
    evidence:
      "generic termsは検証セットで83%、具体的な故障・移動・感染等を加えた後解析で92%。",
    sourceUrl: "https://pmc.ncbi.nlm.nih.gov/articles/PMC6853259/",
  },
  {
    key: "other",
    label: "その他・不明",
    evidence:
      "一般的な害語を使う未検証の実務式です。既知の重要文献で回収確認してください。",
    sourceUrl:
      "https://www.cochrane.org/authors/handbooks-and-manuals/handbook/current/chapter-19",
  },
];

async function copyText(text: string) {
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
}

/** 検索式コードブロック＋コピーボタンの共通子コンポーネント。 */
function CodeBlockWithCopy({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  async function handleCopy() {
    await copyText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }
  return (
    <div className="harms-code-block">
      <button
        type="button"
        className="harms-code-copy-btn"
        onClick={handleCopy}
        title="この検索式をクリップボードにコピー"
      >
        {copied ? "✓ コピーしました" : "📋 コピー"}
      </button>
      <pre className="harms-code">{code}</pre>
    </div>
  );
}

export function HarmsSearchTab() {
  const [intervention, setIntervention] = useState("");
  const [population, setPopulation] = useState("");
  const [specificHarm, setSpecificHarm] = useState("");
  const [mode, setMode] = useState<HarmsSearchMode>("known");
  const [interventionType, setInterventionType] =
    useState<HarmsInterventionType>("other");
  const [includePopulation, setIncludePopulation] = useState(false);
  const [excludeAnimalOnly, setExcludeAnimalOnly] = useState(true);
  const [builderCopied, setBuilderCopied] = useState(false);

  const query = buildHarmsSearchQuery({
    intervention,
    population,
    specificHarm,
    mode,
    interventionType,
    includePopulation,
    excludeAnimalOnly,
  });
  const activeMode = HARMS_SEARCH_MODES.find((item) => item.key === mode)!;
  const activeInterventionType = HARMS_INTERVENTION_TYPES.find(
    (item) => item.key === interventionType
  )!;

  async function handleBuilderCopy() {
    if (!query) return;
    await copyText(query);
    setBuilderCopied(true);
    setTimeout(() => setBuilderCopied(false), 1800);
  }

  return (
    <div className="harms-search-tab">
      <header className="harms-header">
        <h2>診療ガイドライン作成における「害」の検索</h2>
        <p className="harms-header-subtitle">
          RCT だけでは不十分である理由と、実務的検索戦略
        </p>
      </header>

      <nav className="section-jump-nav" aria-label="害の検索ページ内メニュー">
        <span>ページ内メニュー</span>
        <a href="#harms-builder">検索式を作る</a>
        <a href="#harms-methods">基本方法を読む</a>
        <a href="#harms-by-intervention">介入別の検索式</a>
        <a href="#harms-practical-flow">実務フロー</a>
        <a href="#harms-missing-signals">見つからないとき</a>
        <a href="#harms-references">参考文献</a>
      </nav>

      <section id="harms-builder" className="harms-builder" aria-labelledby="harms-builder-title">
        <div className="harms-builder-heading">
          <div>
            <span className="harms-builder-kicker">実践ツール</span>
            <h3 id="harms-builder-title">PubMed「害」検索式ビルダー</h3>
          </div>
          <p>
            介入（I）を検索の軸にし、対象集団（P）は必要なときだけ追加します。
            RCTなどの研究デザインで一律に絞り込みません。
          </p>
        </div>

        <div className="harms-builder-callout" role="note">
          <strong>推奨は2本立て：</strong>
          ①通常の「P AND I」を害語・研究デザインで絞らず検索し、②別に「I AND（汎用害語 OR 具体的害）」を検索します。
          このビルダーは②を生成します。具体的な害が分かるなら、名称・旧称・略語・上位概念を追加してください。
        </div>

        <fieldset className="harms-builder-type-fieldset">
          <legend>介入の種類（害フィルターを切り替えます）</legend>
          <div className="harms-builder-types">
            {HARMS_INTERVENTION_TYPES.map((item) => (
              <label
                key={item.key}
                className={`harms-builder-mode${
                  interventionType === item.key ? " active" : ""
                }`}
              >
                <input
                  type="radio"
                  name="harms-intervention-type"
                  value={item.key}
                  checked={interventionType === item.key}
                  onChange={() => setInterventionType(item.key)}
                />
                <span>{item.label}</span>
              </label>
            ))}
          </div>
          <p className="harms-builder-evidence-note">
            {activeInterventionType.evidence}{" "}
            <a
              href={activeInterventionType.sourceUrl}
              target="_blank"
              rel="noreferrer"
            >
              根拠を開く
            </a>
          </p>
        </fieldset>

        <div className="harms-builder-fields">
          <label className="harms-builder-field harms-builder-field-wide">
            <span>
              介入（I）<strong className="harms-required">必須</strong>
            </span>
            <textarea
              value={intervention}
              onChange={(event) => setIntervention(event.target.value)}
              rows={2}
              placeholder={'例："Bisphosphonates"[Mesh] OR bisphosphonate*[tiab]'}
              aria-required="true"
            />
            <small>薬剤・手技・医療機器のMeSH語、一般名、商品名、略語などをORでまとめます。</small>
          </label>

          <label className="harms-builder-field">
            <span>具体的な害（任意）</span>
            <textarea
              value={specificHarm}
              onChange={(event) => setSpecificHarm(event.target.value)}
              rows={3}
              placeholder={'例："Osteonecrosis of the Jaw"[Mesh] OR MRONJ[tiab]'}
            />
            <small>分かっている害は generic な “safety” より具体語を優先します。</small>
          </label>

          <div className="harms-builder-field">
            <label className="harms-builder-check">
              <input
                type="checkbox"
                checked={includePopulation}
                onChange={(event) => setIncludePopulation(event.target.checked)}
              />
              対象集団（P）を追加（任意・初期OFF）
            </label>
            <textarea
              value={population}
              onChange={(event) => setPopulation(event.target.value)}
              rows={3}
              disabled={!includePopulation}
              placeholder={'例："Osteoporosis"[Mesh] OR osteoporosis[tiab]'}
              aria-label="対象集団の検索ブロック"
            />
            <small>対象集団を必須にすると、より広い集団で報告された害を落とすことがあります。</small>
          </div>
        </div>

        <fieldset className="harms-builder-mode-fieldset">
          <legend>検索モード</legend>
          <div className="harms-builder-modes">
            {HARMS_SEARCH_MODES.map((item) => (
              <label
                key={item.key}
                className={`harms-builder-mode${mode === item.key ? " active" : ""}`}
              >
                <input
                  type="radio"
                  name="harms-search-mode"
                  value={item.key}
                  checked={mode === item.key}
                  onChange={() => setMode(item.key)}
                />
                <span>{item.label}</span>
              </label>
            ))}
          </div>
          <p className={`harms-builder-mode-note mode-${mode}`}>
            {activeMode.description}
          </p>
        </fieldset>

        <label className="harms-builder-check harms-builder-animal-check">
          <input
            type="checkbox"
            checked={excludeAnimalOnly}
            onChange={(event) => setExcludeAnimalOnly(event.target.checked)}
          />
          動物のみの研究を除外する
          <code>NOT (animals[mh] NOT humans[mh])</code>
        </label>

        {mode === "rare" && (
          <div className="harms-builder-warning" role="alert">
            <strong>補足検索です。</strong>
            まず「介入 AND 具体的な害」を研究デザイン制限なしで検索し、この式を追加で実行してください。
            規制当局の安全性情報、試験登録、引用追跡も別途確認します。
          </div>
        )}

        <div className="harms-builder-output">
          <label htmlFor="harms-generated-query">生成されたPubMed検索式</label>
          <textarea
            id="harms-generated-query"
            value={query}
            readOnly
            rows={8}
            placeholder="介入（I）を入力すると検索式が生成されます。"
          />
          {!query && (
            <p className="harms-builder-validation">介入（I）を入力してください。</p>
          )}
          <div className="harms-builder-actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => void handleBuilderCopy()}
              disabled={!query}
            >
              {builderCopied ? "✓ コピーしました" : "検索式をコピー"}
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => void openPubMedWithQuery(query, "regular")}
              disabled={!query}
            >
              PubMedで開く
            </button>
          </div>
        </div>

        <p className="harms-builder-source">
          方法の考え方：
          <a
            href="https://www.cochrane.org/authors/handbooks-and-manuals/handbook/current/chapter-19"
            target="_blank"
            rel="noreferrer"
          >
            Cochrane Handbook Chapter 19
          </a>
          。検索式は出発点であり、既存レビュー、規制当局情報、引用追跡、必要に応じて他データベースを組み合わせてください。
        </p>
      </section>

      <div className="harms-report-divider" role="separator">
        <span>方法論の詳しい解説</span>
      </div>

      {/* 1. 害の検索が不可欠な理由 */}
      <section className="harms-section">
        <h3>1. 診療ガイドラインにおいて「害」の検索が不可欠な理由</h3>
        <p>
          診療ガイドライン作成では、介入の「益」だけでなく「害」も評価しなければ、推奨のバランスが崩れます。Cochrane Handbook Chapter 19 は、介入の有効性だけを扱い有害性を扱わないレビューは、介入を実際以上に好ましく見せる危険があると明記しています［1］。これは診療ガイドラインでは特に重大です。なぜなら、推奨は「効果があるか」だけではなく、「その効果に見合う害・負担・コストを許容できるか」で決まるからです［5–7］。
        </p>
        <p>
          GRADE アプローチでは、推奨の方向と強さを決める際に、望ましい効果、望ましくない効果、エビデンスの確実性、患者の価値観、資源利用、受け入れ可能性、実行可能性を総合的に評価します［5–7］。GRADE Working Group の基本論文では、推奨の強さは、利益と害のバランス、エビデンスの質、適用可能性、ベースラインリスクの不確実性、資源利用などを考慮して決めるとされています［5］。この論文には、GRADE の中心人物である Gordon H. Guyatt 先生および Holger J. Schünemann 先生らが GRADE Working Group メンバーとして含まれています［5］。
        </p>
        <p>
          GRADE Evidence to Decision (EtD) framework では、ガイドラインパネルが「望ましい効果はどの程度大きいか」「望ましくない効果はどの程度大きいか」「そのエビデンスの確実性はどうか」「患者がそのアウトカムをどの程度重視するか」を明示的に判断します［6,7］。したがって、害の検索が不十分であれば、EtD の「望ましくない効果」の評価が過小になり、結果として不適切に強い推奨や、介入に有利すぎる推奨が作られる可能性があります［1,5–7］。
        </p>
      </section>

      {/* 2. 用語 */}
      <section className="harms-section">
        <h3>2. 「害」の用語を明確にする</h3>
        <p>
          害の検索では、まず用語を整理する必要があります。Cochrane Handbook では、adverse event を「介入中または介入後に生じた好ましくない転帰で、必ずしも介入が原因とは限らないもの」、adverse effect / harm を「介入との因果関係が合理的に疑われる有害な転帰」と区別しています［1］。PRISMA Harms でも、adverse event、adverse effect、harm、complication、toxicity、side effect、safety などの用語が混在することが、害のレビューの透明性を低下させると指摘しています［8］。
        </p>
        <p>
          実務上、検索では広く拾うために adverse event、adverse effect、harm、complication、toxicity、side effect、safety などを含めますが、レビュー本文では「何を害として扱ったのか」を明確に定義する必要があります［1,8］。特に “safety” という語は、「安全性が証明された」という印象を与えやすいため注意が必要です。CONSORT Harms 2022 は、RCT 報告において “safe” や “safety” という曖昧な語で済ませず、具体的な harms / adverse events を記載することを求めています［9］。
        </p>
      </section>

      {/* 3. RCT だけでは不十分 */}
      <section className="harms-section">
        <h3>3. なぜ RCT だけでは害の検索として不十分なのか</h3>

        <h4>3.1 RCT は益の評価には強いが、害の評価には限界がある</h4>
        <p>
          RCT は介入効果、特に有効性を評価するうえで重要ですが、害の評価には限界があります。Cochrane Handbook は、小規模・短期の RCT では、注射部位反応のような頻度が高くすぐに起こる害は捉えられる一方、稀な害や長期的な害は、コホート研究や症例対照研究など非ランダム化研究でなければ観察されないことがあると述べています［1］。
        </p>
        <p>
          RCT では、研究参加者が厳しく選択されるため、高齢者、併存疾患をもつ患者、妊婦、小児、フレイルな患者など、実臨床で害を受けやすい集団が除外されることがあります［1,9,10］。また、RCT の追跡期間は短いことが多く、発がん、骨折、インプラント破損、遅発性感染、長期神経障害などの検出には不向きです［1,9,10］。
        </p>
        <p>
          CONSORT Harms 2022 も、RCT は介入効果評価の標準的研究デザインである一方、害の評価では、追跡期間の短さ、対象集団の制限、稀なイベントに対する検出力不足、害報告の不十分さが問題になると述べています［9］。したがって、「RCT で害が報告されていない」ことは、「害が存在しない」ことを意味しません［1,9,11］。
        </p>

        <h4>3.2 観察研究・症例報告・市販後情報が必要になる場合</h4>
        <p>
          害の種類によっては、観察研究や症例報告が重要になります。Cochrane Handbook は、非ランダム化研究、コホート研究、症例対照研究、レジストリ、症例報告、症例集積は、稀な害や未知の害のシグナル検出に有用と述べています［1］。ただし、症例報告や自発報告は分母がないため、発生率やリスク比の推定には不向きであり、主にシグナル検出やアウトカム選定に使うべきです［1］。
        </p>
        <p>
          Golder、Peryer、Loke の概説でも、害の検索では RCT に限定することはしばしば不適切であり、稀な害・長期的な害では、コホート研究、症例対照研究、症例集積、症例報告、市販後調査などが必要になり得るとされています［10］。Loke、Golder、Vandenbroucke も、薬剤の害を包括的に評価するには、適切な研究デザインとデータソースの選択が重要であると述べています［12］。
        </p>

        <h4>3.3 GRADE では、観察研究は「使ってはいけない研究」ではない</h4>
        <p>
          GRADE では、通常、RCT のエビデンスは「高」から開始し、観察研究は「低」から開始しますが、これは観察研究を使ってはいけないという意味ではありません［5,13］。GRADE Working Group の基本論文は、稀な有害事象では観察研究が RCT より適切なエビデンスを提供することがあると述べています［5］。
        </p>
        <p>
          また、GRADE では、観察研究であっても、関連が非常に強い、用量反応関係がある、残余交絡が効果を小さくする方向に働く、などの条件があればエビデンスの確実性を上げることがあります［5,13］。一方で、観察研究には交絡、選択バイアス、情報バイアス、報告バイアスがあるため、ROBINS-I などを用いてリスクオブバイアスを慎重に評価する必要があります［13］。
        </p>
      </section>

      {/* 4. 害の検索が難しい理由 */}
      <section className="harms-section">
        <h3>4. 害の検索が難しい理由</h3>
        <p>
          害の検索が難しい理由は複数あります。第一に、害は研究計画時に事前指定されていないことが多く、未知の害は検索語として指定しにくいです［1,10］。第二に、害の種類は極めて多様であり、薬剤、手術、医療機器、リハビリテーション、心理社会的介入などで、使われる用語が異なります［10,14–16］。第三に、害は主要アウトカムでないことが多く、タイトル、抄録、索引語に出てこないため、データベース検索で拾いにくいです［1,10,14］。
        </p>
        <p>
          第四に、害の用語は不統一です。薬剤では adverse drug reaction、toxicity、side effect などが使われ、手術では complication、postoperative complication、surgical site infection などが使われ、医療機器では failure、malfunction、migration、loosening、recall などが使われます［10,14–16］。第五に、MEDLINE だけでは不十分で、Embase、CENTRAL、Science Citation Index、規制当局情報、臨床試験登録、企業データ、灰色文献、引用検索などが必要になることがあります［1,2,10］。
        </p>
        <p>
          Golder、Peryer、Loke は、害データの検索には「包括的で慎重に構築された検索戦略」が必要であり、MEDLINE 単独検索は推奨されないと述べています［10］。Cochrane Handbook も、害のレビューでは単一データベースや限られたデータベースの組み合わせに依存してはいけないと明記しています［1］。
        </p>
      </section>

      {/* 5. MEDLINE 単独の限界 */}
      <section className="harms-section">
        <h3>5. MEDLINE 単独検索の限界：66%・57% の数値の正しい扱い</h3>
        <p>
          害検索でしばしば引用される重要なデータとして、チアゾリジン薬関連骨折に関するケーススタディがあります。Cochrane Handbook Chapter 19 は、2型糖尿病患者におけるチアゾリジン薬使用の有害事象を扱ったケーススタディで、60 以上の情報源を検討した結果、<strong>MEDLINE 単独では関連文献の 66% を検索できず、MEDLINE＋Embase＋CENTRAL でも 57% を検索できなかった</strong>と記載しています［1］。
        </p>
        <p>
          この元論文は、Golder &amp; Loke の <em>“The contribution of different information sources for adverse effects data”</em> です。この研究は、チアゾリジン薬関連骨折に関するシステマティックレビュー更新をケーススタディとして、各情報源の寄与を検討したものです［2］。PubMed 抄録でも、ケーススタディが「thiazolidinedione-related fractures in patients with type 2 diabetes mellitus」であったこと、すべての関連文献を同定するには GSK website、Science Citation Index、Embase、BIOSIS Previews、British Library Direct、Medscape DrugInfo、手検索、参考文献確認、AHFS First、Thomson Reuters Integrity または Conference Papers Index が必要であり、最小構成に MEDLINE は含まれなかったことが確認できます［2］。
        </p>
        <p>
          したがって、前回の記述は「チアゾリジン薬のケーススタディ」としては正しいですが、引用すべき論文は、フィルター性能論文ではなく、情報源の寄与を検討した Golder &amp; Loke 2012 Int J Technol Assess Health Care 論文です［2,3］。
        </p>
      </section>

      {/* 6. 公表データと未公表データ */}
      <section className="harms-section">
        <h3>6. 公表データと未公表データ：害は公表論文だけでは過小評価される</h3>
        <p>
          害の評価では、公表論文だけに依存すると過小評価が生じることがあります。Cochrane Handbook は、Golder らの研究を引用し、公表論文では有害事象データが不完全であること、未公表資料の方が詳細な害データを含むことが多いことを述べています［1,4］。
        </p>
        <p>
          Golder らの PLoS Medicine 2016 では、公表研究と未公表研究を比較した場合、<strong>公表研究では有害事象データの報告が中央値 43% であったのに対し、未公表研究では 83%</strong>でした［4］。また、同じ研究について公表版と未公表版を比較した場合、未公表版の方が有害事象データを含む割合が高く、<strong>公表版 46% に対して未公表版 95%</strong>でした［4］。したがって、診療ガイドラインで害が推奨判断に影響する場合、公表論文だけでなく、ClinicalTrials.gov、規制当局資料、臨床試験報告書、企業データなどを検討する必要があります［1,4,17］。
        </p>
        <p>
          Tang らは、ClinicalTrials.gov に重篤な有害事象が記載されていた 300 試験のうち、78 試験、すなわち 26% には対応する公表論文がなく、対応論文がある試験でも一部の論文では重篤な有害事象が記載されていなかったと報告しています［17］。これは、害の評価で臨床試験登録を確認する重要性を示しています［17］。
        </p>
      </section>

      {/* 7. 確認的・探索的・ハイブリッド */}
      <section className="harms-section">
        <h3>7. 害のレビューでは、確認的・探索的・ハイブリッドの方針を決める</h3>
        <p>
          Cochrane Handbook は、害のレビューのアプローチを、<strong>confirmatory（確認的）</strong>、<strong>exploratory（探索的）</strong>、<strong>hybrid（ハイブリッド）</strong>に分類しています［1］。
        </p>
        <p>
          確認的アプローチでは、あらかじめ特定の害を決めて検索・抽出します。たとえば、「抗凝固薬による大出血」「手術後の創部感染」「吸収性プレートによる神経障害」などです［1］。これは、臨床的に重要な害が事前に想定され、定義しやすい場合に適しています［1,10］。
        </p>
        <p>
          探索的アプローチでは、特定の害を事前に限定せず、介入に関連するあらゆる害を拾います［1］。未知の害や稀な害の検出に有用ですが、検索数が膨大になりやすく、抽出・統合も困難です［1,10］。
        </p>
        <p>
          ハイブリッドアプローチでは、重要な害をいくつか事前指定しつつ、その他の報告された有害事象も探索的に拾います［1］。診療ガイドライン作成では、実務上この方法が最も使いやすいことが多いです。たとえば、推奨判断に大きく関わる重篤な害を事前指定し、それ以外の害は表形式で整理する方法です［1,8,10］。
        </p>
      </section>

      {/* 8. 検索数が多すぎる場合 */}
      <section className="harms-section">
        <h3>8. 検索数が多すぎる場合の現実的対応</h3>
        <p>
          害の検索では、観察研究や症例報告まで含めると、検索数が数千件から数万件になることがあります。Golder、Peryer、Loke は、高感度検索は低精度になりやすく、1 件の適格研究を見つけるために大量の抄録や全文を確認する必要があると述べています［10］。したがって、診療ガイドラインでは、完全性と実行可能性のバランスをプロトコル段階で明示する必要があります［1,10,18］。
        </p>

        <h4>8.1 害の重要度を GRADE に従って分類する</h4>
        <p>
          まず、すべての害を同じ深さで扱うのではなく、GRADE に従ってアウトカムの重要度を分類します。GRADE では、アウトカムを「重大（critical）」「重要だが重大ではない（important but not critical）」「重要性が低い」に分類します［5,7］。害についても、推奨判断に影響する重篤な害、患者が重視する害、頻度が高い害を優先して検索・評価します［1,5,7］。
        </p>

        <h4>8.2 全害探索ではなくハイブリッド戦略を使う</h4>
        <p>
          検索数が多すぎる場合、すべての害を完全に探索するより、重大な害を事前指定して確認的に検索し、その他の害は既存 SR、RCT、規制情報、代表的観察研究から表形式で補足するハイブリッド戦略が現実的です［1,8,10］。
        </p>

        <h4>8.3 P を入れるかどうかを慎重に判断する</h4>
        <p>
          害のプロファイルが疾患を超えて共通すると考えられる場合、P を入れずに介入名中心で検索する方が包括的です［1］。たとえば、薬剤の出血リスクやデバイスの破損リスクは、複数疾患にまたがって評価した方がよい場合があります［1,10］。
        </p>
        <p>
          一方で、P を入れないと検索数が過大になる場合や、対象疾患・対象集団で害の発生機序が異なる場合は、P を入れて絞ることが妥当です［1,10］。ただし、P で絞ると、書誌情報に疾患名が出ていない研究を見逃す可能性があるため注意が必要です［10］。
        </p>

        <h4>8.4 研究デザインフィルターで絞りすぎない</h4>
        <p>
          害の検索で RCT フィルターのみを使うのは不十分ですが、観察研究フィルターも感度が低いことがあります［1,10］。観察研究の用語は cohort、case-control、registry、surveillance、postmarketing、case series など多様であり、検索式だけで完全に捕捉することは困難です［10］。検索数が許容できる場合は、研究デザインで強く絞らず、スクリーニングで判断する方が安全です［10］。
        </p>

        <h4>8.5 既存 SR・規制情報・引用検索を活用する</h4>
        <p>
          検索数が多すぎる場合は、既存 SR を利用して過去分をカバーし、既存 SR 以降を追加検索する方法が有効です［1,10,18］。ただし、既存 SR の検索式、検索日、適格基準、含まれた研究、害の抽出方法、バイアス評価を確認する必要があります［8,10,18］。
        </p>
        <p>
          また、害はデータベース検索だけでは漏れやすいため、主要論文の引用検索、参考文献確認、規制当局資料、ClinicalTrials.gov、著者照会を組み合わせることが推奨されます［1,10,17］。
        </p>
      </section>

      {/* 9. 検索式の基本構造 */}
      <section id="harms-methods" className="harms-section">
        <h3>9. 実際の検索式の基本構造</h3>
        <p>
          害検索は、1本の万能式ではなく、通常検索Aと害専用検索Bの2本立てにします。Aでは害語を付けず、通常の有効性検索で回収したRCT等から害も抽出します。Bでは同じ介入が別疾患で使われた安全性研究も拾うため、原則としてPを必須にしません［1,10］。
        </p>
        <CodeBlockWithCopy
          code={`検索A（通常検索）：
(P：対象疾患・対象患者) AND (I：介入)
※害語なし、研究デザイン制限なし

検索B（害専用）：
(I：介入) AND ((汎用害フィルター) OR (事前指定した具体的な害))
※原則Pなし、研究デザイン制限なし

必要な場合だけ最後に：
NOT (animals[mh] NOT humans[mh])`}
        />
        <p>
          疾患を限定しないBが大きすぎる場合に限りPを追加します。ただし、Pを必須にすると別適応で報告された同一介入の害を落とし得ます。<code>humans[mh]</code>単独制限は未索引の最新論文を落とすため使いません。
        </p>
        <p>
          診療ガイドラインでは、重大な害を事前指定するconfirmatory検索と、未知の害を探すexploratory検索を組み合わせるhybridが実用的です。汎用害語と具体的害語をORで組み合わせ、既知の重要文献が回収されるか確認します［1,10］。
        </p>
      </section>

      {/* 10. 汎用フィルター */}
      <section className="harms-section">
        <h3>10. 「全介入に万能な害フィルター」はない</h3>
        <p>
          薬剤、手術、医療機器では害の表現が異なります。薬剤用フィルターを非薬物介入へ転用すると性能が低下し、CADTH薬剤フィルターのMEDLINE相対再現率は薬剤88%に対し機器・手技67%でした［23］。介入種別が不明な場合だけ、次の一般語を出発点にします。
        </p>
        <CodeBlockWithCopy
          code={`(
  "adverse effects"[Subheading]
  OR "complications"[Subheading]
  OR "poisoning"[Subheading]
  OR "toxicity"[Subheading]
  OR "adverse effect*"[tiab]
  OR "adverse event*"[tiab]
  OR "adverse reaction*"[tiab]
  OR "side effect*"[tiab]
  OR harm*[tiab]
  OR safety[tiab]
  OR tolerability[tiab]
  OR toxic*[tiab]
  OR complication*[tiab]
)`}
        />
        <p>
          これは未検証の汎用fallbackです。検索数を減らすために先に研究デザインで絞るのではなく、介入固有の具体的害を追加し、既知重要論文の回収を確認します。<em>safety</em>や<em>risk</em>は“patient safety”“risk of bias”も拾うため、特に低精度です［10］。
        </p>
      </section>

      {/* 11. 薬剤の害 */}
      <section id="harms-by-intervention" className="harms-section">
        <h3>11. 薬剤の害検索</h3>
        <p>
          薬剤名は一般名、商品名、薬剤クラス名、略語を含めます。Golderらの更新フィルターはOvid MEDLINE検証セットで相対再現率90%、具体的害をOR追加すると92%でした。これは絶対感度でも、PubMed変換後の検証値でもありません［22］。
        </p>
        <h4>11.1 感度重視（薬剤・大量ノイズ）</h4>
        <CodeBlockWithCopy
          code={`(
  "adverse effects"[Subheading]
  OR safe*[tiab]
  OR "drug effects"[Subheading]
  OR adverse[tiab]
  OR "complications"[Subheading]
  OR "side effect*"[tiab]
  OR complication*[tiab]
  OR "chemically induced"[Subheading]
  OR tolerated[tiab]
  OR tolerance[tiab]
  OR harm*[tiab]
  OR toxicity[tiab]
  OR risk[Title]
  OR "Pregnancy Complications/drug therapy"[Mesh]
  OR "Clinical Trial, Phase IV"[Publication Type]
  OR "Drug Hypersensitivity"[Mesh]
  OR tolerability[tiab]
  OR "toxicity"[Subheading]
  OR "Toxicology"[Mesh]
  OR "drug induced"[tiab]
  OR "negative effects"[tiab]
)`}
        />
        <p>
          <code>safe*</code>、単独の<code>adverse</code>、<code>risk[Title]</code>、<code>"drug effects"[Subheading]</code>は特に低精度です。網羅性が必要な最終検索や、既知文献が実用型で漏れるときに使います［22］。
        </p>
        <h4>11.2 ノイズ抑制の実用型（更新後未検証）</h4>
        <CodeBlockWithCopy
          code={`(
  "Drug-Related Side Effects and Adverse Reactions"[Mesh]
  OR "Product Surveillance, Postmarketing"[Mesh]
  OR "Clinical Trial, Phase IV"[Publication Type]
  OR "Drug Hypersensitivity"[Mesh]
  OR "adverse effect*"[tiab]
  OR "adverse event*"[tiab]
  OR "adverse reaction*"[tiab]
  OR "side effect*"[tiab]
  OR safety[tiab]
  OR harm*[tiab]
  OR toxic*[tiab]
  OR tolerability[tiab]
  OR pharmacovigilance[tiab]
  OR postmarket*[tiab]
  OR "drug induced"[tiab]
  OR "treatment emergent"[tiab]
)`}
        />
        <p>
          実用型は低精度要因を減らしたアプリ独自の再構成で、感度・精度は未検証です。正式なガイドライン検索では感度重視式、具体的害、既知重要論文の回収確認を併用します。さらにEmbase、ClinicalTrials.gov、FDA・EMA・PMDA、臨床試験報告書等を確認します［1,4,10,17］。
        </p>
      </section>

      {/* 12. 外科的介入 */}
      <section className="harms-section">
        <h3>12. 外科的介入の害検索</h3>
        <p>
          外科的介入では、薬剤のような adverse drug reaction よりも、complication、postoperative complication、surgical wound infection、postoperative pain、mortality、reoperation などが重要になります［10,14］。
        </p>
        <p>
          Golder、Wright、Loke は、外科的介入の害フィルターを開発し、generic terms だけで MEDLINE の検証セットでは 87%、Embase の検証セットでは 92% の relative recall を示し、特定害語を追加すると MEDLINE 93%、Embase 95% まで改善し得ると報告しています［14］。ただし、開発・評価・検証セットで数値は変動し、MEDLINE では 86%、94%、87%、Embase では 88%、89%、92% でした［14］。したがって、実務上は「およそ 90% 前後」と表現するのが適切です［14］。
        </p>
        <p>PubMed 用の外科的介入向け実務例は以下です［14］。</p>
        <CodeBlockWithCopy
          code={`(
  complication*[tiab]
  OR "adverse effects"[Subheading]
  OR safe*[tiab]
  OR "complications"[Subheading]
  OR "Postoperative Complications"[Mesh]
)`}
        />
        <p>さらに術式に応じて以下を追加します［14］。</p>
        <CodeBlockWithCopy
          code={`(
  "Surgical Wound Infection"[Mesh]
  OR "Wound Dehiscence"[Mesh]
  OR "Pain, Postoperative"[Mesh]
  OR "Postoperative Hemorrhage"[Mesh]
  OR "Postoperative Nausea and Vomiting"[Mesh]
  OR wound infection*[tiab]
  OR surgical site infection*[tiab]
  OR postoperative pain[tiab]
  OR reoperation[tiab]
  OR readmission[tiab]
  OR mortality[tiab]
)`}
        />
        <p>
          外科系では、合併症が本文にしか出ないこともあり、検索フィルターだけで 100% を期待すべきではありません［14］。主要 SR の参考文献確認、引用検索、専門家確認が重要です［1,10,14］。
        </p>
      </section>

      {/* 13. 医療機器 */}
      <section className="harms-section">
        <h3>13. 医療機器の害検索</h3>
        <p>
          医療機器では、薬剤や手術と異なり、failure、malfunction、breakage、migration、loosening、removal、recall、device-related event などが重要になります［10,16］。Golder、Farrah、Mierzwinski-Urban らは、医療機器の害フィルターを開発し、generic terms だけで MEDLINE 84%、Embase 83% の relative recall、特定害語を追加すると 90% 以上に改善すると報告しています［16］。
        </p>
        <p>PubMed 用の実務例は以下です［16］。</p>
        <CodeBlockWithCopy
          code={`(
  complicat*[tiab]
  OR "adverse effects"[Subheading]
  OR "complications"[Subheading]
  OR safe*[tiab]
  OR safety[tiab]
  OR failure*[tiab]
  OR failed[tiab]
  OR malfunction*[tiab]
  OR breakag*[tiab]
  OR migration[tiab]
  OR loosen*[tiab]
  OR loosening[tiab]
  OR removal[tiab]
  OR displacement[tiab]
  OR discomfort[tiab]
  OR "device related"[tiab]
  OR "device-related"[tiab]
  OR recall*[tiab]
  OR "Equipment Failure"[Mesh]
  OR "Equipment Safety"[Mesh]
)`}
        />
        <p>
          医療機器では、デバイスの材料、留置部位、力学的特徴に応じて特定害語を追加する必要があります［16］。たとえば、ステントなら thrombosis、restenosis、migration、fracture、人工関節なら loosening、wear、dislocation、infection、プレートやスクリューなら loosening、breakage、malunion、nonunion、nerve injury などです［16］。
        </p>
      </section>

      {/* 14. 症例報告 */}
      <section className="harms-section">
        <h3>14. 症例報告を探す場合</h3>
        <p>
          症例報告は、未知または稀な害のシグナル検出に有用ですが、分母がないため発生率や相対リスクの推定には不向きです［1］。検索式では、以下のような語を補助的に使います。
        </p>
        <CodeBlockWithCopy
          code={`(
  "Case Reports"[Publication Type]
  OR case report[tiab]
  OR case reports[tiab]
  OR case series[tiab]
)`}
        />
        <p>
          ただし、症例報告まで含めると検索数が大きく増えるため、診療ガイドラインでは、重大で稀な害のシグナル確認に限定する、既存 SR・規制情報・添付文書で候補を絞ってから症例報告を探す、などの運用が現実的です［1,10］。
        </p>
      </section>

      {/* 15. 観察研究 */}
      <section className="harms-section">
        <h3>15. 観察研究を探す場合</h3>
        <p>
          観察研究を害検索に含める場合、単純な観察研究フィルターだけでは感度が低くなることがあります［10］。補助的には以下のような語を使用できます。
        </p>
        <CodeBlockWithCopy
          code={`(
  cohort[tiab]
  OR cohorts[tiab]
  OR "Cohort Studies"[Mesh]
  OR case-control[tiab]
  OR "Case-Control Studies"[Mesh]
  OR registry[tiab]
  OR registries[tiab]
  OR "Registries"[Mesh]
  OR observational[tiab]
  OR surveillance[tiab]
  OR postmarketing[tiab]
  OR post-marketing[tiab]
)`}
        />
        <p>
          しかし、害の研究デザイン用語は不統一であり、研究デザインフィルターで強く絞ると漏れが出る可能性があります［10］。検索数が許容できる場合は、研究デザインで絞らず、スクリーニングで判断する方が安全です［1,10］。
        </p>
      </section>

      {/* 16. メタ分析できない害 */}
      <section className="harms-section">
        <h3>16. メタ分析できない害も表にする</h3>
        <p>
          害は、定義、測定方法、追跡期間、重症度分類、報告単位が研究ごとに異なるため、メタ分析できないことが多いです［1,8,10］。しかし、メタ分析できないからといって、害を無視してよいわけではありません。PRISMA Harms は、各害の定義、測定方法、観察期間、ゼロイベントの扱い、因果関係評価を明示することを求めています［8］。
        </p>
        <p>
          Cochrane Handbook も、害が詳細に評価されていない場合に「安全」と書くのではなく、「害は評価されていない」と明示すべきとしています［1］。したがって、診療ガイドラインでは、メタ分析できない害であっても、研究ごとに表として整理し、EtD framework の「望ましくない効果」の判断に反映することが重要です［1,6–8］。
        </p>
      </section>

      {/* 17. ゼロイベント */}
      <section className="harms-section">
        <h3>17. ゼロイベントの扱いに注意する</h3>
        <p>
          害のレビューでは、「報告されていない」ことと「発生していない」ことを区別する必要があります。Cochrane Handbook は、ある害が本文や有害事象表に出てこない場合、それをゼロイベントとして抽出すべきではないとしています［1］。明確に「0 例」と記載されている場合でも、その害が能動的にモニタリングされたのか、単なる自発報告だったのかを確認する必要があります［1］。
        </p>
        <p>
          PRISMA Harms でも、ゼロイベントをどのように扱ったかを明示することが必須項目の一つです［8］。特に、重篤だが稀な害では、ゼロイベントの扱いが推定値や結論に大きく影響します［1,8］。
        </p>
      </section>

      {/* 18. 報告時 */}
      <section className="harms-section">
        <h3>18. 報告時に必ず記載すべきこと</h3>
        <p>
          PRISMA Harms では、害を扱うシステマティックレビューにおいて、少なくとも以下の 4 項目を追加的に報告すべきとされています［8］。
        </p>
        <ol>
          <li>タイトルで harms、adverse events、complications など、害を扱うことを明示する［8］。</li>
          <li>ゼロイベントをどのように扱ったかを明示する［8］。</li>
          <li>各害の定義、測定方法、観察期間を明示する［8］。</li>
          <li>因果関係評価を行った場合、その方法を明示する［8］。</li>
        </ol>
        <p>
          また、検索報告では、検索日、データベース、プラットフォーム、全検索式、使用したフィルター、期間制限、言語制限、未公表情報源、引用検索、著者照会の有無を明示する必要があります［8,10,18］。害の検索を益の検索と別に行った場合は、害の検索履歴を独立して報告すべきです［10］。
        </p>
      </section>

      {/* 19. 実務フロー */}
      <section id="harms-practical-flow" className="harms-section">
        <h3>19. 診療ガイドライン作成における実務フロー</h3>
        <p>診療ガイドライン作成では、以下の流れが実務的です。</p>
        <ol>
          <li>CQ と PICO を確認する［5–7］。</li>
          <li>害アウトカムを critical、important、limited importance に分類する［5,7］。</li>
          <li>確認的、探索的、ハイブリッドのどの害レビューにするかを決める［1］。</li>
          <li>既存 SR、添付文書、FDA、EMA、PMDA、ClinicalTrials.gov、主要 RCT、主要観察研究でスコーピングする［1,10,17］。</li>
          <li>検索A「P AND I（害語・デザイン制限なし）」と検索B「I AND（汎用害語 OR 具体的害）」を別々に作る［1,10］。</li>
          <li>薬剤・手術・医療機器に合う害フィルターを選び、具体的害のMeSH、旧称、略語、患者表現、検査値異常をOR追加する［14,16,22,23］。</li>
          <li>既知の重要文献が拾えるか確認し、検索式はPRESSで査読する［10,18］。</li>
          <li>検索数が多すぎる場合は、重大な害に限定する、具体的害を追加する、既存 SR 以降に限定する、規制情報を補助的に使うなど、実行可能性を考慮して調整する。先に研究デザインで絞らない［1,10,14,16］。</li>
          <li>メタ分析可能なら行い、困難なら表形式・ナラティブ統合を行う［1,8］。</li>
          <li>EtD framework の「望ましくない効果」に反映し、益とのバランスをパネルで判断する［6,7］。</li>
        </ol>
      </section>

      {/* 20. 最終まとめ */}
      <section className="harms-section">
        <h3>20. 最終まとめ</h3>
        <p>
          診療ガイドライン作成における害の検索は、推奨の方向と強さを左右する重要な作業です。GRADE アプローチと EtD framework では、望ましい効果と望ましくない効果のバランスが推奨判断の中心であり、害の検索が不十分であれば、介入の価値を過大評価する危険があります［5–7］。
        </p>
        <p>
          RCT は有効性評価には重要ですが、稀な害、長期的な害、実臨床の高リスク患者における害を十分に捉えられないことがあります［1,9,10］。したがって、害の検索では、必要に応じて観察研究、症例報告、レジストリ、市販後調査、臨床試験登録、規制当局情報、未公表データを組み合わせる必要があります［1,4,10,12,17］。
        </p>
        <p>
          一方で、観察研究や症例報告まで含めると検索数が膨大になりやすいため、確認的・探索的・ハイブリッドの方針を事前に決め、GRADE に基づいて重要な害を優先し、既存 SR、規制情報、特定害検索、引用検索を組み合わせることが現実的です［1,5,8,10］。
        </p>
        <p>
          害はメタ分析できないことも多いですが、表として整理すること自体が診療ガイドラインの推奨判断に有用です［1,8］。「害が報告されていない」ことを「安全」と解釈してはいけません。害が評価されていないなら、「害は評価されていない」と明示することが、透明性の高い診療ガイドライン作成に不可欠です［1,8］。
        </p>
      </section>

      {/* 21. 害の報告がありそうなのに見つからない場合 */}
      <section id="harms-missing-signals" className="harms-section harms-section-spotlight">
        <h3>21. 害の報告が「ありそうなのに見つからない」場合</h3>
        <p>
          自由診療で行われている治療、たとえば高濃度ビタミンC点滴や、標準治療として有効性・安全性が十分に確立していないがん免疫療法などでは、医療者の間で「効果が乏しい可能性が高い」「患者に不利益を与える可能性がある」と認識されていても、学術論文として明確な「害」の報告が見つからないことがあります。
        </p>
        <p>
          しかし、論文として害が報告されていないことは、「害がない」ことを意味しません。これは、害のシステマティックレビューを行う際に非常に重要な点です。Cochrane Handbook でも、有害事象は研究ごとに定義、測定方法、観察期間、報告の仕方が大きく異なり、しばしば十分に報告されないことが指摘されています。また、PRISMA Harms や CONSORT Harms でも、害の報告が不十分であることが、利益と害のバランスを誤って評価する原因になるとされています。
        </p>
        <p>
          害の報告が論文として出にくい理由はいくつかあります。第一に、その害がすでに医療者の間で「常識的なリスク」と見なされており、あえて症例報告や研究として発表されない場合があります。第二に、治療そのものに直接的な毒性が少ない場合でも、標準治療を受ける機会を遅らせる、または失わせるという「間接的な害」が生じることがあります。がん領域では、補完代替医療を選択した患者が標準的ながん治療を拒否または遅延し、その結果として死亡リスクが高くなる可能性が報告されています。つまり、薬剤や点滴そのものの副作用が少なくても、「有効な治療を受ける機会を失うこと」自体が重大な害になり得ます。
        </p>
        <p>
          第三に、自由診療では診療内容や有害事象が研究データベースや臨床試験登録に体系的に記録されていないことが多く、分母、つまり何人がその治療を受けたのかが分からない場合があります。そのため、害が起きても頻度を推定しにくく、症例報告にもつながりにくいという問題があります。第四に、患者の同意が得られない、個人が特定されやすい、経過が複雑で因果関係を明確にしにくい、といった理由で論文化されない場合もあります。さらに、重篤な被害が生じた場合には、訴訟や紛争の対象となり、医療機関や関係者が詳細を公表しにくくなることもあります。
        </p>
        <p>
          高濃度ビタミンC点滴についても、すべての患者に明らかな毒性が出るわけではありませんが、腎障害やシュウ酸腎症などの症例報告があり、腎機能障害のある患者などでは注意が必要です。また、がん治療との相互作用や、標準治療の代替として用いられることによる治療機会の喪失も問題になります。したがって、「副作用報告が少ない」ことをもって安全と判断するのではなく、直接的な副作用、標準治療の遅れ、経済的負担、患者の意思決定への影響を含めて、広く害を評価する必要があります。
        </p>
        <p>
          このような状況では、システマティックレビューや診療ガイドライン作成において、RCT だけに依存することは不十分です。RCT は有効性の評価には重要ですが、まれな害、長期的な害、自由診療や実臨床で起こる害、標準治療の遅延による害を十分に把握できないことがあります。そのため、観察研究、症例報告、症例集積、規制当局情報、医療安全情報、裁判例や行政資料、患者団体からの情報なども、必要に応じて探索することが重要です。
        </p>

        <div className="harms-spotlight-summary">
          要するに、害の報告が見つからない場合には、「害がない」と考えるのではなく、
          <ol>
            <li>本当に害がないのか、</li>
            <li>害はあるが論文化されていないのか、</li>
            <li>直接的な副作用ではなく標準治療の遅れなどの間接的な害なのか、</li>
            <li>自由診療のためデータが体系的に収集されていないのか</li>
          </ol>
          を慎重に検討する必要があります。
        </div>

        <p>
          診療ガイドラインでは、介入の利益だけでなく害も評価し、そのバランスに基づいて推奨を決めます。GRADE アプローチでも、推奨の強さは望ましい効果と望ましくない効果のバランス、エビデンスの確実性、患者の価値観、資源利用などを踏まえて判断します。したがって、学術論文に害の報告が少ない治療ほど、「害がない」と結論づけるのではなく、<strong>「害に関するエビデンスが不足している」と明確に記載することが重要</strong>です。
        </p>

        <h4>参考文献・参考情報（このセクション独自）</h4>
        <ol className="harms-spotlight-references">
          <li>
            Cochrane Handbook for Systematic Reviews of Interventions, Chapter 19: Adverse effects.{" "}
            <a
              href="https://www.cochrane.org/authors/handbooks-and-manuals/handbook/current/chapter-19"
              target="_blank"
              rel="noreferrer"
            >
              cochrane.org/handbook/current/chapter-19
            </a>
          </li>
          <li>
            Zorzela L, et al. PRISMA harms checklist: improving harms reporting in systematic reviews. <em>BMJ</em>. 2016;352:i157.{" "}
            <a href="https://www.bmj.com/content/352/bmj.i157" target="_blank" rel="noreferrer">
              bmj.com/content/352/bmj.i157
            </a>
          </li>
          <li>
            Junqueira DR, et al. CONSORT Harms 2022 statement, explanation, and elaboration: updated guideline for the reporting of harms in randomized trials. <em>BMJ</em>. 2023;381:e073725.{" "}
            <a href="https://www.bmj.com/content/381/bmj-2022-073725" target="_blank" rel="noreferrer">
              bmj.com/content/381/bmj-2022-073725
            </a>
          </li>
          <li>
            Johnson SB, et al. Complementary Medicine, Refusal of Conventional Cancer Therapy, and Survival Among Patients With Curable Cancers. <em>JAMA Oncology</em>. 2018;4(10):1375–1381.{" "}
            <a href="https://pmc.ncbi.nlm.nih.gov/articles/PMC6233773/" target="_blank" rel="noreferrer">
              PMC6233773
            </a>
          </li>
          <li>
            National Cancer Institute. Intravenous Vitamin C (PDQ®).{" "}
            <a
              href="https://www.cancer.gov/about-cancer/treatment/cam/hp/vitamin-c-pdq"
              target="_blank"
              rel="noreferrer"
            >
              cancer.gov/.../vitamin-c-pdq
            </a>
          </li>
          <li>
            Cossey LN, et al. Oxalate Nephropathy and Intravenous Vitamin C. <em>American Journal of Kidney Diseases</em>. 2013;61(6):1032–1035. 関連症例報告例：{" "}
            <a href="https://pmc.ncbi.nlm.nih.gov/articles/PMC7363608/" target="_blank" rel="noreferrer">
              PMC7363608
            </a>
          </li>
        </ol>
      </section>

      {/* 参考文献 */}
      <section id="harms-references" className="harms-section harms-references">
        <h3>参考文献</h3>
        <ol className="harms-reference-list">
          <li>
            Peryer G, Golder S, Junqueira DR, Vohra S, Loke YK. Chapter 19: Adverse effects. In: Higgins JPT, Thomas J, Chandler J, Cumpston M, Li T, Page MJ, et al, editors. <em>Cochrane Handbook for Systematic Reviews of Interventions, version 6.5</em>. Cochrane, 2024. Available from:{" "}
            <a href="https://www.cochrane.org/authors/handbooks-and-manuals/handbook/current/chapter-19" target="_blank" rel="noreferrer">
              cochrane.org/handbook/current/chapter-19
            </a>
          </li>
          <li>
            Golder S, Loke YK. The contribution of different information sources for adverse effects data. <em>International Journal of Technology Assessment in Health Care</em>. 2012;28(2):133–137. doi:10.1017/S0266462312000128.{" "}
            <a href="https://pubmed.ncbi.nlm.nih.gov/22559754/" target="_blank" rel="noreferrer">
              PMID: 22559754
            </a>
          </li>
          <li>
            Golder S, Loke YK. Sensitivity and precision of adverse effects search filters in MEDLINE and EMBASE: a case study of fractures with thiazolidinediones. <em>Health Information and Libraries Journal</em>. 2012;29(1):28–38. doi:10.1111/j.1471-1842.2011.00972.x.{" "}
            <a href="https://pubmed.ncbi.nlm.nih.gov/22335287/" target="_blank" rel="noreferrer">
              PMID: 22335287
            </a>
          </li>
          <li>
            Golder S, Loke YK, Wright K, Norman G. Reporting of adverse events in published and unpublished studies of health care interventions: a systematic review. <em>PLoS Medicine</em>. 2016;13(9):e1002127. doi:10.1371/journal.pmed.1002127.
          </li>
          <li>
            Atkins D, Best D, Briss PA, Eccles M, Falck-Ytter Y, Flottorp S, Guyatt GH, Harbour RT, Haugh MC, Henry D, Hill S, Jaeschke R, Leng G, Liberati A, Magrini N, Mason J, Middleton P, Mrukowicz J, O'Connell D, Oxman AD, Phillips B, Schünemann HJ, Edejer TT, Varonen H, Vist GE, Williams JW Jr, Zaza S; GRADE Working Group. Grading quality of evidence and strength of recommendations. <em>BMJ</em>. 2004;328(7454):1490. doi:10.1136/bmj.328.7454.1490.
          </li>
          <li>
            Alonso-Coello P, Schünemann HJ, Moberg J, Brignardello-Petersen R, Akl EA, Davoli M, et al. GRADE Evidence to Decision frameworks: a systematic and transparent approach to making well informed healthcare choices. 1: Introduction. <em>BMJ</em>. 2016;353:i2016. doi:10.1136/bmj.i2016.
          </li>
          <li>
            Moberg J, Oxman AD, Rosenbaum S, Schünemann HJ, Guyatt G, Flottorp S, et al. The GRADE Evidence to Decision framework for health system and public health decisions. <em>Health Research Policy and Systems</em>. 2018;16:45. doi:10.1186/s12961-018-0320-2.
          </li>
          <li>
            Zorzela L, Loke YK, Ioannidis JPA, Golder S, Santaguida P, Altman DG, Moher D, Vohra S; PRISMA Harms Group. PRISMA harms checklist: improving harms reporting in systematic reviews. <em>BMJ</em>. 2016;352:i157. doi:10.1136/bmj.i157.{" "}
            <a href="https://pubmed.ncbi.nlm.nih.gov/26830668/" target="_blank" rel="noreferrer">
              PMID: 26830668
            </a>
          </li>
          <li>
            Junqueira DR, Zorzela L, Golder S, Loke Y, Gagnier JJ, Julious SA, Li T, Mayo-Wilson E, Pham B, Phillips R, Santaguida P, Scherer RW, Gøtzsche PC, Moher D, Ioannidis JPA, Vohra S; CONSORT Harms Group. CONSORT Harms 2022 statement, explanation, and elaboration: updated guideline for the reporting of harms in randomised trials. <em>BMJ</em>. 2023;381:e073725. doi:10.1136/bmj-2022-073725.{" "}
            <a href="https://pubmed.ncbi.nlm.nih.gov/37094878/" target="_blank" rel="noreferrer">
              PMID: 37094878
            </a>
          </li>
          <li>
            Golder S, Peryer G, Loke YK. Overview: comprehensive and carefully constructed strategies are required when conducting searches for adverse effects data. <em>Journal of Clinical Epidemiology</em>. 2019;113:36–43. doi:10.1016/j.jclinepi.2019.05.019.
          </li>
          <li>
            Loke YK, Mattishent K. If nothing happens, is everything all right? Distinguishing genuine reassurance from a false sense of security. <em>CMAJ</em>. 2015;187(1):15–16. doi:10.1503/cmaj.141344.
          </li>
          <li>
            Loke YK, Golder SP, Vandenbroucke JP. Comprehensive evaluations of the adverse effects of drugs: importance of appropriate study selection and data sources. <em>Therapeutic Advances in Drug Safety</em>. 2011;2(2):59–68. doi:10.1177/2042098611401129.
          </li>
          <li>
            Schünemann HJ, Cuello C, Akl EA, Mustafa RA, Meerpohl JJ, Thayer K, et al. GRADE guidelines: 18. How ROBINS-I and other tools to assess risk of bias in nonrandomized studies should be used to rate the certainty of a body of evidence. <em>Journal of Clinical Epidemiology</em>. 2019;111:105–114. doi:10.1016/j.jclinepi.2018.01.012.{" "}
            <a href="https://pubmed.ncbi.nlm.nih.gov/29432858/" target="_blank" rel="noreferrer">
              PMID: 29432858
            </a>
          </li>
          <li>
            Golder S, Wright K, Loke YK. The development of search filters for adverse effects of surgical interventions in MEDLINE and Embase. <em>Health Information and Libraries Journal</em>. 2018;35(2):121–129. doi:10.1111/hir.12213.
          </li>
          <li>
            Golder S, Loke YK. The performance of adverse effects search filters in MEDLINE and EMBASE. <em>Health Information and Libraries Journal</em>. 2012;29(2):141–151. doi:10.1111/j.1471-1842.2012.00980.x.{" "}
            <a href="https://pubmed.ncbi.nlm.nih.gov/22630362/" target="_blank" rel="noreferrer">
              PMID: 22630362
            </a>
          </li>
          <li>
            Golder S, Farrah K, Mierzwinski-Urban M, Wright K, Loke YK. The development of search filters for adverse effects of medical devices in MEDLINE and Embase. <em>Health Information and Libraries Journal</em>. 2019;36(3):244–263. doi:10.1111/hir.12260.
          </li>
          <li>
            Tang E, Ravaud P, Riveros C, Perrodeau E, Dechartres A. Comparison of serious adverse events posted at ClinicalTrials.gov and published in corresponding journal articles. <em>BMC Medicine</em>. 2015;13:189. doi:10.1186/s12916-015-0430-4.{" "}
            <a href="https://pubmed.ncbi.nlm.nih.gov/26269118/" target="_blank" rel="noreferrer">
              PMID: 26269118
            </a>
          </li>
          <li>
            McGowan J, Sampson M, Salzwedel DM, Cogo E, Foerster V, Lefebvre C. PRESS Peer Review of Electronic Search Strategies: 2015 guideline statement. <em>Journal of Clinical Epidemiology</em>. 2016;75:40–46. doi:10.1016/j.jclinepi.2016.01.021.
          </li>
          <li>
            Golder S, McIntosh HM, Duffy S, Glanville J. Developing efficient search strategies to identify reports of adverse effects in MEDLINE and EMBASE. <em>Health Information and Libraries Journal</em>. 2006;23(1):3–12. doi:10.1111/j.1471-1842.2006.00634.x.
          </li>
          <li>
            InterTASC Information Specialists' Sub-Group. ISSG Search Filter Resource: Adverse effects. Available from:{" "}
            <a href="https://sites.google.com/a/york.ac.uk/issg-search-filters-resource/home/adverse-effects" target="_blank" rel="noreferrer">
              ISSG Search Filters Resource (Adverse effects)
            </a>
          </li>
          <li>
            Schünemann H, Brożek J, Guyatt G, Oxman A, editors. <em>GRADE Handbook for grading quality of evidence and strength of recommendations</em>. GRADE Working Group. Updated 2013. Available from:{" "}
            <a href="https://gradepro.org/handbook/" target="_blank" rel="noreferrer">
              gradepro.org/handbook
            </a>
          </li>
          <li>
            Golder S, Farrah K, Mierzwinski-Urban M, Barker B, Rama A. Updated generic search filters for finding studies of adverse drug effects in Ovid MEDLINE and Embase may retrieve up to 90% of relevant studies. <em>Health Information &amp; Libraries Journal</em>. 2023;40(2):190–200. doi:10.1111/hir.12441.{" "}
            <a href="https://eprints.whiterose.ac.uk/id/eprint/185209/" target="_blank" rel="noreferrer">
              Open access manuscript
            </a>
          </li>
          <li>
            Farrah K, Mierzwinski-Urban M, Cimon K. Effectiveness of adverse effects search filters: drugs versus medical devices. <em>Journal of the Medical Library Association</em>. 2016;104(3):221–225. doi:10.3163/1536-5050.104.3.007.{" "}
            <a href="https://pmc.ncbi.nlm.nih.gov/articles/PMC4915640/" target="_blank" rel="noreferrer">
              PMC4915640
            </a>
          </li>
        </ol>
      </section>
    </div>
  );
}
