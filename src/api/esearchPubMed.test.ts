import { afterEach, describe, expect, it, vi } from "vitest";
import type { NcbiRateLimiter } from "../utils/ncbiRateLimiter";
import { defaultSettings } from "../types";
import { esearchPubMed } from "./esearchPubMed";

const immediateLimiter = {
  schedule: <T>(task: () => Promise<T>) => task(),
} as NcbiRateLimiter;

afterEach(() => vi.unstubAllGlobals());

describe("esearchPubMed", () => {
  it("sends long strategies in a POST body and returns NCBI warnings", async () => {
    const longTerm = `heart failure[tiab] ${"OR placebo[tiab] ".repeat(700)}`;
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          esearchresult: {
            count: "2",
            idlist: ["1", "2"],
            querytranslation: "translated query",
            warninglist: { phrasesignored: ["ignored phrase"] },
          },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await esearchPubMed(
      longTerm,
      defaultSettings,
      immediateLimiter,
      100
    );

    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).not.toContain(encodeURIComponent(longTerm));
    expect(init.method).toBe("POST");
    expect(new URLSearchParams(init.body as string).get("term")).toBe(longTerm);
    expect(result.idList).toEqual(["1", "2"]);
    expect(result.warnings).toEqual(["ignored phrase"]);
  });
});
