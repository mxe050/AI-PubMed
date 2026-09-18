# AI支援 PubMed検索・書誌検証ツール

このアプリは、AI APIを使わずに、PubMed検索のためのAIプロンプトを生成するWebアプリです。

## 重要

このアプリはOpenAI API、Claude API、Gemini APIなどのAI APIには一切通信しません。
AI APIキーも扱いません。

PubMed検索結果の取得には、NCBI公式のE-utilities APIを利用します。
NCBI APIキーは任意です。入力しなくても使用できます。

PubMedでPMID・タイトル等を確認できることは、論文内容や推奨内容が正しいことを意味しません。本アプリは書誌確認と原典確認を支援しますが、正確性を保証しません。

## CPG / SR検索の安全原則

- CPGとSRは研究デザイン欄の別々の選択肢として提供し、1回の検索で1種類だけ適用します。査読用には各検索を別々に実行・報告します。
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

## EBM初心者とSR作成者への支援

- 「使い方・設定」から目的別に開始できます。EBMでは短い疑問からPICO案を作り、P/I/C/Oを個別に確認・編集します。Cは任意です。
- EBMとSRの手順ナビゲーションから、開いている各ステップへ戻れます。入力変更後の古いAI回答・検索結果は、そのまま最新として扱いません。
- 長いAIプロンプトは省スペース表示でも全文をコピー・テキスト保存できます。AIサービスへの送信はユーザーが行います。
- SRのAPIプレビュー検索は、実行式、Query Translation、日時、ヒット総数、取得PMID、フィルター、検索時点のPICO・検索語・定義・適格基準、キー論文回収を履歴に残します。0件も記録します。
- 検索ごとの変更理由と提出前チェックをMarkdown / JSONで保存できます。チェックは人による確認記録であり、新しい検索を実行すると解除されます。
- 記録はこの画面のAPI検索のみです。外部PubMedでの操作や他DBの検索は自動記録されません。ヒット数とプレビュー取得数は区別し、件数を単純合計してPRISMAの総数にしません。
- 入力・検索履歴は自動永続保存しません。閉じる・再読み込み・クリアの前にファイル保存してください。APIキーや設定メールアドレスは検索履歴の出力対象外です。患者個人の情報は入力しないでください。

PubMed検索の完成だけでSR全体は完了しません。追加DB、試験登録、引用追跡、スクリーニング、吟味、情報専門家のレビューは別途計画してください。

参考：[Cochrane Handbook Chapter 4](https://www.cochrane.org/authors/handbooks-and-manuals/handbook/current/chapter-04)、[PRISMA-S](https://doi.org/10.1186/s13643-020-01542-z)。検索品質や査読通過を保証する機能ではありません。

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

Node.js 24系（24.15以上）を推奨します。`.nvmrc`とGitHub Actionsも24系です。ブラウザー用テスト環境が必要とするため、Node.js 20ではテストできません。

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
