import { describe, expect, it } from "vitest";
import type { SrTerm, SrTermsByElement } from "./parseSrTermsFromAiResponse";
import { buildSrSearchString } from "./buildSrSearchString";

function term(value: string, enabled = true): SrTerm {
  return {
    id: value,
    term: value,
    japanese: "",
    fieldTag: "[tiab]",
    reason: "",
    enabled,
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
});
