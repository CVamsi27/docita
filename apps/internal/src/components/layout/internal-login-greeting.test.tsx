import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@/test-utils";
import { InternalLoginGreeting } from "./internal-login-greeting";

describe("InternalLoginGreeting", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 0, 8, 9, 30)); // 09:30 local = morning
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders the serif daypart greeting in English", () => {
    render(<InternalLoginGreeting />);

    const heading = screen.getByRole("heading", { level: 2 });
    expect(heading).toHaveClass("font-serif");
    expect(heading).toHaveTextContent("Good morning");
    expect(screen.getByText("Today")).toBeInTheDocument();
    expect(screen.getByText("09:30")).toBeInTheDocument();
  });

  it("does not render a language toggle (internal console is English-only)", () => {
    render(<InternalLoginGreeting />);

    expect(
      screen.queryByRole("button", { name: "हिंदी" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "EN" }),
    ).not.toBeInTheDocument();
  });
});
