import { describe, expect, it } from "vitest";
import {
  collectSelectedDefinitionReferences,
  parseSrDefinitionResponse,
} from "./parseSrDefinitionResponse";

describe("parseSrDefinitionResponse", () => {
  it("parses definition candidates and keeps the recommended choice selected", () => {
    const result = parseSrDefinitionResponse(`
説明文
===DEFINITION_JSON_START===
\`\`\`json
{
  "questionInterpretation": "介入効果を比較する",
  "decisionPoints": ["重症度をどこで区切るか"],
  "options": [
    {
      "id": "P1", "element": "P", "title": "広い定義",
      "definition": "成人の対象疾患", "operationalCriteria": ["18歳以上"],
      "rationale": "一般化可能性", "limitations": ["異質性"],
      "recommended": true,
      "sources": [{"citation": "Example citation", "pmid": "123", "doi": "", "url": "https://pubmed.ncbi.nlm.nih.gov/123/", "verifiedWith": "PubMed"}]
    },
    {
      "id": "I1", "element": "I", "title": "介入定義",
      "definition": "対象介入", "operationalCriteria": ["介入を実施"],
      "rationale": "", "limitations": [], "recommended": false, "sources": []
    }
  ]
}
\`\`\`
===DEFINITION_JSON_END===`);

    expect(result.ok).toBe(true);
    expect(result.consultation?.options[0].selected).toBe(true);
    expect(result.consultation?.options[0].sources[0].pmid).toBe("123");
    expect(result.consultation?.options[1].selected).toBe(true);
    expect(result.warnings.join(" ")).toContain("Iに推奨指定");
  });

  it("rejects malformed JSON", () => {
    const result = parseSrDefinitionResponse(
      "===DEFINITION_JSON_START==={bad===DEFINITION_JSON_END==="
    );
    expect(result.ok).toBe(false);
  });

  it("parses separate P1 and P2 definition groups", () => {
    const result = parseSrDefinitionResponse(`
===DEFINITION_JSON_START===
{
  "populationGuidance": ["P2が本文だけに記載される可能性を確認する"],
  "options": [
    {"id":"P1-1","element":"P1","definition":"糖尿病","recommended":true,"sources":[]},
    {"id":"P2-1","element":"P2","definition":"肥満","recommended":true,"sources":[]},
    {"id":"I-1","element":"I","definition":"介入A","recommended":true,"sources":[]}
  ]
}
===DEFINITION_JSON_END===`);

    expect(result.ok).toBe(true);
    expect(result.consultation?.options.map((option) => option.element)).toEqual([
      "P1",
      "P2",
      "I",
    ]);
    expect(result.consultation?.populationGuidance?.[0]).toContain("本文");
  });

  it("collects evidence only from selected options and deduplicates shared papers", () => {
    const result = collectSelectedDefinitionReferences({
      questionInterpretation: "",
      decisionPoints: [],
      options: [
        {
          id: "P1",
          element: "P",
          title: "P definition",
          definition: "Adults",
          operationalCriteria: [],
          rationale: "",
          limitations: [],
          recommended: true,
          selected: true,
          sources: [
            {
              citation: "Shared paper",
              pmid: "123",
              doi: "",
              url: "https://pubmed.ncbi.nlm.nih.gov/123/",
              verifiedWith: "PubMed",
            },
          ],
        },
        {
          id: "I1",
          element: "I",
          title: "I definition",
          definition: "Intervention",
          operationalCriteria: [],
          rationale: "",
          limitations: [],
          recommended: true,
          selected: true,
          sources: [
            {
              citation: "Shared paper",
              pmid: "123",
              doi: "10.1000/shared",
              url: "https://pubmed.ncbi.nlm.nih.gov/123/",
              verifiedWith: "PubMed",
            },
          ],
        },
        {
          id: "P2",
          element: "P",
          title: "Unselected",
          definition: "Other adults",
          operationalCriteria: [],
          rationale: "",
          limitations: [],
          recommended: false,
          selected: false,
          sources: [
            {
              citation: "Unselected paper",
              pmid: "999",
              doi: "",
              url: "",
              verifiedWith: "PubMed",
            },
          ],
        },
      ],
    });

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      optionIds: ["P1", "I1"],
      citation: "Shared paper",
      pmid: "123",
      doi: "10.1000/shared",
    });
  });
});
