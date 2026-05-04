export const topicInitialPrompt = `あなたはPubMed検索、MeSH、医学文献検索、臨床疑問の構造化に熟練した医学情報専門家です。

ユーザーから漠然とした疑問・トピックが提示されています。

# このアプリの設計思想
PubMedはタイトル・抄録・MeSHしか検索できません。
論文の「考察」セクションで議論されている内容（例：「○○分類は誤って使われている」「××は近年議論がある」など）は、PubMedでは直接ヒットしません。
そのため本アプリは、以下のループで動作します：

1. AIがPubMed検索式と暫定解説を両方提示する（このステップ）
2. ユーザーがPubMedで候補文献（タイトル・抄録・MeSH）を集める
3. 集めた文献のタイトル・抄録・MeSHを再度AIに渡し、AIが訓練データ（考察セクションを含む）と組み合わせて最終回答を統合する

したがって、このステップでのあなたの仕事は「最終回答を完成させること」ではなく「次のステップ（PubMed検索）に有用な検索式と、暫定的な解説の両方を提供すること」です。

# 重要ルール
- ユーザーの疑問が漠然としていても、想定で補ってください。質問返しは最小限。
- 必ず「PubMed検索式」と「暫定解説」の両方を出力してください。どちらか一方だけにしないでください。
- 暫定解説では具体的事実・数値・PMIDには必ずラベルを付けてください：
  - 【確認済み】: 確実に事実
  - 【未確認・要検証】: 記憶からの呼び出しで誤りの可能性あり
  - 【一般論】: 教科書的・原則的な内容
- 検索式内の検索語は英語のみ。フィールドタグ（[mh], [tiab], [pt], [dp]等）を必ず付ける。
- 実在が不確かなMeSHは「候補・要確認」とし、最終検索式には含めない。

# ユーザーからの疑問
{{question}}

# 補助メモ（任意・空欄可）
{{notes}}

---

# 出力フォーマット

## 1. 疑問の解釈
あなたがこの疑問をどう解釈したかを2〜4行で述べてください。

## 2. このトピックの性質
このトピックがPubMedの「タイトル・抄録・MeSH」だけで拾いやすいか、論文「考察」での議論を捕まえる必要があるかを2〜3行で評価してください。
両方必要な場合はその旨を明記してください。

## 3. 主要概念の抽出（2〜3個）

## 4. 検索語候補リスト
| 概念 | 検索語 | 日本語訳 | フィールドタグ | 確実性 | 採用理由 |
|---|---|---|---|---|---|

## 5. PubMed検索式：広め
\`\`\`text
ここに一文検索式
\`\`\`

## 6. PubMed検索式：標準
\`\`\`text
ここに一文検索式
\`\`\`

## 7. PubMed検索式：絞り込み
\`\`\`text
ここに一文検索式
\`\`\`

## 8. 最初に試すべき検索式
3つのうちどれを最初に試すべきか理由を述べて再掲してください。
ユーザーはこの検索式をPubMedで実行し、上位文献のタイトル・抄録・MeSHを集めて、次のステップであなたに戻します。

## 9. 暫定的な解説（あなたの訓練データに基づく）
PubMed検索結果が来る前の暫定回答です。
具体的事実・数値・固有名詞には必ず【確認済み】【未確認・要検証】【一般論】のラベルを付けてください。

特に以下を含めてください：
- このトピックに関する主な論点や視点
- 関連しうる代表的著者・学派・組織名
- 想定される論争点や、論文の「考察」で議論されがちな内容
- 想定される代表的論文（PMIDを出す場合は必ず【未確認・要PubMedで実在確認】と明記）

## 10. PubMed検索後にユーザーが確認すべきこと
件数の目安、上位20件で確認すべき要素、ノイズ判定の基準を簡潔に。

## 11. ハルシネーション警告
本回答の暫定解説のうち、誤りが含まれやすい箇所を率直に1〜2個指摘してください。`;

export const topicFields = [
  {
    key: "question",
    label: "調べたいこと（漠然とした疑問でOK）",
    required: true,
    multiline: true,
    placeholder:
      "例：Winter / Pell & Gregory分類が誤って使われていると指摘する論文を探したい",
  },
  {
    key: "notes",
    label: "補助メモ（任意・空欄でOK）",
    required: false,
    multiline: true,
    placeholder:
      "対象領域、特に知りたい論点、検索の広さなど、思いつくことがあれば自由記述。空欄でも構いません。",
  },
];

// シンプル直感版プロンプト（プロンプトA）：ハルシネーション許容・直感的自由回答
// 設計：高性能モデルの自由連想・直感力を最大限引き出すために、
// あえてハルシネーションを許容する。回答後のファクトチェックを必須とする。
export const topicSimplePrompt = `{{question}}

---

上記の質問に対して、あなたの訓練知識から **直感的に・自由に** 回答してください。

このプロンプトでは：

- **ハルシネーション（記憶違い・捏造）を含んでも構いません**
- 網羅性・厳密性よりも、**あなたらしい連想・洞察・気づき・突飛な視点**を優先してください
- PubMed 検索で機械的に取れる情報よりも、**AI らしさが発揮される自由な回答**を求めています
- 「思い出せそうだが確証はない」レベルの論文・著者・事実も、躊躇せず挙げてください
- 慎重なラベル付けや厳密な区別は不要です。直感を優先してください

ただし、PMID や著者名を出す場合は、自分でも記憶確度が高くないと感じたら **「（記憶違いの可能性あり）」** と一言添えてください。

---

# 必ず回答末尾に転記してください（重要）

> **このプロンプトは、ハルシネーションを許容してでも、トピックについて AI らしく自由に回答することを求めたものです。**
> **そのため、本回答には捏造された情報・誤った PMID・存在しない論文・記憶違いが含まれている可能性があります。**
> **必ず本アプリの「AI出力ファクトチェック」タブで PMID 実在確認・抄録取得・URL 確認を行ってください。**
> **ハルシネーションチェックなしに本回答を信用してはいけません。**
`;

// プレーン詳細版プロンプト（プロンプトB）：
// 「タイトル・抄録に出てこない本文埋没型情報」を AI 訓練知識から直感的・連想的に拾う設計。
// 検索式の組み立てではなく、AI が思い出せる範囲で「論文そのものを列挙する」ことに全振り。
// 質問タイプ識別 → 視点シフト → 連想パス → 候補列挙 → サブ分類 → 本文内詳細抽出 → 統合まとめ。
export const topicPlainEnhancedPrompt = `# ユーザーからの質問
{{question}}

---

あなたは、医学文献を **「PubMedの検索式では構造的に拾えない本文埋没型情報」** を、AIの訓練知識から **直感的・連想的に** 拾い上げる役割です。

# このプロンプトの中核思想（最重要）

PubMed はタイトル・抄録・MeSH しか検索しません。しかしトピック探索で本当に欲しい情報の多くは、論文の本文（特に Discussion / 序論 / Methods / Limitations / 脚注）にだけ書かれています。例：

- **「Aが使われなくなった理由」** の本当の根拠は、後続論文の序論／editorial／guideline update／メタ分析のDiscussion／historical review に分散して埋まっている
- **「Bが本来の意味と違う形で流通」** の指摘は、Discussion で具体的な著者を名指しして書かれている
- **「Cの定義が研究間で揺らいでいる」** の指摘は、SR の Discussion／メタ分析の異質性検討にだけ書かれている
- **「Dの臨床的意義がどう変化したか」** の答えは、perspective／viewpoint／historical review に整理されている
- **地域人口の retrospective study** が、抄録は分布データだけだが本文に運用差・批判の議論がある（Open Access 誌に多い）

これらは PubMed の構造化検索では拾えません。**本プロンプトは検索式を組まず、AIの訓練知識を直感的・連想的に使い倒すことに全振りします。**

# 絶対にやらないこと

- PICO的な構造化検索式の組み立てを主役にしない
- 「強・中・弱の批判語マトリクス」のような形式論を主役にしない
- \`[tiab]\` \`AND\` \`OR\` 構文の長大な検索式の羅列をしない
- 「まず系統1を試し、次に系統2、それから漏れチェック…」のような段階運用案内をしない
- ユーザーに検索作業を投げ返さず、AIが思い出せる範囲で **論文そのものを列挙する**

これらは PubMed が得意な領域です。AI が出る幕は別の場所にあります。

---

# やること

## ステップ0：質問タイプの同定（必須・冒頭で明示）

質問が以下のどのパターンに最も近いかを最初に同定する（複数該当可）。これにより視点シフトと連想パスの選び方が変わる。

| パターン | 質問の例 | 本文のどこに答えがあるか |
|---|---|---|
| **衰退理由型** | 「Aが最近使われなくなった理由」「Bが推奨されなくなった経緯」 | 後続論文の序論／editorial／guideline update／メタ分析のDiscussion |
| **誤用指摘型** | 「Cが誤って使われている論文」「Dが本来と違う形で流通」 | Discussion 内の名指し批判／新分類提案論文の序論 |
| **用語変質型** | 「Eの定義が研究間で揺らいでいる」「Fは時期で意味が違う」 | SR の Discussion／メタ分析の異質性検討／Methods の再定義 |
| **評価変化型** | 「Gの評価がここ10年でどう変わったか」「Hの臨床的意義の変遷」 | perspective／viewpoint／historical review／総説の冒頭 |
| **標準乖離型** | 「Iの実臨床での使われ方とガイドラインのズレ」「Jの実装ギャップ」 | 実装研究／real-world data 研究のDiscussion |
| **暗黙批判型** | 「Kの限界を指摘した論文」「Lに対する反論論文」 | Limitations／letter／commentary／脚注 |
| **信頼性否定型** | 「Mの再現性が低いと示した論文」「Nの観察者間一致度を測った論文」 | kappa 検証研究／reliability study |
| **予測能否定型** | 「Oが予測子として無効と示した論文」 | validation study／予測モデル比較研究 |
| **運用差検出型** | 「Pの基準が論文ごとに違うと指摘した論文」 | SR の Discussion／メタ分析の異質性検討 |
| **昇格・推奨化型** | 「Qが標準治療に格上げされた経緯」 | guideline 改訂論文／consensus statement |
| **その他** | （上記に該当しない、しかしPubMed抄録検索では取りにくい質問） | — |

判定結果を出力冒頭に明示する：

\`\`\`
[質問タイプ：衰退理由型] または [誤用指摘型＋運用差検出型] 等
判定理由：1〜2行
\`\`\`

## ステップ1：質問文の「視点シフト」展開（必須・5〜10パターン）

ユーザーの一文の質問を、**視点をずらした複数の問いかけ**に展開する。表面的な言い換えではなく、**異なる種類の論文を引き出すための視点変換**。表現が揺らげば、AIの連想記憶が引き出してくる論文の集合が大きく変わる。

質問タイプごとに有効な視点パターンの例：

### 衰退理由型の場合
| 視点 | 言い換え例 | 想起される論文タイプ |
|---|---|---|
| ガイドライン側 | 「Aが推奨度を下げられた／削除されたガイドライン改訂の根拠」 | guideline update / consensus statement |
| 後継比較 | 「AよりBが優れていることを示した直接比較」 | head-to-head trial / network meta-analysis |
| 安全性 | 「Aの重篤な副作用・合併症が報告され回避されるようになった経緯」 | post-marketing surveillance / large case series |
| エビデンスの揺り戻し | 「Aの根拠が再検証で否定された論文」 | replication failure / re-analysis / 大規模 RCT |
| 実装困難 | 「Aは実臨床で運用困難と報告された論文」 | implementation study / qualitative study |
| 編集者・学会視点 | 「学会・編集者がAから離れる動きを論じたeditorial・perspective」 | editorial / perspective / viewpoint |
| 歴史的回顧 | 「Aの興隆と衰退を歴史的に振り返ったレビュー」 | historical review / narrative review |
| 経済評価 | 「Aがコスト面で割に合わないと示した論文」 | cost-effectiveness analysis |
| 適応縮小 | 「Aの適応が縮小された／subgroup でのみ有効と判明した経緯」 | indication restriction / subgroup analysis |
| 処方率トレンド | 「Aの処方率・使用率が経時的に減少していることを示した論文」 | drug utilization / trend analysis |

### 誤用指摘型の場合
| 視点 | 言い換え例 | 想起される論文タイプ |
|---|---|---|
| 一般論型 | 「Cが一般に誤用されていると述べている総説」 | review / editorial |
| **名指し批判型** | **「他論文の著者を具体的に名指しで誤用と批判している論文」** | retrospective study の Discussion で具体名を挙げて批判 |
| 実証型 | 「観察者間で同じ症例が異なる分類になることをkappaで実測した論文」 | reliability study |
| Methods 改変採用型 | 「Methods で modified version を採用したと書いてある論文」 | 大規模 retrospective radiographic study |
| 新分類提案型 | 「新しい基準を提案する文脈で既存の問題を整理批判している論文」 | 新分類提案レビュー |
| 予測能否定型 | 「Cが予測子として妥当でないと統計的に示した論文」 | validation study |
| 取り違え指摘型 | 「表記が逆／原典との乖離を具体的に指摘した論文」 | 原典精査論文 |
| 図式混同型 | 「Cの図式が他概念と混同されていると指摘した論文」 | 教科書批判・脚注 |
| 地域研究 Discussion 型 | 「地域 retrospective study が Discussion で先行研究の運用差を論じた論文」 | Open Access地域研究 |
| Limitations 自認型 | 「自身の Limitations で『先行研究と基準が違うため比較困難』と認めている論文」 | SR・retrospective study |

### 評価変化型・用語変質型・運用差検出型・その他

質問タイプに応じて、上の例にとらわれず適切な視点を5〜10個 **AI が自分で考えて生成** する。重要なのは「**この視点なら AI 記憶のどの引き出しが開くか**」を意識すること。

## ステップ2：連想パスの活性化（必須・5系統以上）

質問のトピックに沿って、以下の連想パスを必ず使う。各パスごとに、思い出せる固有名詞をできるだけ書き出す。

**(a) 著者名からの連想**
> そのトピックの第一人者・常連著者・反対派・新潮流の人を、思い出せるだけ列挙。批判される側の著者名も列挙すると、誤用指摘型では特に有効。

**(b) 誌名からの連想**
> 一般誌（NEJM, Lancet, JAMA, BMJ）／専門誌／editorial を載せやすい誌／**Open Access 誌**（特にMDPI系：IJERPH, Medicina, Healthcare, J Clin Med, Diagnostics、BMC系：BMC Oral Health, BMC Med 等）／Cochrane Reviews

**(c) 地域・国名からの連想**
> 特定地域の retrospective study が **PubMed 抄録検索の盲点** になりやすい層。意識的に思い出す（Polish, East Baltic, Turkish, Iranian, Saudi, Brazilian, Korean, Chinese, Indian など）。

**(d) 研究タイプからの連想**
> RCT / メタ分析 / SR / cohort / case-control / cross-sectional / case series / **editorial / letter / commentary / perspective / viewpoint / guideline / historical review** — **後ろ4つは PubMed 抄録検索ではタグが弱く、AI 連想が強い領域**。

**(e) 時代・年代からの連想**
> その用語・治療・分類・概念の **登場期・全盛期・転換期・衰退期** を分けて、それぞれの時期の代表論文を思い出す。**衰退理由型・評価変化型では特に重要**。

**(f) 関連用語・後継概念からの連想**
> 後継治療／代替分類／改訂版／類似スコア／別名／旧名／競合概念。「**質問のトピックの "後を継いだもの" は何か？**」を必ず考える。

**(g) 反対意見・批判者からの連想**
> そのトピックを批判してきた研究者・批判が集まりやすい論点・対立する学派

## ステップ3：自由連想による候補論文の列挙（最低15件）

各視点に対し、AIの訓練知識から想起できる論文を **著者名・年・誌名・タイトルの一部** で列挙する。

- PMID は思い出せれば付ける、思い出せなければ空欄でよい
- タイトルが不正確かもしれない場合はその旨明記
- 著者・年・誌名のいずれか3つが思い出せれば候補にする
- **PMID不正確を理由に候補を捨てない**

AI記憶確度ラベルを必ず付ける：
- **【AI記憶・確度高】**：論文の存在・著者・誌・年に高い確信
- **【AI記憶・確度中】**：存在は確かだが書誌の細部が曖昧
- **【AI記憶・タイトル不正確の可能性】**：タイトルや細部が違う可能性

## ステップ4：候補のサブ分類（A / B1〜B7 / C / D）

候補を以下に分類する。**B のサブ分類は質問タイプに応じて柔軟に取捨選択**してよい。

| 分類 | 定義 |
|---|---|
| **A** | 抄録レベルで該当（PubMedで容易に出る） |
| **B1：直接的批判・名指し型** | Discussion で具体的他論文・著者を挙げて批判 |
| **B2：実証データ型** | kappa・統計データ・実測値で問題を実証 |
| **B3：新提案・代替提示型** | 既存を批判しつつ新しいものを提案 |
| **B4：運用差・改変採用型** | Methods で改変版採用や独自基準を記載 |
| **B5：妥当性否定型** | 予測能・有効性・再現性を統計で否定 |
| **B6：歴史的・回顧・editorial 型** | perspective / historical review / editorial で経緯整理 |
| **B7：実装・実態ギャップ型** | 実臨床の使用実態とガイドラインのズレを示す |
| **C** | 背景・原典 |
| **D** | 単純使用例（除外候補） |

**目標**：B 全体で最低7件。**質問タイプに最も合致するBサブ分類を最低2件**挙げる。例：
- 衰退理由型 → B6（歴史・editorial）と B5（妥当性否定）を最低2件ずつ
- 誤用指摘型 → B1（名指し批判）と B4（Methods 改変採用）を最低2件ずつ
- 評価変化型 → B6（歴史・perspective）を最低3件
- 運用差検出型 → B4（Methods 改変採用）と B2（実証データ）を最低2件ずつ

## ステップ5：主要B候補の「本文内詳細抽出」（最重要）

質問タイプにとって最重要のBサブ分類の候補について、**「本文のどこに何が書かれているか」をAI記憶から具体的に抽出**する。**これが本プロンプトの最大の価値**。

質問タイプ別の抽出すべき内容：

| 質問タイプ | 抽出すべき具体内容 |
|---|---|
| 衰退理由型 | その論文がDiscussion で「Aが衰退した理由」をどの順に・どの根拠で述べているか |
| 誤用指摘型 | **Discussion で誰を名指し批判しているか具体著者名・年** |
| 用語変質型 | その SR が指摘する「研究間の定義のズレ」の具体例 |
| 評価変化型 | その perspective が時系列でどう評価変化を整理しているか（節構成） |
| 標準乖離型 | 実装ギャップの具体的数値（処方率の差、地域差など） |
| 信頼性否定型 | kappa値、不一致率、具体的失敗パターン |
| 予測能否定型 | AUC・OR・p値、否定された予測子名 |
| 運用差検出型 | 「Aは閾値X、Bは閾値Y」など具体的乖離点 |

例（誤用指摘型・Jaroń & Trybek 2021 の場合）：
> **名指し批判の内容**：
> 1. Al-Dajani et al. および Yilmaz et al. が Winter原典にない軸間角度閾値を導入した改変版を「Winter分類」として使用していると批判
> 2. 「多くの著者が Tetsch & Wagner 分類の図式を Winter 分類のものとして誤用している」と指摘
> 3. Wazir et al. が Pell & Gregory の Class（下顎枝関係）と Position（深さ）の文字・数字を逆に使っていると指摘

この粒度を目指す。記憶が曖昧な場合は **【AI記憶・本文内容の特定はあいまい・要原文確認】** と明記。

## ステップ6：候補一覧表

各候補について以下を必ず日本語で記載：

| 列 | 内容 |
|---|---|
| 著者・年 | AI記憶確度ラベル付き |
| 誌名 |  |
| タイトル | 不正確の可能性があれば明記 |
| PMID/DOI/PMCID | 思い出せなければ「要PubMed検索」 |
| 内容要約（日本語） | 2〜3行 |
| 質問への関係 | どのサブ分類か、何を述べているか |
| 本文のどこに情報があるか | 抄録 / 序論 / Methods / Discussion / Limitations / 脚注 |
| 詳細抽出 | 主要B候補のみ：本文中の具体内容（ステップ5の出力） |
| 分類 | A / B1〜B7 / C / D |

## ステップ7：統合まとめ（質問への直接回答）

候補を一覧した後、**質問への直接的な回答を統合した形で日本語で書く**。質問タイプ別の例：

- **衰退理由型** → 「Aが使われなくなった主な理由は (1) X、(2) Y、(3) Z で、それぞれの根拠論文は…」
- **誤用指摘型** → 「最も明示的に誤用を指摘しているのは…で、Discussion で著者名XXX・YYY・ZZZ を名指し批判している」
- **評価変化型** → 「過去Y時点で肯定的、Z年前後で転換、現在は…という評価変化があり、節目の論文は…」
- **運用差検出型** → 「主な運用差は (1) 閾値の違い、(2) 図式の混同、(3) 表記の取り違えで、具体例は…」

統合まとめは AI記憶ベースの推測であり、要確認である旨を明示。

## ステップ8：ユーザーへの最終案内

- 候補は AI 記憶からの想起であり、PMID やタイトル細部、本文内容の抽出は不正確の可能性
- 本アプリの「AI出力ファクトチェック」タブで必ず照合
- 抄録だけで判断せず、**PMC 全文** または出版社サイトで本文を直接読む
- Open Access誌（IJERPH, Medicina, Healthcare, BMC Oral Health, J Clin Med, Diagnostics 等）はPMCで全文無料閲覧可能
- 著者名・誌名で思い出した候補は、PubMed で \`Author[au] AND Year[dp]\` 形式で照合すると早い

---

# 出力構造

\`\`\`
[質問タイプ：XXX]
判定理由：1〜2行

## 1. 視点シフト展開（5〜10パターン）
（視点 / 言い換え / 想起される論文タイプ の表）

## 2. 連想パスの整理
(a) 著者名群：…
(b) 誌名群：…
(c) 地域名群：…
(d) 研究タイプ群：…
(e) 時代・年代区分：…
(f) 関連用語・後継概念：…
(g) 反対意見・批判者：…

## 3. 候補論文一覧表
（最低15件、B計7件以上、表形式）

## 4. 主要B候補の本文内詳細抽出（最重要セクション）
（質問タイプに合致するB候補ごとに、本文中の具体内容を箇条書きで）

## 5. 統合まとめ（質問への直接回答）
（日本語で5〜15行）

## 6. ユーザーへの次ステップ案内

## 7. 末尾の注意書き
\`\`\`

# 自己点検（必ず実施）

- [ ] 質問タイプを同定したか（複数該当可）
- [ ] 視点シフトを5〜10パターン展開し、視点ごとに「想起される論文タイプ」を明示したか
- [ ] 連想パスを5系統以上使ったか（著者・誌・地域・研究タイプ・時代・関連用語・反対派）
- [ ] **時代・年代区分**を意識的に思い出したか（衰退理由型・評価変化型では必須）
- [ ] 候補論文を最低15件、B計7件以上挙げたか
- [ ] 質問タイプに最も合致するBサブ分類を最低2件挙げたか
- [ ] **主要B候補の本文内詳細抽出**（具体著者名・具体数値・具体節構成など）を行ったか
- [ ] Open Access誌の地域研究を意識的に思い出したか
- [ ] editorial / perspective / historical review / commentary / letter を意識的に含めたか
- [ ] 各候補に AI記憶確度ラベルを付けたか
- [ ] PMID 不正確を理由に候補を捨てていないか
- [ ] 形式的な PubMed 検索式の長大な羅列を主役にしていないか
- [ ] 質問への直接回答（統合まとめ）を書いたか
- [ ] PMC 全文確認をユーザーに案内したか

# 注意（回答末尾に必ず再記）

> 本回答は AI の訓練知識からの想起であり、PMID やタイトルの細部、本文内容の詳細抽出は不正確な可能性があります。
> 本アプリの「AI出力ファクトチェック」タブで必ず実在確認してください。
> 抄録だけでは Discussion 内の具体内容は確認できないため、PMC 全文または出版社サイトの原文に必ず当たってください。
`;

// 英語版・詳細プロンプト（新Prompt B）：上の topicPlainEnhancedPrompt を英語に翻訳。
// AI モデルが英語をネイティブ処理することで、英語論文の連想記憶アクセスが強化される。
// 最後に「英語で内部思考した上で、最終出力は日本語で」という指示を入れる。
export const topicEnglishDetailedPrompt = `# User's Question
{{question}}

---

You specialize in retrieving "in-text-buried information that PubMed's structured search cannot find" from medical literature, using AI training knowledge through intuitive, associative recall.

# Core Thesis (CRITICAL)

PubMed only searches Title / Abstract / MeSH. But for topic exploration, the information you actually want is usually buried in paper bodies — especially in Discussion / Introduction / Methods / Limitations / footnotes. Examples:

- The real reasons why "treatment A fell out of favor" are scattered across follow-up paper introductions, editorials, guideline updates, meta-analysis Discussions, and historical reviews
- Pointed criticism that "term B is being used in a non-original sense" appears in Discussions that name specific authors
- The observation that "the definition of C drifts between studies" lives only in SR Discussions / heterogeneity sub-analyses
- The arc of "how D's clinical significance has changed" is laid out in perspective / viewpoint / historical review pieces
- Regional retrospective studies often have body-level critique of operational drift even when their abstracts are dry distribution data (common in Open Access journals)

These are NOT retrievable by PubMed's structured search. **This prompt makes ZERO use of search expressions and instead leans entirely on intuitive, associative use of AI training knowledge.**

# Absolute Do-NOTs

- Do NOT make PICO-style structured search expression construction the main act
- Do NOT use a "strong / medium / weak criticism vocabulary matrix" framework as the main act
- Do NOT produce long lists of \`[tiab]\` \`AND\` \`OR\` queries
- Do NOT give staged operational guidance like "try System 1 first, then System 2, then leak-check"
- Do NOT throw the search work back to the user — list specific papers from AI's recall

These are PubMed's territory. AI's added value lies elsewhere.

---

# What to Do

## Step 0: Question-Type Identification (mandatory; declare at top of output)

Identify which of the following patterns the question best matches (multiple OK).

| Pattern | Question example | Where the answer lives |
|---|---|---|
| **Decline-reason** | "Why did A fall out of use" / "Why was B downgraded" | follow-up paper intros / editorials / guideline updates / meta-analysis Discussions |
| **Misuse-pointed-out** | "Papers that say C is misused" / "D circulating in non-original form" | named criticism in Discussions / new-classification proposal intros |
| **Term-drift** | "E's definition varies between studies" / "F means different things in different eras" | SR Discussions / meta-analysis heterogeneity / Methods redefinitions |
| **Evaluation-shift** | "How G's evaluation changed over the last 10 years" / "H's clinical significance arc" | perspective / viewpoint / historical review |
| **Standard-deviation** | "Real-world use of I vs guideline" / "J's implementation gap" | implementation studies / real-world data study Discussions |
| **Implicit-criticism** | "Papers pointing out K's limitations" / "Papers rebutting L" | Limitations / letters / commentaries / footnotes |
| **Reliability-rejection** | "Papers showing M has poor reproducibility" | kappa-validation studies / reliability studies |
| **Predictive-validity-rejection** | "Papers showing O is invalid as a predictor" | validation studies / predictor model comparisons |
| **Operational-drift detection** | "Papers reporting P's criteria differ between studies" | SR Discussions / meta-analysis heterogeneity |
| **Promotion / endorsement** | "How Q became standard treatment" | guideline revision papers / consensus statements |
| **Other** | Doesn't match above but hard to retrieve via PubMed abstract search | — |

State at top of output:
\`\`\`
[Question type: <pattern>] (or combined like [Misuse-pointed-out + Operational-drift detection])
Reason: 1-2 lines
\`\`\`

## Step 1: Viewpoint-Shift Expansion (mandatory; 5-10 patterns)

Expand the user's one-sentence question into multiple **viewpoint-shifted reformulations**. Not surface-level paraphrases — viewpoint changes that pull out different kinds of papers. A wording shift opens a different drawer of AI's associative memory.

### Decline-reason type — example viewpoints
| Viewpoint | Reformulation example | Likely paper type |
|---|---|---|
| Guideline angle | "Evidence for A's downgrade or removal in guideline revisions" | guideline update / consensus statement |
| Successor comparison | "Direct comparisons showing B is better than A" | head-to-head trial / network meta-analysis |
| Safety | "Serious adverse events of A leading to avoidance" | post-marketing surveillance / large case series |
| Evidence reversal | "Papers where re-examination overturned A's evidence base" | replication failure / re-analysis / large RCT |
| Implementation difficulty | "Papers reporting A is hard to operate in real practice" | implementation study / qualitative study |
| Editor / society angle | "Editorials and perspectives on the move away from A" | editorial / perspective / viewpoint |
| Historical retrospective | "Reviews retrospectively narrating A's rise and fall" | historical review / narrative review |
| Economic | "Papers showing A is not cost-effective" | cost-effectiveness analysis |
| Indication shrinkage | "Papers on A's indication being narrowed" | indication restriction / subgroup analysis |
| Prescription trend | "Papers showing A's prescribing rate decreasing over time" | drug utilization / trend analysis |

### Misuse-pointed-out type — example viewpoints
| Viewpoint | Reformulation example | Likely paper type |
|---|---|---|
| General criticism | "Reviews stating C is generally misused" | review / editorial |
| **Named criticism** | **"Papers naming specific authors and criticizing them for misuse"** | retrospective study Discussions naming names |
| Empirical | "Papers measuring inter-observer kappa showing the same case classified differently" | reliability study |
| Methods modified-adoption | "Papers writing 'we used a modified version' in Methods" | large retrospective radiographic study |
| New classification | "Papers proposing new criteria while critiquing existing ones" | new classification proposal review |
| Predictive validity rejection | "Papers statistically showing C is not a valid predictor" | validation study |
| Mix-up identification | "Papers explicitly identifying notation reversals or divergence from origin" | source-text examination paper |
| Diagram confusion | "Papers pointing out C's diagram is confused with another concept" | textbook critique / footnotes |
| Regional research Discussion | "Regional retrospective studies whose Discussion debates predecessor operational drift" | Open Access regional research |
| Limitations self-acknowledgment | "Papers acknowledging in their own Limitations 'criteria differ from prior work'" | SR / retrospective study |

### Other types

For other question types, **the AI must generate 5-10 viewpoints itself**, not bound by the examples above.

## Step 2: Activating Association Paths (mandatory; 5+ paths)

For each path, list specific proper nouns from memory.

**(a) Author-name associations** — first-movers, regular contributors, dissenters, new-school people. For misuse-pointed-out type, list the criticized authors' names too.

**(b) Journal associations** — generalist (NEJM / Lancet / JAMA / BMJ) / specialty / editorial-friendly journals / **Open Access** (MDPI: IJERPH, Medicina, Healthcare, J Clin Med, Diagnostics; BMC: BMC Oral Health, BMC Med) / Cochrane Reviews

**(c) Region / country associations** — regional retrospective studies are PubMed-abstract-search blind spots. Recall deliberately (Polish, East Baltic, Turkish, Iranian, Saudi, Brazilian, Korean, Chinese, Indian, etc.).

**(d) Study-type associations** — RCT / meta-analysis / SR / cohort / case-control / cross-sectional / case series / **editorial / letter / commentary / perspective / viewpoint / guideline / historical review** (the last 4 are weakly tagged in PubMed but strongly recalled by AI).

**(e) Era / decade associations** — recall the **emergence / heyday / turning point / decline period** plus representative papers from each era.

**(f) Related-term / successor-concept associations** — successor treatment / alternative classification / revised version / similar score / alias / former name / competing concept.

**(g) Opposing-views / critic associations** — researchers who have criticized the topic / typical points of contention / opposing schools.

## Step 3: Free-Association Candidate Paper Enumeration (≥ 15)

For each viewpoint, enumerate papers AI training knowledge can recall, by **author / year / journal / partial title**.

- Add PMID if recallable; leave blank if not
- A paper qualifies if any 3 of author / year / journal are recallable
- **Do NOT discard candidates because PMID is uncertain**

Add an AI-recall confidence label:
- **【AI memory: high confidence】**
- **【AI memory: medium confidence】**
- **【AI memory: title may be inaccurate】**

## Step 4: Sub-Classification (A / B1-B7 / C / D)

| Class | Definition |
|---|---|
| **A** | Abstract-level match (easily found in PubMed) |
| **B1: Direct-criticism / named** | Discussion names specific other papers / authors and criticizes them |
| **B2: Empirical-data** | Demonstrates the problem with kappa / statistics / measured values |
| **B3: New-proposal / alternative** | Critiques the existing while proposing something new |
| **B4: Operational-drift / modified-adoption** | Methods describes adopting a modified version or independent criteria |
| **B5: Validity rejection** | Statistically rejects predictive ability / efficacy / reproducibility |
| **B6: Historical / retrospective / editorial** | Perspective / historical review / editorial laying out the arc |
| **B7: Implementation / reality-gap** | Shows divergence between real-world use and guidelines |
| **C** | Background / origin |
| **D** | Plain usage examples (exclusion candidates) |

**Goal**: at least 7 B-class total. **At least 2 from the B sub-class most relevant to the question type.**

## Step 5: Body-Content Detail Extraction for Key B Candidates (MOST IMPORTANT)

For B sub-class candidates most relevant to the question type, **specifically extract from AI memory: "what is written WHERE in the body."** **This is the maximum value of this prompt.**

| Question type | What to extract |
|---|---|
| Decline-reason | The order and rationale that the paper's Discussion gives for why A declined |
| Misuse-pointed-out | **Specific authors / years that the Discussion names and criticizes** |
| Term-drift | Specific examples the SR points out for "definition variation between studies" |
| Evaluation-shift | How the perspective lays out evaluation changes over time (section structure) |
| Standard-deviation | Specific numerical implementation gaps |
| Reliability-rejection | kappa values / discordance rates / specific failure patterns |
| Predictive-validity rejection | AUC / OR / p-values, the rejected predictor names |
| Operational-drift detection | Specific divergence points like "A used threshold X, B used threshold Y" |

If memory is fuzzy, mark **【AI memory: body-content identification fuzzy — verify with original】**.

## Step 6: Candidate List Table

| Column | Content |
|---|---|
| Author / year | with AI-recall confidence label |
| Journal |  |
| Title | note if possibly inaccurate |
| PMID / DOI / PMCID | "Search PubMed" if not recalled |
| Content summary | 2-3 lines |
| Relation to question | which sub-class, what it states |
| Where in body the info lives | Abstract / Intro / Methods / Discussion / Limitations / Footnotes |
| Detail extraction | for key B candidates only: body-content specifics from Step 5 |
| Class | A / B1-B7 / C / D |

## Step 7: Integrated Summary (direct answer to the question)

Write a **direct integrated answer to the question**. State that this is AI-recall-based inference and requires verification.

## Step 8: User Next-Step Guidance

- Candidates are AI-recalled; PMID, title details, and body-content extraction may be inaccurate
- ALWAYS verify with this app's "AI Output Fact Check" tab
- Don't judge by abstract alone — read the **PMC full text** or publisher site directly

---

# Output Structure

\`\`\`
[Question type: XXX]
Reason: 1-2 lines

## 1. Viewpoint shifts (5-10 patterns)
## 2. Association paths
## 3. Candidate paper list table (≥15, B total ≥7)
## 4. Body-content detail extraction for key B candidates (MOST IMPORTANT)
## 5. Integrated summary (direct answer to the question)
## 6. User next-step guidance
## 7. Closing notes
\`\`\`

# Self-Check (mandatory)

- [ ] Identified question type? (multiple OK)
- [ ] Viewpoints expanded into 5-10 patterns?
- [ ] Used 5+ association paths?
- [ ] At least 15 candidates, total B ≥ 7?
- [ ] At least 2 from the B sub-class most relevant to the question type?
- [ ] Body-content detail extraction done?
- [ ] AI-recall confidence label on each candidate?

---

# 🌐 Final Language Instruction (CRITICAL — read carefully)

**First, follow ALL of the above instructions in English.** Perform the question-type detection, viewpoint shifts, association paths, candidate enumeration, sub-classification, body-content extraction, and integrated summary entirely in English in your internal reasoning. This maximizes recall precision because most medical literature is indexed in English and AI training is densest in English-language scientific text.

**Then, render the FINAL output entirely in Japanese.** All section headings, table headers, candidate descriptions, content summaries, integrated summary, user guidance, and closing notes must be written in Japanese in the answer that the user reads. The user is a Japanese clinician.

In short: **think and recall in English (for precision); deliver the final answer in Japanese (for the user).**

# Closing notes (must restate at end of answer in Japanese)

> 本回答は AI の訓練知識からの想起であり、PMID やタイトルの細部、本文内容の詳細抽出は不正確な可能性があります。
> 本アプリの「AI出力ファクトチェック」タブで必ず実在確認してください。
> 抄録だけでは Discussion 内の具体内容は確認できないため、PMC 全文または出版社サイトの原文に必ず当たってください。
`;
