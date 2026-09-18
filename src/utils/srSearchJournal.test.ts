import { describe, expect, it } from "vitest";
import type { PubMedSearchResult } from "../types";
import {
  buildSrJournalMarkdown, createSrSearchRecord, describeBenchmark,
  type SrSearchProtocol,
} from "./srSearchJournal";

const protocol: SrSearchProtocol = {
  question: "Question",
  pico: { P: "population", I: "intervention", C: "", O: "outcome" },
  terms: { P: [{ id: "p1", term: "asthma", enabled: true, fieldTag: "[tiab]", reason: "Synonym", japanese: "喘息" }], I: [], C: [], O: [] },
  filter: { key: "none", label: "制限なし", expression: "" },
  populationRelation: "",
  populationReason: "",
  preparation: null,
};
const result: PubMedSearchResult = {
  id: "run-1", searchStringId: "query-1", query: "(asthma[tiab])",
  count: 247, idList: ["1", "2"], articles: [], fetchedAt: "2026-09-18T10:00:00.000Z",
  apiMode: "no_api_key", queryTranslation: "asthma[Title/Abstract]",
  warnings: ["Warning"], warningList: ["Warning"],
};

describe("SR search records", () => {
  it("freezes query, protocol and PMID list without retaining credentials", () => {
    const input = structuredClone(protocol);
    const response = { ...structuredClone(result), api_key: "SECRET", email: "PRIVATE", queryParameters: { api_key: "SECRET" } };
    const record = createSrSearchRecord(response, input);
    input.terms.P[0].enabled = false;
    input.pico.P = "changed";
    response.idList.push("3");
    expect(record.protocol.terms.P[0].enabled).toBe(true);
    expect(record.protocol.pico.P).toBe("population");
    expect(record.retrievedPmids).toEqual(["1", "2"]);
    expect(record.warnings).toEqual(["Warning"]);
    expect(JSON.stringify(record)).not.toMatch(/SECRET|PRIVATE|api_key/);
  });

  it("separates hit counts from a partial preview and preserves executed query", () => {
    const record = createSrSearchRecord(result, protocol);
    record.note = "Added a synonym";
    const report = buildSrJournalMarkdown([record], { vocabulary: true }, "CENTRAL planned");
    expect(report).toContain("ヒット件数（重複除去前）：247");
    expect(report).toContain("取得したPMID：2件（プレビュー");
    expect(report).toContain(result.query);
    expect(report).toContain(result.fetchedAt);
    expect(report).toContain("Added a synonym");
    expect(report).toContain("- [x] MeSH");
    expect(report).toContain("CENTRAL planned");
    expect(report).toContain("件数を足してPRISMAの総数にしない");
  });

  it("keeps zero-hit searches as valid records", () => {
    const record = createSrSearchRecord({ ...result, count: 0, idList: [] }, protocol);
    expect(record.count).toBe(0);
    expect(buildSrJournalMarkdown([record], {}, "")).toContain("重複除去前）：0");
  });

  it("does not treat a failed or warned benchmark as an actual miss", () => {
    const benchmark = { requestedPmids: ["1"], matchedPmids: [], missedPmids: ["1"], benchmarkQuery: "query" };
    expect(describeBenchmark()).toContain("未実施");
    expect(describeBenchmark({ ...benchmark, error: "timeout" })).toBe("確認不能：timeout");
    expect(describeBenchmark({ ...benchmark, warnings: ["Phrase not found"] })).toContain("要再確認");
    expect(describeBenchmark(benchmark)).toBe("0 / 1件回収");
  });
});
