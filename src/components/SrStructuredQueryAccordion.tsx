// SR Step 4：P/I/C/研究デザインを個別にコピーできる構造化検索式アコーディオン。
// Cochrane 方式：各ブロックを Advanced Search の History に分けて入れたい場合に便利。

import { useState } from "react";
import type { SrPicoElement } from "../utils/parseSrTermsFromAiResponse";

interface Props {
  perElement: Record<SrPicoElement, string>;
  designFilterExpression: string;
}

const ELEMENT_LABEL: Record<SrPicoElement, string> = {
  P: "P（患者・問題）",
  I: "I（介入）",
  C: "C（比較対照）",
  O: "O（アウトカム・参考）",
};

export function SrStructuredQueryAccordion({
  perElement,
  designFilterExpression,
}: Props) {
  return (
    <details className="sr-structured-accordion">
      <summary>
        <strong>構造化検索式（P/I/C/D を個別にコピー）</strong>
      </summary>
      <p className="hint">
        Cochrane 等の SR では、P・I・C・研究デザインをそれぞれ個別に PubMed
        Advanced Search で検索し、最後に AND
        で結合する方法を使います。以下から各ブロックを個別にコピーできます。
      </p>

      {(["P", "I", "C", "O"] as SrPicoElement[]).map((el) => (
        <BlockRow
          key={el}
          label={ELEMENT_LABEL[el]}
          query={perElement[el]}
        />
      ))}

      {designFilterExpression && (
        <BlockRow
          label="研究デザインフィルター"
          query={designFilterExpression}
        />
      )}

      <div className="form-group" style={{ marginTop: 12 }}>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => {
            window.open(
              "https://pubmed.ncbi.nlm.nih.gov/advanced/",
              "_blank",
              "noopener,noreferrer"
            );
          }}
        >
          PubMed Advanced Search を開く（空の状態）
        </button>
      </div>
    </details>
  );
}

function BlockRow({ label, query }: { label: string; query: string }) {
  const [copyMsg, setCopyMsg] = useState("");

  async function copy() {
    if (!query) return;
    try {
      await navigator.clipboard.writeText(query);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = query;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    setCopyMsg("コピーしました");
    setTimeout(() => setCopyMsg(""), 1800);
  }

  return (
    <div className="sr-structured-block">
      <div className="sr-structured-block-header">
        <strong>{label}</strong>
        <button
          type="button"
          className="btn btn-secondary btn-xs"
          onClick={copy}
          disabled={!query}
        >
          {copyMsg || "コピー"}
        </button>
      </div>
      <pre className="sr-structured-block-query">
        {query || "（該当する検索語が選択されていません）"}
      </pre>
    </div>
  );
}
