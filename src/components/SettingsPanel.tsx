import { useState } from "react";
import type { AppSettings } from "../types";
import { saveSettings } from "../utils/settingsStorage";

interface Props {
  initialSettings: AppSettings;
  onChange: (settings: AppSettings) => void;
}

export function SettingsPanel({ initialSettings, onChange }: Props) {
  const [settings, setSettings] = useState<AppSettings>(initialSettings);
  const [saved, setSaved] = useState(false);

  function update(partial: Partial<AppSettings>) {
    const next = { ...settings, ...partial };
    setSettings(next);
    onChange(next);
  }

  function handleSave() {
    saveSettings(settings);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="settings-panel">
      <h2>設定</h2>

      <div className="info-box">
        <h3>NCBI API key（任意）</h3>
        <p>
          PubMed APIキーを入力すると、PubMed APIへのアクセスがより安定します。
          APIキーなしでも利用できます。
        </p>
        <p>
          このキーはOpenAIやClaudeなどのAI APIキーではありません。
          PubMedを提供しているNCBIが無料で発行しているキーです。
        </p>
        <p className="warning-text">共有PCでは保存しないでください。</p>
      </div>

      <div className="form-group">
        <label htmlFor="ncbi-api-key">NCBI API key</label>
        <input
          id="ncbi-api-key"
          type="password"
          value={settings.ncbiApiKey ?? ""}
          onChange={(e) => update({ ncbiApiKey: e.target.value })}
          placeholder="NCBI API keyを入力（任意）"
        />
      </div>

      <div className="form-group checkbox-group">
        <label>
          <input
            type="checkbox"
            checked={settings.saveApiKey}
            onChange={(e) => update({ saveApiKey: e.target.checked })}
          />
          このブラウザにAPIキーを保存する
        </label>
      </div>

      <div className="form-group">
        <label htmlFor="email">email（任意）</label>
        <input
          id="email"
          type="email"
          value={settings.email ?? ""}
          onChange={(e) => update({ email: e.target.value })}
          placeholder="your-email@example.com"
        />
        <p className="hint">NCBI推奨：E-utilitiesリクエストにemailを含めると、問題発生時にNCBIから連絡が来ます。</p>
      </div>

      <button className="btn btn-primary" onClick={handleSave}>
        {saved ? "保存しました" : "設定を保存"}
      </button>

      <hr />

      <details className="api-key-guide">
        <summary>PubMed APIキーの取得手順</summary>

        <div className="guide-content">
          <h4>PubMed APIキーとは</h4>
          <p>
            PubMed APIキーとは、PubMedを提供しているNCBIが無料で発行している利用者識別用のキーです。
          </p>
          <p>
            これはOpenAI APIキーやClaude APIキーのような有料AI APIキーではありません。
            PubMed APIキーを使っても課金は発生しません。
          </p>
          <p>
            PubMed APIキーを使うと、PubMed公式APIであるE-utilitiesをより安定して利用できます。
          </p>
          <p>
            APIキーなしでも本アプリは使えますが、APIキーなしでは1秒あたり約3回まで、
            APIキーありでは標準で1秒あたり約10回までPubMed APIにアクセスできます。
          </p>

          <h4>取得手順</h4>
          <ol>
            <li>
              <a
                href="https://www.ncbi.nlm.nih.gov/account/"
                target="_blank"
                rel="noreferrer"
              >
                NCBIアカウント作成ページ
              </a>
              にアクセスします。
            </li>
            <li>
              すでにNCBIアカウントを持っている場合はログインします。
              持っていない場合は、新規アカウントを作成します。
            </li>
            <li>
              ログイン後、画面右上のユーザー名またはアカウント名をクリックします。
            </li>
            <li>「Account settings」または「Settings」を開きます。</li>
            <li>
              設定画面の中にある「API Key Management」セクションを探します。
            </li>
            <li>「Create an API Key」ボタンをクリックします。</li>
            <li>APIキーが表示されます。英数字の長い文字列です。</li>
            <li>そのAPIキーをコピーします。</li>
            <li>
              上記の「NCBI API key」欄に貼り付けます。
            </li>
            <li>
              共有PCでなければ「このブラウザに保存する」にチェックを入れて保存できます。
            </li>
          </ol>

          <h4>APIキーを使うメリット</h4>
          <ul>
            <li>PubMed検索結果件数の取得がより安定</li>
            <li>PMIDリストの取得がより安定</li>
            <li>タイトル・雑誌名・出版年の取得がより安定</li>
            <li>抄録の取得がより安定</li>
            <li>MeSH Termsの取得がより安定</li>
            <li>AIが提示したPMIDの実在確認がより安定</li>
          </ul>

          <h4>注意事項</h4>
          <ul>
            <li>PubMed APIキーは無料です。</li>
            <li>APIキーを使っても課金は発生しません。</li>
            <li>APIキーはNCBIアカウントごとに1つ発行できます。</li>
            <li>新しいAPIキーを作ると、古いAPIキーは無効になる場合があります。</li>
            <li>APIキーはAI APIキーではありません。</li>
            <li>本アプリはAI APIには一切通信しません。</li>
          </ul>
        </div>
      </details>
    </div>
  );
}
