import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TooltipProvider } from "@workspace/ui/components/overlay/tooltip";
import { PatientFaceSheetHeaderContainer } from "./PatientFaceSheetHeaderContainer";

describe("PatientFaceSheetHeaderContainer", () => {
  it("renders the patient header without a medical ID editor", () => {
    render(
      <TooltipProvider>
        <PatientFaceSheetHeaderContainer
          patient={{
            id: "patient-1",
            firstName: "Jane",
            lastName: "Doe",
            gender: "FEMALE",
            dateOfBirth: "1990-01-01",
          }}
        />
      </TooltipProvider>,
    );

    expect(screen.getByText(/doe, jane/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/medical id/i)).not.toBeInTheDocument();
  });
});
