import { useState } from "react";
import { ClipboardCheck, Copy, Download, History } from "lucide-react";
import {
  buildSrJournalMarkdown, describeBenchmark, SR_HANDOFF_CHECKS,
  type SrSearchRecord, type SrHandoffChecks,
} from "../utils/srSearchJournal";
import { copyText, downloadText } from "../utils/textActions";

interface Props {
  records: SrSearchRecord[];
  onNoteChange: (id: string, note: string) => void;
}

export function SrSearchJournal({ records, onNoteChange }: Props) {
  const [checkState, setCheckState] = useState<{ recordId: string; values: SrHandoffChecks }>({ recordId: "", values: {} });
  const [notes, setNotes] = useState("");
  const [feedback, setFeedback] = useState("");
  const latestId = records.at(-1)?.id ?? "";
  const checks = checkState.recordId === latestId ? checkState.values : {};
  const markdown = buildSrJournalMarkdown(records, checks, notes);
  const checkedCount = SR_HANDOFF_CHECKS.filter((item) => checks[item.id]).length;

  async function copyReport() {
    try {
      await copyText(markdown);
      setFeedback("検索履歴と確認メモをコピーしました。");
    } catch {
      setFeedback("コピーできませんでした。ファイル保存をご利用ください。");
    }
  }

  return (
    <section className="sr-journal workflow-section" id="sr-search-journal">
      <header className="journal-heading">
        <div>
          <span className="section-kicker"><History size={16} aria-hidden="true" /> 検索を記録する</span>
          <h2>検索履歴・引き継ぎ</h2>
        </div>
        <span className="journal-count">{records.length}回の検索</span>
      </header>
      <p className="hint">この画面で実行したAPI検索の記録です。入力や検索語を修正しても過去の記録は残ります。ページを閉じる・再読込する前にファイル保存してください。ブラウザへの自動保存は行いません。</p>
      {records.length === 0 ? (
        <p className="journal-empty">まだ検索記録はありません。Step 7のPubMedプレビューを実行すると、検索式・日時・件数・キー論文の回収結果がここに残ります。</p>
      ) : (
        <ol className="journal-list">
          {records.map((record, index) => (
            <li key={record.id}>
              <details>
                <summary>
                  <strong>検索 {index + 1}</strong>
                  <span>{new Date(record.searchedAt).toLocaleString("ja-JP")}</span>
                  <span>{record.count.toLocaleString("ja-JP")}件ヒット / {record.retrievedPmids.length}件取得</span>
                </summary>
                <dl className="journal-metadata">
                  <div><dt>研究デザイン</dt><dd>{record.protocol.filter.label}</dd></div>
                  <div><dt>キー論文</dt><dd>{describeBenchmark(record.benchmark)}</dd></div>
                </dl>
                <pre className="journal-query" tabIndex={0}>{record.query}</pre>
                {!!record.warnings.length && <p className="warning-text">{record.warnings.join(" / ")}</p>}
                <label>変更理由・判断メモ
                  <textarea rows={2} value={record.note}
                    onChange={(event) => onNoteChange(record.id, event.target.value)}
                    placeholder="例：同義語を追加。キー論文の未回収が解消したか確認する。" />
                </label>
              </details>
            </li>
          ))}
        </ol>
      )}
      <details className="journal-handoff">
        <summary><ClipboardCheck size={17} aria-hidden="true" /> 提出前の自己確認 <span>{checkedCount} / {SR_HANDOFF_CHECKS.length}</span></summary>
        <p className="hint">チェックは最新の検索に対する人の確認記録です。再検索すると解除されます。チェック数は検索品質の点数ではありません。</p>
        {SR_HANDOFF_CHECKS.map((item) => (
          <label key={item.id} className="journal-check">
            <input type="checkbox" checked={Boolean(checks[item.id])}
              onChange={(event) => setCheckState({ recordId: latestId, values: { ...checks, [item.id]: event.target.checked } })} />
            <span>{item.label}</span>
          </label>
        ))}
        <label className="journal-notes">他のDB・追加検索・未完了の作業
          <textarea rows={4} value={notes} onChange={(event) => setNotes(event.target.value)}
            placeholder="追加するDBとプラットフォーム、検索予定、制限の理由、レビュー依頼先など。患者個人の情報は書かないでください。" />
        </label>
      </details>
      <div className="button-group">
        <button type="button" className="btn btn-secondary" onClick={() => void copyReport()} disabled={!records.length}>
          <Copy size={16} aria-hidden="true" /> 記録をコピー
        </button>
        <button type="button" className="btn btn-primary" disabled={!records.length}
          onClick={() => downloadText(markdown, "sr-search-record.md", "text/markdown")}>
          <Download size={16} aria-hidden="true" /> 記録を保存（Markdown）
        </button>
        <button type="button" className="btn btn-secondary" disabled={!records.length}
          onClick={() => downloadText(JSON.stringify({ schemaVersion: 1, records, checks, notes }, null, 2), "sr-search-record.json", "application/json")}>
          <Download size={16} aria-hidden="true" /> JSON
        </button>
      </div>
      <p role="status" className="hint">{feedback}</p>
      <p className="hint">
        PubMedのみでSRの網羅的検索は完了しません。分野に応じて他のDB・試験登録・引用追跡も検討してください。
        記録の参考：<a href="https://doi.org/10.1186/s13643-020-01542-z" target="_blank" rel="noopener noreferrer">PRISMA-S</a>、
        <a href="https://www.cochrane.org/authors/handbooks-and-manuals/handbook/current/chapter-04" target="_blank" rel="noopener noreferrer">Cochrane Handbook Chapter 4</a>。
      </p>
    </section>
  );
}
