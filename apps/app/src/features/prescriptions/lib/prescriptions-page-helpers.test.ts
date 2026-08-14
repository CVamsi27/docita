import { describe, expect, it } from "vitest";
import type { Patient, Prescription } from "@workspace/types";
import {
  buildPrescriptionsHeaderDescription,
  filterPrescriptionsBySearch,
  sortPrescriptions,
} from "./prescriptions-page-helpers";

type Row = Prescription & { patient: Patient };

function makeRow(overrides: {
  firstName: string;
  lastName: string;
  diagnosis?: string;
  medications?: { name: string }[];
  createdAt?: string;
}): Row {
  return {
    patient: {
      firstName: overrides.firstName,
      lastName: overrides.lastName,
    } as Patient,
    diagnosis: overrides.diagnosis ?? "",
    medications: overrides.medications ?? [],
    createdAt: overrides.createdAt ?? "2026-06-01T10:00:00.000Z",
  } as Row;
}

const rows = [
  makeRow({
    firstName: "Asha",
    lastName: "Verma",
    diagnosis: "Hypertension",
    medications: [{ name: "Amlodipine" }],
    createdAt: "2026-06-02T10:00:00.000Z",
  }),
  makeRow({
    firstName: "Ravi",
    lastName: "Kumar",
    diagnosis: "Type 2 Diabetes",
    medications: [{ name: "Metformin" }, { name: "Glimepiride" }],
    createdAt: "2026-06-01T10:00:00.000Z",
  }),
  makeRow({
    firstName: "Meena",
    lastName: "Iyer",
    diagnosis: "",
    medications: [],
    createdAt: "2026-06-03T10:00:00.000Z",
  }),
];

describe("filterPrescriptionsBySearch", () => {
  it("returns all rows for a blank query", () => {
    expect(filterPrescriptionsBySearch(rows, "")).toHaveLength(3);
    expect(filterPrescriptionsBySearch(rows, "   ")).toHaveLength(3);
  });

  it("matches patient name case-insensitively", () => {
    const result = filterPrescriptionsBySearch(rows, "asha");
    expect(result).toHaveLength(1);
    expect(result[0].patient.firstName).toBe("Asha");
  });

  it("matches diagnosis and medication names", () => {
    expect(filterPrescriptionsBySearch(rows, "diabetes")).toHaveLength(1);
    expect(filterPrescriptionsBySearch(rows, "metformin")).toHaveLength(1);
  });

  it("returns empty when nothing matches", () => {
    expect(filterPrescriptionsBySearch(rows, "paracetamol")).toHaveLength(0);
  });
});

describe("sortPrescriptions", () => {
  it("sorts by date descending without mutating the input", () => {
    const sorted = sortPrescriptions(rows, { key: "date", direction: "desc" });
    expect(sorted.map((r) => r.patient.firstName)).toEqual([
      "Meena",
      "Asha",
      "Ravi",
    ]);
    expect(rows[0].patient.firstName).toBe("Asha");
  });

  it("sorts by patient name ascending", () => {
    const sorted = sortPrescriptions(rows, {
      key: "patient",
      direction: "asc",
    });
    expect(sorted.map((r) => r.patient.firstName)).toEqual([
      "Asha",
      "Meena",
      "Ravi",
    ]);
  });

  it("sorts by medication count", () => {
    const sorted = sortPrescriptions(rows, {
      key: "medications",
      direction: "desc",
    });
    expect(sorted[0].medications).toHaveLength(2);
    expect(sorted[2].medications).toHaveLength(0);
  });
});

describe("buildPrescriptionsHeaderDescription", () => {
  const base = {
    hasDateRange: true,
    startDate: "2026-06-10",
    endDate: "2026-06-10",
    clinicToday: "2026-06-10",
    patientId: "",
    isDoctorRole: false,
  };

  it("labels today's single-day range as today", () => {
    expect(buildPrescriptionsHeaderDescription(base)).toBe(
      "View and manage prescriptions for today (2026-06-10).",
    );
  });

  it("labels a past single-day range as the day", () => {
    expect(
      buildPrescriptionsHeaderDescription({
        ...base,
        startDate: "2026-06-01",
        endDate: "2026-06-01",
      }),
    ).toBe("View and manage prescriptions for the day (2026-06-01).");
  });

  it("uses the patient-scoped sentence when a patient is selected", () => {
    expect(
      buildPrescriptionsHeaderDescription({ ...base, patientId: "pat_1" }),
    ).toBe(
      "Showing prescriptions for today (2026-06-10), scoped to the selected patient.",
    );
  });

  it("uses the doctor sentence and all-days label", () => {
    expect(
      buildPrescriptionsHeaderDescription({
        ...base,
        hasDateRange: false,
        isDoctorRole: true,
      }),
    ).toBe("Showing prescriptions for all days.");
  });

  it("formats a multi-day range", () => {
    expect(
      buildPrescriptionsHeaderDescription({
        ...base,
        startDate: "2026-06-01",
        endDate: "2026-06-07",
      }),
    ).toBe("View and manage prescriptions for 2026-06-01 to 2026-06-07.");
  });
});
