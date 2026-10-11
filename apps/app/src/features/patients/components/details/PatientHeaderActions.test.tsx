import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@/test-utils";
import { AskAiProvider } from "@/components/ask-ai/ask-ai-provider";
import { AskAiOverlay } from "@/components/ask-ai/ask-ai-overlay";
import { PatientHeaderActions } from "./PatientHeaderActions";

vi.mock("@/lib/config/ai-features", () => ({ AI_FEATURES_ENABLED: false }));
vi.mock("@/hooks/use-permissions", () => ({
  usePermissions: () => ({ canStartConsultation: false }),
}));
vi.mock("@/lib/stores/permission-store", () => ({
  usePermissionStore: () => ({ canAccess: () => false }),
}));
vi.mock("@workspace/data-access", () => ({
  useStartConsultation: () => ({ mutateAsync: vi.fn() }),
}));

describe("Patient contextual AI preview", () => {
  it("opens the local patient preview with external AI disabled and sends no patient data", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    try {
      render(
        <AskAiProvider>
          <PatientHeaderActions
            patientId="patient-fixture"
            patientName="Jane Patient"
            appointments={[]}
            canEditPatient={false}
            canCreateAppointment={false}
            onScheduleVisit={vi.fn()}
            onEdit={vi.fn()}
          />
          <AskAiOverlay />
        </AskAiProvider>,
      );
      const trigger = screen.getByRole("button", { name: "Ask AI" });
      trigger.focus();
      fireEvent.click(trigger);
      const dialog = screen.getByRole("dialog", { name: "Ask AI" });
      expect(screen.getByText("on Jane Patient")).toBeVisible();
      expect(screen.getByText("AI assistant is coming soon.")).toBeVisible();
      expect(
        screen.getByText("AI suggestions are not medical advice."),
      ).toBeVisible();
      expect(fetchSpy).not.toHaveBeenCalled();
      fireEvent.keyDown(dialog, { key: "Escape" });
      await waitFor(() =>
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
      );
      await waitFor(() => expect(trigger).toHaveFocus());
    } finally {
      fetchSpy.mockRestore();
    }
  });
});
