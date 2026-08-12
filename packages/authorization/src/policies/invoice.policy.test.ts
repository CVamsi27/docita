import { describe, expect, it } from "vitest";
import {
  type EnvAttributes,
  envAttributesSchema,
  type ResourceAttributes,
  resourceAttributesSchema,
  type SubjectAttributes,
  subjectAttributesSchema,
} from "@workspace/types/authorization";
import { InvoiceAbacPolicy } from "./invoice.policy.js";

const policy = new InvoiceAbacPolicy();

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
    type: "invoice",
    clinicId: "clinic-a",
    ownerId: null,
    assignedDoctorIds: [],
    assignedPatientId: "pat-1",
    classification: "billing",
    requiresAssignment: false,
    ...overrides,
  });
}

const env: EnvAttributes = envAttributesSchema.parse({
  authnContext: "session",
  time: "2026-08-07T00:00:00.000Z",
});

describe("InvoiceAbacPolicy", () => {
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

  it("is not-applicable for a non-invoice resource", () => {
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

  it("allows a PATIENT on their own invoice", () => {
    const result = policy.can(
      "read",
      subject({ roles: ["PATIENT"], patientId: "pat-1", doctorId: null }),
      resource({ assignedPatientId: "pat-1" }),
      env,
    );
    expect(result.effect).toBe("allow");
  });

  it("denies a PATIENT on another patient's invoice", () => {
    const result = policy.can(
      "read",
      subject({ roles: ["PATIENT"], patientId: "pat-1", doctorId: null }),
      resource({ assignedPatientId: "pat-2" }),
      env,
    );
    expect(result).toMatchObject({ effect: "deny", reason: "ownership_denied" });
  });

  it("allows a PATIENT to update their own invoice (legacy has no read-only branch)", () => {
    const result = policy.can(
      "update",
      subject({ roles: ["PATIENT"], patientId: "pat-1", doctorId: null }),
      resource({ assignedPatientId: "pat-1" }),
      env,
    );
    expect(result.effect).toBe("allow");
  });

  it.each([
    "ADMIN",
    "DOCTOR",
    "RECEPTIONIST",
    "ADMIN_DOCTOR",
    "NURSE",
    "LAB",
  ] as const)("%s is clinic-wide on invoices (legacy InvoicePolicy)", (role) => {
    const result = policy.can(
      "read",
      subject({ roles: [role], doctorId: null }),
      resource({}),
      env,
    );
    expect(result.effect).toBe("allow");
  });
});

type OracleRow = {
  name: string;
  sub: SubjectAttributes;
  res: ResourceAttributes;
  action: "read" | "update";
  // Legacy InvoicePolicy + clinic-scoped repository wire contract: PATIENT
  // own-row; all staff clinic-wide; cross-clinic 404 via the clinic-scoped
  // repository. approve-invoice is roles-only today and STAYS clinic-wide
  // (C4.3, resolves C3.1): the legacy policy has no doctor author-of-record
  // branch, unlike prescriptions.
  intended: "allow" | "deny";
};

const ORACLE_ROWS: OracleRow[] = [
  {
    name: "ADMIN same-clinic read",
    sub: subject({ roles: ["ADMIN"], doctorId: null }),
    res: resource({}),
    action: "read",
    intended: "allow",
  },
  {
    name: "DOCTOR same-clinic read (any invoice, no author pin)",
    sub: subject({ roles: ["DOCTOR"], doctorId: "d9" }),
    res: resource({ assignedPatientId: "pat-9" }),
    action: "read",
    intended: "allow",
  },
  {
    name: "RECEPTIONIST same-clinic update",
    sub: subject({ roles: ["RECEPTIONIST"], doctorId: null }),
    res: resource({}),
    action: "update",
    intended: "allow",
  },
  {
    name: "NURSE same-clinic read",
    sub: subject({ roles: ["NURSE"], doctorId: null }),
    res: resource({}),
    action: "read",
    intended: "allow",
  },
  {
    name: "LAB same-clinic read",
    sub: subject({ roles: ["LAB"], doctorId: null }),
    res: resource({}),
    action: "read",
    intended: "allow",
  },
  {
    name: "staff cross-clinic (404 via guard tenant discipline)",
    sub: subject({ roles: ["ADMIN"] }),
    res: resource({ clinicId: "clinic-b" }),
    action: "read",
    intended: "deny",
  },
  {
    name: "PATIENT own invoice read (portal parity)",
    sub: subject({ roles: ["PATIENT"], patientId: "pat-1", doctorId: null }),
    res: resource({ assignedPatientId: "pat-1" }),
    action: "read",
    intended: "allow",
  },
  {
    name: "PATIENT on another patient's invoice",
    sub: subject({ roles: ["PATIENT"], patientId: "pat-1", doctorId: null }),
    res: resource({ assignedPatientId: "pat-2" }),
    action: "read",
    intended: "deny",
  },
  {
    name: "PATIENT own invoice update (no read-only branch in legacy)",
    sub: subject({ roles: ["PATIENT"], patientId: "pat-1", doctorId: null }),
    res: resource({ assignedPatientId: "pat-1" }),
    action: "update",
    intended: "allow",
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
