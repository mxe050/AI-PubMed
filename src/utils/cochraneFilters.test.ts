import { describe, expect, it } from "vitest";
import {
  ANIMAL_ONLY_EXCLUSION,
  COCHRANE_RCT_SENSITIVITY_MAX_EXPRESSION,
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
});
