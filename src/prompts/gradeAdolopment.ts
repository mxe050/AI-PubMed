export const gradePromptMap: Record<string, string> = {
  source_guideline: `あなたは、GRADE-ADOLOPMENT、診療ガイドライン作成、既存ガイドライン評価に精通した医学情報専門家です。

目的：
以下の優先臨床疑問について、既存の信頼できるsource guidelineを探すための検索戦略を作成してください。

重要：
- いきなり一次研究検索を行わないでください。
- まず既存ガイドライン、既存推奨、既存EtD、Evidence profile、Summary of Findingsの有無を確認してください。
- PubMed検索式内の検索語は英語のみを使用してください。
- 検索式には[mh]、[tiab]、[pt]、[dp]などのフィールドタグを付けてください。

入力：
Guideline topic：{{guidelineTopic}}
Prioritized question：{{prioritizedQuestion}}
P：{{p}}
I / Option：{{i}}
C / Comparator：{{c}}
O / Outcomes：{{o}}
Setting：{{setting}}
Perspective：{{perspective}}
Target context：{{targetContext}}

出力：
# 1. PICOとsource guideline探索方針
# 2. 探すべきsource guidelineの条件
# 3. 推奨する検索先
# 4. PubMed用source guideline検索式
# 5. ガイドライン候補を評価する抽出項目
# 6. 次の判断`,

  existing_sr: `あなたは、GRADE-ADOLOPMENTとシステマティックレビュー検索に精通した医学情報専門家です。

目的：
以下の優先臨床疑問について、既存のシステマティックレビュー、メタ解析、HTAを探すためのPubMed検索戦略を作成してください。

重要：
- 既存の信頼できるSRがあれば、de novo SRではなく更新検索で済む可能性があります。
- 検索式内の検索語は英語のみを使用してください。
- PubMed検索式には[mh]、[tiab]、[pt]、[sb]、[dp]などのフィールドタグを付けてください。
- 既存SRの信頼性評価にはAMSTAR 2またはROBISを想定してください。

入力：
Guideline topic：{{guidelineTopic}}
Prioritized question：{{prioritizedQuestion}}
P：{{p}}
I / Option：{{i}}
C / Comparator：{{c}}
O / Outcomes：{{o}}

出力：
# 1. 既存SR探索方針
# 2. 検索概念
# 3. PubMed用既存SR検索式：高感度版
# 4. PubMed用既存SR検索式：推奨バランス版
# 5. 既存SRを評価する抽出項目
# 6. 次の判断`,

  update_search: `あなたは、既存システマティックレビューの更新検索に精通した医学情報専門家です。

目的：
既存SRの最終検索日以降に発表された一次研究をPubMedで検索するためのupdate search戦略を作成してください。

入力：
Prioritized question：{{prioritizedQuestion}}
P：{{p}}
I / Option：{{i}}
C / Comparator：{{c}}
O / Outcomes：{{o}}
既存SRの最終検索日：{{lastSearchDate}}
既存SRの検索式：{{originalSearchString}}

出力：
# 1. 更新検索の方針
# 2. 既存SR検索式を利用できるかの判断
# 3. PubMed用update search：高感度版
# 4. PubMed用update search：推奨バランス版
# 5. 日付制限の扱い
# 6. 既知PMIDによる検証
# 7. 注意点`,

  de_novo: `あなたは、GRADEに基づくde novo evidence synthesisのためのPubMed検索戦略を作成する医学情報専門家です。

目的：
既存の信頼できるsource guidelineまたは既存SRが利用できない場合に、de novoで効果・有害性に関する一次研究を検索するためのPubMed検索式を作成してください。

重要：
- 通常のSR検索として設計してください。
- Outcomeは原則として検索式に含めないでください。
- Comparisonは、含めることで感度が低下する場合は含めないでください。
- 最終検索式には NOT (animals[mh] NOT humans[mh]) を含めてください。

入力：
Prioritized question：{{prioritizedQuestion}}
P：{{p}}
I / Option：{{i}}
C / Comparator：{{c}}
O / Outcomes：{{o}}

出力：
# 1. de novo SRが必要となる理由
# 2. 検索概念マップ
# 3. MeSH・自由語候補表
# 4. 高感度検索式
# 5. 推奨バランス検索式
# 6. ノイズ低減検索式
# 7. 研究デザインフィルター案
# 8. PRESS風セルフチェック
# 9. 最初に実行すべき検索式`,

  etd_supplemental: `あなたは、GRADE Evidence to Decision frameworkを完成させるための補助的文献検索に精通した医学情報専門家です。

目的：
以下の優先臨床疑問について、EtD項目「{{etdCriterion}}」を埋めるためのPubMed検索戦略を作成してください。

重要：
- これは効果推定のための通常のSR検索ではありません。
- EtD判断に必要な補助エビデンスを探す検索です。
- 検索式内の検索語は英語のみを使用してください。

入力：
Prioritized question：{{prioritizedQuestion}}
P：{{p}}
I / Option：{{i}}
C / Comparator：{{c}}
O / Outcomes：{{o}}
Setting：{{setting}}
Perspective：{{perspective}}
Target context：{{targetContext}}
EtD項目：{{etdCriterion}}

出力：
# 1. このEtD項目で必要な情報
# 2. 検索概念
# 3. PubMed検索式：広め
# 4. PubMed検索式：推奨
# 5. PubMed以外に確認すべき情報源
# 6. 抽出すべき情報項目
# 7. EtD判断にどう使うか`,

  adopt_adapt_denovo: `あなたは、GRADE-ADOLOPMENTに基づく推奨作成に精通した方法論専門家です。

目的：
以下の優先臨床疑問について、既存のsource guidelineまたは既存SRを利用して、推奨をadopt、adapt、またはde novo developmentすべきかを判断するための整理を行ってください。

入力：
Prioritized question：{{prioritizedQuestion}}
P：{{p}}
I / Option：{{i}}
C / Comparator：{{c}}
O / Outcomes：{{o}}
Setting：{{setting}}
Perspective：{{perspective}}
Target context：{{targetContext}}
Source guideline情報：{{sourceGuidelineInfo}}
既存SR情報：{{existingSrInfo}}
EtD補助検索結果：{{etdSupplementalInfo}}

出力：
# 1. PICO一致度評価
# 2. Source guidelineの信頼性評価
# 3. EtD criteriaごとの再判断
# 4. 推奨される方針
Adopt、Adapt、De novo development、判断保留のいずれかを選んでください。
# 5. 判断理由
# 6. 追加で必要な検索
# 7. 次に作成すべき検索式またはEtD項目`,
};

export type GradeSubStrategy = keyof typeof gradePromptMap;

export const gradeSubStrategies: {
  key: GradeSubStrategy;
  label: string;
  description: string;
}[] = [
  {
    key: "source_guideline",
    label: "Source guideline search",
    description: "既存の信頼できるガイドラインを探す",
  },
  {
    key: "existing_sr",
    label: "Existing SR search",
    description: "既存のシステマティックレビューを探す",
  },
  {
    key: "update_search",
    label: "Update search",
    description: "既存SRの更新検索を行う",
  },
  {
    key: "de_novo",
    label: "De novo evidence search",
    description: "新規に一次研究を検索する",
  },
  {
    key: "etd_supplemental",
    label: "EtD supplemental search",
    description: "EtD項目を埋めるための補助検索",
  },
  {
    key: "adopt_adapt_denovo",
    label: "Adopt / Adapt / De novo decision",
    description: "推奨の採用・適応・新規作成を判断する",
  },
];

export const gradeCommonFields = [
  {
    key: "guidelineTopic",
    label: "Guideline topic",
    required: true,
    multiline: false,
  },
  {
    key: "prioritizedQuestion",
    label: "Prioritized question",
    required: true,
    multiline: true,
  },
  { key: "p", label: "P（対象）", required: true, multiline: true },
  {
    key: "i",
    label: "I / Option（介入・選択肢）",
    required: true,
    multiline: true,
  },
  {
    key: "c",
    label: "C / Comparator（比較対照）",
    required: false,
    multiline: true,
  },
  {
    key: "o",
    label: "O / Outcomes（アウトカム）",
    required: false,
    multiline: true,
  },
  { key: "setting", label: "Setting", required: false, multiline: false },
  {
    key: "perspective",
    label: "Perspective",
    required: false,
    multiline: false,
  },
  {
    key: "targetContext",
    label: "Target context",
    required: false,
    multiline: true,
  },
];

export const gradeExtraFields: Record<
  string,
  { key: string; label: string; required: boolean; multiline: boolean }[]
> = {
  update_search: [
    {
      key: "lastSearchDate",
      label: "既存SRの最終検索日",
      required: true,
      multiline: false,
    },
    {
      key: "originalSearchString",
      label: "既存SRの検索式",
      required: true,
      multiline: true,
    },
  ],
  etd_supplemental: [
    {
      key: "etdCriterion",
      label: "EtD項目",
      required: true,
      multiline: false,
    },
  ],
  adopt_adapt_denovo: [
    {
      key: "sourceGuidelineInfo",
      label: "Source guideline情報",
      required: false,
      multiline: true,
    },
    {
      key: "existingSrInfo",
      label: "既存SR情報",
      required: false,
      multiline: true,
    },
    {
      key: "etdSupplementalInfo",
      label: "EtD補助検索結果",
      required: false,
      multiline: true,
    },
  ],
};
