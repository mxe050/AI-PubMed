// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { EbmTab } from "./EbmTab";
import { defaultSettings } from "../types";
import type { PubMedSearchResult } from "../types";

vi.mock("./PubMedSearchBox", () => ({
  PubMedSearchBox: ({ searchString, onResult }: { searchString: string; onResult: (result: PubMedSearchResult) => void }) => (
    <button onClick={() => onResult({ id: "test", searchStringId: "q", query: searchString,
      count: 0, idList: [], articles: [], apiMode: "no_api_key", fetchedAt: "2026-09-19T00:00:00Z" })}>Test retrieval</button>
  ),
}));

afterEach(() => { cleanup(); vi.restoreAllMocks(); });

it("lets beginners start from a short question without keyword-based alerts", () => {
  const alert = vi.spyOn(window, "alert").mockImplementation(() => {});
  const confirm = vi.spyOn(window, "confirm");
  render(<EbmTab settings={defaultSettings} onPubMedFallbackToAi={vi.fn()} />);
  fireEvent.change(screen.getByLabelText(/原質問/), { target: { value: "腰痛の運動について知りたい" } });
  fireEvent.click(screen.getByRole("button", { name: "次へ：検索プロンプトを作る" }));
  expect(screen.getByRole("heading", { name: "Step 2：プロンプトを外部AIへ渡す" })).toBeTruthy();
  expect(alert).not.toHaveBeenCalled();
  expect(confirm).not.toHaveBeenCalled();
});

it("does not relabel an old result as current after regenerating the prompt", () => {
  Element.prototype.scrollIntoView = vi.fn();
  render(<EbmTab settings={defaultSettings} onPubMedFallbackToAi={vi.fn()} />);
  fireEvent.change(screen.getByLabelText(/原質問/), { target: { value: "喘息について" } });
  fireEvent.click(screen.getByRole("button", { name: "次へ：検索プロンプトを作る" }));
  fireEvent.change(screen.getByLabelText("検索式を含むAI回答"), { target: { value: "```text\nasthma[tiab]\n```" } });
  fireEvent.click(screen.getByRole("button", { name: "AI回答から検索式を抽出してStep 4へ" }));
  fireEvent.click(screen.getByRole("button", { name: "Test retrieval" }));
  const classify = screen.getByRole("button", { name: "AIで研究デザイン別に分類する（プロンプト＋結果をコピー）" }) as HTMLButtonElement;
  expect(classify.disabled).toBe(false);
  fireEvent.change(screen.getByLabelText(/原質問/), { target: { value: "小児喘息について" } });
  fireEvent.click(screen.getByRole("button", { name: "現在の入力でプロンプトを作り直す" }));
  fireEvent.change(screen.getByLabelText("検索式を含むAI回答"), { target: { value: "更新回答\n```text\nasthma[tiab]\n```" } });
  expect(classify.disabled).toBe(true);
  fireEvent.click(screen.getByRole("button", { name: "Test retrieval" }));
  expect(classify.disabled).toBe(false);
});

it("edits PICO independently, keeps C optional and preserves multiline P", () => {
  render(<EbmTab settings={defaultSettings} onPubMedFallbackToAi={vi.fn()} />);
  fireEvent.change(screen.getByLabelText("P：誰について"), { target: { value: "成人\n慢性腰痛" } });
  fireEvent.change(screen.getByLabelText("I：何を調べるか"), { target: { value: "運動療法" } });
  fireEvent.change(screen.getByLabelText("O：何を知りたいか"), { target: { value: "痛み" } });
  expect((screen.getByLabelText("C：何と比べるか") as HTMLTextAreaElement).value).toBe("");
  fireEvent.click(screen.getByRole("button", { name: "次へ：検索プロンプトを作る" }));
  expect(document.querySelector(".prompt-text")?.textContent).toContain("P: 成人\n慢性腰痛 / I: 運動療法 / O: 痛み");
  fireEvent.change(screen.getByLabelText("Cの入力候補"), { target: { value: "比較なし" } });
  expect((screen.getByLabelText("C：何と比べるか") as HTMLTextAreaElement).value).toBe("比較なし");
});

it("keeps old AI text but prevents extracting it after a PICO change", () => {
  render(<EbmTab settings={defaultSettings} onPubMedFallbackToAi={vi.fn()} />);
  fireEvent.change(screen.getByLabelText("P：誰について"), { target: { value: "喘息" } });
  fireEvent.change(screen.getByLabelText("I：何を調べるか"), { target: { value: "介入" } });
  fireEvent.click(screen.getByRole("button", { name: "次へ：検索プロンプトを作る" }));
  fireEvent.change(screen.getByLabelText("検索式を含むAI回答"), { target: { value: "asthma[tiab]" } });
  fireEvent.change(screen.getByLabelText("P：誰について"), { target: { value: "小児喘息" } });
  fireEvent.click(screen.getByRole("button", { name: "現在の入力でプロンプトを作り直す" }));
  const extract = screen.getByRole("button", { name: "AI回答から検索式を抽出してStep 4へ" }) as HTMLButtonElement;
  expect(extract.disabled).toBe(true);
  expect((screen.getByLabelText("検索式を含むAI回答") as HTMLTextAreaElement).value).toBe("asthma[tiab]");
  fireEvent.change(screen.getByLabelText("検索式を含むAI回答"), { target: { value: "pediatric asthma[tiab]" } });
  expect(extract.disabled).toBe(false);
});
