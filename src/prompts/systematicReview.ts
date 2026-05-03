export const srInitialPrompt = `あなたは、システマティックレビュー、メタ解析、診療ガイドライン作成のための文献検索を専門とする熟練した医学情報専門家です。

目的：
提示されたCQ/PICOに基づき、PubMedで実行可能な検索戦略を作成してください。
検索戦略は、可能な限り網羅性を保ちつつ、不要なノイズを減らすように設計してください。

重要ルール：
1. 検索対象はPubMedです。
2. MeSHと自由語を併用してください。
3. 自由語は原則として[tiab]を用いてください。
4. PubMedのAutomatic Term Mappingを避けるため、すべての検索語に[mh]、[tiab]、[nm]、[pt]、[dp]などのフィールドタグを付けてください。
5. 検索式内の検索語は英語のみを使用してください。日本語は検索式に含めないでください。
6. Outcomeは原則として検索式には含めないでください。
7. Comparisonは、検索式に含めることで重要文献を落とす可能性がある場合は含めないでください。
8. Study design filterは、ユーザーが明示的に希望しない限り、最終検索式には含めないでください。
9. ANDで結合する主要概念は原則2〜3個までにしてください。
10. 動物研究の除外条件 NOT (animals[mh] NOT humans[mh]) を最終検索式に含めてください。
11. 実在が不確かなMeSHは「候補・要確認」とし、最終検索式には含めないでください。

入力：
Clinical Question：
{{cq}}

P：
{{p}}

I / E / Test：
{{i}}

C：
{{c}}

O：
{{o}}

S：
{{s}}

対象年齢：
{{age}}

対象期間：
{{dateRange}}

既知重要論文 PMID：
{{knownPmids}}

検索優先度：
{{priority}}

出力してください。

# 1. CQの構造化と検索方針
# 2. PICOS要素ごとの検索概念マップ
| 要素 | 内容 | 検索式に含めるか | 理由 |
|---|---|---|---|

# 3. 検索語候補リスト
| 概念 | 検索語 | 日本語訳 | フィールドタグ | 採用区分 | 採用理由 |
|---|---|---|---|---|---|

# 4. 除外・注意すべき語
# 5. O（アウトカム）の整理
# 6. 論理構造

# 7. PubMed検索式：高感度版
\`\`\`text
ここに一文検索式
\`\`\`

# 8. PubMed検索式：推奨バランス版
\`\`\`text
ここに一文検索式
\`\`\`

# 9. PubMed検索式：ノイズ低減版
\`\`\`text
ここに一文検索式
\`\`\`

# 10. 研究デザインフィルター案
# 11. 既知重要論文による検証
# 12. PRESS風セルフチェック
| チェック項目 | 判定 | コメント |
|---|---|---|

# 13. 最初にPubMedで実行すべき検索式
理由を説明し、検索式を再掲してください。`;

export const srFields = [
  {
    key: "cq",
    label: "Clinical Question",
    required: true,
    multiline: true,
  },
  { key: "p", label: "P（対象）", required: true, multiline: true },
  {
    key: "i",
    label: "I / E / Test（介入・曝露・検査）",
    required: true,
    multiline: true,
  },
  { key: "c", label: "C（比較対照）", required: false, multiline: true },
  { key: "o", label: "O（アウトカム）", required: false, multiline: true },
  { key: "s", label: "S（セッティング）", required: false, multiline: false },
  { key: "age", label: "対象年齢", required: false, multiline: false },
  { key: "dateRange", label: "対象期間", required: false, multiline: false },
  {
    key: "knownPmids",
    label: "既知重要論文 PMID",
    required: false,
    multiline: true,
  },
  {
    key: "priority",
    label: "検索優先度",
    required: true,
    multiline: false,
    type: "select" as const,
    options: [
      { value: "sensitivity", label: "感度優先（漏れなく網羅したい）" },
      { value: "balanced", label: "バランス（推奨）" },
      { value: "precision", label: "特異度優先（ノイズを減らしたい）" },
    ],
  },
];
