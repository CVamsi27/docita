import { describe, expect, it } from "vitest";
import {
  type EnvAttributes,
  envAttributesSchema,
  type ResourceAttributes,
  resourceAttributesSchema,
  type SubjectAttributes,
  subjectAttributesSchema,
} from "@workspace/types/authorization";
import { AppointmentAbacPolicy } from "./appointment.policy.js";

const policy = new AppointmentAbacPolicy();

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
    type: "appointment",
    clinicId: "clinic-a",
    ownerId: null,
    assignedDoctorIds: ["d1"],
    assignedPatientId: "pat-1",
    classification: "phi",
    requiresAssignment: false,
    ...overrides,
  });
}

const env: EnvAttributes = envAttributesSchema.parse({
  authnContext: "session",
  time: "2026-08-07T00:00:00.000Z",
});

describe("AppointmentAbacPolicy", () => {
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

  it("is not-applicable for a non-appointment resource", () => {
    const result = policy.can(
      "read",
      subject({}),
      resource({ type: "patient" }),
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

  it("allows an assigned DOCTOR on their own appointment", () => {
    const result = policy.can(
      "read",
      subject({ roles: ["DOCTOR"], doctorId: "d1" }),
      resource({ assignedDoctorIds: ["d1"] }),
      env,
    );
    expect(result.effect).toBe("allow");
  });

  it("denies an unassigned DOCTOR on another doctor's appointment", () => {
    const result = policy.can(
      "read",
      subject({ roles: ["DOCTOR"], doctorId: "d9" }),
      resource({ assignedDoctorIds: ["d1"] }),
      env,
    );
    expect(result).toMatchObject({ effect: "deny", reason: "ownership_denied" });
  });

  it("denies a DOCTOR with no doctorId (missing attribute = deny)", () => {
    const result = policy.can(
      "read",
      subject({ roles: ["DOCTOR"], doctorId: null }),
      resource({ assignedDoctorIds: ["d1"] }),
      env,
    );
    expect(result).toMatchObject({ effect: "deny", reason: "ownership_denied" });
  });

  it("allows a PATIENT on their own appointment", () => {
    const result = policy.can(
      "read",
      subject({
        roles: ["PATIENT"],
        patientId: "pat-1",
        doctorId: null,
      }),
      resource({ assignedPatientId: "pat-1" }),
      env,
    );
    expect(result.effect).toBe("allow");
  });

  it("denies a PATIENT on another patient's appointment", () => {
    const result = policy.can(
      "read",
      subject({
        roles: ["PATIENT"],
        patientId: "pat-1",
        doctorId: null,
      }),
      resource({ assignedPatientId: "pat-2" }),
      env,
    );
    expect(result).toMatchObject({ effect: "deny", reason: "ownership_denied" });
  });

  it("denies a PATIENT on an appointment with no assignedPatientId", () => {
    const result = policy.can(
      "read",
      subject({
        roles: ["PATIENT"],
        patientId: "pat-1",
        doctorId: null,
      }),
      resource({ assignedPatientId: null }),
      env,
    );
    expect(result).toMatchObject({ effect: "deny", reason: "ownership_denied" });
  });

  it.each([
    "NURSE",
    "RECEPTIONIST",
    "ADMIN",
    "ADMIN_DOCTOR",
    "LAB",
  ] as const)(
    "%s is clinic-wide on appointments (legacy AppointmentPolicy)",
    (role) => {
      const result = policy.can(
        "read",
        subject({ roles: [role], doctorId: null }),
        resource({}),
        env,
      );
      expect(result.effect).toBe("allow");
    },
  );
});

type OracleRow = {
  name: string;
  sub: SubjectAttributes;
  res: ResourceAttributes;
  // Legacy AppointmentPolicy + service-layer access-context outcome (the wire
  // contract today: doctor-mismatch 403, cross-clinic 404, staff 200).
  legacyEffective: "allow" | "deny";
};

// Oracle = legacy AppointmentPolicy (DOCTOR ↔ assignedDoctorId, PATIENT ↔
// assignedPatientId, all other staff clinic-wide) + clinic-scoped repository.
// Status-based write locks do NOT exist today: staff may update a completed
// appointment (legacyEffective allow). The C2.1 write-lock tightening is a
// DEFERRED product decision (ADR-0013) — if it ever lands, the last row here
// must flip to "deny" in the same commit.
const ORACLE_ROWS: OracleRow[] = [
  {
    name: "assigned DOCTOR on own appointment",
    sub: subject({ roles: ["DOCTOR"], doctorId: "d1" }),
    res: resource({ assignedDoctorIds: ["d1"] }),
    legacyEffective: "allow",
  },
  {
    name: "unassigned DOCTOR on another doctor's appointment",
    sub: subject({ roles: ["DOCTOR"], doctorId: "d9" }),
    res: resource({ assignedDoctorIds: ["d1"] }),
    legacyEffective: "deny",
  },
  {
    name: "ADMIN same-clinic",
    sub: subject({ roles: ["ADMIN"], doctorId: null }),
    res: resource({}),
    legacyEffective: "allow",
  },
  {
    name: "NURSE same-clinic",
    sub: subject({ roles: ["NURSE"], doctorId: null }),
    res: resource({}),
    legacyEffective: "allow",
  },
  {
    name: "RECEPTIONIST same-clinic",
    sub: subject({ roles: ["RECEPTIONIST"], doctorId: null }),
    res: resource({}),
    legacyEffective: "allow",
  },
  {
    name: "ADMIN_DOCTOR same-clinic",
    sub: subject({ roles: ["ADMIN_DOCTOR"], doctorId: null }),
    res: resource({}),
    legacyEffective: "allow",
  },
  {
    name: "LAB same-clinic",
    sub: subject({ roles: ["LAB"], doctorId: null }),
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
    name: "PATIENT own appointment (portal surface, parity only)",
    sub: subject({ roles: ["PATIENT"], patientId: "pat-1", doctorId: null }),
    res: resource({ assignedPatientId: "pat-1" }),
    legacyEffective: "allow",
  },
  {
    name: "PATIENT on another patient's appointment",
    sub: subject({ roles: ["PATIENT"], patientId: "pat-1", doctorId: null }),
    res: resource({ assignedPatientId: "pat-2" }),
    legacyEffective: "deny",
  },
  {
    name: "staff update on a COMPLETED appointment (write-lock DEFERRED — C2.1)",
    sub: subject({ roles: ["NURSE"], doctorId: null }),
    res: resource({ status: "COMPLETED" }),
    legacyEffective: "allow",
  },
  {
    name: "staff update on a NO_SHOW appointment (write-lock DEFERRED — C2.1)",
    sub: subject({ roles: ["ADMIN"], doctorId: null }),
    res: resource({ status: "NO_SHOW" }),
    legacyEffective: "allow",
  },
];

describe("differential: policy outcome === legacy effective outcome", () => {
  for (const row of ORACLE_ROWS) {
    it(row.name, () => {
      const result = policy.can("update", row.sub, row.res, env);
      const policyAllows = result.effect === "allow";
      expect(policyAllows).toBe(row.legacyEffective === "allow");
    });
  }
});
