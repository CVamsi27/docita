import { shouldUpdatePreselectedPatient } from "./appointment-preselected-patient";

describe("shouldUpdatePreselectedPatient", () => {
  it("returns false when dialog is not open", () => {
    expect(
      shouldUpdatePreselectedPatient(false, "pat-1", "pat-2", false),
    ).toBe(false);
  });

  it("returns false when dialog is undefined", () => {
    expect(
      shouldUpdatePreselectedPatient(undefined, "pat-1", "pat-2", false),
    ).toBe(false);
  });

  it("returns false when preselectedPatientId equals lastPreselectedPatientId", () => {
    expect(
      shouldUpdatePreselectedPatient(true, "pat-1", "pat-1", false),
    ).toBe(false);
  });

  it("returns false when preselectedPatientId is undefined", () => {
    expect(
      shouldUpdatePreselectedPatient(true, undefined, "pat-1", false),
    ).toBe(false);
  });

  it("returns false when patientFieldIsDirty", () => {
    expect(
      shouldUpdatePreselectedPatient(true, "pat-2", "pat-1", true),
    ).toBe(false);
  });

  it("returns true when all conditions are met", () => {
    expect(
      shouldUpdatePreselectedPatient(true, "pat-2", "pat-1", false),
    ).toBe(true);
  });

  it("returns true when lastPreselectedPatientId is undefined", () => {
    expect(
      shouldUpdatePreselectedPatient(true, "pat-1", undefined, false),
    ).toBe(true);
  });

  it("returns false when preselectedPatientId is empty string", () => {
    expect(
      shouldUpdatePreselectedPatient(true, "", "pat-1", false),
    ).toBe(false);
  });
});
