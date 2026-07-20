import {
  render,
  screen,
  fireEvent,
  waitForElementToBeRemoved,
} from "@testing-library/react";
import "@testing-library/jest-dom";
import { describe, test, expect, beforeAll, vi } from "vitest";
import { App } from "./App";

beforeAll(() => {
  window.supabase = {
    createClient: vi.fn(() => ({
      auth: {
        signInAnonymously: vi.fn(() =>
          Promise.resolve({ data: { user: { id: "test-user" } }, error: null }),
        ),
      },
      from: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        insert: vi.fn().mockReturnThis(),
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
      })),
    })),
  };
});

describe("学習時間記録アプリのテスト", () => {
  test("初期状態でタイトルが表示されていること", () => {
    render(<App />);
    const titleElement = screen.getByText(/学習時間記録/i);
    expect(titleElement).toBeInTheDocument();
  });

  test("入力が空の状態で登録ボタンを押すとエラーメッセージが表示されること", async () => {
    render(<App />);

    await waitForElementToBeRemoved(() => screen.queryByText(/ロード中/i));

    const submitButton = screen.getByRole("button", { name: /登録/i });

    fireEvent.click(submitButton);

    const errorMessage =
      await screen.findByText(/学習内容と時間を正しく入力してください/i);
    expect(errorMessage).toBeInTheDocument();
  });
});
