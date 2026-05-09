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
