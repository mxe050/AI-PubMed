import { describe, expect, it } from "vitest";
import { parsePicoFromAiResponse } from "./parsePicoFromAiResponse";

describe("parsePicoFromAiResponse", () => {
  it("parses an SR population split without changing the full P", () => {
    const result = parsePicoFromAiResponse(`
===PICO_START===
P: 肥満を有する2型糖尿病患者
P_STRUCTURE: MULTIPLE
P1: 2型糖尿病患者
P2: 肥満
I: GLP-1受容体作動薬
C: 標準治療
O: 体重減少
===PICO_END===`);

    expect(result.ok).toBe(true);
    expect(result.pico).toMatchObject({
      p: "肥満を有する2型糖尿病患者",
      populationMode: "multiple",
      p1: "2型糖尿病患者",
      p2: "肥満",
    });
  });

  it("keeps an existing PICO block backward compatible", () => {
    const result = parsePicoFromAiResponse(`
===PICO_START===
P: 心不全患者
I: 介入A
C:
O: 死亡
===PICO_END===`);

    expect(result.ok).toBe(true);
    expect(result.pico?.populationMode).toBe("single");
    expect(result.pico?.p1).toBe("心不全患者");
    expect(result.pico?.p2).toBe("");
  });
});
