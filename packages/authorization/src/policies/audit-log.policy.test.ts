import { describe, expect, it } from "vitest";
import {
  type EnvAttributes,
  envAttributesSchema,
  type ResourceAttributes,
  resourceAttributesSchema,
  type SubjectAttributes,
  subjectAttributesSchema,
} from "@workspace/types/authorization";
import { AuditLogAbacPolicy } from "./audit-log.policy.js";

const policy = new AuditLogAbacPolicy();

function subject(overrides: Partial<SubjectAttributes>): SubjectAttributes {
  return subjectAttributesSchema.parse({
    userId: "u1",
    roles: ["ADMIN"],
    clinicId: "clinic-a",
    doctorId: null,
    ...overrides,
  });
}

function resource(overrides: Partial<ResourceAttributes>): ResourceAttributes {
  return resourceAttributesSchema.parse({
    type: "audit-log",
    clinicId: "clinic-a",
    ownerId: null,
    assignedDoctorIds: [],
    assignedPatientId: null,
    classification: "phi",
    requiresAssignment: false,
    ...overrides,
  });
}

const env: EnvAttributes = envAttributesSchema.parse({
  authnContext: "session",
  time: "2026-08-07T00:00:00.000Z",
});

describe("AuditLogAbacPolicy", () => {
  it("allows INTERNAL regardless of clinic", () => {
    const result = policy.can(
      "read",
      subject({
        roles: ["INTERNAL"],
        clinicId: "internal-bypass",
        doctorId: null,
      }),
      resource({ clinicId: "clinic-b" }),
      env,
    );
    expect(result.effect).toBe("allow");
  });

  it("is not-applicable for a non-audit-log resource", () => {
    const result = policy.can(
      "read",
      subject({}),
      resource({ type: "invoice" }),
      env,
    );
    expect(result.effect).toBe("not-applicable");
  });

  it("denies cross-clinic staff (tenant_mismatch — PolicyGuard 404)", () => {
    const result = policy.can(
      "read",
      subject({ roles: ["ADMIN"], clinicId: "clinic-a" }),
      resource({ clinicId: "clinic-b" }),
      env,
    );
    expect(result.effect).toBe("deny");
    expect(result.reason).toBe("tenant_mismatch");
  });

  it("allows ADMIN clinic-wide", () => {
    const result = policy.can("read", subject({ roles: ["ADMIN"] }), resource({}), env);
    expect(result.effect).toBe("allow");
  });

  it("allows ADMIN_DOCTOR and DOCTOR clinic-wide (audit/recent summary roles)", () => {
    for (const role of ["ADMIN_DOCTOR", "DOCTOR"] as const) {
      const result = policy.can(
        "read",
        subject({ roles: [role] }),
        resource({}),
        env,
      );
      expect(result.effect).toBe("allow");
    }
  });

  it("denies roles outside the audit-reader set (default-deny)", () => {
    for (const role of ["NURSE", "RECEPTIONIST", "LAB"] as const) {
      const result = policy.can(
        "read",
        subject({ roles: [role] }),
        resource({}),
        env,
      );
      expect(result.effect).toBe("deny");
      expect(result.reason).toBe("role_denied");
    }
  });

  it("denies PATIENT (own-row has no meaning on the audit surface)", () => {
    const result = policy.can(
      "read",
      subject({ roles: ["PATIENT"], patientId: "pat-1" }),
      resource({}),
      env,
    );
    expect(result.effect).toBe("deny");
    expect(result.reason).toBe("role_denied");
  });
});
