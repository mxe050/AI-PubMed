// SR Step 4：P/I/C/研究デザインを個別にコピーできる構造化検索式アコーディオン。
// Cochrane 方式：各ブロックを Advanced Search の History に分けて入れたい場合に便利。

import { useState } from "react";
import type { SrPicoElement } from "../utils/parseSrTermsFromAiResponse";
import type { SrPopulationSearchBlocks } from "../utils/buildSrSearchString";
import type {
  SrPopulationMode,
  SrPopulationRelation,
} from "../utils/srPopulation";

interface Props {
  perElement: Record<SrPicoElement, string>;
  designFilterExpression: string;
  populationMode?: SrPopulationMode;
  populationRelation?: SrPopulationRelation | null;
  populationBlocks?: SrPopulationSearchBlocks;
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
  populationMode = "single",
  populationRelation = null,
  populationBlocks,
}: Props) {
  return (
    <details className="sr-structured-accordion">
      <summary>
        <strong>
          論文記載用：P / I / C / 研究デザインを分けた検索式（個別コピー）
        </strong>
      </summary>
      <p className="hint">
        ここは実行・報告用の行別ブロックです。P、I、必要な場合のみC、研究デザインを
        PubMed Advanced SearchのHistoryへ個別に登録し、最後にANDで結合してください。
        Oは通常、最終検索式には含めません。以下から各ブロックを個別にコピーできます。
      </p>

      {populationMode === "multiple" && populationBlocks ? (
        <>
          <div className="sr-structured-population-note">
            {populationRelation === "P1_ONLY" ? (
              <>
                最終検索式には<strong> P1のみ </strong>を使用します。P2は検索式へ入れず、
                適格基準とスクリーニングで確認します。
              </>
            ) : (
              <>
                複合Pは、P1とP2を別々に保存したうえで、最終的に
                <strong> {populationRelation ?? "AND／OR未選択"} </strong>
                で結合した行も保存します。
              </>
            )}
          </div>
          <BlockRow label="P1（主となる集団・疾患）" query={populationBlocks.p1} />
          <BlockRow
            label={populationRelation === "P1_ONLY"
              ? "P2（参考・最終検索式では不使用）"
              : "P2（追加条件・特性）"}
            query={populationBlocks.p2}
          />
          <BlockRow
            label={populationRelation === "P1_ONLY"
              ? "P（P1のみ）"
              : `P（P1 ${populationRelation ?? "?"} P2）`}
            query={populationBlocks.combined}
          />
        </>
      ) : (
        <BlockRow label={ELEMENT_LABEL.P} query={perElement.P} />
      )}

      {(["I", "C", "O"] as SrPicoElement[]).map((el) => (
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
