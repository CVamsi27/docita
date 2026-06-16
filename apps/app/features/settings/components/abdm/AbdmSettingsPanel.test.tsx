import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AbdmSettingsPanel } from "./AbdmSettingsPanel";

describe("AbdmSettingsPanel", () => {
  it("renders coming soon placeholder", () => {
    render(<AbdmSettingsPanel />);

    expect(screen.getByText("ABDM Integration")).toBeInTheDocument();
    expect(screen.getByText("Coming soon")).toBeInTheDocument();
    expect(
      screen.getByText(/gateway certification is in progress/),
    ).toBeInTheDocument();
  });

  it("lists planned ABDM capabilities", () => {
    render(<AbdmSettingsPanel />);

    expect(
      screen.getByText("Facility ABDM enable/disable toggle"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("M1/M2/M3 readiness checklist"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("ABHA verification status per patient"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("External health records inbox"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("DHIS incentive estimates"),
    ).toBeInTheDocument();
  });
});
