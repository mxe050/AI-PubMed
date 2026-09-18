// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { PromptDisplay } from "./PromptDisplay";
import { SrSearchJournal } from "./SrSearchJournal";
import { WorkflowNav } from "./WorkflowNav";
import { createSrSearchRecord } from "../utils/srSearchJournal";
import { copyText, downloadText } from "../utils/textActions";

vi.mock("../utils/textActions", () => ({
  copyText: vi.fn().mockResolvedValue(undefined), downloadText: vi.fn(),
}));
afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe("Prompt actions", () => {
  it("copies and downloads the entire long prompt even with compact preview", async () => {
    const prompt = "長いプロンプト".repeat(2000) + "末尾の指示";
    render(<PromptDisplay title="Test prompt" prompt={prompt} />);
    fireEvent.click(screen.getByRole("button", { name: "全文をコピー" }));
    await waitFor(() => expect(copyText).toHaveBeenCalledWith(prompt));
    fireEvent.click(screen.getByRole("button", { name: "プロンプトをテキストファイルで保存" }));
    expect(downloadText).toHaveBeenCalledWith(prompt, "Test prompt.txt");
    const expand = screen.getByRole("button", { name: "本文の表示を広げる" });
    fireEvent.click(expand);
    expect(expand.getAttribute("aria-expanded")).toBe("true");
  });

  it("reports clipboard failure instead of claiming success", async () => {
    vi.mocked(copyText).mockRejectedValueOnce(new Error("denied"));
    render(<PromptDisplay prompt="prompt" />);
    fireEvent.click(screen.getByRole("button", { name: "全文をコピー" }));
    await waitFor(() => expect(screen.getByRole("alert").textContent).toContain("コピーできません"));
    expect(screen.queryByRole("button", { name: "コピーしました" })).toBeNull();
  });
});

it("navigates to existing steps and leaves unavailable steps disabled", () => {
  const scroll = vi.fn();
  Element.prototype.scrollIntoView = scroll;
  render(<>
    <WorkflowNav label="Steps" current="one" nextAction="Begin" steps={[
      { id: "one", label: "Input", available: true },
      { id: "two", label: "Search", available: false },
    ]} />
    <section id="one"><h2>Input heading</h2></section>
  </>);
  expect((screen.getByRole("button", { name: /Search/ }) as HTMLButtonElement).disabled).toBe(true);
  fireEvent.click(screen.getByRole("button", { name: /Input/ }));
  expect(document.activeElement?.textContent).toBe("Input heading");
  expect(scroll).toHaveBeenCalled();
});

it("resets handoff checks for a new search while retaining additional-search notes", () => {
  const record = createSrSearchRecord({
    id: "1", searchStringId: "s1", query: "asthma", count: 20, idList: ["1"],
    articles: [], fetchedAt: "2026-09-19T00:00:00.000Z", apiMode: "no_api_key",
  }, {
    question: "Question", pico: {}, terms: { P: [], I: [], C: [], O: [] },
    filter: { key: "none", label: "None", expression: "" },
    populationRelation: "", populationReason: "", preparation: null,
  });
  const { rerender } = render(<SrSearchJournal records={[record]} onNoteChange={vi.fn()} />);
  const checkbox = screen.getByLabelText("PICO・適格基準と検索範囲の整合性を確認した") as HTMLInputElement;
  fireEvent.click(checkbox);
  expect(checkbox.checked).toBe(true);
  fireEvent.change(screen.getByLabelText("他のDB・追加検索・未完了の作業"), { target: { value: "CENTRAL planned" } });
  rerender(<SrSearchJournal records={[record, { ...record, id: "2" }]} onNoteChange={vi.fn()} />);
  expect(checkbox.checked).toBe(false);
  expect((screen.getByLabelText("他のDB・追加検索・未完了の作業") as HTMLTextAreaElement).value).toBe("CENTRAL planned");
});
