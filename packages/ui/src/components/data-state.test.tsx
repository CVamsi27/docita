import { render, screen } from "@testing-library/react";
import { Calendar } from "lucide-react";
import { describe, expect, it, vi } from "vitest";
import { DataState } from "./data-state";

describe("DataState", () => {
  it("renders loading state", () => {
    render(<DataState status="loading" loadingMessage="Loading patients..." />);
    expect(screen.getByText("Loading patients...")).toBeInTheDocument();
  });

  it("renders error state with retry action", () => {
    const onRetry = vi.fn();
    render(
      <DataState
        status="error"
        errorMessage="Unable to fetch records"
        onRetry={onRetry}
      />,
    );

    expect(screen.getByText("Unable to fetch records")).toBeInTheDocument();
    screen.getByRole("button", { name: "Try again" }).click();
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("renders empty state", () => {
    render(
      <DataState
        status="empty"
        emptyIcon={Calendar}
        emptyTitle="No appointments found"
        emptyDescription="Appointments will appear here."
      />,
    );

    expect(screen.getByText("No appointments found")).toBeInTheDocument();
    expect(screen.getByText("Appointments will appear here.")).toBeInTheDocument();
  });

  it("renders success children", () => {
    render(
      <DataState status="success">
        <div>Loaded content</div>
      </DataState>,
    );

    expect(screen.getByText("Loaded content")).toBeInTheDocument();
  });
});
