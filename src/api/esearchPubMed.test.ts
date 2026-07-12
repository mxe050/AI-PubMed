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
    expect(result.warningList).toEqual(["ignored phrase"]);
    expect(result.errorList).toEqual([]);
    expect(new URLSearchParams(init.body as string).get("usehistory")).toBe("y");
  });

  it("keeps NCBI warninglist and errorlist separate", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({
      esearchresult: {
        count: "0", idlist: [],
        warninglist: { quotedphrasesnotfound: ["missing phrase"] },
        errorlist: { fieldnotfound: ["bad field"] },
      },
    }), { status: 200 })));
    const result = await esearchPubMed("asthma", defaultSettings, immediateLimiter);
    expect(result.warningList).toEqual(["missing phrase"]);
    expect(result.errorList).toEqual(["bad field"]);
  });

  it("can skip NCBI History storage for a translation-only check", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          esearchresult: {
            count: "42",
            idlist: [],
            querytranslation: '"hypertension"[Title/Abstract]',
          },
        }),
        { status: 200 }
      )
    );
    vi.stubGlobal("fetch", fetchMock);

    await esearchPubMed(
      "hypertension[tiab]",
      defaultSettings,
      immediateLimiter,
      0,
      0,
      undefined,
      { useHistory: false }
    );

    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    const body = new URLSearchParams(init.body as string);
    expect(body.get("retmax")).toBe("0");
    expect(body.has("usehistory")).toBe(false);
  });
});
