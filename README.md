# AI支援 PubMed検索・書誌検証ツール

このアプリは、AI APIを使わずに、PubMed検索のためのAIプロンプトを生成するWebアプリです。

## 重要

このアプリはOpenAI API、Claude API、Gemini APIなどのAI APIには一切通信しません。
AI APIキーも扱いません。

PubMed検索結果の取得には、NCBI公式のE-utilities APIを利用します。
NCBI APIキーは任意です。入力しなくても使用できます。

PubMedでPMID・タイトル等を確認できることは、論文内容や推奨内容が正しいことを意味しません。本アプリは書誌確認と原典確認を支援しますが、正確性を保証しません。

## CPG / SR検索の安全原則

- CPGとSRは独立した検索式・API呼び出しとして実行し、同じPMIDが両方で得られても検索元を保持します。
- CPG/SR検索には出版年・登録年・相対日付の制限を使用しません。
- 最新CPGは検索後に、発行機関のcurrent / superseded / archived情報、明示的な置換関係、版番号等で判定します。最大出版年だけでは判定しません。
- consensus statement、position statement、practice parameter、appropriate use criteria等は、正式なCPGの代替語としてCPG_FILTERへ含めません。
- focused update、partial update、addendumは、発行機関が全面置換を明示しない限り基礎ガイドラインを自動的に置換しません。
- 状態を確認できないCPGは削除せず `needs_manual_review` として保持します。
- 改変したフィルターへ原論文の性能値を転用しません。検索件数の減少だけをprecision向上とは表現しません。
- 人手で適格性を確認していない集合からprecisionやnumber needed to screenを算出しません。
- 既知文献をすべて回収できても完全な網羅性は保証されません。

採用式、根拠、改変点、制約は [SEARCH_FILTER_EVIDENCE.md](SEARCH_FILTER_EVIDENCE.md)、実行時の件数とQuery Translationは [SEARCH_FILTER_VALIDATION.csv](SEARCH_FILTER_VALIDATION.csv) に記録します。

## 機能

- **トピック探索** — PICOに乗りにくい疑問やスコーピング検索に
- **システマティックレビュー** — PICOに基づくSR・メタ解析用の検索式作成に
- **GRADE-ADOLOPMENT** — ガイドライン作成、既存GL/SRの採用・適応判断に
- **害・有害事象検索** — 介入名、イベント名、観察研究・規制情報を分けて構成

### ワークフロー

1. 検索戦略タブを選ぶ
2. フォームに疑問やPICOを入力する
3. AI用プロンプトを生成・コピーする
4. 外部AI（ChatGPT / Claude / Gemini）に貼り付ける
5. AIの回答をアプリに貼り戻す
6. PubMed APIで検索式を検証する
7. 改善プロンプトを生成して検索式を改善する

## PubMed APIキーについて

PubMed APIキーは無料です。
NCBIアカウントのSettingsページから取得できます。

取得手順：
1. https://www.ncbi.nlm.nih.gov/account/ にアクセス
2. ログインまたはアカウント作成
3. Account settingsを開く
4. API Key Managementを探す
5. Create an API Keyをクリック
6. 表示されたキーを本アプリの設定画面に貼り付ける

## 開発

```bash
npm ci
npm test
npm run lint
npm run dev
npm run build
```

### 検索フィルターの実通信検証

既定では `all[sb]` をTOPIC_QUERYとして件数とPubMed Query Translationを取得します。APIキーは環境変数からのみ読み、CSVへ出力しません。

```bash
npm run validate:filters
```

トピックと既知適格PMID集合を指定する例：

```bash
node scripts/validate-search-filters.mjs --topic "heart failure[mh]" --known-cpg known-cpg.txt --known-sr known-sr.txt --output SEARCH_FILTER_VALIDATION.csv
```

`known-cpg.txt` と `known-sr.txt` はPMIDを改行またはカンマ区切りで記載します。これは既知集合に対する再現率であり、完全な感度ではありません。実行時はNCBIの利用方針に従い、必要に応じて `NCBI_EMAIL` と `NCBI_API_KEY` を環境変数へ設定してください。

GitHub Pagesはmainへのpushで自動デプロイされます。

## ライセンス

MIT
