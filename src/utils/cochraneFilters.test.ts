import { describe, expect, it } from "vitest";
import {
  ANIMAL_ONLY_EXCLUSION,
  COCHRANE_RCT_SENSITIVITY_MAX_EXPRESSION,
  GUIDELINE_OR_SR_SENSITIVITY_EXPRESSION,
  GUIDELINE_PRACTICAL_EXPRESSION,
  GUIDELINE_SENSITIVITY_MAX_EXPRESSION,
  PUBMED_SYSTEMATIC_SUBSET_EXPRESSION,
  SYSTEMATIC_REVIEW_CURRENT_EXPRESSION,
  SYSTEMATIC_REVIEW_SENSITIVITY_EXPRESSION,
  appendAnimalOnlyExclusion,
  applyStudyDesignFilter,
  studyDesignFilters,
} from "./cochraneFilters";

describe("Cochrane RCT filter", () => {
  it("matches the v6.5 Box 4.4.a PubMed sensitivity-maximizing core", () => {
    expect(COCHRANE_RCT_SENSITIVITY_MAX_EXPRESSION).toBe(
      "(randomized controlled trial[pt] OR controlled clinical trial[pt] OR randomized[tiab] OR placebo[tiab] OR drug therapy[sh] OR randomly[tiab] OR trial[tiab] OR groups[tiab])"
    );
    expect(studyDesignFilters.find((filter) => filter.key === "rct")?.expression)
      .toBe(COCHRANE_RCT_SENSITIVITY_MAX_EXPRESSION);
  });

  it("adds the animal-only exclusion exactly once", () => {
    expect(appendAnimalOnlyExclusion("heart failure[tiab]")).toBe(
      `(heart failure[tiab]) NOT ${ANIMAL_ONLY_EXCLUSION}`
    );
    expect(
      appendAnimalOnlyExclusion(
        "heart failure[tiab] NOT (animals [mh] NOT humans [mh])"
      )
    ).toBe(`heart failure[tiab] NOT ${ANIMAL_ONLY_EXCLUSION}`);
  });

  it("keeps a trailing animal exclusion after an applied design filter", () => {
    const rct = studyDesignFilters.find((filter) => filter.key === "rct");
    expect(rct).toBeDefined();
    const query = applyStudyDesignFilter(
      "heart failure[tiab] NOT (animals[mh] NOT humans[mh])",
      rct!
    );
    expect(query).toContain("drug therapy[sh]");
    expect(query.endsWith(`NOT ${ANIMAL_ONLY_EXCLUSION}`)).toBe(true);
    expect(query.match(/animals\[mh\]/gi)).toHaveLength(1);
  });

  it("does not pretend the non-RCT option is a validated restricting filter", () => {
    const nonRct = studyDesignFilters.find((filter) => filter.key === "non_rct");
    expect(nonRct?.expression).toBe("");
    expect(nonRct?.caution).toContain("高感度");
  });

  it("uses the lower-noise current-vocabulary guideline filter by default", () => {
    const guideline = studyDesignFilters.find(
      (filter) => filter.key === "guideline"
    );
    expect(guideline?.expression).toBe(GUIDELINE_PRACTICAL_EXPRESSION);
    expect(GUIDELINE_PRACTICAL_EXPRESSION).toContain(
      '"consensus statement"[pt]'
    );
    expect(GUIDELINE_PRACTICAL_EXPRESSION).toContain(
      '"recommendation statement"[ti]'
    );
    expect(GUIDELINE_PRACTICAL_EXPRESSION).toContain(
      "NOT (protocol[ti] OR protocols[ti])"
    );
    expect(GUIDELINE_PRACTICAL_EXPRESSION).not.toContain('"Consensus"[mh]');
    expect(GUIDELINE_PRACTICAL_EXPRESSION).not.toContain("[tiab]");
    expect(guideline?.evidenceBadge).toContain("更新後未検証");
  });

  it("retains CADTH broad only as an explicitly noisy fallback", () => {
    const broad = studyDesignFilters.find(
      (filter) => filter.key === "guideline_broad"
    );
    expect(broad?.expression).toBe(GUIDELINE_SENSITIVITY_MAX_EXPRESSION);
    expect(GUIDELINE_SENSITIVITY_MAX_EXPRESSION).toContain(
      '"Guidelines as topic"[mh:noexp]'
    );
    expect(broad?.label).toContain("大量ノイズ");
  });

  it("supplements the old PubMed systematic subset for current and unindexed reviews", () => {
    const systematic = studyDesignFilters.find(
      (filter) => filter.key === "systematic_review"
    );
    const combined = studyDesignFilters.find(
      (filter) => filter.key === "guideline_or_sr"
    );
    expect(PUBMED_SYSTEMATIC_SUBSET_EXPRESSION).toBe("systematic[sb]");
    expect(SYSTEMATIC_REVIEW_SENSITIVITY_EXPRESSION).toBe(
      SYSTEMATIC_REVIEW_CURRENT_EXPRESSION
    );
    expect(SYSTEMATIC_REVIEW_CURRENT_EXPRESSION).toContain(
      '"meta-analysis"[pt]'
    );
    expect(SYSTEMATIC_REVIEW_CURRENT_EXPRESSION).toContain(
      '"network meta-analysis"[pt]'
    );
    expect(SYSTEMATIC_REVIEW_CURRENT_EXPRESSION).toContain(
      '"eligibility criteria"[tiab]'
    );
    expect(SYSTEMATIC_REVIEW_CURRENT_EXPRESSION).toContain(
      '"scoping review"[pt]'
    );
    expect(SYSTEMATIC_REVIEW_CURRENT_EXPRESSION).toContain("scoping[ti]");
    expect(systematic?.expression).toBe(SYSTEMATIC_REVIEW_CURRENT_EXPRESSION);
    expect(combined?.expression).toBe(GUIDELINE_OR_SR_SENSITIVITY_EXPRESSION);
    expect(combined?.expression).toContain(GUIDELINE_PRACTICAL_EXPRESSION);
    expect(combined?.expression).not.toContain(
      '"Guidelines as topic"[mh:noexp]'
    );
  });
});
