import { describe, expect, it, vi, beforeEach } from "vitest";
import { fireEvent, screen } from "@testing-library/react";
import { render } from "@/test-utils/render-with-tooltip";
import { RecordsTab } from "./RecordsTab";

// Mock the underlying container so we only assert on the gate logic.
vi.mock(
  "@/features/patients/components/details/PatientMedicalHistoryContainer",
  () => ({
    PatientMedicalHistoryContainer: ({
      readOnly,
      allowGrowthEdit,
    }: {
      readOnly: boolean;
      allowGrowthEdit: boolean;
    }) => (
      <div
        data-testid="history-container"
        data-readonly={String(readOnly)}
        data-allow-growth-edit={String(allowGrowthEdit)}
      />
    ),
  }),
);

const PATIENT = { id: "p-1" } as never;

describe("RecordsTab growth-edit gate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("starts read-only with growth editing disabled", () => {
    render(<RecordsTab patient={PATIENT} canEditPatient={true} />);

    const container = screen.getByTestId("history-container");
    expect(container).toHaveAttribute("data-readonly", "true");
    expect(container).toHaveAttribute("data-allow-growth-edit", "false");
  });

  it("unlocks every field including growth when the user clicks Edit", () => {
    render(<RecordsTab patient={PATIENT} canEditPatient={true} />);

    fireEvent.click(screen.getByRole("button", { name: /edit records/i }));

    const container = screen.getByTestId("history-container");
    expect(container).toHaveAttribute("data-readonly", "false");
    // Regression: previously allowGrowthEdit was hardcoded to false,
    // so the growth chart stayed read-only even after Edit.
    expect(container).toHaveAttribute("data-allow-growth-edit", "true");
  });

  it("re-locks every field including growth when the user clicks Done", () => {
    render(<RecordsTab patient={PATIENT} canEditPatient={true} />);

    fireEvent.click(screen.getByRole("button", { name: /edit records/i }));
    fireEvent.click(screen.getByRole("button", { name: /done/i }));

    const container = screen.getByTestId("history-container");
    expect(container).toHaveAttribute("data-readonly", "true");
    expect(container).toHaveAttribute("data-allow-growth-edit", "false");
  });

  it("hides the Edit records button when the actor lacks edit permission", () => {
    render(<RecordsTab patient={PATIENT} canEditPatient={false} />);

    expect(
      screen.queryByRole("button", { name: /edit records/i }),
    ).not.toBeInTheDocument();
  });
});
