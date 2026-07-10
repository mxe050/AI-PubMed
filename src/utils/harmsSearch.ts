export type HarmsSearchMode = "known" | "broad" | "rare";
export type HarmsInterventionType = "drug" | "surgery" | "device" | "other";

export interface HarmsSearchInput {
  intervention: string;
  population?: string;
  specificHarm?: string;
  mode: HarmsSearchMode;
  interventionType?: HarmsInterventionType;
  includePopulation?: boolean;
  excludeAnimalOnly?: boolean;
}

/**
 * Updated high-sensitivity adverse-drug-effects filter from Golder et al.
 * The reported 90% figure is relative recall in an Ovid MEDLINE validation
 * set—not absolute sensitivity and not a validation of this PubMed rendering.
 */
export const DRUG_HARMS_SENSITIVE_EXPRESSION =
  '"adverse effects"[sh] OR safe*[tiab] OR "drug effects"[sh] OR adverse[tiab] OR complications[sh] OR "side effect*"[tiab] OR complication*[tiab] OR "chemically induced"[sh] OR tolerated[tiab] OR tolerance[tiab] OR harm*[tiab] OR toxicity[tiab] OR risk[ti] OR "Pregnancy Complications/drug therapy"[mh] OR "Clinical Trial, Phase IV"[pt] OR "Drug Hypersensitivity"[mh] OR tolerability[tiab] OR toxicity[sh] OR "Toxicology"[mh] OR "drug induced"[tiab] OR "negative effects"[tiab]';

/** Lower-noise practical drug filter. This reconstruction is not validated. */
export const DRUG_HARMS_BALANCED_EXPRESSION =
  '"Drug-Related Side Effects and Adverse Reactions"[mh] OR "Product Surveillance, Postmarketing"[mh] OR "Clinical Trial, Phase IV"[pt] OR "Drug Hypersensitivity"[mh] OR "adverse effect*"[tiab] OR "adverse event*"[tiab] OR "adverse reaction*"[tiab] OR "side effect*"[tiab] OR safety[tiab] OR harm*[tiab] OR toxic*[tiab] OR tolerability[tiab] OR pharmacovigilance[tiab] OR postmarket*[tiab] OR "drug induced"[tiab] OR "treatment emergent"[tiab]';

/** Surgical filter: 87% relative recall in its MEDLINE validation set. */
export const SURGERY_HARMS_EXPRESSION =
  'complication*[tiab] OR "adverse effects"[sh] OR safe*[tiab] OR complications[sh] OR "Postoperative Complications"[mh]';

/** Device-oriented PubMed practical rendering; add device-specific failure modes. */
export const DEVICE_HARMS_EXPRESSION =
  'complication*[tiab] OR "adverse effects"[sh] OR complications[sh] OR safe*[tiab] OR safety[tiab] OR failure*[tiab] OR failed[tiab] OR malfunction*[tiab] OR breakag*[tiab] OR migration[tiab] OR loosen*[tiab] OR removal[tiab] OR displacement[tiab] OR discomfort[tiab] OR "device related"[tiab] OR "device-related"[tiab] OR recall*[tiab] OR "Equipment Failure"[mh] OR "Equipment Safety"[mh]';

/** Generic non-drug fallback. It is a discovery aid, not a validated filter. */
export const GENERIC_HARMS_SENSITIVE_EXPRESSION =
  '"adverse effects"[sh] OR "complications"[sh] OR "poisoning"[sh] OR "toxicity"[sh] OR "adverse effect*"[tiab] OR "adverse event*"[tiab] OR "adverse reaction*"[tiab] OR "side effect*"[tiab] OR harm*[tiab] OR safety[tiab] OR tolerability[tiab] OR toxic*[tiab] OR complication*[tiab]';

/**
 * Sources/designs that can reveal rare or delayed harms. It is intentionally
 * used only by the supplemental rare-harm search, never as a blanket limit.
 */
export const RARE_HARMS_SUPPLEMENT_EXPRESSION =
  '"case reports"[pt] OR "observational study"[pt] OR "cohort studies"[mh] OR "case-control studies"[mh] OR cohort*[tiab] OR "case control"[tiab] OR "case-control"[tiab] OR registr*[tiab] OR surveillance[tiab] OR pharmacovigilance[tiab] OR postmarketing[tiab] OR "post-marketing"[tiab] OR "spontaneous report"[tiab] OR "spontaneous reports"[tiab] OR "case series"[tiab]';

export const ANIMAL_ONLY_HARMS_EXCLUSION = "(animals[mh] NOT humans[mh])";

function asBlock(value: string): string {
  return `(${value.trim()})`;
}

/** Choose a harm concept appropriate to the intervention, avoiding drug filters for devices/procedures. */
export function getHarmsExpression(
  interventionType: HarmsInterventionType,
  mode: HarmsSearchMode
): string {
  if (interventionType === "drug") {
    return mode === "broad"
      ? DRUG_HARMS_SENSITIVE_EXPRESSION
      : DRUG_HARMS_BALANCED_EXPRESSION;
  }
  if (interventionType === "surgery") return SURGERY_HARMS_EXPRESSION;
  if (interventionType === "device") return DEVICE_HARMS_EXPRESSION;
  return GENERIC_HARMS_SENSITIVE_EXPRESSION;
}

/**
 * Builds a PubMed query from user-supplied concept blocks.
 *
 * The intervention is the stable core. Population is opt-in because requiring
 * it can hide harms reported in broader or differently described populations.
 * An empty intervention returns an empty query so the UI cannot open a broad,
 * context-free harms search by accident.
 */
export function buildHarmsSearchQuery(input: HarmsSearchInput): string {
  const intervention = input.intervention.trim();
  if (!intervention) return "";

  const population = input.population?.trim() ?? "";
  const specificHarm = input.specificHarm?.trim() ?? "";
  const interventionType = input.interventionType ?? "other";
  const genericExpression = getHarmsExpression(interventionType, input.mode);
  const blocks = [asBlock(intervention)];

  if (input.includePopulation && population) {
    blocks.push(asBlock(population));
  }

  if (input.mode === "broad") {
    const harmExpression = specificHarm
      ? `${asBlock(specificHarm)} OR (${genericExpression})`
      : genericExpression;
    blocks.push(`(${harmExpression})`);
  } else {
    blocks.push(
      specificHarm
        ? asBlock(specificHarm)
        : `(${genericExpression})`
    );
  }

  if (input.mode === "rare") {
    blocks.push(`(${RARE_HARMS_SUPPLEMENT_EXPRESSION})`);
  }

  let query = blocks.join(" AND ");
  if (input.excludeAnimalOnly) {
    query += ` NOT ${ANIMAL_ONLY_HARMS_EXCLUSION}`;
  }

  return query;
}
