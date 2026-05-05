// SR Step 4 のインタラクティブ検索語テーブル。
// P / I / C / O 4セクション、各行に「選択チェック / 検索語 / 日本語 / フィールドタグ / 選定理由 / 削除」。

import type {
  SrPicoElement,
  SrTerm,
  SrTermsByElement,
  SrFieldTag,
} from "../utils/parseSrTermsFromAiResponse";

interface Props {
  table: SrTermsByElement;
  onChange: (next: SrTermsByElement) => void;
}

const ELEMENT_INFO: Record<
  SrPicoElement,
  { title: string; subtitle: string; cssClass: string }
> = {
  P: { title: "P（患者・問題）", subtitle: "対象となる患者集団・状況", cssClass: "sr-section-p" },
  I: { title: "I（介入・曝露）", subtitle: "評価する介入・薬剤・処置", cssClass: "sr-section-i" },
  C: { title: "C（比較対照）", subtitle: "比較対象（標準治療・プラセボ等）", cssClass: "sr-section-c" },
  O: { title: "O（アウトカム）", subtitle: "PRISMA-S：通常は検索式に含めない（参照用）", cssClass: "sr-section-o" },
};

const FIELD_TAG_OPTIONS: SrFieldTag[] = [
  "[MeSH]",
  "[tiab]",
  "[tw]",
  "[pt]",
  "[sh]",
  "[mh]",
];

function newRowId() {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);
}

export function SrTermTable({ table, onChange }: Props) {
  function update(el: SrPicoElement, newRows: SrTerm[]) {
    onChange({ ...table, [el]: newRows });
  }

  function patchRow(el: SrPicoElement, idx: number, patch: Partial<SrTerm>) {
    const rows = table[el].map((r, i) => (i === idx ? { ...r, ...patch } : r));
    update(el, rows);
  }

  function addRow(el: SrPicoElement) {
    update(el, [
      ...table[el],
      {
        id: newRowId(),
        term: "",
        japanese: "",
        fieldTag: "[tiab]",
        reason: "",
        enabled: true,
      },
    ]);
  }

  function deleteRow(el: SrPicoElement, idx: number) {
    update(
      el,
      table[el].filter((_, i) => i !== idx)
    );
  }

  function toggleAllInSection(el: SrPicoElement, enabled: boolean) {
    update(
      el,
      table[el].map((r) => ({ ...r, enabled }))
    );
  }

  return (
    <div className="sr-term-table">
      {(["P", "I", "C", "O"] as SrPicoElement[]).map((el) => {
        const rows = table[el];
        const enabledCount = rows.filter((r) => r.enabled).length;
        const info = ELEMENT_INFO[el];
        return (
          <details
            key={el}
            className={`sr-term-section ${info.cssClass}`}
            open
          >
            <summary>
              <span className="sr-section-title">
                <strong>{info.title}</strong>
              </span>
              <span className="sr-section-meta">
                {enabledCount} / {rows.length} 語 選択中
              </span>
            </summary>
            <p className="sr-section-subtitle">{info.subtitle}</p>

            {rows.length > 0 && (
              <div className="sr-section-toolbar">
                <button
                  type="button"
                  className="btn btn-secondary btn-xs"
                  onClick={() => toggleAllInSection(el, true)}
                >
                  全選択
                </button>
                <button
                  type="button"
                  className="btn btn-secondary btn-xs"
                  onClick={() => toggleAllInSection(el, false)}
                >
                  全解除
                </button>
              </div>
            )}

            <table className="sr-term-grid">
              <thead>
                <tr>
                  <th style={{ width: 40 }}>選択</th>
                  <th>検索語（英語）</th>
                  <th>日本語訳</th>
                  <th style={{ width: 110 }}>フィールド</th>
                  <th>選定理由</th>
                  <th style={{ width: 40 }}></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, idx) => (
                  <tr key={row.id}>
                    <td>
                      <input
                        type="checkbox"
                        checked={row.enabled}
                        onChange={(e) =>
                          patchRow(el, idx, { enabled: e.target.checked })
                        }
                      />
                    </td>
                    <td>
                      <input
                        type="text"
                        value={row.term}
                        onChange={(e) =>
                          patchRow(el, idx, { term: e.target.value })
                        }
                        placeholder="例: Diabetes Mellitus"
                      />
                    </td>
                    <td>
                      <input
                        type="text"
                        value={row.japanese}
                        onChange={(e) =>
                          patchRow(el, idx, { japanese: e.target.value })
                        }
                        placeholder="例: 糖尿病"
                      />
                    </td>
                    <td>
                      <select
                        value={row.fieldTag}
                        onChange={(e) =>
                          patchRow(el, idx, {
                            fieldTag: e.target.value as SrFieldTag,
                          })
                        }
                      >
                        {FIELD_TAG_OPTIONS.map((tag) => (
                          <option key={tag} value={tag}>
                            {tag}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <input
                        type="text"
                        value={row.reason}
                        onChange={(e) =>
                          patchRow(el, idx, { reason: e.target.value })
                        }
                        placeholder="任意"
                      />
                    </td>
                    <td>
                      <button
                        type="button"
                        className="btn btn-secondary btn-xs"
                        onClick={() => deleteRow(el, idx)}
                        title="この行を削除"
                      >
                        ×
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => addRow(el)}
            >
              ＋ 行を追加
            </button>
          </details>
        );
      })}
    </div>
  );
}
