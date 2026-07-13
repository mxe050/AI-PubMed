import { useState } from "react";

interface Props {
  prompt: string;
  title?: string;
}

export function PromptDisplay({ prompt, title = "AI用プロンプト" }: Props) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(prompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = prompt;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  if (!prompt) return null;

  return (
    <div className="prompt-display">
      <div className="prompt-header">
        <h3>{title}</h3>
        <button type="button" className="btn btn-copy" onClick={handleCopy}>
          {copied ? "コピーしました" : "コピー"}
        </button>
      </div>
      <pre className="prompt-text">{prompt}</pre>
    </div>
  );
}
