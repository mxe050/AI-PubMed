import { describe, expect, it } from "vitest";
import { isSrPopulationGroupDisabled } from "./srPopulation";

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
