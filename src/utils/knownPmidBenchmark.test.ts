import { describe, expect, it } from "vitest";
import {
  buildKnownPmidBenchmarkQuery,
  parseKnownPmids,
  summarizeKnownPmidMatches,
} from "./knownPmidBenchmark";

describe("known PMID benchmark", () => {
  it("parses PMIDs, labels, URLs, duplicates, and invalid fragments", () => {
    const result = parseKnownPmids(
      "PMID: 33270928, 32865377\nhttps://pubmed.ncbi.nlm.nih.gov/33270928/ bad-id"
    );
    expect(result.pmids).toEqual(["33270928", "32865377"]);
    expect(result.invalidTokens).toEqual(["bad-id"]);
  });

  it("builds one PubMed query that checks all known studies", () => {
    expect(
      buildKnownPmidBenchmarkQuery("heart failure[tiab]", ["1", "2", "2"])
    ).toBe("(heart failure[tiab]) AND (1[pmid] OR 2[pmid])");
  });

  it("reports matched and missed benchmark PMIDs in input order", () => {
    expect(
      summarizeKnownPmidMatches(
        ["10", "20", "30"],
        ["30", "10"],
        "benchmark query"
      )
    ).toMatchObject({
      matchedPmids: ["10", "30"],
      missedPmids: ["20"],
    });
  });
});
