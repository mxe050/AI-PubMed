export type SrPopulationMode = "single" | "multiple";

export type SrPopulationGroup = "P1" | "P2";

export type SrPopulationRelation = "AND" | "OR" | "P1_ONLY";

export interface SrPopulationStructure {
  populationMode: SrPopulationMode;
  p1: string;
  p2: string;
}

export interface SrEligibilityPopulationRoute {
  hasRequiredPopulationDefinition: boolean;
  effectivePopulationMode: SrPopulationMode;
  selectedPopulationRoute: "P" | "P1_ONLY" | "P1_P2" | "NONE";
  p1Omitted: boolean;
  p2Omitted: boolean;
}

export function resolveSrEligibilityPopulationRoute(
  populationMode: SrPopulationMode,
  selected: { p: boolean; p1: boolean; p2: boolean }
): SrEligibilityPopulationRoute {
  if (populationMode === "single") {
    return {
      hasRequiredPopulationDefinition: selected.p,
      effectivePopulationMode: "single",
      selectedPopulationRoute: selected.p ? "P" : "NONE",
      p1Omitted: false,
      p2Omitted: false,
    };
  }

  const hasBothSplitPopulations = selected.p1 && selected.p2;
  return {
    hasRequiredPopulationDefinition: selected.p1,
    effectivePopulationMode: hasBothSplitPopulations ? "multiple" : "single",
    selectedPopulationRoute: hasBothSplitPopulations
      ? "P1_P2"
      : selected.p1
        ? "P1_ONLY"
        : "NONE",
    p1Omitted: !selected.p1,
    p2Omitted: !selected.p2,
  };
}

export function isSrPopulationGroupDisabled(
  sectionGroup?: SrPopulationGroup,
  disabledGroup?: SrPopulationGroup
): boolean {
  return Boolean(disabledGroup && sectionGroup === disabledGroup);
}

export function hasCompleteSplitPopulation(
  value: SrPopulationStructure
): boolean {
  return (
    value.populationMode === "multiple" &&
    value.p1.trim().length > 0 &&
    value.p2.trim().length > 0
  );
}
