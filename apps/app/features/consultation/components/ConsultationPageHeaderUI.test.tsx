import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ConsultationPageHeaderUI } from "./ConsultationPageHeaderUI";

vi.mock("@tanstack/react-query", () => ({
  useQueryClient: () => ({
    invalidateQueries: vi.fn(),
  }),
}));

vi.mock("./modals/VitalsModal", () => ({
  VitalsModal: () => null,
}));

vi.mock("./modals/BillingModal", () => ({
  BillingModal: () => null,
}));

describe("ConsultationPageHeaderUI", () => {
  it("hides edit actions in read-only mode", () => {
    render(
      <ConsultationPageHeaderUI
        patientName="Asha Rao"
        appointmentDate="2026-04-18T10:00:00.000Z"
        appointmentId="apt-1"
        appointmentType="follow_up"
        appointmentStatus="completed"
        readOnly
        onBack={vi.fn()}
      />,
    );

    expect(screen.getByText("View only")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /Vitals/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /Invoice/i }),
    ).not.toBeInTheDocument();
  });
});
