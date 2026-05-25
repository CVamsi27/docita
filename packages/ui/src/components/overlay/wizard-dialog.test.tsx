import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { WizardDialog } from "./wizard-dialog";

const STEPS = [
  { id: "details" },
  { id: "review" },
  { id: "confirm" },
];

describe("WizardDialog", () => {
  it("renders title, description, and step pips with current step marked", () => {
    render(
      <WizardDialog
        open
        onOpenChange={() => undefined}
        category="Onboarding"
        title="Add patient"
        description="Quick details"
        steps={STEPS}
        activeStepId="review"
      >
        <p>step body</p>
      </WizardDialog>,
    );

    expect(
      screen.getByRole("heading", { name: /add patient/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/quick details/i)).toBeInTheDocument();
    expect(screen.getByText("Onboarding")).toBeInTheDocument();
    expect(screen.getByLabelText(/step 2 of 3/i)).toBeInTheDocument();
  });

  it("invokes onBack only when not on the first step", () => {
    const onBack = vi.fn();
    render(
      <WizardDialog
        open
        onOpenChange={() => undefined}
        title="Add patient"
        steps={STEPS}
        activeStepId="review"
        onBack={onBack}
      >
        <p>step body</p>
      </WizardDialog>,
    );
    fireEvent.click(screen.getByRole("button", { name: /previous step/i }));
    expect(onBack).toHaveBeenCalled();
  });
});
