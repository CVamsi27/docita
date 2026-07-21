import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { Patient } from "@workspace/types";
import { AskAiProvider, useAskAi } from "@/components/ask-ai/ask-ai-context";
import { PatientPageHeaderUI } from "./PatientPageHeaderUI";

vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

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

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string, params?: Record<string, string | number>) => {
    const template = patientHeaderCopy[key] ?? key;
    if (!params) return template;
    return template.replace(/\{(\w+)\}/g, (_, name) => String(params[name] ?? ""));
  },
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
};

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

describe("PatientPageHeaderUI Ask AI button", () => {
  it("opens the overlay scoped to the current patient", () => {
    render(
      <AskAiProvider>
        <PatientPageHeaderUI patient={mockPatient} />
        <ScopeProbe />
      </AskAiProvider>,
    );

    fireEvent.click(screen.getByTestId("patient-ask-ai"));

    const probe = screen.getByTestId("ask-ai-state");
    expect(probe.getAttribute("data-open")).toBe("true");
    expect(probe.getAttribute("data-scope-id")).toBe("patient:patient-abc-123");
    expect(probe.getAttribute("data-scope-label")).toBe("on Ada Lovelace");
  });

  it("renders an explicit aria-label that includes the patient name", () => {
    render(
      <AskAiProvider>
        <PatientPageHeaderUI patient={mockPatient} />
      </AskAiProvider>,
    );
    expect(
      screen.getByRole("button", { name: /Ask AI about Ada Lovelace/i }),
    ).toBeInTheDocument();
  });
});
