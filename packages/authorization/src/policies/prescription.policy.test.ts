import { describe, expect, it } from "vitest";
import {
  type EnvAttributes,
  envAttributesSchema,
  type ResourceAttributes,
  resourceAttributesSchema,
  type SubjectAttributes,
  subjectAttributesSchema,
} from "@workspace/types/authorization";
import { PrescriptionAbacPolicy } from "./prescription.policy.js";

const policy = new PrescriptionAbacPolicy();

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
    type: "prescription",
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

describe("PrescriptionAbacPolicy", () => {
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

  it("is not-applicable for a non-prescription resource", () => {
    const result = policy.can(
      "read",
      subject({}),
      resource({ type: "appointment" }),
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

  it("allows the author DOCTOR to update their own prescription", () => {
    const result = policy.can(
      "update",
      subject({ roles: ["DOCTOR"], doctorId: "d1" }),
      resource({ assignedDoctorIds: ["d1"] }),
      env,
    );
    expect(result.effect).toBe("allow");
  });

  it("denies a non-author DOCTOR from updating another doctor's prescription (C3 author-of-record)", () => {
    const result = policy.can(
      "update",
      subject({ roles: ["DOCTOR"], doctorId: "d9" }),
      resource({ assignedDoctorIds: ["d1"] }),
      env,
    );
    expect(result).toMatchObject({ effect: "deny", reason: "ownership_denied" });
  });

  it("denies a DOCTOR with no doctorId from updating (missing attribute = deny)", () => {
    const result = policy.can(
      "update",
      subject({ roles: ["DOCTOR"], doctorId: null }),
      resource({ assignedDoctorIds: ["d1"] }),
      env,
    );
    expect(result).toMatchObject({ effect: "deny", reason: "ownership_denied" });
  });

  it("allows a non-author DOCTOR to READ another doctor's prescription (read retains matrix roles)", () => {
    const result = policy.can(
      "read",
      subject({ roles: ["DOCTOR"], doctorId: "d9" }),
      resource({ assignedDoctorIds: ["d1"] }),
      env,
    );
    expect(result.effect).toBe("allow");
  });

  it("allows a PATIENT on their own prescription (read)", () => {
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

  it("denies a PATIENT on another patient's prescription", () => {
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

  it("denies a PATIENT any non-read action", () => {
    const result = policy.can(
      "update",
      subject({
        roles: ["PATIENT"],
        patientId: "pat-1",
        doctorId: null,
      }),
      resource({ assignedPatientId: "pat-1" }),
      env,
    );
    expect(result).toMatchObject({ effect: "deny", reason: "role_denied" });
  });

  it.each(["NURSE", "RECEPTIONIST", "ADMIN", "ADMIN_DOCTOR", "LAB"] as const)(
    "%s is clinic-wide on prescriptions (legacy PrescriptionPolicy)",
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
  action: "read" | "update" | "delete";
  // Intended semantics: legacy PrescriptionPolicy (PATIENT own-row read-only;
  // DOCTOR author-of-record on update/delete; all other staff clinic-wide) +
  // the recorded C3 tightening that the approve route ("sign" = update) is
  // author-of-record, not roles-only as it is on the wire today.
  intended: "allow" | "deny";
};

const ORACLE_ROWS: OracleRow[] = [
  {
    name: "author DOCTOR on own prescription (update)",
    sub: subject({ roles: ["DOCTOR"], doctorId: "d1" }),
    res: resource({ assignedDoctorIds: ["d1"] }),
    action: "update",
    intended: "allow",
  },
  {
    name: "non-author DOCTOR update (C3 recorded tightening)",
    sub: subject({ roles: ["DOCTOR"], doctorId: "d9" }),
    res: resource({ assignedDoctorIds: ["d1"] }),
    action: "update",
    intended: "deny",
  },
  {
    name: "non-author DOCTOR read (read retains matrix roles)",
    sub: subject({ roles: ["DOCTOR"], doctorId: "d9" }),
    res: resource({ assignedDoctorIds: ["d1"] }),
    action: "read",
    intended: "allow",
  },
  {
    name: "ADMIN update any clinic prescription",
    sub: subject({ roles: ["ADMIN"], doctorId: null }),
    res: resource({}),
    action: "update",
    intended: "allow",
  },
  {
    name: "ADMIN_DOCTOR update any clinic prescription",
    sub: subject({ roles: ["ADMIN_DOCTOR"], doctorId: null }),
    res: resource({}),
    action: "update",
    intended: "allow",
  },
  {
    name: "NURSE read any clinic prescription",
    sub: subject({ roles: ["NURSE"], doctorId: null }),
    res: resource({}),
    action: "read",
    intended: "allow",
  },
  {
    name: "RECEPTIONIST read any clinic prescription",
    sub: subject({ roles: ["RECEPTIONIST"], doctorId: null }),
    res: resource({}),
    action: "read",
    intended: "allow",
  },
  {
    name: "staff cross-clinic (404 via guard tenant discipline)",
    sub: subject({ roles: ["DOCTOR"] }),
    res: resource({ clinicId: "clinic-b" }),
    action: "read",
    intended: "deny",
  },
  {
    name: "PATIENT own prescription read (portal parity)",
    sub: subject({ roles: ["PATIENT"], patientId: "pat-1", doctorId: null }),
    res: resource({ assignedPatientId: "pat-1" }),
    action: "read",
    intended: "allow",
  },
  {
    name: "PATIENT on another patient's prescription",
    sub: subject({ roles: ["PATIENT"], patientId: "pat-1", doctorId: null }),
    res: resource({ assignedPatientId: "pat-2" }),
    action: "read",
    intended: "deny",
  },
  {
    name: "PATIENT non-read action",
    sub: subject({ roles: ["PATIENT"], patientId: "pat-1", doctorId: null }),
    res: resource({ assignedPatientId: "pat-1" }),
    action: "update",
    intended: "deny",
  },
  {
    name: "INTERNAL cross-clinic bypass",
    sub: subject({
      roles: ["INTERNAL"],
      clinicId: "internal-bypass",
      doctorId: null,
    }),
    res: resource({ clinicId: "clinic-b" }),
    action: "read",
    intended: "allow",
  },
];

describe("differential: policy outcome === intended outcome", () => {
  for (const row of ORACLE_ROWS) {
    it(row.name, () => {
      const result = policy.can(row.action, row.sub, row.res, env);
      const policyAllows = result.effect === "allow";
      expect(policyAllows).toBe(row.intended === "allow");
    });
  }
});
