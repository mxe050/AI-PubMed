// SR（システマティックレビュー）用 PICO 必須構造
// 参照：Cochrane Handbook v6.5 (2024) Chapter 2 "Determining the scope of the
// review and the questions it will address"、PRISMA 2020 statement (Page MJ et
// al, BMJ 2021;372:n71), PRISMA-S (Rethlefsen ML et al, Syst Rev 2021;10:39).
// EBM Step 1 の PICO とは異なり、SR 用 PICO は適格基準（eligibility criteria）と
// 検索戦略の中核を成す。Cochrane Handbook は I（介入）と P（対象）を検索式の
// 主軸とし、O（アウトカム）は検索式に通常含めず、結果データから抽出する方針を示す。

export const srFields = [
  {
    key: "question",
    label: "臨床疑問（CQ・自然な日本語でOK）",
    required: true,
    multiline: true,
    placeholder: "例：高齢の心不全患者にSGLT2阻害薬を加えると、標準治療単独に比べて心不全入院や全死亡が減るか",
  },
  {
    key: "p",
    label: "P（対象患者・状況）— 必須",
    required: true,
    multiline: true,
    placeholder: "例：60歳以上、HFrEF（LVEF≦40%）、外来通院中",
  },
  {
    key: "i",
    label: "I（介入・曝露）— 必須",
    required: true,
    multiline: true,
    placeholder: "例：SGLT2阻害薬（ダパグリフロジン10mg/日 または エンパグリフロジン10mg/日）の標準治療への追加",
  },
  {
    key: "c",
    label: "C（比較）— 必須ではない（CQによっては不要）",
    required: false,
    multiline: true,
    placeholder: "例：標準治療（ACE-I/ARB/β遮断薬/MRA）のみ。SGLT2阻害薬を追加しない群。Cが不要なCQでは空欄でOK。",
    quickFillOptions: [
      "標準治療（usual care / standard of care）",
      "プラセボ（placebo）",
      "偽治療・sham（sham procedure）",
      "対照なし（no comparator）",
      "他剤（active comparator）",
      "用量比較（dose-response）",
      "無治療（no treatment / untreated）",
      "前後比較（before-after）",
    ],
  },
  {
    key: "o",
    label: "O（アウトカム）— 検索式には入れない（後段の結果から抽出）",
    required: false,
    multiline: true,
    placeholder: "例：心不全入院、全死亡、心血管死、QOL（KCCQ）、入院期間。検索式には含めない。",
  },
  {
    key: "s",
    label: "S（研究デザイン）— 検索の最終段階で適用",
    required: false,
    multiline: true,
    placeholder: "例：RCT を最優先、不足なら非RCT/観察研究。検索式の最終段階で Cochrane Handbook の高感度フィルターを適用。",
  },
  {
    key: "knownPmids",
    label: "既知重要論文の PMID（任意）",
    required: false,
    multiline: true,
    placeholder: "例：33270928, 32865377, 32905714（DAPA-HF / EMPEROR-Reduced 等）。ベンチマークに使用。",
  },
];

// SR 検索戦略構築プロンプト（CoT・系統的検索戦略・研究デザイン非限定）
// 参考：Cochrane Handbook v6.5 (2024) Chapter 4 "Searching for and selecting studies"
//      PRISMA-S (Rethlefsen ML et al, Syst Rev 2021;10:39)
//      PRESS Peer Review of Electronic Search Strategies (McGowan J et al,
//      J Clin Epidemiol 2016;75:40-46)
export const srInitialPrompt = `# 役割
あなたは、システマティックレビュー（SR）のための系統的検索戦略を専門とする熟練した医学情報専門家（Medical Information Specialist）です。
あなたのタスクは、提供された PICO 要素に基づき、PubMed での実行に特化した**高感度な検索戦略**を論理的かつ厳密に構築することです。

# 思考プロセス（Chain of Thought・必ず順守）

検索式構築プロセスにおいては、以下のステップを厳密に実行してください：

1. 各 P / I / C 要素について、**関連性の高い MeSH ターム**を特定する
2. 各 MeSH タームに対応する、**論文タイトル・抄録（[tiab]）で検索すべき関連性の高いフリーワード**（同義語、スペルバリエーション、略語など）を**幅広く**収集する
3. 収集した全ての語句を、MeSH と [tiab] で**論理的な OR グループ**に結合する
4. 最終的な Boolean 検索式を、指定されたすべての要件（動物除外、研究デザイン除外、ATM 回避）に従って**一文**で生成する

# 必須要件（Constraints）

検索式の感度を最大化しつつ特異度とのバランスを保つために、以下の要件を厳守してください：

- 検索対象は **PubMed** とします
- **MeSH と [tiab] を必ず併用**し、論理的な OR グループ内で明示すること（例：(Term A[mh] OR Term B[tiab] OR Term C[tiab])）
- 各 PIC 要素の検索セット（#1, #2, #3）は、できる限り多くの関連語・同義語を含め、**感度を最優先**してください
- C（比較）要素は、もし提供された入力が不要であると示唆する場合、検索式に含めなくても構いません
- **研究デザインのフィルター（例：RCT[pt], Random*[ti] など）は一切含めないこと**（最終段階で別途適用するため、このステップでは含めない）
- 動物研究の除外条件 \`NOT (animals[mh] NOT humans[mh])\` は、最終検索式に必ず含めること
- 使用する語句はすべて**英語のみ**とすること（日本語不可）
- PubMed の Automatic Term Mapping（ATM）を避けるため、すべての検索語句に **[mh] または [tiab] などのフィールドタグを付与**してください
- 不明確な語句や、検索式に妥当でない語（ハルシネーション）は避けること
- O（アウトカム）は**検索式に含めない**（PRISMA-S・Cochrane Handbook 推奨：感度を著しく落とすため）

# 入力（ユーザーの PICO）

- 臨床疑問（CQ）：{{question}}
- P（対象）：{{p}}
- I（介入・曝露）：{{i}}
- C（比較）：{{c}}
- O（アウトカム・※検索式には含めない）：{{o}}
- S（研究デザイン・※最終段階で別途適用）：{{s}}
- 既知重要論文 PMID（ベンチマーク用）：{{knownPmids}}

---

# 出力フォーマット（以下を順に・前置き不要）

## 1. PIC 要素ごとの関連語リストと選定理由

以下の Markdown テーブル形式で、各要素（P, I, C）の検索語をリストアップしてください。

| 要素 | 検索語（英語） | 日本語訳 | フィールドタグ | 選定理由 |
|---|---|---|---|---|
| P | [MeSH Term A] | [日本語訳] | [mh] | [選定理由：主要概念、疾患名 等] |
| P | [Free Word B] | [日本語訳] | [tiab] | [選定理由：一般用語、略語 等] |
| I | … | … | … | … |
| I | … | … | … | … |
| C | … | … | … | … |

各要素について、できるだけ多くの同義語・関連語・スペルバリエーション・略語を出してください。

## 2. O（アウトカム）に含まれる主要項目一覧（※検索式には含めない）

ユーザーが入力した O を箇条書きで整理してください。
これらは検索式には含めず、後段で取得結果から抽出するためのリストです。

## 3. 論理構造の明記

最終的な検索式の論理的な結合順序を、以下の例のように明確に記述してください。

例：\`#1 (P element) AND #2 (I element) AND #3 (C element) AND NOT (animals[mh] NOT humans[mh])\`

## 4. 検索式の構造解説（必須・3〜5行）

なぜこの構造にしたか、各 OR グループの選定根拠、ATM 回避をどう保証しているか、感度を確保しつつ特異度を維持する設計意図を、簡潔に説明してください。

## 5. PubMed にそのまま使用可能な一文の検索式（最終出力）

PubMed にコピー＆ペースト可能な、タグ・括弧・Boolean 演算子（OR, AND, NOT）を完全に含む**一文の検索式のみ**を出力してください。
この一文には、セクション 3 で定義された全ての論理構造と除外条件 \`NOT (animals[mh] NOT humans[mh])\` を含めてください。
**研究デザインフィルターは含めません**（最終段階で別途適用するため）。

\`\`\`text
（一文検索式・研究デザインフィルター無し・コメント/改行なし）
\`\`\`

## 6. 既知重要論文によるベンチマーク確認

提供された既知重要論文 PMID が、上記の検索式でヒットするかを言及してください（実際の確認はユーザーが PubMed で行う前提）。
ヒットしない可能性が高い場合は、その論文の特徴的な語を検索式に補強する案を提示してください。

---

# 注意

- 本検索式は **研究デザインフィルター無し** です。最終段階でユーザーが Cochrane Handbook 由来の高感度フィルター（診療ガイドライン / SR / RCT / 非RCT 等）を別途適用します。
- O（アウトカム）と S（研究デザイン）は本検索式には含めません。
- 動物除外を最終検索式に必ず含めます。
- 英語のみ・全語フィールドタグ付き・ATM 回避を厳守。
`;
