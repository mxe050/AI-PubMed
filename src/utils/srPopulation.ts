export type SrPopulationMode = "single" | "multiple";

export type SrPopulationGroup = "P1" | "P2";

export type SrPopulationRelation = "AND" | "OR" | "P1_ONLY";

export interface SrPopulationStructure {
  populationMode: SrPopulationMode;
  p1: string;
  p2: string;
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
