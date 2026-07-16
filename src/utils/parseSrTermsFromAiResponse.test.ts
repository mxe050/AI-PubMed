import { describe, expect, it } from "vitest";
import { parseSrTermsFromAiResponse } from "./parseSrTermsFromAiResponse";

describe("parseSrTermsFromAiResponse", () => {
  it("accepts full-width colons and defaults to P/I-only sensitivity", () => {
    const result = parseSrTermsFromAiResponse(`
===TERMS_START===
[P]
検索語： heart failure | 日本語訳： 心不全 | フィールドタグ： [tiab] | 選定理由： 疾患
[I]
検索語： dapagliflozin | 日本語訳： ダパグリフロジン | フィールドタグ： [tiab] | 選定理由： 介入
[C]
検索語： placebo | 日本語訳： プラセボ | フィールドタグ： [tiab] | 選定理由： 比較
[O]
検索語： mortality | 日本語訳： 死亡 | フィールドタグ： [tiab] | 選定理由： 転帰
===TERMS_END===`);

    expect(result.ok).toBe(true);
    expect(result.terms?.P[0].enabled).toBe(true);
    expect(result.terms?.I[0].enabled).toBe(true);
    expect(result.terms?.C[0].enabled).toBe(false);
    expect(result.terms?.O[0].enabled).toBe(false);
    expect(result.warnings.join(" ")).toContain("C/O");
  });

  it("extracts practical search-table advice from the dedicated block", () => {
    const result = parseSrTermsFromAiResponse(`
===SEARCH_ADVICE_START===
- PとIを検索の主軸にする
・Oは既定でOFFにする
===SEARCH_ADVICE_END===
===TERMS_START===
[P]
検索語: heart failure | 日本語訳: 心不全 | フィールドタグ: [tiab] | 選定理由: 疾患
[I]
検索語: dapagliflozin | 日本語訳: ダパグリフロジン | フィールドタグ: [tiab] | 選定理由: 介入
===TERMS_END===`);

    expect(result.advice).toEqual([
      "PとIを検索の主軸にする",
      "Oは既定でOFFにする",
    ]);
  });

  it("keeps P1 and P2 terms in separate population groups", () => {
    const result = parseSrTermsFromAiResponse(`
===TERMS_START===
[P1]
検索語: diabetes | 日本語訳: 糖尿病 | フィールドタグ: [tiab] | 選定理由: P1
[P2]
検索語: obesity | 日本語訳: 肥満 | フィールドタグ: [tiab] | 選定理由: P2
[I]
検索語: semaglutide | 日本語訳: セマグルチド | フィールドタグ: [tiab] | 選定理由: 介入
===TERMS_END===`);

    expect(result.ok).toBe(true);
    expect(result.terms?.P).toHaveLength(2);
    expect(result.terms?.P[0].populationGroup).toBe("P1");
    expect(result.terms?.P[1].populationGroup).toBe("P2");
  });
});
