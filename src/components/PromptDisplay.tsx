import { useId, useState } from "react";
import { Check, ChevronDown, ChevronUp, Copy, Download } from "lucide-react";
import { copyText, downloadText } from "../utils/textActions";

interface Props {
  prompt: string;
  title?: string;
}

export function PromptDisplay({ prompt, title = "AI用プロンプト" }: Props) {
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [error, setError] = useState("");
  const contentId = useId();

  async function handleCopy() {
    try {
      await copyText(prompt);
      setError("");
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("コピーできませんでした。本文を選択してコピーするか、テキストを保存してください。");
    }
  }

  if (!prompt) return null;

  return (
    <div className="prompt-display">
      <div className="prompt-header">
        <h3>{title}</h3>
        <div className="prompt-tools">
          <span className="prompt-length">{prompt.length.toLocaleString("ja-JP")}文字</span>
          <button type="button" className="btn btn-copy" onClick={handleCopy}>
            {copied ? <Check size={16} aria-hidden="true" /> : <Copy size={16} aria-hidden="true" />}
            {copied ? "コピーしました" : "全文をコピー"}
          </button>
          <button type="button" className="btn btn-secondary icon-button"
            title="プロンプトをテキストファイルで保存" aria-label="プロンプトをテキストファイルで保存"
            onClick={() => downloadText(prompt, `${title}.txt`)}>
            <Download size={17} aria-hidden="true" />
          </button>
        </div>
      </div>
      <pre id={contentId} className={`prompt-text prompt-preview ${expanded ? "is-expanded" : ""}`} tabIndex={0}>{prompt}</pre>
      <div className="prompt-preview-footer">
        <button type="button" className="text-button" aria-expanded={expanded}
          aria-controls={contentId} onClick={() => setExpanded(!expanded)}>
          {expanded ? <ChevronUp size={16} aria-hidden="true" /> : <ChevronDown size={16} aria-hidden="true" />}
          {expanded ? "表示をコンパクトにする" : "本文の表示を広げる"}
        </button>
        <span role="status">{copied ? "全文をコピーしました。外部AIへ貼り付けられます。" : "コピー・保存には全文が含まれます。"}</span>
      </div>
      {error && <p role="alert" className="warning-text">{error}</p>}
    </div>
  );
}
