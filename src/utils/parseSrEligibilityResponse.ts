export interface SrEligibilityReference {
  optionIds: string[];
  citation: string;
  pmid: string;
  doi: string;
  url: string;
  verifiedWith: string;
}

export interface SrEligibilityCriteria {
  p: string;
  i: string;
  c: string;
  o: string;
  studyDesigns: string[];
  settings: string[];
  timing: string[];
  inclusion: string[];
  exclusion: string[];
  screeningQuestions: string[];
  methodsText: string;
  searchNotes: string[];
  sourceOptionIds: string[];
  definitionReferences: SrEligibilityReference[];
}

export interface ParseSrEligibilityResult {
  ok: boolean;
  criteria?: SrEligibilityCriteria;
  reason?: string;
}

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.map(asString).filter((item) => item.length > 0)
    : [];
}

function asDefinitionReferences(value: unknown): SrEligibilityReference[] {
  if (!Array.isArray(value)) return [];

  return value
    .filter((item) => item && typeof item === "object")
    .map((item) => {
      const reference = item as Record<string, unknown>;
      return {
        optionIds: asStringArray(reference.optionIds),
        citation: asString(reference.citation),
        pmid: asString(reference.pmid),
        doi: asString(reference.doi),
        url: asString(reference.url),
        verifiedWith: asString(reference.verifiedWith) || "unverified",
      };
    })
    .filter(
      (reference) =>
        reference.citation || reference.pmid || reference.doi || reference.url
    );
}

function stripCodeFence(value: string): string {
  return value
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();
}

export function parseSrEligibilityResponse(text: string): ParseSrEligibilityResult {
  const normalized = text
    .normalize("NFKC")
    .replace(/[\u200B-\u200D\uFEFF]/g, "");
  if (!normalized.trim()) return { ok: false, reason: "AI回答が空です" };

  const block = normalized.match(
    /=+\s*ELIGIBILITY_JSON_START\s*=+([\s\S]*?)=+\s*ELIGIBILITY_JSON_END\s*=+/i
  );
  if (!block) {
    return {
      ok: false,
      reason: "ELIGIBILITY_JSON_START / END ブロックが見つかりません",
    };
  }

  let raw: unknown;
  try {
    raw = JSON.parse(stripCodeFence(block[1]));
  } catch {
    return { ok: false, reason: "適格基準JSONを解析できませんでした" };
  }
  if (!raw || typeof raw !== "object") {
    return { ok: false, reason: "適格基準JSONがオブジェクトではありません" };
  }

  const value = raw as Record<string, unknown>;
  const criteria: SrEligibilityCriteria = {
    p: asString(value.p),
    i: asString(value.i),
    c: asString(value.c),
    o: asString(value.o),
    studyDesigns: asStringArray(value.studyDesigns),
    settings: asStringArray(value.settings),
    timing: asStringArray(value.timing),
    inclusion: asStringArray(value.inclusion),
    exclusion: asStringArray(value.exclusion),
    screeningQuestions: asStringArray(value.screeningQuestions),
    methodsText: asString(value.methodsText),
    searchNotes: asStringArray(value.searchNotes),
    sourceOptionIds: asStringArray(value.sourceOptionIds),
    definitionReferences: asDefinitionReferences(value.definitionReferences),
  };

  if (!criteria.p || !criteria.i) {
    return { ok: false, reason: "最終PまたはIが空です" };
  }
  return { ok: true, criteria };
}

export function buildEligibilityContext(criteria: SrEligibilityCriteria): string {
  return JSON.stringify(criteria, null, 2);
}
