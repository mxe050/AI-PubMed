# AI支援 PubMed検索プロンプト支援ツール

このアプリは、AI APIを使わずに、PubMed検索のためのAIプロンプトを生成するWebアプリです。

## 重要

このアプリはOpenAI API、Claude API、Gemini APIなどのAI APIには一切通信しません。
AI APIキーも扱いません。

PubMed検索結果の取得には、NCBI公式のE-utilities APIを利用します。
NCBI APIキーは任意です。入力しなくても使用できます。

## 機能

- **トピック探索** — PICOに乗りにくい疑問やスコーピング検索に
- **システマティックレビュー** — PICOに基づくSR・メタ解析用の検索式作成に
- **GRADE-ADOLOPMENT** — ガイドライン作成、既存GL/SRの採用・適応判断に

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
npm install
npm run dev
npm run build
```

## ライセンス

MIT
