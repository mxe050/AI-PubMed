import { describe, expect, it } from "vitest";
import { parseSrEligibilityResponse } from "./parseSrEligibilityResponse";

describe("parseSrEligibilityResponse", () => {
  it("parses operational PICO and screening criteria", () => {
    const result = parseSrEligibilityResponse(`
===ELIGIBILITY_JSON_START===
{
  "p": "成人", "i": "介入A", "c": "標準治療", "o": "有害事象",
  "studyDesigns": ["並行する比較群を持つ"],
  "settings": ["外来"], "timing": ["12週以上"],
  "inclusion": ["18歳以上"], "exclusion": ["症例報告"],
  "screeningQuestions": ["比較群があるか"],
  "methodsText": "事前に定めた基準で選択した。",
  "searchNotes": ["アウトカム語は原則検索しない"],
  "sourceOptionIds": ["P1", "I1"]
}
===ELIGIBILITY_JSON_END===`);

    expect(result.ok).toBe(true);
    expect(result.criteria?.studyDesigns[0]).toContain("比較群");
    expect(result.criteria?.sourceOptionIds).toEqual(["P1", "I1"]);
  });

  it("requires final P and I", () => {
    const result = parseSrEligibilityResponse(`
===ELIGIBILITY_JSON_START===
{"p":"", "i":"", "c":"", "o":""}
===ELIGIBILITY_JSON_END===`);
    expect(result.ok).toBe(false);
    expect(result.reason).toContain("PまたはI");
  });
});
