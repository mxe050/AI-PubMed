// SR用：AI回答から ===TERMS_START=== ... ===TERMS_END=== ブロックを抽出し、
// P / I / C / O 各セクションの検索語リストにパースする。
//
// 期待されるフォーマット：
//   ===TERMS_START===
//   [P]
//   検索語: Diabetes Mellitus | 日本語訳: 糖尿病 | フィールドタグ: [MeSH] | 選定理由: 主題語
//   検索語: diabetes | 日本語訳: 糖尿病 | フィールドタグ: [tiab] | 選定理由: 自由語
//
//   [I]
//   検索語: ...
//   ...
//   ===TERMS_END===

import { extractSearchString } from "./extractSearchString";

export type SrPicoElement = "P" | "I" | "C" | "O";

export type SrFieldTag =
  | "[MeSH]"
  | "[tiab]"
  | "[tw]"
  | "[pt]"
  | "[sh]"
  | "[mh]";

export interface SrTerm {
  id: string;
  term: string;
  japanese: string;
  fieldTag: SrFieldTag;
  reason: string;
  enabled: boolean;
}

export type SrTermsByElement = Record<SrPicoElement, SrTerm[]>;

export interface ParseSrTermsResult {
  ok: boolean;
  terms?: SrTermsByElement;
  reason?: string;
  warnings: string[];
}

const TAG_NORMALIZE: Record<string, SrFieldTag> = {
  "[mh]": "[MeSH]",
  "[mesh]": "[MeSH]",
  "[MeSH]": "[MeSH]",
  "[tiab]": "[tiab]",
  "[tw]": "[tw]",
  "[pt]": "[pt]",
  "[sh]": "[sh]",
};

function normalizeTag(raw: string): SrFieldTag {
  const t = raw.trim();
  // 大括弧無し→付加して再試行
  const candidate = t.startsWith("[") ? t : `[${t}]`;
  return TAG_NORMALIZE[candidate.toLowerCase()] ?? TAG_NORMALIZE[candidate] ?? "[tiab]";
}

function parseTermLine(line: string): SrTerm | null {
  // "検索語: X | 日本語訳: Y | フィールドタグ: Z | 選定理由: W" を抽出
  // フィールドキーは「検索語/日本語訳/フィールドタグ/選定理由」を中心に、英語キー（term/japanese/tag/reason）も許容
  const segments = line.split("|").map((s) => s.trim());
  const fields: Record<string, string> = {};
  for (const seg of segments) {
    const m = seg.match(/^([^：:]+)[：:]\s*(.+)$/);
    if (m) {
      const key = m[1].trim().toLowerCase();
      fields[key] = m[2].trim();
    }
  }
  const term =
    fields["検索語"] ?? fields["term"] ?? fields["search"] ?? "";
  if (!term) return null;
  const japanese =
    fields["日本語訳"] ?? fields["japanese"] ?? fields["jp"] ?? "";
  const tagRaw =
    fields["フィールドタグ"] ?? fields["tag"] ?? fields["field"] ?? "[tiab]";
  const reason =
    fields["選定理由"] ?? fields["reason"] ?? fields["rationale"] ?? "";

  return {
    id:
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : Math.random().toString(36).slice(2),
    term,
    japanese,
    fieldTag: normalizeTag(tagRaw),
    reason,
    enabled: true,
  };
}

function createTerm(
  term: string,
  fieldTag: SrFieldTag,
  reason: string,
  japanese = ""
): SrTerm {
  return {
    id:
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : Math.random().toString(36).slice(2),
    term,
    japanese,
    fieldTag,
    reason,
    enabled: true,
  };
}

function termsFromSearchString(text: string): ParseSrTermsResult | null {
  const searchString = extractSearchString(text);
  if (!searchString) return null;

  return {
    ok: true,
    terms: {
      P: [
        createTerm(
          searchString,
          "[tiab]",
          "AI回答のPubMed検索式をそのまま抽出"
        ),
      ],
      I: [],
      C: [],
      O: [],
    },
    warnings: [
      "===TERMS_START=== ブロックがないため、AI回答内のPubMed検索式全体をStep 4へ反映しました",
    ],
  };
}

export function parseSrTermsFromAiResponse(
  text: string
): ParseSrTermsResult {
  const warnings: string[] = [];
  if (!text || !text.trim()) {
    return {
      ok: false,
      warnings,
      reason: "AI回答が空です",
    };
  }

  const blockMatch = text.match(
    /===\s*TERMS_START\s*===([\s\S]*?)===\s*TERMS_END\s*===/
  );
  if (!blockMatch) {
    const fromSearchString = termsFromSearchString(text);
    if (fromSearchString) return fromSearchString;

    return {
      ok: false,
      warnings,
      reason:
        "===TERMS_START=== と ===TERMS_END=== で囲まれたブロックが見つかりません",
    };
  }

  const lines = blockMatch[1]
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const terms: SrTermsByElement = { P: [], I: [], C: [], O: [] };
  let current: SrPicoElement | null = null;
  let unparsed = 0;

  for (const line of lines) {
    // 見出し検出: [P] / [I] / [C] / [O]、または "P", "I", "C", "O" 単独
    const headerMatch = line.match(/^\[?\s*([PICOpico])\s*\]?\s*$/);
    if (headerMatch) {
      current = headerMatch[1].toUpperCase() as SrPicoElement;
      continue;
    }

    // 検索語行
    if (/検索語|term|search/i.test(line) && line.includes(":")) {
      if (!current) {
        warnings.push(
          `セクション見出し前に検索語行が出現しました: "${line.slice(0, 60)}"`
        );
        continue;
      }
      const t = parseTermLine(line);
      if (t) {
        terms[current].push(t);
      } else {
        unparsed++;
      }
    }
  }

  const total = terms.P.length + terms.I.length + terms.C.length + terms.O.length;
  if (total === 0) {
    return {
      ok: false,
      warnings,
      reason:
        "ブロックは見つかりましたが、検索語を1件もパースできませんでした",
    };
  }
  if (unparsed > 0) {
    warnings.push(`${unparsed} 件の検索語行を完全にパースできませんでした`);
  }

  return { ok: true, terms, warnings };
}
