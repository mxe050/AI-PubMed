// SR用：開始年月日 / 終了年月日のフリー入力 → PubMed の [PDAT] フィルター文字列を構築
// EBM の publicationDateFilter（プリセット6択）とは別物。
//
// PubMed の日付フィルター仕様：
//   ("YYYY/MM/DD"[PDAT] : "YYYY/MM/DD"[PDAT])
//   YYYY-MM-DD でも受け付けるが、慣用は YYYY/MM/DD。
//   片方だけでも可：開始のみ → 開始日以降、終了のみ → 終了日まで。

export interface SrDateRange {
  /** "YYYY-MM-DD" 形式（HTML <input type="date"> の native 値） */
  fromDate: string;
  /** "YYYY-MM-DD" 形式 */
  toDate: string;
}

/** PubMed 用の [PDAT] フィルター式を返す。何も指定が無ければ空文字。 */
export function buildSrDateRangeExpression(range: SrDateRange): string {
  const from = (range.fromDate ?? "").trim();
  const to = (range.toDate ?? "").trim();

  if (!from && !to) return "";

  const fmt = (iso: string): string => iso.replace(/-/g, "/");
  // PubMed は片方欠損の場合、極端な日付で代用するのが慣用
  // 開始のみ → 上限を 3000/12/31
  // 終了のみ → 下限を 1800/01/01
  const lo = from ? fmt(from) : "1800/01/01";
  const hi = to ? fmt(to) : "3000/12/31";

  return `("${lo}"[PDAT] : "${hi}"[PDAT])`;
}

/** baseQuery に AND で日付フィルターを付加する（動物除外フィルターがあればその前に挿入） */
export function applySrDateRange(
  baseQuery: string,
  range: SrDateRange
): string {
  const trimmed = baseQuery.trim();
  if (!trimmed) return "";
  const expr = buildSrDateRangeExpression(range);
  if (!expr) return trimmed;

  const animalExclusion = /\s+NOT\s+\(animals\[mh\]\s+NOT\s+humans\[mh\]\)\s*$/i;
  if (animalExclusion.test(trimmed)) {
    const stripped = trimmed.replace(animalExclusion, "");
    return `(${stripped}) AND ${expr} NOT (animals[mh] NOT humans[mh])`;
  }
  return `(${trimmed}) AND ${expr}`;
}
