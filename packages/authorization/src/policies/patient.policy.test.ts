import { describe, expect, it } from "vitest";
import {
  type EnvAttributes,
  envAttributesSchema,
  type ResourceAttributes,
  resourceAttributesSchema,
  type SubjectAttributes,
  subjectAttributesSchema,
} from "@workspace/types/authorization";
import { PatientAbacPolicy } from "./patient.policy.js";

const policy = new PatientAbacPolicy();

function subject(overrides: Partial<SubjectAttributes>): SubjectAttributes {
  return subjectAttributesSchema.parse({
    userId: "u1",
    roles: ["DOCTOR"],
    clinicId: "clinic-a",
    doctorId: "u1",
    ...overrides,
  });
}

function resource(overrides: Partial<ResourceAttributes>): ResourceAttributes {
  return resourceAttributesSchema.parse({
    type: "patient",
    clinicId: "clinic-a",
    ownerId: "pat-user-1",
    assignedDoctorIds: ["d1"],
    classification: "phi",
    requiresAssignment: false,
    ...overrides,
  });
}

const env: EnvAttributes = envAttributesSchema.parse({
  authnContext: "session",
  time: "2026-08-06T00:00:00.000Z",
});

describe("PatientAbacPolicy", () => {
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

  it("is not-applicable for a non-patient resource", () => {
    const result = policy.can(
      "read",
      subject({}),
      resource({ type: "invoice" }),
      env,
    );
    expect(result.effect).toBe("not-applicable");
  });

  it("denies cross-clinic access (tenant discipline)", () => {
    const result = policy.can(
      "read",
      subject({}),
      resource({ clinicId: "clinic-b" }),
      env,
    );
    expect(result).toMatchObject({ effect: "deny", reason: "tenant_mismatch" });
  });

  it("allows a PATIENT on their own row", () => {
    const result = policy.can(
      "read",
      subject({
        roles: ["PATIENT"],
        patientId: "pat-1",
        doctorId: null,
      }),
      resource({ ownerId: "u1" }),
      env,
    );
    expect(result.effect).toBe("allow");
  });

  it("denies a PATIENT on another patient's row", () => {
    const result = policy.can(
      "read",
      subject({
        roles: ["PATIENT"],
        patientId: "pat-1",
        doctorId: null,
      }),
      resource({ ownerId: "someone-else" }),
      env,
    );
    expect(result).toMatchObject({ effect: "deny", reason: "ownership_denied" });
  });

  it("allows clinical staff in the same clinic when assignment-pinning is off (current staff surface)", () => {
    const result = policy.can(
      "read",
      subject({ roles: ["NURSE"], doctorId: null }),
      resource({}),
      env,
    );
    expect(result.effect).toBe("allow");
  });

  it("allows an assigned DOCTOR when requiresAssignment is on (future portal surface)", () => {
    const result = policy.can(
      "read",
      subject({ roles: ["DOCTOR"], doctorId: "d1" }),
      resource({ requiresAssignment: true, assignedDoctorIds: ["d1"] }),
      env,
    );
    expect(result.effect).toBe("allow");
  });

  it("denies an unassigned DOCTOR when requiresAssignment is on", () => {
    const result = policy.can(
      "read",
      subject({ roles: ["DOCTOR"], doctorId: "d9" }),
      resource({ requiresAssignment: true, assignedDoctorIds: ["d1"] }),
      env,
    );
    expect(result).toMatchObject({ effect: "deny", reason: "ownership_denied" });
  });

  it("exempts ADMIN_DOCTOR from assignment-pinning when requiresAssignment is on (legacy guard bypass)", () => {
    const result = policy.can(
      "read",
      subject({ roles: ["ADMIN_DOCTOR"], doctorId: null }),
      resource({ requiresAssignment: true, assignedDoctorIds: ["d1"] }),
      env,
    );
    expect(result.effect).toBe("allow");
  });

  it("exempts NURSE from assignment-pinning when requiresAssignment is on (legacy guard bypass)", () => {
    const result = policy.can(
      "read",
      subject({ roles: ["NURSE"], doctorId: null }),
      resource({ requiresAssignment: true, assignedDoctorIds: ["d1"] }),
      env,
    );
    expect(result.effect).toBe("allow");
  });

  it("denies a PATIENT on a row with no ownerId (missing attribute = deny)", () => {
    const result = policy.can(
      "read",
      subject({
        roles: ["PATIENT"],
        doctorId: null,
        patientId: "pat-1",
      }),
      resource({ ownerId: null }),
      env,
    );
    expect(result).toMatchObject({ effect: "deny", reason: "ownership_denied" });
  });
});

type OracleRow = {
  name: string;
  sub: SubjectAttributes;
  res: ResourceAttributes;
  // today's effective outcome on the live staff surface
  legacyEffective: "allow" | "deny";
};

// Oracle = PatientDoctorGuard (if it were applied) + roles matrix.
// Staff surface today: clinical staff same-clinic allowed; PATIENT roles-gated
// out of /patients/* (403 at RolesGuard); cross-clinic denied at the service.
const ORACLE_ROWS: OracleRow[] = [
  {
    name: "admin same-clinic",
    sub: subject({ roles: ["ADMIN"], doctorId: null }),
    res: resource({}),
    legacyEffective: "allow",
  },
  {
    name: "nurse same-clinic",
    sub: subject({ roles: ["NURSE"], doctorId: null }),
    res: resource({}),
    legacyEffective: "allow",
  },
  {
    name: "doctor same-clinic (no pin today)",
    sub: subject({ roles: ["DOCTOR"] }),
    res: resource({}),
    legacyEffective: "allow",
  },
  {
    name: "staff cross-clinic",
    sub: subject({ roles: ["DOCTOR"] }),
    res: resource({ clinicId: "clinic-b" }),
    legacyEffective: "deny",
  },
  {
    name: "unassigned DOCTOR is denied on the pinned surface",
    sub: subject({ roles: ["DOCTOR"], doctorId: "d9" }),
    res: resource({ requiresAssignment: true, assignedDoctorIds: ["d1"] }),
    legacyEffective: "deny",
  },
  {
    name: "assigned DOCTOR is allowed on the pinned surface",
    sub: subject({ roles: ["DOCTOR"], doctorId: "d1" }),
    res: resource({ requiresAssignment: true, assignedDoctorIds: ["d1"] }),
    legacyEffective: "allow",
  },
  {
    name: "ADMIN_DOCTOR bypasses pinning (legacy guard exempts it)",
    sub: subject({ roles: ["ADMIN_DOCTOR"], doctorId: null }),
    res: resource({ requiresAssignment: true, assignedDoctorIds: ["d1"] }),
    legacyEffective: "allow",
  },
  {
    name: "NURSE bypasses pinning (legacy guard exempts it)",
    sub: subject({ roles: ["NURSE"], doctorId: null }),
    res: resource({ requiresAssignment: true, assignedDoctorIds: ["d1"] }),
    legacyEffective: "allow",
  },
];

describe("differential: policy outcome === legacy effective outcome (staff surface)", () => {
  for (const row of ORACLE_ROWS) {
    it(row.name, () => {
      const result = policy.can("read", row.sub, row.res, env);
      const policyAllows = result.effect === "allow";
      expect(policyAllows).toBe(row.legacyEffective === "allow");
    });
  }
});
