import { useState } from "react";
import { buildPubMedWebUrl, getPubMedUrlWarning } from "../utils/pubmedUrl";

interface Props {
  value: string;
  onChange: (value: string) => void;
  onExtractFromAi?: () => void;
}

export function SearchStringInput({ value, onChange, onExtractFromAi }: Props) {
  const [copied, setCopied] = useState(false);
  const warning = value ? getPubMedUrlWarning(value) : null;

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* fallback handled silently */
    }
  }

  function handleOpenPubMed() {
    if (!value) return;
    window.open(buildPubMedWebUrl(value), "_blank");
  }

  return (
    <div className="search-string-input">
      <h3>PubMed検索式</h3>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={4}
        placeholder="PubMed検索式をここに入力または貼り付け..."
      />
      {warning && <p className="warning-text">{warning}</p>}
      <p className="hint">
        下の「<strong>PubMed APIで検索</strong>」ボタンを押すと、このアプリ内に検索結果（タイトル・抄録・MeSH等）が表示され、自動的に次のStepへ進めます。
        「PubMedサイトで開く」は外部参照用です（検索結果はアプリに戻ってきません）。
      </p>
      <div className="button-group">
        {onExtractFromAi && (
          <button className="btn btn-secondary" onClick={onExtractFromAi}>
            AI回答から検索式を抽出
          </button>
        )}
        <button
          className="btn btn-secondary"
          onClick={handleCopy}
          disabled={!value}
        >
          {copied ? "コピーしました" : "検索式コピー"}
        </button>
        <button
          className="btn btn-secondary"
          onClick={handleOpenPubMed}
          disabled={!value}
        >
          PubMedサイトで開く（外部・参考）
        </button>
      </div>
    </div>
  );
}
