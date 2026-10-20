import { render, screen } from "@/test-utils";
import { describe, expect, it, vi } from "vitest";
import { PrescriptionsTable } from "./PrescriptionsTable";
import type { Prescription } from "@workspace/types";

function makePrescription(overrides: Partial<Prescription> = {}): Prescription {
  return {
    id: "rx-1",
    clinicId: "clinic-1",
    patientId: "patient-1",
    doctorId: "doctor-1",
    appointmentId: "apt-1",
    diagnosis: "Common cold",
    notes: "",
    medications: [{ name: "Paracetamol", dosage: "500mg", frequency: "TID", duration: "5 days", instructions: "" }],
    createdAt: "2026-08-15T10:00:00.000Z",
    updatedAt: "2026-08-15T10:00:00.000Z",
    ...overrides,
  } as Prescription;
}

const defaultSortConfig = { key: "createdAt" as const, direction: "desc" as const };

describe("PrescriptionsTable", () => {
  it("renders prescription rows with diagnosis text", () => {
    const prescriptions = [
      makePrescription({ id: "rx-1", diagnosis: "Fever" }),
      makePrescription({ id: "rx-2", diagnosis: "Headache" }),
    ];

    render(
      <PrescriptionsTable
        prescriptions={prescriptions}
        loading={false}
        sortConfig={defaultSortConfig}
        onSort={vi.fn()}
        onDownloadPDF={vi.fn()}
      />,
    );

    // DataTable renders both desktop table and mobile cards, so text may appear twice
    expect(screen.getAllByText("Fever").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Headache").length).toBeGreaterThanOrEqual(1);
  });

  it("shows empty state when no prescriptions exist", () => {
    render(
      <PrescriptionsTable
        prescriptions={[]}
        loading={false}
        sortConfig={defaultSortConfig}
        onSort={vi.fn()}
        onDownloadPDF={vi.fn()}
      />,
    );

    expect(screen.getByText(/no prescriptions/i)).toBeInTheDocument();
  });

  it("renders skeleton loaders when loading", () => {
    const { container } = render(
      <PrescriptionsTable
        prescriptions={[]}
        loading={true}
        sortConfig={defaultSortConfig}
        onSort={vi.fn()}
        onDownloadPDF={vi.fn()}
      />,
    );

    // DataTable renders Skeleton components (data-skeleton) when isLoading is true
    const skeletons = container.querySelectorAll("[data-skeleton]");
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it("displays medication count badge for each prescription", () => {
    const prescriptions = [
      makePrescription({
        id: "rx-1",
        medications: [
          { name: "Amoxicillin", dosage: "250mg", frequency: "BID", duration: "7 days", instructions: "" },
          { name: "Ibuprofen", dosage: "400mg", frequency: "TID", duration: "5 days", instructions: "" },
        ],
      }),
    ];

    render(
      <PrescriptionsTable
        prescriptions={prescriptions}
        loading={false}
        sortConfig={defaultSortConfig}
        onSort={vi.fn()}
        onDownloadPDF={vi.fn()}
      />,
    );

    // MedicationsCell shows count, not names — "2" for two medications
    expect(screen.getAllByText("2").length).toBeGreaterThanOrEqual(1);
  });
});
