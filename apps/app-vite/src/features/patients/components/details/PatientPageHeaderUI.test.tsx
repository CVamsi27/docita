import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router";
import type { Patient } from "@workspace/types";
import { AskAiProvider, useAskAi } from "@/components/ask-ai/ask-ai-context";
import { PatientPageHeaderUI } from "./PatientPageHeaderUI";

// English literal map mirroring the Patients.pageHeader JSON keys the
// component uses, so test assertions on hardcoded English still match
// after the i18n refactor.
const patientHeaderCopy: Record<string, string> = {
  backToList: "Patients",
  askAiButton: "Ask AI",
  askAiAria: "Ask AI about {name}",
  askAiDefaultName: "this patient",
  askAiOverlayLabel: "on {name}",
  editButton: "Edit Patient",
  idPrefix: "ID: {id}",
};

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, string | number>) => {
      const template = patientHeaderCopy[key] ?? key;
      if (!params) return template;
      return template.replace(/\{(\w+)\}/g, (_, name) => String(params[name] ?? ""));
    },
  }),
}));

// These tests exercise the Ask AI button, which only renders when the global
// AI switch is on.
vi.mock("@/lib/config/ai-features", () => ({
  AI_FEATURES_ENABLED: true,
}));

const mockPatient: Patient = {
  id: "patient-abc-123",
  firstName: "Ada",
  lastName: "Lovelace",
  gender: "FEMALE",
  isolationStatus: "NONE",
  fallRisk: false,
  phoneNumber: "9000000001",
  email: "ada@example.com",
} as Patient;

function ScopeProbe() {
  const { open, scope } = useAskAi();
  return (
    <div
      data-testid="ask-ai-state"
      data-open={open ? "true" : "false"}
      data-scope-id={scope?.id ?? ""}
      data-scope-label={scope?.label ?? ""}
    />
  );
}

function renderHeader() {
  return render(
    <MemoryRouter initialEntries={["/patients/patient-abc-123"]}>
      <AskAiProvider>
        <PatientPageHeaderUI patient={mockPatient} onEdit={vi.fn()} />
        <ScopeProbe />
      </AskAiProvider>
    </MemoryRouter>,
  );
}

describe("PatientPageHeaderUI", () => {
  it("renders the patient name and gender badge", () => {
    renderHeader();
    expect(screen.getByRole("heading", { name: "Ada Lovelace" })).toBeInTheDocument();
    // formatGenderLabel maps FEMALE -> the friendly "Female" label.
    expect(screen.getByText("Female")).toBeInTheDocument();
  });

  it("renders the back link to the patients list", () => {
    renderHeader();
    expect(screen.getByRole("link", { name: "Patients" })).toHaveAttribute(
      "href",
      "/patients",
    );
  });

  it("opens the Ask AI overlay with a patient scope", () => {
    renderHeader();
    fireEvent.click(screen.getByTestId("patient-ask-ai"));
    expect(screen.getByTestId("ask-ai-state")).toHaveAttribute(
      "data-open",
      "true",
    );
    expect(screen.getByTestId("ask-ai-state")).toHaveAttribute(
      "data-scope-id",
      "patient:patient-abc-123",
    );
  });

  it("invokes onEdit when the edit button is clicked", () => {
    const onEdit = vi.fn();
    render(
      <MemoryRouter>
        <AskAiProvider>
          <PatientPageHeaderUI patient={mockPatient} onEdit={onEdit} />
        </AskAiProvider>
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Edit Patient" }));
    expect(onEdit).toHaveBeenCalled();
  });
});
