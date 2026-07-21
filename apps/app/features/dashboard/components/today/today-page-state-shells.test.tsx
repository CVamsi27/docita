import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { render } from "@/test-utils/render-with-tooltip";

import { TodayErrorState, TodayNewClinicEmptyState } from "./today-page-state-shells";

describe("TodayErrorState", () => {
  it("renders the error message and a retry control", () => {
    const onRetry = vi.fn();
    render(<TodayErrorState header={null} onRetry={onRetry} />);

    expect(
      screen.getByText(/We could not load today's workspace/i),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /try again/i }),
    ).toBeInTheDocument();
  });

  it("invokes the retry handler when the user clicks the retry control", () => {
    const onRetry = vi.fn();
    render(<TodayErrorState header={null} onRetry={onRetry} />);

    screen.getByRole("button", { name: /try again/i }).click();
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});

describe("TodayNewClinicEmptyState", () => {
  it("renders the empty-state copy and the primary action", () => {
    render(
      <TodayNewClinicEmptyState
        header={null}
        slot={null}
      />,
    );

    expect(
      screen.getByText(/Start with your first patient/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /Add a patient or schedule a visit to see your queue and today's appointments here\./i,
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /Go to patients/i }),
    ).toHaveAttribute("href", "/patients");
  });
});
