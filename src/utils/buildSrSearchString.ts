// SR用：P / I / C / O 検索語テーブルから PubMed 検索式を組み立てる純粋関数。
//
// ルール：
// - 同一PICO要素内のチェック済み（enabled）検索語は OR で結合
// - 各要素ブロック（P / I / C / O）は AND で結合
// - 各検索語にはフィールドタグを付加（[MeSH] は PubMed の正規表記、それ以外はそのまま）
// - 検索語が空・チェック無しの要素は無視
// - 動物研究除外は呼び出し側で必要に応じて付加

import type { SrTerm, SrTermsByElement, SrPicoElement } from "./parseSrTermsFromAiResponse";
import type {
  SrPopulationMode,
  SrPopulationRelation,
} from "./srPopulation";

const ELEMENT_ORDER: SrPicoElement[] = ["P", "I", "C", "O"];

export interface SrSearchBuildOptions {
  populationMode?: SrPopulationMode;
  populationRelation?: SrPopulationRelation | null;
}

export interface SrPopulationSearchBlocks {
  p1: string;
  p2: string;
  combined: string;
  ready: boolean;
}

function formatTerm(t: SrTerm): string {
  const term = t.term.trim();
  if (!term) return "";
  // フィールドタグや Boolean 構文を含む完全検索式は、そのまま扱う。
  if (/\[[^\]]+\]/.test(term) || /\b(?:AND|OR|NOT)\b|[()]/i.test(term)) {
    return term;
  }

  // 複数語の場合は引用符で囲む（PubMed の慣例）
  const needsQuote = /\s/.test(term) && !/^"[\s\S]*"$/.test(term);
  const body = needsQuote ? `"${term}"` : term;
  return `${body}${t.fieldTag}`;
}

/** 1要素分の OR 結合を返す。enabled が無ければ空。 */
function buildElementBlock(terms: SrTerm[]): string {
  const enabled = terms
    .filter((t) => t.enabled && t.term.trim().length > 0)
    .map(formatTerm)
    .filter((s) => s.length > 0);
  if (enabled.length === 0) return "";
  if (enabled.length === 1) return enabled[0];
  return `(${enabled.join(" OR ")})`;
}

export function buildSrPopulationSearchBlocks(
  terms: SrTerm[],
  options: SrSearchBuildOptions = {}
): SrPopulationSearchBlocks {
  if (options.populationMode !== "multiple") {
    const combined = buildElementBlock(terms);
    return { p1: combined, p2: "", combined, ready: Boolean(combined) };
  }

  const p1 = buildElementBlock(
    terms.filter((term) => !term.populationGroup || term.populationGroup === "P1")
  );
  const p2 = buildElementBlock(
    terms.filter((term) => term.populationGroup === "P2")
  );
  if (options.populationRelation === "P1_ONLY") {
    return { p1, p2, combined: p1, ready: Boolean(p1) };
  }

  const relation = options.populationRelation;
  const ready = Boolean(p1 && p2 && relation);
  const combined = ready && relation ? `(${p1} ${relation} ${p2})` : "";
  return { p1, p2, combined, ready };
}

/** P/I/C/O のブロックを AND 結合した検索式を返す。空なら空文字。 */
export function buildSrSearchString(
  table: SrTermsByElement,
  options: SrSearchBuildOptions = {}
): string {
  const population = buildSrPopulationSearchBlocks(table.P, options);
  if (options.populationMode === "multiple" && !population.ready) return "";

  const blocks = ELEMENT_ORDER.map((el) =>
    el === "P" ? population.combined : buildElementBlock(table[el])
  ).filter((b) => b.length > 0);
  if (blocks.length === 0) return "";
  return blocks.join(" AND ");
}

/** 各要素単独の検索式を返す（構造化検索式アコーディオン用） */
export function buildSrSearchStringPerElement(
  table: SrTermsByElement,
  options: SrSearchBuildOptions = {}
): Record<SrPicoElement, string> {
  const population = buildSrPopulationSearchBlocks(table.P, options);
  return {
    P: population.combined,
    I: buildElementBlock(table.I),
    C: buildElementBlock(table.C),
    O: buildElementBlock(table.O),
  };
}
