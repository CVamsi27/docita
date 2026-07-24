import {
  extractDiagnosis,
  extractMedications,
  extractBloodPressure,
  extractTemperature,
  extractPulse,
  extractSpO2,
  extractHemoglobin,
  extractGlucose,
  extractCreatinine,
} from "./clinical-parsers";
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

describe("extractDiagnosis", () => {
  it("extracts diagnosis from line with 'diagnosis'", () => {
    const fields = createEmptyFields();
    extractDiagnosis("Diagnosis: Malaria", "diagnosis: malaria", fields);
    expect(fields.diagnosis).toBe("Malaria");
  });

  it("extracts diagnosis from line with 'imp:'", () => {
    const fields = createEmptyFields();
    extractDiagnosis("Imp: Dengue Fever", "imp: dengue fever", fields);
    expect(fields.diagnosis).toBe("Dengue Fever");
  });

  it("does not overwrite existing diagnosis", () => {
    const fields = createEmptyFields();
    fields.diagnosis = "Existing";
    extractDiagnosis("Diagnosis: New", "diagnosis: new", fields);
    expect(fields.diagnosis).toBe("Existing");
  });

  it("does nothing when no diagnosis keyword found", () => {
    const fields = createEmptyFields();
    extractDiagnosis("Random line", "random line", fields);
    expect(fields.diagnosis).toBe("");
  });
});

describe("extractMedications", () => {
  it("extracts medication with dosage", () => {
    const fields = createEmptyFields();
    extractMedications("Paracetamol 500mg", "paracetamol 500mg", fields);
    expect(fields.medications).toHaveLength(1);
    expect(fields.medications[0].name).toBe("Paracetamol");
    expect(fields.medications[0].dosage).toBe("500mg");
  });

  it("extracts medication with frequency", () => {
    const fields = createEmptyFields();
    extractMedications("Amoxicillin 250mg twice daily", "amoxicillin 250mg twice daily", fields);
    expect(fields.medications[0].frequency).toBe("twice daily");
  });

  it("does not extract medication line containing 'medication' keyword", () => {
    const fields = createEmptyFields();
    extractMedications("Medication: Paracetamol 500mg", "medication: paracetamol 500mg", fields);
    expect(fields.medications).toHaveLength(0);
  });

  it("stops adding when already at 10 medications", () => {
    const fields = createEmptyFields();
    for (let i = 0; i < 12; i++) {
      fields.medications.push({ name: `Med${i}`, dosage: "10mg", frequency: "", route: "", duration: "" });
    }
    extractMedications("New Drug 100mg", "new drug 100mg", fields);
    // Guard fires at >= 10, so no new medication is added
    expect(fields.medications).toHaveLength(12);
  });
});

describe("extractBloodPressure", () => {
  it("extracts blood pressure", () => {
    const fields = createEmptyFields();
    extractBloodPressure("BP: 120/80 mmhg", fields);
    expect(fields.vitals.bp).toBe("120/80");
  });

  it("extracts BP without mmhg", () => {
    const fields = createEmptyFields();
    extractBloodPressure("Blood Pressure: 130/90", fields);
    expect(fields.vitals.bp).toBe("130/90");
  });

  it("does not overwrite existing BP", () => {
    const fields = createEmptyFields();
    fields.vitals.bp = "110/70";
    extractBloodPressure("BP: 120/80", fields);
    expect(fields.vitals.bp).toBe("110/70");
  });

  it("does nothing when no BP found", () => {
    const fields = createEmptyFields();
    extractBloodPressure("No BP here", fields);
    expect(fields.vitals.bp).toBe("");
  });
});

describe("extractTemperature", () => {
  it("extracts temperature", () => {
    const fields = createEmptyFields();
    extractTemperature("Temp: 98.6 F", fields);
    expect(fields.vitals.temp).toBe("98.6");
  });

  it("extracts temperature without unit", () => {
    const fields = createEmptyFields();
    extractTemperature("T: 37.5", fields);
    expect(fields.vitals.temp).toBe("37.5");
  });

  it("rejects temperature outside valid range", () => {
    const fields = createEmptyFields();
    extractTemperature("Temp: 20", fields);
    expect(fields.vitals.temp).toBe("");
  });

  it("does not overwrite existing temperature", () => {
    const fields = createEmptyFields();
    fields.vitals.temp = "99.0";
    extractTemperature("Temp: 98.6", fields);
    expect(fields.vitals.temp).toBe("99.0");
  });
});

describe("extractPulse", () => {
  it("extracts pulse rate", () => {
    const fields = createEmptyFields();
    extractPulse("Pulse: 72", fields);
    expect(fields.vitals.pulse).toBe("72");
  });

  it("extracts heart rate", () => {
    const fields = createEmptyFields();
    extractPulse("Heart Rate: 85", fields);
    expect(fields.vitals.pulse).toBe("85");
  });

  it("rejects pulse outside valid range", () => {
    const fields = createEmptyFields();
    extractPulse("Pulse: 30", fields);
    expect(fields.vitals.pulse).toBe("");
  });

  it("does not overwrite existing pulse", () => {
    const fields = createEmptyFields();
    fields.vitals.pulse = "80";
    extractPulse("Pulse: 72", fields);
    expect(fields.vitals.pulse).toBe("80");
  });
});

describe("extractSpO2", () => {
  it("extracts SpO2", () => {
    const fields = createEmptyFields();
    extractSpO2("SpO2: 98%", fields);
    expect(fields.vitals.spO2).toBe("98");
  });

  it("extracts saturation", () => {
    const fields = createEmptyFields();
    extractSpO2("Sat: 95%", fields);
    expect(fields.vitals.spO2).toBe("95");
  });

  it("does not overwrite existing SpO2", () => {
    const fields = createEmptyFields();
    fields.vitals.spO2 = "99";
    extractSpO2("SpO2: 97%", fields);
    expect(fields.vitals.spO2).toBe("99");
  });
});

describe("extractHemoglobin", () => {
  it("extracts hemoglobin value", () => {
    const fields = createEmptyFields();
    extractHemoglobin("Hemoglobin: 12.5 g/dl", "hemoglobin: 12.5 g/dl", fields);
    expect(fields.labValues.hemoglobin).toBe("12.5");
  });

  it("extracts hb value", () => {
    const fields = createEmptyFields();
    extractHemoglobin("HB: 14.0", "hb: 14.0", fields);
    expect(fields.labValues.hemoglobin).toBe("14.0");
  });

  it("does nothing when no hemoglobin keyword found", () => {
    const fields = createEmptyFields();
    extractHemoglobin("Random line", "random line", fields);
    expect(fields.labValues.hemoglobin).toBe("");
  });
});

describe("extractGlucose", () => {
  it("extracts glucose value", () => {
    const fields = createEmptyFields();
    extractGlucose("Glucose: 110", "glucose: 110", fields);
    expect(fields.labValues.glucose).toBe("110");
  });

  it("extracts blood sugar value", () => {
    const fields = createEmptyFields();
    extractGlucose("Blood Sugar: 95", "blood sugar: 95", fields);
    expect(fields.labValues.glucose).toBe("95");
  });

  it("does nothing when no glucose keyword found", () => {
    const fields = createEmptyFields();
    extractGlucose("Random line", "random line", fields);
    expect(fields.labValues.glucose).toBe("");
  });
});

describe("extractCreatinine", () => {
  it("extracts creatinine value", () => {
    const fields = createEmptyFields();
    extractCreatinine("Creatinine: 1.2mg/dl", "creatinine: 1.2mg/dl", fields);
    expect(fields.labValues.creatinine).toBe("1.2");
  });

  it("does nothing when no creatinine keyword found", () => {
    const fields = createEmptyFields();
    extractCreatinine("Random line", "random line", fields);
    expect(fields.labValues.creatinine).toBe("");
  });
});
