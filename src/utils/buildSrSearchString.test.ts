import { describe, expect, it } from "vitest";
import type { SrTerm, SrTermsByElement } from "./parseSrTermsFromAiResponse";
import { buildSrSearchString } from "./buildSrSearchString";

function term(
  value: string,
  enabled = true,
  populationGroup?: "P1" | "P2"
): SrTerm {
  return {
    id: value,
    term: value,
    japanese: "",
    fieldTag: "[tiab]",
    reason: "",
    enabled,
    populationGroup,
  };
}

describe("buildSrSearchString", () => {
  it("uses enabled P/I terms and leaves disabled C/O out", () => {
    const table: SrTermsByElement = {
      P: [term("heart failure")],
      I: [term("dapagliflozin")],
      C: [term("placebo", false)],
      O: [term("mortality", false)],
    };
    expect(buildSrSearchString(table)).toBe(
      '"heart failure"[tiab] AND dapagliflozin[tiab]'
    );
  });

  it("does not double-quote an already quoted phrase", () => {
    const table: SrTermsByElement = {
      P: [term('"heart failure"')], I: [], C: [], O: [],
    };
    expect(buildSrSearchString(table)).toBe('"heart failure"[tiab]');
  });

  it("preserves a complete raw PubMed expression", () => {
    const raw = '(heart failure[mh:noexp] OR "heart failure"[tiab])';
    const table: SrTermsByElement = {
      P: [term(raw)], I: [], C: [], O: [],
    };
    expect(buildSrSearchString(table)).toBe(raw);
  });

  it("requires an explicit relation and builds separate P1/P2 blocks", () => {
    const table: SrTermsByElement = {
      P: [
        term("diabetes", true, "P1"),
        term("diabetes mellitus", true, "P1"),
        term("obesity", true, "P2"),
      ],
      I: [term("semaglutide")],
      C: [],
      O: [],
    };

    expect(
      buildSrSearchString(table, {
        populationMode: "multiple",
        populationRelation: null,
      })
    ).toBe("");
    expect(
      buildSrSearchString(table, {
        populationMode: "multiple",
        populationRelation: "OR",
      })
    ).toBe(
      '((diabetes[tiab] OR "diabetes mellitus"[tiab]) OR obesity[tiab]) AND semaglutide[tiab]'
    );
    expect(
      buildSrSearchString(table, {
        populationMode: "multiple",
        populationRelation: "AND",
      })
    ).toBe(
      '((diabetes[tiab] OR "diabetes mellitus"[tiab]) AND obesity[tiab]) AND semaglutide[tiab]'
    );
  });
});
