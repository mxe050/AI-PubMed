import { describe, expect, it } from "vitest";
import type { ESearchResult } from "../api/esearchPubMed";
import { assessPubMedQueryTranslation } from "./assessPubMedQueryTranslation";

function result(overrides: Partial<ESearchResult> = {}): ESearchResult {
  return {
    count: 0,
    idList: [],
    warningList: [],
    errorList: [],
    ...overrides,
  };
}

describe("assessPubMedQueryTranslation", () => {
  it("treats ordinary query translation without warnings as ATM, not an error", () => {
    const assessment = assessPubMedQueryTranslation(
      "hypertension",
      result({
        queryTranslation:
          '"hypertension"[MeSH Terms] OR "hypertension"[All Fields]',
      })
    );

    expect(assessment.status).toBe("translated");
    expect(assessment.changed).toBe(true);
  });

  it("gives PubMed warnings priority over an ordinary translation", () => {
    const assessment = assessPubMedQueryTranslation(
      "madeupterm[MeSH Terms]",
      result({
        queryTranslation: "madeupterm[MeSH Terms]",
        warningList: ["No items found."],
      })
    );

    expect(assessment.status).toBe("warning");
    expect(assessment.warnings).toEqual(["No items found."]);
  });

  it("gives errors the highest priority", () => {
    const assessment = assessPubMedQueryTranslation(
      "(broken",
      result({
        warningList: ["warning"],
        errorList: ["Syntax error"],
      })
    );

    expect(assessment.status).toBe("error");
    expect(assessment.errors).toEqual(["Syntax error"]);
  });

  it("ignores whitespace-only differences and falls back to the original query", () => {
    const assessment = assessPubMedQueryTranslation(
      "heart   failure",
      result({ queryTranslation: "heart failure" })
    );
    expect(assessment.status).toBe("unchanged");

    const fallback = assessPubMedQueryTranslation("stroke", result());
    expect(fallback.translatedQuery).toBe("stroke");
    expect(fallback.translationReturned).toBe(false);
    expect(fallback.status).toBe("unchanged");
  });
});
