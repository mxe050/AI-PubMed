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
});
