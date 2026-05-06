// 「低モデル用ハルシネーション防止プロンプト」モード選択時に表示する
// プロバイダ別ハルシネーション対策の比較表＋参考資料リスト。
//
// 表は (項目, プロバイダ) を 1 行とする正規化テーブル。
// - カテゴリ別フィルター
// - プロバイダ別フィルター
// - 「記載なし」を非表示にするトグル
// を備える。

import { Fragment, useMemo, useState } from "react";
import {
  hallucinationStrategies,
  HS_CATEGORY_LABEL,
  HS_REFERENCES,
  type HsRow,
  type HsProvider,
} from "../data/hallucinationStrategies";

const PROVIDERS: HsProvider[] = ["OpenAI", "Anthropic", "Google/Gemini"];

const PROVIDER_COLORS: Record<HsProvider, string> = {
  OpenAI: "#10a37f",
  Anthropic: "#d97706",
  "Google/Gemini": "#4285f4",
};

export function HallucinationStrategiesTable() {
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedProvider, setSelectedProvider] = useState<HsProvider | "all">(
    "all"
  );
  const [hideNotRecorded, setHideNotRecorded] = useState(true);

  const categories = useMemo(() => {
    const set = new Set<string>();
    hallucinationStrategies.forEach((r) => set.add(r.category));
    return Array.from(set);
  }, []);

  const filtered = useMemo<HsRow[]>(() => {
    return hallucinationStrategies.filter((r) => {
      if (selectedCategory !== "all" && r.category !== selectedCategory)
        return false;
      if (selectedProvider !== "all" && r.provider !== selectedProvider)
        return false;
      if (hideNotRecorded && !r.recorded) return false;
      return true;
    });
  }, [selectedCategory, selectedProvider, hideNotRecorded]);

  // 同じ項目 ID ごとにまとめてセクション化
  const grouped = useMemo(() => {
    const map = new Map<number, { item: string; category: string; rows: HsRow[] }>();
    filtered.forEach((r) => {
      const key = r.id;
      if (!map.has(key)) {
        map.set(key, { item: r.item, category: r.category, rows: [] });
      }
      map.get(key)!.rows.push(r);
    });
    return Array.from(map.entries()).map(([id, v]) => ({ id, ...v }));
  }, [filtered]);

  return (
    <div className="hs-strategies">
      <div className="hs-strategies-header">
        <h3>📊 OpenAI / Anthropic / Google(Gemini) のハルシネーション対策比較</h3>
        <p className="hint">
          各社の公式・準公式ドキュメントから整理した 36 項目 × 3 プロバイダの正規化テーブル。
          プロンプト設計・運用設計の参考に。
          「記載なし」は公式ハルシネーション低減ページに明記がない、または提示文での扱いが弱いことを示します。
        </p>
      </div>

      {/* フィルター */}
      <div className="hs-filter-bar">
        <div className="hs-filter-group">
          <label>カテゴリ：</label>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
          >
            <option value="all">すべて</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {HS_CATEGORY_LABEL[c] ?? c}
              </option>
            ))}
          </select>
        </div>

        <div className="hs-filter-group">
          <label>プロバイダ：</label>
          <select
            value={selectedProvider}
            onChange={(e) =>
              setSelectedProvider(e.target.value as HsProvider | "all")
            }
          >
            <option value="all">すべて</option>
            {PROVIDERS.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>

        <div className="hs-filter-group">
          <label>
            <input
              type="checkbox"
              checked={hideNotRecorded}
              onChange={(e) => setHideNotRecorded(e.target.checked)}
            />
            「記載なし」を非表示
          </label>
        </div>

        <div className="hs-filter-summary">
          {filtered.length} 行 / 全 {hallucinationStrategies.length} 行
        </div>
      </div>

      {/* テーブル本体（項目ごとにグループ化） */}
      <div className="hs-table-wrap">
        <table className="hs-table">
          <thead>
            <tr>
              <th style={{ width: 50 }}>No.</th>
              <th>項目 / プロバイダ</th>
              <th>考え方・対策</th>
              <th>必要とされる理由</th>
            </tr>
          </thead>
          <tbody>
            {grouped.map((g) => (
              <Fragment key={g.id}>
                <tr className="hs-item-row">
                  <td className="hs-item-id">{g.id}</td>
                  <td colSpan={3} className="hs-item-name">
                    <span className="hs-category-badge">
                      {HS_CATEGORY_LABEL[g.category] ?? g.category}
                    </span>
                    <strong>{g.item}</strong>
                  </td>
                </tr>
                {g.rows.map((r, idx) => (
                  <tr key={`row-${g.id}-${idx}`} className="hs-provider-row">
                    <td></td>
                    <td className="hs-provider-cell">
                      <span
                        className="hs-provider-dot"
                        style={{ background: PROVIDER_COLORS[r.provider] }}
                        aria-hidden="true"
                      />
                      {r.provider}
                    </td>
                    <td className={r.policy === "記載なし" ? "hs-na" : ""}>
                      {r.policy}
                    </td>
                    <td className={r.reason === "記載なし" ? "hs-na" : ""}>
                      {r.reason}
                    </td>
                  </tr>
                ))}
              </Fragment>
            ))}
            {grouped.length === 0 && (
              <tr>
                <td colSpan={4} style={{ textAlign: "center", padding: 20 }}>
                  該当する行がありません。フィルター条件を変えてください。
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* 参考資料 */}
      <div className="hs-references">
        <h4>📚 参考資料</h4>
        <ul>
          {HS_REFERENCES.map((r) => (
            <li key={r.url}>
              <strong>{r.label}</strong>
              <br />
              <a href={r.url} target="_blank" rel="noreferrer">
                {r.url}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
