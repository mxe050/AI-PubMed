// SR Step 7 のインタラクティブ検索語テーブル。
// 複合Pでは P1 / P2 を別ブロックにし、各ブロック内の語だけを OR で結ぶ。

import type {
  SrPicoElement,
  SrTerm,
  SrTermsByElement,
  SrFieldTag,
} from "../utils/parseSrTermsFromAiResponse";
import type {
  SrPopulationGroup,
  SrPopulationMode,
} from "../utils/srPopulation";

interface Props {
  table: SrTermsByElement;
  onChange: (next: SrTermsByElement) => void;
  populationMode?: SrPopulationMode;
  p1Label?: string;
  p2Label?: string;
}

interface TableSection {
  key: string;
  element: SrPicoElement;
  populationGroup?: SrPopulationGroup;
  title: string;
  subtitle: string;
  cssClass: string;
}

const ELEMENT_INFO: Record<
  Exclude<SrPicoElement, "P">,
  { title: string; subtitle: string; cssClass: string }
> = {
  I: { title: "I（介入・曝露）", subtitle: "評価する介入・薬剤・処置", cssClass: "sr-section-i" },
  C: { title: "C（比較対照）", subtitle: "比較対象（通常は初期OFF）", cssClass: "sr-section-c" },
  O: { title: "O（アウトカム）", subtitle: "通常は検索式に含めない（参照用）", cssClass: "sr-section-o" },
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

function compactLabel(value: string, fallback: string): string {
  const normalized = value.trim().replace(/\s+/g, " ");
  if (!normalized) return fallback;
  return normalized.length > 72 ? `${normalized.slice(0, 72)}…` : normalized;
}

export function SrTermTable({
  table,
  onChange,
  populationMode = "single",
  p1Label = "",
  p2Label = "",
}: Props) {
  const sections: TableSection[] =
    populationMode === "multiple"
      ? [
          {
            key: "P1",
            element: "P",
            populationGroup: "P1",
            title: "P1（主となる集団・疾患）",
            subtitle: compactLabel(p1Label, "主となる集団・疾患の検索語"),
            cssClass: "sr-section-p sr-section-p1",
          },
          {
            key: "P2",
            element: "P",
            populationGroup: "P2",
            title: "P2（追加条件・特性）",
            subtitle: compactLabel(p2Label, "追加条件・特性の検索語"),
            cssClass: "sr-section-p sr-section-p2",
          },
          ...(["I", "C", "O"] as const).map((element) => ({
            key: element,
            element,
            ...ELEMENT_INFO[element],
          })),
        ]
      : [
          {
            key: "P",
            element: "P",
            title: "P（患者・問題）",
            subtitle: "対象となる患者集団・状況",
            cssClass: "sr-section-p",
          },
          ...(["I", "C", "O"] as const).map((element) => ({
            key: element,
            element,
            ...ELEMENT_INFO[element],
          })),
        ];

  function rowsFor(section: TableSection): SrTerm[] {
    const rows = table[section.element];
    if (section.element !== "P" || populationMode !== "multiple") return rows;
    if (section.populationGroup === "P2") {
      return rows.filter((row) => row.populationGroup === "P2");
    }
    return rows.filter((row) => !row.populationGroup || row.populationGroup === "P1");
  }

  function patchRow(element: SrPicoElement, id: string, patch: Partial<SrTerm>) {
    onChange({
      ...table,
      [element]: table[element].map((row) =>
        row.id === id ? { ...row, ...patch } : row
      ),
    });
  }

  function addRow(section: TableSection) {
    onChange({
      ...table,
      [section.element]: [
        ...table[section.element],
        {
          id: newRowId(),
          term: "",
          japanese: "",
          fieldTag: "[tiab]",
          reason: "",
          enabled: section.element === "P" || section.element === "I",
          populationGroup: section.populationGroup,
        },
      ],
    });
  }

  function deleteRow(element: SrPicoElement, id: string) {
    onChange({
      ...table,
      [element]: table[element].filter((row) => row.id !== id),
    });
  }

  function toggleAllInSection(section: TableSection, enabled: boolean) {
    const ids = new Set(rowsFor(section).map((row) => row.id));
    onChange({
      ...table,
      [section.element]: table[section.element].map((row) =>
        ids.has(row.id) ? { ...row, enabled } : row
      ),
    });
  }

  return (
    <div className="sr-term-table">
      {sections.map((section) => {
        const rows = rowsFor(section);
        const enabledCount = rows.filter((row) => row.enabled).length;
        return (
          <details
            key={section.key}
            className={`sr-term-section ${section.cssClass}`}
            open
          >
            <summary>
              <span className="sr-section-title"><strong>{section.title}</strong></span>
              <span className="sr-section-meta">{enabledCount} / {rows.length} 語 選択中</span>
            </summary>
            <p className="sr-section-subtitle">{section.subtitle}</p>

            {rows.length > 0 && (
              <div className="sr-section-toolbar">
                <button type="button" className="btn btn-secondary btn-xs" onClick={() => toggleAllInSection(section, true)}>
                  全選択
                </button>
                <button type="button" className="btn btn-secondary btn-xs" onClick={() => toggleAllInSection(section, false)}>
                  全解除
                </button>
              </div>
            )}

            <div className="table-scroll sr-term-grid-scroll" role="region" aria-label={`${section.title}の検索語テーブル`} tabIndex={0}>
              <table className="sr-term-grid">
                <thead>
                  <tr>
                    <th style={{ width: 40 }}>選択</th>
                    <th>検索語（英語）</th>
                    <th>日本語訳</th>
                    <th style={{ width: 110 }}>フィールド</th>
                    <th>選定理由</th>
                    <th style={{ width: 70 }}>MeSH</th>
                    <th style={{ width: 40 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, index) => (
                    <tr key={row.id}>
                      <td>
                        <input
                          type="checkbox"
                          aria-label={`${row.term || `${section.title} ${index + 1}行目`}を検索式に含める`}
                          checked={row.enabled}
                          onChange={(event) => patchRow(section.element, row.id, { enabled: event.target.checked })}
                        />
                      </td>
                      <td>
                        <input
                          type="text"
                          aria-label={`${section.title} ${index + 1}行目の検索語`}
                          value={row.term}
                          onChange={(event) => patchRow(section.element, row.id, { term: event.target.value })}
                          placeholder="例: Diabetes Mellitus"
                        />
                      </td>
                      <td>
                        <input
                          type="text"
                          aria-label={`${section.title} ${index + 1}行目の日本語訳`}
                          value={row.japanese}
                          onChange={(event) => patchRow(section.element, row.id, { japanese: event.target.value })}
                          placeholder="例: 糖尿病"
                        />
                      </td>
                      <td>
                        <select
                          aria-label={`${section.title} ${index + 1}行目のフィールドタグ`}
                          value={row.fieldTag}
                          onChange={(event) => patchRow(section.element, row.id, { fieldTag: event.target.value as SrFieldTag })}
                        >
                          {FIELD_TAG_OPTIONS.map((tag) => <option key={tag} value={tag}>{tag}</option>)}
                        </select>
                      </td>
                      <td>
                        <input
                          type="text"
                          aria-label={`${section.title} ${index + 1}行目の選定理由`}
                          value={row.reason}
                          onChange={(event) => patchRow(section.element, row.id, { reason: event.target.value })}
                          placeholder="任意"
                        />
                      </td>
                      <td>
                        {row.term.trim() ? (
                          <a
                            className="btn btn-secondary btn-xs sr-mesh-link-btn"
                            href={`https://www.ncbi.nlm.nih.gov/mesh/?term=${encodeURIComponent(row.term.trim())}`}
                            target="_blank"
                            rel="noreferrer"
                            title={`MeSH で「${row.term.trim()}」を検索`}
                          >
                            MeSH確認
                          </a>
                        ) : (
                          <span className="btn btn-secondary btn-xs sr-mesh-link-btn disabled" aria-disabled="true">MeSH確認</span>
                        )}
                      </td>
                      <td>
                        <button type="button" className="btn btn-secondary btn-xs" onClick={() => deleteRow(section.element, row.id)} aria-label={`${row.term || `${section.title} ${index + 1}行目`}を削除`}>
                          ×
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <button type="button" className="btn btn-secondary btn-sm" onClick={() => addRow(section)}>
              ＋ 行を追加
            </button>
          </details>
        );
      })}
    </div>
  );
}
