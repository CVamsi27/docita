import { render, screen } from "@testing-library/react";
import type { ReactElement } from "react";
import { describe, expect, it, vi } from "vitest";
import { TooltipProvider } from "@workspace/ui/components/overlay/tooltip";
import { ConsultationPageHeaderUI } from "./ConsultationPageHeaderUI";

function renderWithUiProviders(ui: ReactElement) {
  return render(<TooltipProvider>{ui}</TooltipProvider>);
}

vi.mock("@tanstack/react-query", () => ({
  useQueryClient: () => ({
    invalidateQueries: vi.fn(),
  }),
}));

vi.mock("@/features/consultation/workspace/consultation-vitals-context", () => ({
  useConsultationVitals: () => ({ openVitals: vi.fn() }),
}));

vi.mock("@/features/consultation/hooks/use-appointment-open-invoice", () => ({
  useAppointmentOpenInvoice: () => ({ invoice: null, isLoading: false }),
}));

vi.mock("@/components/ask-ai/ask-ai-context", () => ({
  useAskAi: () => ({ openOverlay: vi.fn(), closeOverlay: vi.fn(), open: false, scope: null }),
}));

vi.mock("@/hooks/use-permissions", () => ({
  usePermissions: () => ({ canCreateInvoice: true }),
}));

vi.mock("./modals/BillingModal", () => ({
  BillingModal: () => null,
}));

vi.mock("./ConsultationTimerContainer", () => ({
  ConsultationTimerContainer: () => null,
}));

vi.mock("@/features/consultation/workspace/chrome/SaveStatusChip", () => ({
  SaveStatusChip: () => (
    <span data-testid="consultation-save-status" role="status">
      Saved
    </span>
  ),
}));

describe("ConsultationPageHeaderUI", () => {
  it("hides edit actions in read-only mode", () => {
    renderWithUiProviders(
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

    expect(screen.getByText(/View only/i)).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /Record vital signs/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Create invoice/i }),
    ).toBeInTheDocument();
    expect(
      screen.queryByTestId("consultation-save-status"),
    ).not.toBeInTheDocument();
  });

  it("shows draft save status when the consultation is editable", () => {
    renderWithUiProviders(
      <ConsultationPageHeaderUI
        patientName="Asha Rao"
        appointmentDate="2026-04-18T10:00:00.000Z"
        appointmentId="apt-1"
        readOnly={false}
        onBack={vi.fn()}
      />,
    );

    expect(screen.getByTestId("consultation-save-status")).toBeInTheDocument();
  });

  it("exposes patient history sheet trigger up to xl breakpoint", () => {
    renderWithUiProviders(
      <ConsultationPageHeaderUI
        patientName="Asha Rao"
        appointmentDate="2026-04-18T10:00:00.000Z"
        appointmentId="apt-1"
        readOnly={false}
        onBack={vi.fn()}
        MobileSidebarContent={<div data-testid="consultation-mobile-sidebar" />}
      />,
    );

    const trigger = screen.getByRole("button", {
      name: "Open patient chart and history",
    });
    expect(trigger.className).toContain("xl:hidden");
    expect(trigger.className).not.toContain("md:hidden");
  });
});
