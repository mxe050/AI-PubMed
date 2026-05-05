import { useState, useRef, type DragEvent, type ChangeEvent } from "react";
import { parseAbstractText, recordsToCSV } from "../utils/abstractToCSV";
import { convertNBIBtoRIS } from "../utils/nbibToRIS";

type SubTab = "csv" | "ris";

export function PubMedToolTab() {
  const [subTab, setSubTab] = useState<SubTab>("csv");

  return (
    <div className="pubmed-tool-tab">
      <header className="ebm-header">
        <h2>PubMed Tool（補助機能）</h2>
        <p className="hint">
          PubMed 由来データを扱うための補助変換ツール集です。すべてブラウザ内で完結し、
          外部 API には一切送信しません。
        </p>
        <a
          className="youtube-link-btn"
          href="https://www.youtube.com/watch?v=XuK3xJo-PH0"
          target="_blank"
          rel="noopener noreferrer"
        >
          <span className="youtube-link-btn-icon" aria-hidden="true">▶</span>
          <span>🎬 AI時代だからこそ：「専門家と学ぶPubMed検索マスター講座」</span>
        </a>
      </header>

      <nav className="pubmed-tool-subnav">
        <button
          className={`tab-button ${subTab === "csv" ? "active" : ""}`}
          onClick={() => setSubTab("csv")}
        >
          PubMed → CSV保存（抄録あり）
        </button>
        <button
          className={`tab-button ${subTab === "ris" ? "active" : ""}`}
          onClick={() => setSubTab("ris")}
        >
          PubMed nbib → ris コンバーター
        </button>
      </nav>

      <div className="pubmed-tool-body">
        {subTab === "csv" && <AbstractToCsvTool />}
        {subTab === "ris" && <NbibToRisTool />}
      </div>
    </div>
  );
}

/* =================== Abstract → CSV =================== */

function AbstractToCsvTool() {
  const [inputText, setInputText] = useState("");
  const [csvResult, setCsvResult] = useState("");
  const [recordCount, setRecordCount] = useState(0);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [dragging, setDragging] = useState(false);
  const [fileName, setFileName] = useState("pubmed_abstracts");
  const fileRef = useRef<HTMLInputElement>(null);

  function handleFile(file: File) {
    setFileName(file.name.replace(/\.[^/.]+$/, "") || "pubmed_abstracts");
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = (ev.target?.result as string) ?? "";
      setInputText(text);
      autoConvert(text);
    };
    reader.readAsText(file);
  }

  function autoConvert(text: string) {
    try {
      const records = parseAbstractText(text);
      if (records.length === 0) {
        setStatus("error");
        setErrorMsg(
          "レコードを解析できませんでした。PubMedの「Save → All results → Format: Abstract (text)」でDLしたファイルを使ってください。"
        );
        setCsvResult("");
        setRecordCount(0);
        return;
      }
      const csv = recordsToCSV(records);
      setCsvResult(csv);
      setRecordCount(records.length);
      setStatus("success");
      setErrorMsg("");
    } catch (e) {
      setStatus("error");
      setErrorMsg(e instanceof Error ? e.message : "変換中にエラーが発生しました。");
    }
  }

  function handleDrop(e: DragEvent) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }

  function handleConvertNow() {
    if (!inputText.trim()) {
      setStatus("error");
      setErrorMsg("テキストが空です。Abstract (text) ファイルをアップロードまたは貼り付けてください。");
      return;
    }
    autoConvert(inputText);
  }

  function handleDownload() {
    if (!csvResult) return;
    // BOM for Excel UTF-8 detection
    const bom = "﻿";
    const blob = new Blob([bom + csvResult], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName + ".csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function handleClear() {
    setInputText("");
    setCsvResult("");
    setRecordCount(0);
    setStatus("idle");
    setErrorMsg("");
    setFileName("pubmed_abstracts");
    if (fileRef.current) fileRef.current.value = "";
  }

  return (
    <div className="workflow-section">
      <h3>PubMed-CSV保存（抄録あり）</h3>
      <div className="ebm-design-note">
        <strong>このツールが必要な理由：</strong>
        <p>
          PubMed の <strong>Save → CSV</strong> でDLしたCSVは、なぜか
          <strong>抄録（Abstract）が含まれません</strong>。抄録付きで一括保存するには、
          PubMed で <code>Save → All results → Format: Abstract (text)</code> を選んでDLし、
          その <code>.txt</code> ファイルをここでアップしてCSVに変換します。
        </p>
        <p>
          抄録は改行が多くExcel上で見にくいため、本ツールでは
          <strong>改行を1スペースに整形して1セルに収める</strong>処理を行っています。
        </p>
      </div>

      <div
        className={`drop-zone ${dragging ? "drop-zone-active" : ""}`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileRef.current?.click()}
      >
        <p className="drop-zone-main">
          📄 Abstract (text) ファイルをドラッグ＆ドロップ
        </p>
        <p className="drop-zone-sub">
          または <strong>クリック</strong>してファイルを選択（<code>.txt</code>）
        </p>
        <p className="drop-zone-hint">
          ※ DLしたファイルはこのアプリ外には送信されません（ブラウザ内処理のみ）。
        </p>
        <input
          ref={fileRef}
          type="file"
          accept=".txt,.text"
          style={{ display: "none" }}
          onChange={handleFileChange}
        />
      </div>

      {inputText && (
        <div className="form-group" style={{ marginTop: 16 }}>
          <label>取り込んだテキスト（編集可・再変換可）</label>
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            rows={6}
            style={{ width: "100%", fontFamily: "monospace", fontSize: "0.85rem" }}
          />
          <div className="button-group" style={{ marginTop: 8 }}>
            <button className="btn btn-primary" onClick={handleConvertNow}>
              CSVに再変換
            </button>
            <button className="btn btn-secondary" onClick={handleClear}>
              クリア
            </button>
          </div>
        </div>
      )}

      {status === "error" && (
        <div className="ebm-no-filter-note" style={{ marginTop: 12 }}>
          <strong>⚠ エラー：</strong> {errorMsg}
        </div>
      )}

      {status === "success" && (
        <div className="form-group" style={{ marginTop: 16 }}>
          <label>
            変換結果（{recordCount} 件のレコード）
          </label>
          <textarea
            readOnly
            value={
              csvResult.length > 4000
                ? csvResult.slice(0, 4000) + "\n…(以下省略・DLには全件含まれます)"
                : csvResult
            }
            rows={10}
            style={{ width: "100%", fontFamily: "monospace", fontSize: "0.8rem" }}
          />
          <div className="form-group" style={{ marginTop: 8 }}>
            <label>保存ファイル名</label>
            <input
              type="text"
              value={fileName}
              onChange={(e) => setFileName(e.target.value)}
              placeholder="pubmed_abstracts"
            />
          </div>
          <div className="button-group">
            <button className="btn btn-primary" onClick={handleDownload}>
              CSVをダウンロード
            </button>
            <button className="btn btn-secondary" onClick={handleClear}>
              クリア
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* =================== NBIB → RIS =================== */

function NbibToRisTool() {
  const [inputText, setInputText] = useState("");
  const [risResult, setRisResult] = useState("");
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [copyMsg, setCopyMsg] = useState("");
  const [dragging, setDragging] = useState(false);
  const [fileName, setFileName] = useState("citations");
  const fileRef = useRef<HTMLInputElement>(null);

  function autoConvert(text: string) {
    try {
      const result = convertNBIBtoRIS(text);
      setRisResult(result);
      setStatus("success");
      setErrorMsg("");
    } catch (err) {
      setStatus("error");
      setErrorMsg(err instanceof Error ? err.message : "変換エラー");
      setRisResult("");
    }
  }

  function handleFile(file: File) {
    setFileName(file.name.replace(/\.[^/.]+$/, "") || "citations");
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = (ev.target?.result as string) ?? "";
      setInputText(text);
      autoConvert(text);
    };
    reader.readAsText(file);
  }

  function handleDrop(e: DragEvent) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }

  function handleConvertNow() {
    if (!inputText.trim()) {
      setStatus("error");
      setErrorMsg("テキストが空です。.nbib ファイルをアップロードまたは貼り付けてください。");
      return;
    }
    autoConvert(inputText);
  }

  function handleDownload() {
    if (!risResult) return;
    const blob = new Blob([risResult], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName + ".ris";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  async function handleCopy() {
    if (!risResult) return;
    await navigator.clipboard.writeText(risResult);
    setCopyMsg("コピーしました");
    setTimeout(() => setCopyMsg(""), 1800);
  }

  function handleClear() {
    setInputText("");
    setRisResult("");
    setStatus("idle");
    setErrorMsg("");
    setCopyMsg("");
    setFileName("citations");
    if (fileRef.current) fileRef.current.value = "";
  }

  return (
    <div className="workflow-section">
      <h3>PubMed nbib → ris コンバーター</h3>
      <div className="ebm-design-note">
        <strong>このツールが必要な理由：</strong>
        <p>
          PubMed の <strong>Send to → Citation manager</strong> でDLされる形式は <code>.nbib</code>（NLM/Medline形式）です。
          しかし EndNote / Mendeley / Zotero などの文献管理ソフトの多くは
          <strong> RIS 形式（.ris）</strong> を標準のインポート形式として広く採用しています。
        </p>
        <p>
          このツールは <code>.nbib</code> を <code>.ris</code> に変換します。
          PMID / Title / Authors / Abstract / Journal / Year / Vol / Issue / Pages / DOI / Language を
          RIS の対応タグ（AN・ID / TI / AU / AB / JF・JO / PY / VL / IS / SP・EP / DO / LA）にマッピングします。
        </p>
      </div>

      <div
        className={`drop-zone ${dragging ? "drop-zone-active" : ""}`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileRef.current?.click()}
      >
        <p className="drop-zone-main">📄 .nbib ファイルをドラッグ＆ドロップ</p>
        <p className="drop-zone-sub">
          または <strong>クリック</strong>してファイルを選択（<code>.nbib</code> / <code>.txt</code>）
        </p>
        <p className="drop-zone-hint">
          ※ ブラウザ内変換のみ。サーバへの送信はありません。
        </p>
        <input
          ref={fileRef}
          type="file"
          accept=".nbib,.txt"
          style={{ display: "none" }}
          onChange={handleFileChange}
        />
      </div>

      {inputText && (
        <div className="form-group" style={{ marginTop: 16 }}>
          <label>NBIB入力（編集可・再変換可）</label>
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            rows={8}
            style={{ width: "100%", fontFamily: "monospace", fontSize: "0.85rem" }}
          />
          <div className="button-group" style={{ marginTop: 8 }}>
            <button className="btn btn-primary" onClick={handleConvertNow}>
              RISに再変換
            </button>
            <button className="btn btn-secondary" onClick={handleClear}>
              クリア
            </button>
          </div>
        </div>
      )}

      {status === "error" && (
        <div className="ebm-no-filter-note" style={{ marginTop: 12 }}>
          <strong>⚠ エラー：</strong> {errorMsg}
        </div>
      )}

      {status === "success" && (
        <div className="form-group" style={{ marginTop: 16 }}>
          <label>RIS出力</label>
          <textarea
            readOnly
            value={risResult}
            rows={10}
            style={{ width: "100%", fontFamily: "monospace", fontSize: "0.85rem" }}
          />
          <div className="form-group" style={{ marginTop: 8 }}>
            <label>保存ファイル名</label>
            <input
              type="text"
              value={fileName}
              onChange={(e) => setFileName(e.target.value)}
              placeholder="citations"
            />
          </div>
          <div className="button-group">
            <button className="btn btn-primary" onClick={handleDownload}>
              .ris をダウンロード
            </button>
            <button className="btn btn-secondary" onClick={handleCopy}>
              {copyMsg || "RISをコピー"}
            </button>
            <button className="btn btn-secondary" onClick={handleClear}>
              クリア
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
