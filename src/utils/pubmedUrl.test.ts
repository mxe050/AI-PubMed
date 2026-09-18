// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { openPubMedWithQuery } from "./pubmedUrl";
import { copyText } from "./textActions";

vi.mock("./textActions", () => ({ copyText: vi.fn().mockResolvedValue(undefined) }));
afterEach(() => { vi.restoreAllMocks(); vi.clearAllMocks(); });

describe("PubMed navigation", () => {
  it("passes the short query in the Advanced URL and also copies it for the Query box", async () => {
    const open = vi.spyOn(window, "open").mockReturnValue(null);
    vi.spyOn(window, "alert").mockImplementation(() => {});
    const query = '("Low Back Pain"[mh] OR "low back pain"[tiab]) AND exercise[tiab]';
    expect(await openPubMedWithQuery(query, "advanced")).toBe(false);
    const url = new URL(String(open.mock.calls[0][0]));
    expect(url.pathname).toBe("/advanced/");
    expect(url.searchParams.get("term")).toBe(query);
    expect(copyText).toHaveBeenCalledWith(query);
  });

  it("opens synchronously and copies the entire long query without truncation", async () => {
    const open = vi.spyOn(window, "open").mockReturnValue(null);
    const alert = vi.spyOn(window, "alert").mockImplementation(() => {});
    const query = 'asthma[tiab] OR '.repeat(300) + 'wheeze[tiab]';
    expect(await openPubMedWithQuery(query, "advanced")).toBe(false);
    expect(open).toHaveBeenCalledWith("https://pubmed.ncbi.nlm.nih.gov/advanced/", "_blank", "noopener,noreferrer");
    expect(copyText).toHaveBeenCalledWith(query);
    expect(open.mock.invocationCallOrder[0]).toBeLessThan(vi.mocked(copyText).mock.invocationCallOrder[0]);
    expect(alert.mock.calls[0][0]).toContain("検索式全文をコピーしました");
  });

  it("uses a URL directly for short regular searches", async () => {
    const open = vi.spyOn(window, "open").mockReturnValue(null);
    expect(await openPubMedWithQuery("asthma[tiab]", "regular")).toBe(true);
    expect(new URL(String(open.mock.calls[0][0])).searchParams.get("term")).toBe("asthma[tiab]");
    expect(copyText).not.toHaveBeenCalled();
  });

  it("reports a failed long-query copy honestly", async () => {
    vi.spyOn(window, "open").mockReturnValue(null);
    const alert = vi.spyOn(window, "alert").mockImplementation(() => {});
    vi.mocked(copyText).mockRejectedValueOnce(new Error("denied"));
    await openPubMedWithQuery('asthma[tiab] OR '.repeat(300), "regular");
    expect(alert.mock.calls[0][0]).toContain("自動コピーできませんでした");
  });

  it("does not open a blank query", async () => {
    const open = vi.spyOn(window, "open").mockReturnValue(null);
    expect(await openPubMedWithQuery("  ", "advanced")).toBe(false);
    expect(open).not.toHaveBeenCalled();
  });
});
