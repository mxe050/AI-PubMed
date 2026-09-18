// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { SrTab } from "./SrTab";
import { defaultSettings } from "../types";

afterEach(() => { cleanup(); vi.restoreAllMocks(); });

it("renders and resets the preparation and journal independently without duplicate keys", () => {
  const error = vi.spyOn(console, "error");
  vi.spyOn(window, "confirm").mockReturnValue(true);
  vi.spyOn(window, "scrollTo").mockImplementation(() => {});
  render(<SrTab settings={defaultSettings} />);
  expect(screen.getByRole("heading", { name: "Step 1：レビュー疑問と暫定PICO" })).toBeTruthy();
  expect(screen.getAllByRole("heading", { name: "検索履歴・引き継ぎ" })).toHaveLength(1);
  fireEvent.click(screen.getByRole("button", { name: /すべての入力・結果をクリア/ }));
  expect(screen.getAllByRole("heading", { name: "検索履歴・引き継ぎ" })).toHaveLength(1);
  expect(error).not.toHaveBeenCalled();
});
