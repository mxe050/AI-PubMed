import { describe, expect, it } from "vitest";
import {
  isSrPopulationGroupDisabled,
  resolveSrEligibilityPopulationRoute,
} from "./srPopulation";

describe("isSrPopulationGroupDisabled", () => {
  it("does not disable I/C/O sections when no population group is disabled", () => {
    expect(isSrPopulationGroupDisabled(undefined, undefined)).toBe(false);
  });

  it("disables only the explicitly selected population group", () => {
    expect(isSrPopulationGroupDisabled("P2", "P2")).toBe(true);
    expect(isSrPopulationGroupDisabled("P1", "P2")).toBe(false);
    expect(isSrPopulationGroupDisabled(undefined, "P2")).toBe(false);
  });
});

describe("resolveSrEligibilityPopulationRoute", () => {
  it("allows a multiple-P workflow to continue with P1 only", () => {
    expect(
      resolveSrEligibilityPopulationRoute("multiple", {
        p: false,
        p1: true,
        p2: false,
      })
    ).toEqual({
      hasRequiredPopulationDefinition: true,
      effectivePopulationMode: "single",
      selectedPopulationRoute: "P1_ONLY",
      p1Omitted: false,
      p2Omitted: true,
    });
  });

  it("blocks a multiple-P workflow when only P2 is selected", () => {
    expect(
      resolveSrEligibilityPopulationRoute("multiple", {
        p: false,
        p1: false,
        p2: true,
      })
    ).toEqual({
      hasRequiredPopulationDefinition: false,
      effectivePopulationMode: "single",
      selectedPopulationRoute: "NONE",
      p1Omitted: true,
      p2Omitted: false,
    });
  });

  it("keeps the multiple-P route when P1 and P2 are both selected", () => {
    expect(
      resolveSrEligibilityPopulationRoute("multiple", {
        p: false,
        p1: true,
        p2: true,
      })
    ).toEqual({
      hasRequiredPopulationDefinition: true,
      effectivePopulationMode: "multiple",
      selectedPopulationRoute: "P1_P2",
      p1Omitted: false,
      p2Omitted: false,
    });
  });

  it("requires P1 in a multiple-P workflow", () => {
    expect(
      resolveSrEligibilityPopulationRoute("multiple", {
        p: false,
        p1: false,
        p2: false,
      }).hasRequiredPopulationDefinition
    ).toBe(false);
  });
});
