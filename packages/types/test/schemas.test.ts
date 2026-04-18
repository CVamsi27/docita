import { describe, expect, it } from "vitest";
import {
  checkEmailResponseSchema,
  loginResponseSchema,
  validateSessionResponseSchema,
} from "../src/contracts/auth";
import { createAppointmentSchema } from "../src/operations/appointments";
import { CLINIC_TYPE_OPTIONS } from "../src/shared/users";
import { createPatientSchema } from "../src/patient/patients";

describe("@workspace/types schemas", () => {
  it("validates login response payload", () => {
    const parsed = loginResponseSchema.parse({
      access_token: "access-token",
      user: {
        id: "user-1",
        email: "doctor@example.com",
        name: "Doctor",
        role: "DOCTOR",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    }) as { access_token: string; user: { role: string } };

    expect(parsed.access_token).toBe("access-token");
    expect(parsed.user.role).toBe("DOCTOR");

    expect(
      loginResponseSchema.safeParse({
        access_token: "access-token",
        user: {
          id: "user-1",
          email: "doctor@example.com",
          name: "Doctor",
          role: "INVALID_ROLE",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      }).success,
    ).toBe(false);
  });

  it("validates session and email response contracts", () => {
    expect(
      validateSessionResponseSchema.safeParse({ valid: true, user: {} })
        .success,
    ).toBe(false);

    expect(
      validateSessionResponseSchema.safeParse({ valid: true }).success,
    ).toBe(false);

    expect(checkEmailResponseSchema.parse({ exists: false }).exists).toBe(
      false,
    );
  });

  it("rejects future DOB and sanitizes HTML fields", () => {
    const futureDate = new Date(Date.now() + 86_400_000).toISOString();

    expect(
      createPatientSchema.safeParse({
        firstName: "A",
        lastName: "B",
        dateOfBirth: futureDate,
        gender: "MALE",
        phoneNumber: "1234567890",
      }).success,
    ).toBe(false);

    expect(
      createPatientSchema.safeParse({
        firstName: "A",
        lastName: "B",
        dateOfBirth: "2000-01-01",
        gender: "UNKNOWN",
        phoneNumber: "1234567890",
      }).success,
    ).toBe(false);

    const valid = createPatientSchema.parse({
      firstName: "A",
      lastName: "B",
      dateOfBirth: "2000-01-01",
      gender: "MALE",
      phoneNumber: "1234567890",
      address: "<b>Street</b>",
      allergies: "<script>alert(1)</script>pollen",
    });

    expect(valid.address).toBe("Street");
    expect(valid.allergies).not.toContain("<script>");
  });

  it("keeps the shared clinic type label consistent", () => {
    expect(
      CLINIC_TYPE_OPTIONS.find((option) => option.value === "SPECIALTY")?.label,
    ).toBe("Others");
  });

  it("rejects appointment times in the past and end times before start", () => {
    const pastStart = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const futureStart = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();
    const futureValidEnd = new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString();
    const beforeStartEnd = new Date(Date.now() + 30 * 60 * 1000).toISOString();

    expect(
      createAppointmentSchema.safeParse({
        patientId: "patient-1",
        doctorId: "doctor-1",
        clinicId: "clinic-1",
        startTime: pastStart,
        endTime: futureValidEnd,
        status: "scheduled",
        type: "consultation",
        notes: "",
      }).success,
    ).toBe(false);

    expect(
      createAppointmentSchema.safeParse({
        patientId: "patient-1",
        doctorId: "doctor-1",
        clinicId: "clinic-1",
        startTime: futureStart,
        endTime: beforeStartEnd,
        status: "scheduled",
        type: "consultation",
        notes: "",
      }).success,
    ).toBe(false);

    expect(
      createAppointmentSchema.safeParse({
        patientId: "patient-1",
        doctorId: "doctor-1",
        clinicId: "clinic-1",
        startTime: futureStart,
        endTime: futureValidEnd,
        status: "scheduled",
        type: "consultation",
        notes: "",
      }).success,
    ).toBe(true);
  });
});
