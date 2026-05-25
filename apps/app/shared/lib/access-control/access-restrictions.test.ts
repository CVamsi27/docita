import { describe, expect, it } from "vitest";
import { resolveDoctorScopedAppointmentFilter } from "@workspace/types";

describe("resolveDoctorScopedAppointmentFilter", () => {
  it("forces doctor requests to their own user id", () => {
    const scope = resolveDoctorScopedAppointmentFilter({
      role: "DOCTOR",
      userId: "doctor-1",
      requestedDoctorId: "doctor-2",
    });

    expect(scope.denied).toBe(false);
    expect(scope.scopedDoctorId).toBe("doctor-1");
  });

  it("allows clinic-wide roles to request a specific doctor filter", () => {
    const scope = resolveDoctorScopedAppointmentFilter({
      role: "ADMIN_DOCTOR",
      userId: "admin-doctor",
      requestedDoctorId: "doctor-2",
    });

    expect(scope.denied).toBe(false);
    expect(scope.scopedDoctorId).toBe("doctor-2");
  });

  it("denies doctor-scoped access when user id is missing", () => {
    const scope = resolveDoctorScopedAppointmentFilter({
      role: "DOCTOR",
      requestedDoctorId: "doctor-2",
    });

    expect(scope.denied).toBe(true);
    expect(scope.scopedDoctorId).toBeUndefined();
  });
});
