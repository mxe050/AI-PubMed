// AI回答から ===PICO_START=== ... ===PICO_END=== ブロックを抽出して
// P / I / C / O の各値を返す。

export interface ParsedPico {
  p: string;
  i: string;
  c: string;
  o: string;
}

export interface ParsePicoResult {
  ok: boolean;
  pico?: ParsedPico;
  reason?: string;
}

export function parsePicoFromAiResponse(text: string): ParsePicoResult {
  if (!text || !text.trim()) {
    return { ok: false, reason: "AI回答が空です" };
  }

  const blockMatch = text.match(
    /===\s*PICO_START\s*===([\s\S]*?)===\s*PICO_END\s*===/
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
    // 行頭から「P:」「I:」「C:」「O:」を探す。括弧書きや全角コロンも許容。
    const re = new RegExp(`^\\s*${label}\\s*[:：]\\s*(.+?)\\s*$`, "im");
    const m = block.match(re);
    if (!m) return "";
    let v = m[1].trim();
    // [Patient/Problem をここに記入] 等のテンプレ残置を空扱い
    if (/^\[.*をここに記入\]$/.test(v)) v = "";
    if (/^\[.*\]$/.test(v) && /記入|here|入力/i.test(v)) v = "";
    return v;
  };

  const pico: ParsedPico = {
    p: grab("P"),
    i: grab("I"),
    c: grab("C"),
    o: grab("O"),
  };

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
