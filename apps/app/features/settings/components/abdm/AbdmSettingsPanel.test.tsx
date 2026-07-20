import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, it } from "vitest";
import { AbdmSettingsPanel } from "./AbdmSettingsPanel";

const messages = {
  Settings: {
    Abdm: {
      title: "ABDM Integration",
      description:
        "ABHA verification, M2 linking, M3 consent, and DHIS reporting are coming soon. Gateway certification is in progress.",
      capabilitiesIntro: "The ABDM settings panel will include:",
      capabilities: {
        facilityToggle: "Facility ABDM enable/disable toggle",
        readinessChecklist: "M1/M2/M3 readiness checklist",
        abhaVerification: "ABHA verification status per patient",
        recordsInbox: "External health records inbox",
        dhisEstimates: "DHIS incentive estimates",
      },
    },
  },
};

function renderWithIntl(node: React.ReactNode) {
  return render(
    <NextIntlClientProvider locale="en" messages={messages}>
      {node}
    </NextIntlClientProvider>,
  );
}

describe("AbdmSettingsPanel", () => {
  it("renders coming soon placeholder", () => {
    renderWithIntl(<AbdmSettingsPanel />);

    expect(screen.getByText("ABDM Integration")).toBeInTheDocument();
    expect(screen.getByText("Coming soon")).toBeInTheDocument();
    expect(
      screen.getByText(/gateway certification is in progress/i),
    ).toBeInTheDocument();
  });

  it("lists planned ABDM capabilities", () => {
    renderWithIntl(<AbdmSettingsPanel />);

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
