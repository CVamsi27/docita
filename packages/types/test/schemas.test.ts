import { describe, expect, it } from "vitest";
import {
  changePasswordSchema,
  checkEmailResponseSchema,
  loginWireResponseSchema,
  mfaChallengeResponseSchema,
  mfaVerifySchema,
  messageAckResponseSchema,
  NEW_PASSWORD_DIFFERENT_MESSAGE,
  passwordsMustDiffer,
  tokenIssueResponseSchema,
  validateSessionResponseSchema,
} from "../src/contracts/auth";
import { changePasswordFormSchema } from "../src/forms/change-password-form";
import { createAppointmentSchema } from "../src/operations/appointments";
import { CLINIC_TYPE_OPTIONS } from "../src/shared/users";
import { createPatientSchema } from "../src/patient/patients";
import { createLeaveRequestSchema, leaveTypeSchema } from "../src/leave/leave";

describe("@workspace/types schemas", () => {
  it("validates login response payload", () => {
    const parsed = tokenIssueResponseSchema.parse({
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
      tokenIssueResponseSchema.safeParse({
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

  it("keeps the refresh token out of every session-issuing contract", () => {
    // The refresh token is a 30-day credential delivered only as an httpOnly
    // cookie. `z.object` strips keys it does not declare, so a handler that
    // forwards the raw token bundle still cannot publish it through these
    // schemas. Removing `refresh_token` from them is the enforcement.
    const rawBundle = {
      access_token: "access-token",
      refresh_token: "nanoid-refresh",
      user: {
        id: "user-1",
        email: "doctor@example.com",
        name: "Doctor",
        role: "DOCTOR",
      },
    };

    for (const schema of [tokenIssueResponseSchema, loginWireResponseSchema]) {
      const parsed = schema.parse(rawBundle) as Record<string, unknown>;
      expect(parsed).not.toHaveProperty("refresh_token");
      expect(parsed.access_token).toBe("access-token");
    }
  });

  it("separates the MFA challenge branch from the session branch", () => {
    const challenge = { mfa_required: true, mfa_challenge_token: "chal_1" };
    const session = {
      access_token: "access-token",
      user: { id: "u1", email: "d@e.test", name: "D", role: "DOCTOR" },
    };

    expect(loginWireResponseSchema.safeParse(challenge).success).toBe(true);
    expect(loginWireResponseSchema.safeParse(session).success).toBe(true);
    expect(tokenIssueResponseSchema.safeParse(challenge).success).toBe(false);
    expect(mfaChallengeResponseSchema.safeParse(session).success).toBe(false);
  });

  it("requires both MFA verify fields", () => {
    expect(mfaVerifySchema.safeParse({}).success).toBe(false);
    expect(
      mfaVerifySchema.safeParse({ mfa_challenge_token: "chal_1" }).success,
    ).toBe(false);
    expect(
      mfaVerifySchema.safeParse({
        mfa_challenge_token: "chal_1",
        code: "123456",
      }).success,
    ).toBe(true);
    expect(messageAckResponseSchema.safeParse({}).success).toBe(false);
  });

  it("enforces the same new-password rule on the wire and the settings form", () => {
    const current = "Old#Pass1";
    const same = { currentPassword: current, newPassword: current };

    // The predicate itself: identical password must fail, different must pass.
    expect(passwordsMustDiffer(same)).toBe(false);
    expect(
      passwordsMustDiffer({ currentPassword: current, newPassword: "New#Pass2" }),
    ).toBe(true);

    // Both schemas reject the reuse with the same message on the same field.
    const wire = changePasswordSchema.safeParse(same);
    const form = changePasswordFormSchema.safeParse({ ...same, confirmPassword: current });
    expect(wire.success).toBe(false);
    expect(form.success).toBe(false);

    const wireIssue = wire.success ? undefined : wire.error.issues[0];
    const formIssue = form.success ? undefined : form.error.issues[0];
    expect(wireIssue?.message).toBe(NEW_PASSWORD_DIFFERENT_MESSAGE);
    expect(formIssue?.message).toBe(NEW_PASSWORD_DIFFERENT_MESSAGE);
    expect(wireIssue?.path).toEqual(["newPassword"]);
    expect(formIssue?.path).toEqual(["newPassword"]);

    // The shared rule must not swallow the form's own confirm-password check.
    expect(
      changePasswordFormSchema.safeParse({
        currentPassword: current,
        newPassword: "New#Pass2",
        confirmPassword: "Mismatch#3",
      }).success,
    ).toBe(false);
    expect(
      changePasswordFormSchema.safeParse({
        currentPassword: current,
        newPassword: "New#Pass2",
        confirmPassword: "New#Pass2",
      }).success,
    ).toBe(true);
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
    const futureValidEnd = new Date(
      Date.now() + 3 * 60 * 60 * 1000,
    ).toISOString();
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

  it("accepts HOLIDAY in leave type schemas", () => {
    expect(leaveTypeSchema.parse("HOLIDAY")).toBe("HOLIDAY");
    expect(
      createLeaveRequestSchema.parse({
        leaveType: "HOLIDAY",
        startDate: "2026-01-10",
        endDate: "2026-01-12",
      }).leaveType,
    ).toBe("HOLIDAY");
  });
});
