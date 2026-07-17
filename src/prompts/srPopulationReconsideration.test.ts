import { describe, expect, it } from "vitest";
import type { SrTermsByElement } from "../utils/parseSrTermsFromAiResponse";
import { buildSrPopulationReconsiderationPrompt } from "./srPopulationReconsideration";

const terms: SrTermsByElement = {
  P: [
    {
      id: "p1",
      term: "diabetes",
      japanese: "糖尿病",
      fieldTag: "[tiab]",
      reason: "P1自由語",
      enabled: true,
      populationGroup: "P1",
    },
    {
      id: "p2",
      term: "obesity",
      japanese: "肥満",
      fieldTag: "[tiab]",
      reason: "P2自由語",
      enabled: false,
      populationGroup: "P2",
    },
  ],
  I: [],
  C: [],
  O: [],
};

describe("buildSrPopulationReconsiderationPrompt", () => {
  it("carries the full review context and compares all population strategies", () => {
    const prompt = buildSrPopulationReconsiderationPrompt({
      question: "肥満を有する糖尿病患者で介入Aは有効か",
      p: "肥満を有する糖尿病患者",
      p1: "糖尿病",
      p2: "肥満",
      i: "介入A",
      c: "標準治療",
      o: "死亡",
      knownPmids: "12345678",
      currentRelation: "P1_ONLY",
      selectionReason: "P2は本文だけに現れる可能性",
      termTable: terms,
      searchAdvice: ["P2は抄録に出にくい可能性"],
      termWarnings: ["MeSHを確認"],
      candidateQueries: {
        p1Only: "diabetes[tiab] AND intervention[tiab]",
        or: "(diabetes[tiab] OR obesity[tiab]) AND intervention[tiab]",
        and: "(diabetes[tiab] AND obesity[tiab]) AND intervention[tiab]",
      },
      designFilterLabel: "フィルターなし",
      designFilterExpression: "",
      preparationContext: {
        specialty: "糖尿病内科",
        selectedDefinitions: "P1定義と引用",
        eligibilityCriteria: "適格基準JSON",
        existingSearchStrategy: "既存SR検索式",
      },
    });

    expect(prompt).toContain("肥満を有する糖尿病患者");
    expect(prompt).toContain("P1定義と引用");
    expect(prompt).toContain("適格基準JSON");
    expect(prompt).toContain("12345678");
    expect(prompt).toContain("画面上OFF | obesity[tiab]");
    expect(prompt).toContain("P1_ONLY / OR / AND / OTHER / NEEDS_DATA");
    expect(prompt).toContain("提示されていない検索件数");
    expect(prompt).toContain("検索結果件数: 未取得");
  });
});
