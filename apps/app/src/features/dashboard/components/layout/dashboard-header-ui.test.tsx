import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@/test-utils";
import { DashboardHeaderUI } from "./dashboard-header-ui";

// formatDate uses new Date() internally — make it deterministic
vi.mock("@/lib/formatters", async () => {
  const actual = await vi.importActual("@/lib/formatters");
  return {
    ...actual,
    formatDate: () => "Thursday, January 1",
  };
});

describe("DashboardHeaderUI", () => {
  it("renders greeting and user name", () => {
    render(
      <DashboardHeaderUI
        userName="Priya"
        greeting="Good morning"
      />,
    );

    expect(screen.getByText("Good morning, Priya!")).toBeInTheDocument();
  });

  it("renders the formatted date", () => {
    render(
      <DashboardHeaderUI
        userName="Ravi"
        greeting="Good evening"
      />,
    );

    expect(screen.getByText("Thursday, January 1")).toBeInTheDocument();
  });

  it("renders summary when provided", () => {
    render(
      <DashboardHeaderUI
        userName="Test"
        greeting="Hello"
        summary="5 appointments today"
      />,
    );

    expect(screen.getByText("5 appointments today")).toBeInTheDocument();
  });

  it("renders without summary", () => {
    render(
      <DashboardHeaderUI
        userName="Test"
        greeting="Hello"
      />,
    );

    // Should not crash or show empty summary
    expect(screen.getByText("Hello, Test!")).toBeInTheDocument();
  });
});
