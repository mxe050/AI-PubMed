const commonHeader = `あなたは、GRADE-ADOLOPMENT、診療ガイドライン作成、既存ガイドライン評価に精通した医学情報専門家です。

ユーザーから、ガイドライン作成に関する疑問が漠然と提示されています。
ユーザーは必ずしもPICOやprioritized questionに整理できているとは限りません。
あなたの役割は、漠然とした疑問を想定で補い、PICO化したうえで検索戦略を作ることです。

重要：
- ユーザーが書いていない要素は、あなたが想定で埋めて構いません。「想定」と明記してください。
- 質問返しではなく、まず案を提示してください。確認したい点は末尾に1〜3個まで。
- PubMed検索式内の検索語は英語のみを使用してください。
- 検索式には[mh]、[tiab]、[pt]、[dp]などのフィールドタグを付けてください。
- 実在が不確かなMeSHは「候補・要確認」とし、最終検索式には含めないでください。

ユーザーの疑問（漠然としていてもOK）：
{{question}}

補助メモ（任意・空欄可）：
{{notes}}
`;

const picoBlock = `
# 1. 疑問の解釈とPICOへの分解
ユーザーの疑問をどう解釈したかを述べ、Guideline topic、Prioritized question、PICO、Setting、Perspective、Target contextを表で示してください。
ユーザーが書いていない部分は「想定」と明記して埋めてください。

| 要素 | 内容 | ユーザー記載 / AI想定 |
|---|---|---|
| Guideline topic |  |  |
| Prioritized question |  |  |
| P |  |  |
| I / Option |  |  |
| C / Comparator |  |  |
| O / Outcomes |  |  |
| Setting |  |  |
| Perspective |  |  |
| Target context |  |  |
`;

const tailBlock = `
# 最後に：ユーザーに確認したい点（任意）
想定で埋めた部分のうち、ユーザーに確認すべき重要な点があれば1〜3個までに絞って列挙してください。なければ省略可。
`;

export const gradePromptMap: Record<string, string> = {
  source_guideline:
    commonHeader +
    picoBlock +
    `
目的：既存の信頼できるsource guidelineを探すための検索戦略を作成してください。
- いきなり一次研究検索を行わないでください。
- まず既存ガイドライン、既存推奨、既存EtD、Evidence profile、Summary of Findingsの有無を確認してください。

# 2. Source guideline探索方針
# 3. 探すべきsource guidelineの条件
# 4. 推奨する検索先（PubMed以外も含む）
# 5. PubMed用source guideline検索式
\`\`\`text
ここに一文検索式
\`\`\`
# 6. ガイドライン候補を評価する抽出項目
# 7. 次の判断
` +
    tailBlock,

  existing_sr:
    commonHeader +
    picoBlock +
    `
目的：既存のシステマティックレビュー、メタ解析、HTAを探すためのPubMed検索戦略を作成してください。
- 既存の信頼できるSRがあれば、de novo SRではなく更新検索で済む可能性があります。
- 既存SRの信頼性評価にはAMSTAR 2またはROBISを想定してください。

# 2. 既存SR探索方針
# 3. 検索概念
# 4. PubMed用既存SR検索式：高感度版
\`\`\`text
ここに一文検索式
\`\`\`
# 5. PubMed用既存SR検索式：推奨バランス版
\`\`\`text
ここに一文検索式
\`\`\`
# 6. 既存SRを評価する抽出項目
# 7. 次の判断
` +
    tailBlock,

  update_search:
    commonHeader +
    picoBlock +
    `
目的：既存SRの最終検索日以降に発表された一次研究をPubMedで検索するためのupdate search戦略を作成してください。

補足情報（ユーザー記載があれば使用、なければ想定で進める）：
- 既存SRの最終検索日：補助メモに記載があれば使用
- 既存SRの検索式：補助メモに記載があれば使用

# 2. 更新検索の方針
# 3. 既存SR検索式を利用できるかの判断
# 4. PubMed用update search：高感度版
\`\`\`text
ここに一文検索式
\`\`\`
# 5. PubMed用update search：推奨バランス版
\`\`\`text
ここに一文検索式
\`\`\`
# 6. 日付制限の扱い
# 7. 既知PMIDによる検証
# 8. 注意点
` +
    tailBlock,

  de_novo:
    commonHeader +
    picoBlock +
    `
目的：既存の信頼できるsource guidelineまたは既存SRが利用できない場合に、de novoで効果・有害性に関する一次研究を検索するためのPubMed検索式を作成してください。

重要：
- 通常のSR検索として設計してください。
- Outcomeは原則として検索式に含めないでください。
- Comparisonは、含めることで感度が低下する場合は含めないでください。
- 最終検索式には NOT (animals[mh] NOT humans[mh]) を含めてください。

# 2. de novo SRが必要となる理由
# 3. 検索概念マップ
# 4. MeSH・自由語候補表
# 5. 高感度検索式
\`\`\`text
ここに一文検索式
\`\`\`
# 6. 推奨バランス検索式
\`\`\`text
ここに一文検索式
\`\`\`
# 7. ノイズ低減検索式
\`\`\`text
ここに一文検索式
\`\`\`
# 8. 研究デザインフィルター案
# 9. PRESS風セルフチェック
# 10. 最初に実行すべき検索式
` +
    tailBlock,

  etd_supplemental:
    commonHeader +
    picoBlock +
    `
目的：EtD（Evidence to Decision）項目を埋めるためのPubMed補助検索戦略を作成してください。
これは効果推定のための通常のSR検索ではなく、EtD判断に必要な補助エビデンスを探す検索です。

EtD項目（補助メモに記載があれば使用、なければProblem / Values / Resource use / Equity / Acceptability / Feasibilityのうち最も関連が高いものを選んでください）。

# 2. このEtD項目で必要な情報
# 3. 検索概念
# 4. PubMed検索式：広め
\`\`\`text
ここに一文検索式
\`\`\`
# 5. PubMed検索式：推奨
\`\`\`text
ここに一文検索式
\`\`\`
# 6. PubMed以外に確認すべき情報源
# 7. 抽出すべき情報項目
# 8. EtD判断にどう使うか
` +
    tailBlock,

  adopt_adapt_denovo:
    commonHeader +
    picoBlock +
    `
目的：既存のsource guidelineまたは既存SRを利用して、推奨をadopt、adapt、またはde novo developmentすべきかを判断するための整理を行ってください。

補足情報（補助メモに記載があれば使用、なければ「未提供」として想定で進める）：
- Source guideline情報
- 既存SR情報
- EtD補助検索結果

# 2. PICO一致度評価
# 3. Source guidelineの信頼性評価
# 4. EtD criteriaごとの再判断
# 5. 推奨される方針
Adopt、Adapt、De novo development、判断保留のいずれかを選んでください。
# 6. 判断理由
# 7. 追加で必要な検索
# 8. 次に作成すべき検索式またはEtD項目
` +
    tailBlock,
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

export const gradeFields = [
  {
    key: "question",
    label: "ガイドラインに関する疑問（漠然としていてOK）",
    required: true,
    multiline: true,
    placeholder:
      "例：成人の高血圧に対する塩分制限の推奨を、既存ガイドラインから採用できるか検討したい",
  },
  {
    key: "notes",
    label: "補助メモ（任意・空欄でOK）",
    required: false,
    multiline: true,
    placeholder:
      "対象、設定、知っている既存ガイドライン、既存SR、最終検索日、EtD項目など、思いつくことがあれば自由記述。空欄でも構いません。",
  },
];
