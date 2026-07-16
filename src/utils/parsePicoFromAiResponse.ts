// AI回答から ===PICO_START=== ... ===PICO_END=== ブロックを抽出して
// P / I / C / O と、SRで任意に使う P1 / P2 の各値を返す。

import type { SrPopulationMode } from "./srPopulation";

export interface ParsedPico {
  p: string;
  i: string;
  c: string;
  o: string;
  populationMode: SrPopulationMode;
  p1: string;
  p2: string;
}

export interface ParsePicoResult {
  ok: boolean;
  pico?: ParsedPico;
  reason?: string;
}

export function parsePicoFromAiResponse(text: string): ParsePicoResult {
  const normalized = text
    .normalize("NFKC")
    .replace(/[\u200B-\u200D\uFEFF]/g, "");

  if (!normalized || !normalized.trim()) {
    return { ok: false, reason: "AI回答が空です" };
  }

  const blockMatch = normalized.match(
    /=+\s*PICO[\s_-]*START\s*=+([\s\S]*?)=+\s*PICO[\s_-]*END\s*=+/i
  );
  if (!blockMatch) {
    return {
      ok: false,
      reason:
        "===PICO_START=== と ===PICO_END=== で囲まれたブロックが見つかりません",
    };
  }

  const block = blockMatch[1];
  const grab = (label: string): string => {
    // 「P:」「P（対象）:」「| P | 内容 |」など、高モデルの揺れを広く許容する。
    const tableRe = new RegExp(
      `^\\s*\\|\\s*${label}(?:\\s*[（(][^|]*?[）)])?\\s*\\|\\s*([^|]+?)\\s*(?:\\|.*)?$`,
      "im"
    );
    const tableMatch = block.match(tableRe);
    if (tableMatch) {
      return cleanValue(tableMatch[1]);
    }

    const re = new RegExp(
      `^\\s*${label}(?:\\s*[（(].*?[）)])?\\s*[:：\\-]\\s*(.+?)\\s*$`,
      "im"
    );
    const m = block.match(re);
    if (!m) return "";
    return cleanValue(m[1]);
  };

  function cleanValue(value: string): string {
    let v = value.trim();
    // [Patient/Problem をここに記入] 等のテンプレ残置を空扱い
    if (/^\[.*をここに記入\]$/.test(v)) v = "";
    if (/^\[.*\]$/.test(v) && /記入|here|入力/i.test(v)) v = "";
    return v;
  }

  const pico: ParsedPico = {
    p: grab("P"),
    i: grab("I"),
    c: grab("C"),
    o: grab("O"),
    populationMode: "single",
    p1: grab("P1"),
    p2: grab("P2"),
  };

  const structureMatch = block.match(
    /^\s*(?:P_STRUCTURE|P構造|Pの構造)\s*[:：-]\s*(.+?)\s*$/im
  );
  const structure = structureMatch?.[1]?.trim().toUpperCase() ?? "";
  pico.populationMode =
    (pico.p1 && pico.p2) || /MULTIPLE|複数|COMPLEX/.test(structure)
      ? "multiple"
      : "single";

  if (pico.populationMode === "single" && !pico.p1) {
    pico.p1 = pico.p;
  }

  const filled = [pico.p, pico.i, pico.c, pico.o].filter((v) => v.length > 0)
    .length;
  if (filled === 0) {
    return {
      ok: false,
      reason:
        "ブロックは見つかりましたが P / I / C / O の値を読み取れませんでした",
    };
  }

  return { ok: true, pico };
}
