// Step 4 出版年フィルター
// PubMedの [PDAT] フィールドを使い、検索式に AND ("YYYY"[PDAT] : "YYYY"[PDAT]) を付加する。

export type PubDateFilterKey =
  | "none"
  | "past1"
  | "past5"
  | "past10"
  | "past20"
  | "since2000";

export interface PubDateFilter {
  key: PubDateFilterKey;
  label: string;
}

export const pubDateFilters: PubDateFilter[] = [
  { key: "none", label: "設定なし" },
  { key: "past1", label: "過去1年" },
  { key: "past5", label: "過去5年" },
  { key: "past10", label: "過去10年" },
  { key: "past20", label: "過去20年" },
  { key: "since2000", label: "2000年以降" },
];

/** 検索式に出版年フィルターを付加する */
export function applyPubDateFilter(
  baseQuery: string,
  key: PubDateFilterKey
): string {
  const trimmed = baseQuery.trim();
  if (!trimmed || key === "none") return trimmed;

  const now = new Date().getFullYear();
  let from: number;
  let to: number = now;
  switch (key) {
    case "past1":
      from = now - 1;
      break;
    case "past5":
      from = now - 5;
      break;
    case "past10":
      from = now - 10;
      break;
    case "past20":
      from = now - 20;
      break;
    case "since2000":
      from = 2000;
      to = 3000; // PubMedの慣例：上限を 3000 にすることで「以降すべて」を表現
      break;
    default:
      return trimmed;
  }

  const expr = `("${from}"[PDAT] : "${to}"[PDAT])`;
  // 動物研究除外が末尾にある場合はその前に挿入
  const animalExclusion = /\s+NOT\s+\(animals\[mh\]\s+NOT\s+humans\[mh\]\)\s*$/i;
  if (animalExclusion.test(trimmed)) {
    const stripped = trimmed.replace(animalExclusion, "");
    return `(${stripped}) AND ${expr} NOT (animals[mh] NOT humans[mh])`;
  }
  return `(${trimmed}) AND ${expr}`;
}
