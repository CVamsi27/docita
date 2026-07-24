import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SummaryTab } from "./SummaryTab";

// English literal map mirroring the Patients.summary.* JSON keys the
// components use, so test assertions on hardcoded English still match
// after the i18n refactor.
const summaryCopy: Record<string, string> = {
  "ongoingMedications.openAction": "Open prescriptions",
  "ongoingMedications.title": "Ongoing medicines",
  "ongoingMedications.description": "Current prescriptions and adherence at a glance.",
  "ongoingMedications.asNeededBadge": "As needed",
  "ongoingMedications.takeWhenLabel": "Take when: {instructions}",
  "ongoingMedications.adherenceLabel": "Adherence",
  "ongoingMedications.adherenceAria": "{name} adherence",
  "ongoingMedications.adherenceSummary": "{taken} of {total} doses taken",
  "ongoingMedications.adherencePending": "Adherence data is not available yet.",
  "clinicalOverview.title": "Conditions & allergies",
  "clinicalOverview.description": "Critical problem-list items for quick review.",
  "clinicalOverview.editAction": "Edit problem list",
  "clinicalOverview.conditionsHeading": "Health conditions",
  "clinicalOverview.allergiesHeading": "Allergies",
  "clinicalOverview.allergiesEmpty": "NKA",
  "latestVitals.title": "Latest vitals",
  "recentConsultations.title": "Recent consultations",
  "seeAllVisitsButton": "See all visits",
  "abdm.title": "External ABDM records",
  "medicalHistory.title": "Surgeries",
  "comingSoon": "Coming soon",
};

vi.mock("next-intl", () => ({
  useTranslations: (namespace?: string) => (key: string, params?: Record<string, string | number>) => {
    // Map Patients.summary.<ns>.<key> directly to the literal copy map.
    const ns = namespace?.split(".").pop() ?? "";
    const lookupKey = ns ? `${ns}.${key}` : key;
    const template = summaryCopy[lookupKey] ?? summaryCopy[key] ?? key;
    if (!params) return template;
    return template.replace(/\{(\w+)\}/g, (_, name) => String(params[name] ?? ""));
  },
}));

vi.mock("@workspace/data-access", () => ({
  useActiveMedications: () => ({
    data: [
      {
        medicationId: "med-1",
        name: "Metformin",
        dosage: "500 mg",
        frequency: "Twice daily",
        duration: "30 days",
        route: "PO",
        isPRN: false,
        prnInstructions: null,
        adherence: {
          adherenceRate: 87,
          taken: 13,
          totalDoses: 15,
        },
      },
    ],
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  }),
  usePatientSnapshot: () => ({
    data: {
      activeConditions: [
        {
          id: "condition-1",
          conditionName: "Type 2 diabetes",
          status: "ACTIVE",
          severity: "MODERATE",
        },
      ],
      activeAllergies: [
        {
          id: "allergy-1",
          allergen: "Penicillin",
          severity: "SEVERE",
          allergyType: "DRUG",
        },
      ],
      activeMedications: [],
      latestVitals: {
        systolicBP: 120,
        diastolicBP: 80,
        pulse: 72,
        temperature: 36.8,
        spo2: 98,
        weight: 62,
        recordedAt: "2026-05-31T08:00:00.000Z",
      },
    },
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  }),
  usePatientTimeline: () => ({
    data: {
      events: [
        {
          id: "appointment-1",
          type: "APPOINTMENT",
          title: "Follow-up consultation",
          description: "Reviewed ongoing care plan.",
          date: "2026-05-30T08:00:00.000Z",
          metadata: {
            consultationId: "consultation-1",
            doctorName: "Sharma",
            diagnoses: [{ description: "Type 2 diabetes", isPrimary: true }],
            medications: [{ name: "Metformin" }],
            status: "completed",
          },
        },
        {
          id: "appointment-future",
          type: "APPOINTMENT",
          title: "Future appointment",
          description: "Future appointment should not render.",
          date: "2099-05-30T08:00:00.000Z",
          metadata: {
            status: "scheduled",
          },
        },
        {
          id: "appointment-cancelled",
          type: "APPOINTMENT",
          title: "Cancelled appointment",
          description: "Cancelled appointment should not render.",
          date: "2026-05-29T08:00:00.000Z",
          metadata: {
            status: "cancelled",
          },
        },
      ],
      summary: {},
      total: 1,
    },
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  }),
}));

describe("SummaryTab", () => {
  it("surfaces the critical history, medication adherence, and recent consultation", () => {
    render(
      <SummaryTab
        patient={
          {
            id: "patient-1",
            medicalConditions: [
              {
                patientId: "patient-1",
                conditionName: "Type 2 diabetes",
                status: "ACTIVE",
              },
            ],
            patientAllergies: [
              {
                patientId: "patient-1",
                allergen: "Penicillin",
                severity: "SEVERE",
              },
            ],
            surgicalHistory: [
              {
                id: "surgery-1",
                patientId: "patient-1",
                procedureName: "Appendectomy",
              },
            ],
            abhaVerifiedAt: "2026-05-30T08:00:00.000Z",
          } as never
        }
        patientId="patient-1"
      />,
    );

    expect(screen.getByText("Conditions & allergies")).toBeInTheDocument();
    expect(screen.getByText("Penicillin")).toBeInTheDocument();
    expect(screen.getAllByText("Metformin").length).toBeGreaterThan(0);
    expect(screen.getByText("87%")).toBeInTheDocument();
    expect(screen.getByText("Latest vitals")).toBeInTheDocument();
    expect(screen.getByText("Recent consultations")).toBeInTheDocument();
    expect(screen.getByText("External ABDM records")).toBeInTheDocument();
    expect(screen.getAllByText("Coming soon").length).toBeGreaterThan(0);
    expect(screen.getByText("Surgeries")).toBeInTheDocument();
    expect(screen.getAllByText("Type 2 diabetes").length).toBeGreaterThan(0);
    expect(
      screen.queryByText("Future appointment should not render."),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText("Cancelled appointment should not render."),
    ).not.toBeInTheDocument();
    expect(screen.queryByText("No known allergies")).not.toBeInTheDocument();
    // Penicillin allergy is seeded, so neither "NKA" nor the legacy
    // "No known allergies" copy should appear.
    expect(screen.queryByText("NKA")).not.toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Open prescriptions" }),
    ).toHaveAttribute(
      "href",
      "/patients/patient-1?tab=records&subtab=prescriptions",
    );
    expect(screen.getByRole("link", { name: "Open vitals" })).toHaveAttribute(
      "href",
      "/patients/patient-1?tab=records&subtab=vitals",
    );
    expect(
      screen.getByRole("link", { name: "See all visits" }),
    ).toHaveAttribute("href", "/patients/patient-1?tab=visits");
  });
});
