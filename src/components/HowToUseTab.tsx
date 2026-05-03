import type { AppSettings } from "../types";
import { SettingsPanel } from "./SettingsPanel";

interface Props {
  settings: AppSettings;
  onSettingsChange: (s: AppSettings) => void;
}

export function HowToUseTab({ settings, onSettingsChange }: Props) {
  return (
    <div className="how-to-use">
      <header className="how-to-use-header">
        <h2>このアプリの使い方</h2>
        <p className="hint">
          AI APIには一切通信しません。PubMed公式API（NCBI E-utilities）のみを使用します。
        </p>
      </header>

      <section className="how-to-use-section">
        <h3>このアプリの目的</h3>
        <p>
          本アプリは、医学文献検索において、AIの知的支援を活用しつつ、
          最終的にはPubMedで確認可能な文献・検索式に到達するための支援ツールです。
        </p>
        <p>
          AIへのプロンプトを生成する役割をアプリが担い、AIへの問い合わせはユーザーが手動で外部AIサービス（ChatGPT、Claude、Geminiなど）に貼り付けて行います。
          AIから返ってきた検索式や引用文献は、PubMed公式APIで実在確認・抄録取得を行うことでハルシネーションを検出します。
        </p>
      </section>

      <section className="how-to-use-section">
        <h3>3つの検索戦略タブ</h3>
        <div className="strategy-cards">
          <div className="strategy-card">
            <h4>トピック探索</h4>
            <p>
              漠然とした疑問、概念探索、用語法、分類体系の歴史、論争点など、
              <strong>PubMedの抄録だけでは拾いきれないトピック</strong>に使います。
            </p>
            <p>
              フロー：疑問 → AI（検索式 + 暫定解説）→ PubMed検索（候補文献収集）→
              AI（PubMed結果 + 訓練知識を統合）→ 最終回答 →
              <strong>PubMedで全PMIDを実在確認＋抄録取得</strong>
            </p>
          </div>
          <div className="strategy-card">
            <h4>システマティックレビュー</h4>
            <p>
              PICOに基づくSR、メタ解析、診療ガイドライン用の効果検索に使います。
              <strong>必ずPubMed検索式で完結</strong>します。
            </p>
            <p>
              フロー：疑問 → AI（PICO化 + 検索式）→ PubMed検索 →
              改善ループ（PubMed結果をAIに戻す）→
              <strong>査読（PRESS / PRISMA-S）通過品質の最終検索式</strong>
            </p>
          </div>
          <div className="strategy-card">
            <h4>GRADE-ADOLOPMENT</h4>
            <p>
              診療ガイドライン作成手法
              <strong>GRADE-ADOLOPMENT（Adoption + Adaptation + de novo Development）</strong>
              の解説ページです。
            </p>
            <p>
              フローチャート、各ステップの詳細、EtD 8基準、具体例、参考文献を掲載。
              実際の検索作業は「トピック探索」「システマティックレビュー」タブで行います。
            </p>
          </div>
        </div>
      </section>

      <section className="how-to-use-section">
        <h3>使えるAIサービスについて</h3>
        <p className="hint">
          本アプリで生成したプロンプトは、以下のAIサービスのいずれかに貼り付けて利用します。
          無料版でも利用できますが、医学文献検索の用途では有料版のほうが精度が高い傾向があります。
        </p>

        <table className="ai-services-table">
          <thead>
            <tr>
              <th>サービス</th>
              <th>無料版</th>
              <th>有料版</th>
              <th>本アプリ用途での所感</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <strong>ChatGPT</strong>
                <br />
                <a
                  href="https://chat.openai.com/"
                  target="_blank"
                  rel="noreferrer"
                >
                  chat.openai.com
                </a>
              </td>
              <td>
                GPT-5 mini相当などが利用可。
                日々の使用回数や長文・推論機能に制限あり。
              </td>
              <td>
                ChatGPT Plus（月額約 $20）でGPT-5など上位モデル、推論機能、長文処理が安定。
              </td>
              <td>
                医学文献の構造化、PICO分解、検索式生成に強い。日本語の医学用語にも対応。
              </td>
            </tr>
            <tr>
              <td>
                <strong>Claude</strong>
                <br />
                <a
                  href="https://claude.ai/"
                  target="_blank"
                  rel="noreferrer"
                >
                  claude.ai
                </a>
              </td>
              <td>
                Claude 4.5 Sonnetなどが利用可。日々の使用量・長文に制限あり。
              </td>
              <td>
                Claude Pro（月額約 $20）でClaude 4.7 Opus等の最上位モデル、長文処理、Projects機能が安定。
              </td>
              <td>
                長文の抄録一括解釈、論理的な構造化、ニュアンスを汲んだ統合回答に強い。本アプリの「統合プロンプト」（抄録を多数含む）はClaudeとの相性が良い。
              </td>
            </tr>
            <tr>
              <td>
                <strong>Gemini</strong>
                <br />
                <a
                  href="https://gemini.google.com/"
                  target="_blank"
                  rel="noreferrer"
                >
                  gemini.google.com
                </a>
              </td>
              <td>
                Gemini 2.5 Flashなどが無料で利用可。
              </td>
              <td>
                Gemini Advanced（Google One AI Premium、月額約 ¥2,900）でGemini 2.5 Pro、長文処理、Deep Researchが利用可。
              </td>
              <td>
                Webアクセス連動の最新情報取得に強い。Google検索・Scholar検索と組み合わせやすい。
              </td>
            </tr>
            <tr>
              <td>
                <strong>その他</strong>
              </td>
              <td colSpan={2}>
                Perplexity（出典付き回答が標準）、Microsoft
                Copilot、DeepSeek、Mistral
                Le Chat等も利用可能。プロンプトはAIサービスを問わず使えます。
              </td>
              <td>
                出典付き回答が標準のサービス（Perplexityなど）はファクトチェック工程と相性が良い。
              </td>
            </tr>
          </tbody>
        </table>

        <div className="callout">
          <h4>共通の注意</h4>
          <ul>
            <li>
              <strong>ハルシネーション対策</strong>：いずれのAIも、PMIDや論文タイトルを誤って提示することがあります。本アプリのファクトチェック機能（PMID実在確認＋抄録取得）を必ず利用してください。
            </li>
            <li>
              <strong>機密情報</strong>：患者個人情報、機関名で特定できる症例情報などは、AIに貼り付けないでください。
            </li>
            <li>
              <strong>このアプリ自体はAI APIに通信しません</strong>。AI APIキーの入力欄もありません。AI APIを使うと課金されますが、本アプリの利用ではAI APIへの課金は一切発生しません。
            </li>
          </ul>
        </div>
      </section>

      <section className="how-to-use-section">
        <h3>標準的なワークフロー</h3>
        <ol className="workflow-list">
          <li>本アプリの戦略タブで疑問を入力する（漠然とした疑問でOK）</li>
          <li>「プロンプトを生成」ボタンを押す</li>
          <li>生成されたプロンプトをコピー</li>
          <li>外部AI（ChatGPT / Claude / Geminiなど）に貼り付け</li>
          <li>AIの回答を全文コピーし、本アプリに貼り戻す</li>
          <li>「検索式を抽出してStep 4へ」ボタンで自動的にPubMed検索式が抽出される</li>
          <li>「PubMed APIで検索」を実行（NCBI APIキーは任意）</li>
          <li>結果（タイトル・抄録・MeSH）が自動取得される</li>
          <li>Step 6で改善プロンプトまたは統合プロンプトを生成</li>
          <li>外部AIに再度貼り付け、改善された検索式または最終回答を取得</li>
          <li>必要に応じてループを繰り返す</li>
          <li>最終的に、PubMedで実在確認＋抄録取得によりハルシネーションをチェック</li>
        </ol>
      </section>

      <section className="how-to-use-section">
        <h3>NCBI APIキーの設定</h3>
        <p className="hint">
          以下からPubMed APIキー（NCBI APIキー）を設定できます。
          APIキーは<strong>無料・任意</strong>で、入力しなくても本アプリは利用できます。
          AIサービスのAPIキーとは別物です。
        </p>
        <SettingsPanel
          initialSettings={settings}
          onChange={onSettingsChange}
        />
      </section>
    </div>
  );
}
