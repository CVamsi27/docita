import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, it, vi } from "vitest";

import { AdmissionForm, ipdAdmissionFormSchema } from "./admission-form";

const messages = {
  Ipd: {
    admissionForm: {
      title: "New admission",
      description: "Admit a patient to the hospital",
      patientLabel: "Patient",
      patientPlaceholder: "Enter patient name or phone",
      wardLabel: "Ward",
      wardAriaLabel: "Select Ward",
      wardPlaceholder: "Ward",
      bedLabel: "Bed",
      bedAriaLabel: "Select Bed",
      bedPlaceholder: "Bed",
      doctorLabel: "Attending doctor",
      doctorAriaLabel: "Select Doctor",
      doctorPlaceholder: "Doctor",
      diagnosisLabel: "Admission diagnosis",
      diagnosisPlaceholder: "Admission diagnosis",
      notesLabel: "Notes",
      notesPlaceholder: "Admission notes",
      submittingButton: "Admitting…",
      submitButton: "Admit Patient",
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

describe("ipdAdmissionFormSchema", () => {
  it("requires the core admission identifiers", () => {
    const result = ipdAdmissionFormSchema.safeParse({
      patientId: "",
      wardId: "",
      bedId: "",
      attendingDoctorId: "",
      diagnosis: "",
      notes: "",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      const fields = new Set(result.error.issues.map((issue) => issue.path[0]));
      expect(fields).toContain("patientId");
      expect(fields).toContain("wardId");
      expect(fields).toContain("bedId");
      expect(fields).toContain("attendingDoctorId");
      expect(fields).toContain("diagnosis");
    }
  });

  it("accepts a complete admission payload and trims diagnosis", () => {
    const result = ipdAdmissionFormSchema.safeParse({
      patientId: "patient-1",
      wardId: "general",
      bedId: "bed-1",
      attendingDoctorId: "dr1",
      diagnosis: "  Pneumonia  ",
      notes: "Stable",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.diagnosis).toBe("Pneumonia");
    }
  });
});

describe("<AdmissionForm />", () => {
  it("blocks submission and surfaces validation errors when fields are blank", async () => {
    const onSubmit = vi.fn();
    renderWithIntl(<AdmissionForm onSubmit={onSubmit} />);

    fireEvent.click(screen.getByRole("button", { name: /admit patient/i }));

    await waitFor(() => {
      expect(screen.getByText(/select a patient/i)).toBeInTheDocument();
    });

    expect(screen.getByText(/select a ward/i)).toBeInTheDocument();
    expect(screen.getByText(/select a bed/i)).toBeInTheDocument();
    expect(
      screen.getByText(/select the attending doctor/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/enter the admission diagnosis/i),
    ).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("submits the trimmed payload when all required fields are valid", async () => {
    const onSubmit = vi.fn();

    renderWithIntl(
      <AdmissionForm
        defaultValues={{
          patientId: "patient-1",
          wardId: "general",
          bedId: "bed-1",
          attendingDoctorId: "dr1",
          diagnosis: "  Pneumonia  ",
          notes: "Stable",
        }}
        onSubmit={onSubmit}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /admit patient/i }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledTimes(1);
    });
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        patientId: "patient-1",
        wardId: "general",
        bedId: "bed-1",
        attendingDoctorId: "dr1",
        diagnosis: "Pneumonia",
      }),
    );
  });
});
