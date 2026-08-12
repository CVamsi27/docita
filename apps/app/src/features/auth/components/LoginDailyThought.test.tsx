import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@/test-utils";
import { LoginDailyThought } from "./LoginDailyThought";

const MOCK_QUOTE = {
  quote: "The best way to predict the future is to create it.",
  author: "Peter Drucker",
};

beforeEach(() => {
  vi.spyOn(globalThis, "fetch").mockResolvedValue(
    new Response(JSON.stringify(MOCK_QUOTE), {
      headers: { "content-type": "application/json" },
    }),
  );
});

describe("LoginDailyThought", () => {
  it("shows loading skeleton initially", () => {
    render(<LoginDailyThought />);

    expect(screen.getByLabelText("Loading daily thought")).toBeInTheDocument();
  });

  it("renders the quote after loading", async () => {
    render(<LoginDailyThought />);

    await waitFor(() => {
      expect(
        screen.getByText(MOCK_QUOTE.quote),
      ).toBeInTheDocument();
    });

    expect(screen.getByText(`— ${MOCK_QUOTE.author}`)).toBeInTheDocument();
  });

  it("handles fetch error gracefully", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("Network error"));

    render(<LoginDailyThought />);

    await waitFor(() => {
      expect(
        screen.queryByLabelText("Loading daily thought"),
      ).not.toBeInTheDocument();
    });
  });
});
