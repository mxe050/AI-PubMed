import { describe, expect, it } from "vitest";
import { parseSrDefinitionResponse } from "./parseSrDefinitionResponse";

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
});
