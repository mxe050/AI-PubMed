import type { SrEligibilityReference } from "./parseSrEligibilityResponse";

export type SrDefinitionElement = "P" | "P1" | "P2" | "I" | "C" | "O";

export interface SrDefinitionSource {
  citation: string;
  pmid: string;
  doi: string;
  url: string;
  verifiedWith: string;
}

export interface SrDefinitionOption {
  id: string;
  element: SrDefinitionElement;
  title: string;
  definition: string;
  operationalCriteria: string[];
  rationale: string;
  limitations: string[];
  recommended: boolean;
  selected: boolean;
  sources: SrDefinitionSource[];
}

export interface SrDefinitionConsultation {
  questionInterpretation: string;
  decisionPoints: string[];
  populationGuidance?: string[];
  options: SrDefinitionOption[];
}

export interface ParseSrDefinitionResult {
  ok: boolean;
  consultation?: SrDefinitionConsultation;
  reason?: string;
  warnings: string[];
}

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.map(asString).filter((item) => item.length > 0)
    : [];
}

function normalizeElement(value: unknown): SrDefinitionElement | null {
  const element = asString(value).toUpperCase();
  return element === "P" ||
    element === "P1" ||
    element === "P2" ||
    element === "I" ||
    element === "C" ||
    element === "O"
    ? element
    : null;
}

function stripCodeFence(value: string): string {
  return value
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();
}

export function parseSrDefinitionResponse(text: string): ParseSrDefinitionResult {
  const warnings: string[] = [];
  const normalized = text
    .normalize("NFKC")
    .replace(/[\u200B-\u200D\uFEFF]/g, "");

  if (!normalized.trim()) {
    return { ok: false, reason: "AI回答が空です", warnings };
  }

  const block = normalized.match(
    /=+\s*DEFINITION_JSON_START\s*=+([\s\S]*?)=+\s*DEFINITION_JSON_END\s*=+/i
  );
  if (!block) {
    return {
      ok: false,
      reason: "DEFINITION_JSON_START / END ブロックが見つかりません",
      warnings,
    };
  }

  let raw: unknown;
  try {
    raw = JSON.parse(stripCodeFence(block[1]));
  } catch {
    return {
      ok: false,
      reason: "定義候補JSONを解析できませんでした",
      warnings,
    };
  }

  if (!raw || typeof raw !== "object") {
    return { ok: false, reason: "定義候補JSONがオブジェクトではありません", warnings };
  }

  const root = raw as Record<string, unknown>;
  const sourceOptions = Array.isArray(root.options) ? root.options : [];
  const counters: Record<SrDefinitionElement, number> = {
    P: 0,
    P1: 0,
    P2: 0,
    I: 0,
    C: 0,
    O: 0,
  };
  const options: SrDefinitionOption[] = [];

  for (const item of sourceOptions) {
    if (!item || typeof item !== "object") continue;
    const value = item as Record<string, unknown>;
    const element = normalizeElement(value.element);
    if (!element) {
      warnings.push("P/P1/P2/I/C/Oを判定できない定義候補を除外しました");
      continue;
    }
    const definition = asString(value.definition);
    if (!definition) {
      warnings.push(`${element}の定義文が空の候補を除外しました`);
      continue;
    }

    counters[element] += 1;
    const sources = Array.isArray(value.sources)
      ? value.sources
          .filter((source) => source && typeof source === "object")
          .map((source) => {
            const sourceValue = source as Record<string, unknown>;
            return {
              citation: asString(sourceValue.citation),
              pmid: asString(sourceValue.pmid),
              doi: asString(sourceValue.doi),
              url: asString(sourceValue.url),
              verifiedWith: asString(sourceValue.verifiedWith) || "unverified",
            };
          })
          .filter((source) => source.citation || source.url || source.pmid || source.doi)
      : [];

    const recommended = value.recommended === true;
    options.push({
      id: asString(value.id) || `${element}${counters[element]}`,
      element,
      title: asString(value.title) || `${element} 定義候補 ${counters[element]}`,
      definition,
      operationalCriteria: asStringArray(value.operationalCriteria),
      rationale: asString(value.rationale),
      limitations: asStringArray(value.limitations),
      recommended,
      selected: recommended,
      sources,
    });
  }

  if (options.length === 0) {
    return { ok: false, reason: "利用可能な定義候補がありません", warnings };
  }

  for (const element of ["P", "P1", "P2", "I", "C", "O"] as SrDefinitionElement[]) {
    const group = options.filter((option) => option.element === element);
    if (group.length > 0 && !group.some((option) => option.selected)) {
      group[0].selected = true;
      warnings.push(`${element}に推奨指定がなかったため、先頭候補を初期選択しました`);
    }
  }

  const hasPopulation = options.some((option) =>
    ["P", "P1", "P2"].includes(option.element)
  );
  if (!hasPopulation || !options.some((option) => option.element === "I")) {
    warnings.push("PまたはIの定義候補が不足しています");
  }

  return {
    ok: true,
    consultation: {
      questionInterpretation: asString(root.questionInterpretation),
      decisionPoints: asStringArray(root.decisionPoints),
      populationGuidance: asStringArray(root.populationGuidance),
      options,
    },
    warnings,
  };
}

export function buildSelectedDefinitionContext(
  consultation: SrDefinitionConsultation
): string {
  const selected = consultation.options
    .filter((option) => option.selected)
    .map((option) => ({
      id: option.id,
      element: option.element,
      title: option.title,
      definition: option.definition,
      operationalCriteria: option.operationalCriteria,
      rationale: option.rationale,
      limitations: option.limitations,
      recommended: option.recommended,
      sources: option.sources,
    }));
  return JSON.stringify(
    {
      questionInterpretation: consultation.questionInterpretation,
      decisionPoints: consultation.decisionPoints,
      populationGuidance: consultation.populationGuidance ?? [],
      selectedOptions: selected,
    },
    null,
    2
  );
}

function referenceKey(source: SrDefinitionSource): string {
  if (source.pmid.trim()) return `pmid:${source.pmid.trim().toLowerCase()}`;
  if (source.doi.trim()) return `doi:${source.doi.trim().toLowerCase()}`;
  if (source.url.trim()) return `url:${source.url.trim().toLowerCase()}`;
  return `citation:${source.citation.trim().toLowerCase().replace(/\s+/g, " ")}`;
}

/**
 * Step 3で実際に選択された定義候補からだけ、根拠文献を取り出す。
 * 適格基準を作る外部AIの出力は信頼源にせず、同一文献はoptionIdsをまとめる。
 */
export function collectSelectedDefinitionReferences(
  consultation: SrDefinitionConsultation
): SrEligibilityReference[] {
  const references = new Map<string, SrEligibilityReference>();

  for (const option of consultation.options.filter((item) => item.selected)) {
    for (const source of option.sources) {
      if (!source.citation && !source.pmid && !source.doi && !source.url) continue;
      const key = referenceKey(source);
      const existing = references.get(key);
      if (existing) {
        if (!existing.optionIds.includes(option.id)) {
          existing.optionIds.push(option.id);
        }
        if (!existing.citation && source.citation) existing.citation = source.citation;
        if (!existing.pmid && source.pmid) existing.pmid = source.pmid;
        if (!existing.doi && source.doi) existing.doi = source.doi;
        if (!existing.url && source.url) existing.url = source.url;
        if (
          existing.verifiedWith.toLowerCase() === "unverified" &&
          source.verifiedWith
        ) {
          existing.verifiedWith = source.verifiedWith;
        }
        continue;
      }

      references.set(key, {
        optionIds: [option.id],
        citation: source.citation,
        pmid: source.pmid,
        doi: source.doi,
        url: source.url,
        verifiedWith: source.verifiedWith || "unverified",
      });
    }
  }

  return Array.from(references.values());
}
