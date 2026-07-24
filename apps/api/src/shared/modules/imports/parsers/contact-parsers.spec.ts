import { extractPhoneNumber, extractEmail, extractEmergencyContact } from "./contact-parsers";
import type { ParsedMedicalFields } from "@workspace/types";

function createEmptyFields(): ParsedMedicalFields {
  return {
    clinicName: "",
    doctorName: "",
    patientName: "",
    gender: "",
    dateOfBirth: "",
    visitDate: "",
    admissionDate: "",
    invoiceDate: "",
    mrn: "",
    phoneNumber: "",
    email: "",
    diagnosis: "",
    medications: [],
    vitals: { bp: "", temp: "", pulse: "", spO2: "" },
    labValues: { hemoglobin: "", glucose: "", creatinine: "" },
    emergencyContact: undefined,
    invoice: { total: 0, tax: 0, discount: 0, subtotal: 0, items: [] },
  };
}

describe("extractPhoneNumber", () => {
  it("extracts Indian mobile number", () => {
    const fields = createEmptyFields();
    extractPhoneNumber("Phone: 9876543210", fields);
    expect(fields.phoneNumber).toBe("9876543210");
  });

  it("extracts number with +91 prefix", () => {
    const fields = createEmptyFields();
    extractPhoneNumber("Call +919876543210", fields);
    expect(fields.phoneNumber).toBe("9876543210");
  });

  it("extracts number with 0 prefix", () => {
    const fields = createEmptyFields();
    extractPhoneNumber("Tel: 09876543210", fields);
    expect(fields.phoneNumber).toBe("9876543210");
  });

  it("does not overwrite existing phone number", () => {
    const fields = createEmptyFields();
    fields.phoneNumber = "1234567890";
    extractPhoneNumber("Phone: 9876543210", fields);
    expect(fields.phoneNumber).toBe("1234567890");
  });

  it("does nothing when no phone number found", () => {
    const fields = createEmptyFields();
    extractPhoneNumber("No phone here", fields);
    expect(fields.phoneNumber).toBe("");
  });
});

describe("extractEmail", () => {
  it("extracts email address", () => {
    const fields = createEmptyFields();
    extractEmail("Email: john@example.com", fields);
    expect(fields.email).toBe("john@example.com");
  });

  it("extracts email with dots and hyphens", () => {
    const fields = createEmptyFields();
    extractEmail("Contact: john.doe@hospital.org", fields);
    expect(fields.email).toBe("john.doe@hospital.org");
  });

  it("does not overwrite existing email", () => {
    const fields = createEmptyFields();
    fields.email = "existing@test.com";
    extractEmail("Email: new@test.com", fields);
    expect(fields.email).toBe("existing@test.com");
  });

  it("does nothing when no email found", () => {
    const fields = createEmptyFields();
    extractEmail("No email here", fields);
    expect(fields.email).toBe("");
  });
});

describe("extractEmergencyContact", () => {
  it("extracts emergency contact with name and phone", () => {
    const fields = createEmptyFields();
    extractEmergencyContact("Emergency Contact: John Doe 9876543210", fields);
    expect(fields.emergencyContact).toEqual({
      name: "John Doe",
      phoneNumber: "9876543210",
      relation: "",
    });
  });

  it("extracts emergency contact with name only", () => {
    const fields = createEmptyFields();
    extractEmergencyContact("Emergency: Jane Smith", fields);
    expect(fields.emergencyContact?.name).toBe("Jane Smith");
  });

  it("does nothing when no emergency keyword found", () => {
    const fields = createEmptyFields();
    extractEmergencyContact("No match here at all", fields);
    expect(fields.emergencyContact).toBeUndefined();
  });
});
