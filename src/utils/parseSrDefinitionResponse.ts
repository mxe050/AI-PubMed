export type SrDefinitionElement = "P" | "I" | "C" | "O";

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
  return element === "P" || element === "I" || element === "C" || element === "O"
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
  const counters: Record<SrDefinitionElement, number> = { P: 0, I: 0, C: 0, O: 0 };
  const options: SrDefinitionOption[] = [];

  for (const item of sourceOptions) {
    if (!item || typeof item !== "object") continue;
    const value = item as Record<string, unknown>;
    const element = normalizeElement(value.element);
    if (!element) {
      warnings.push("P/I/C/Oを判定できない定義候補を除外しました");
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

  for (const element of ["P", "I", "C", "O"] as SrDefinitionElement[]) {
    const group = options.filter((option) => option.element === element);
    if (group.length > 0 && !group.some((option) => option.selected)) {
      group[0].selected = true;
      warnings.push(`${element}に推奨指定がなかったため、先頭候補を初期選択しました`);
    }
  }

  if (!options.some((option) => option.element === "P") || !options.some((option) => option.element === "I")) {
    warnings.push("PまたはIの定義候補が不足しています");
  }

  return {
    ok: true,
    consultation: {
      questionInterpretation: asString(root.questionInterpretation),
      decisionPoints: asStringArray(root.decisionPoints),
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
      selectedOptions: selected,
    },
    null,
    2
  );
}
