import { describe, expect, it } from "vitest";
import {
  type EnvAttributes,
  envAttributesSchema,
  type ResourceAttributes,
  resourceAttributesSchema,
  type SubjectAttributes,
  subjectAttributesSchema,
} from "@workspace/types/authorization";
import { LabOrderAbacPolicy } from "./lab-order.policy.js";

const policy = new LabOrderAbacPolicy();

function subject(overrides: Partial<SubjectAttributes>): SubjectAttributes {
  return subjectAttributesSchema.parse({
    userId: "u1",
    roles: ["LAB"],
    clinicId: "clinic-a",
    doctorId: null,
    ...overrides,
  });
}

function resource(overrides: Partial<ResourceAttributes>): ResourceAttributes {
  return resourceAttributesSchema.parse({
    type: "lab-order",
    clinicId: "clinic-a",
    ownerId: null,
    assignedDoctorIds: [],
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

describe("LabOrderAbacPolicy", () => {
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

  it("is not-applicable for a non-lab-order resource", () => {
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

  it("allows a PATIENT on their own lab order (portal parity)", () => {
    const result = policy.can(
      "read",
      subject({ roles: ["PATIENT"], patientId: "pat-1", doctorId: null }),
      resource({ assignedPatientId: "pat-1" }),
      env,
    );
    expect(result.effect).toBe("allow");
  });

  it("denies a PATIENT on another patient's lab order", () => {
    const result = policy.can(
      "read",
      subject({ roles: ["PATIENT"], patientId: "pat-1", doctorId: null }),
      resource({ assignedPatientId: "pat-2" }),
      env,
    );
    expect(result).toMatchObject({ effect: "deny", reason: "ownership_denied" });
  });

  it.each([
    "LAB",
    "DOCTOR",
    "ADMIN",
    "ADMIN_DOCTOR",
    "NURSE",
    "RECEPTIONIST",
  ] as const)("%s is clinic-wide on lab orders (matrix roles)", (role) => {
    const result = policy.can(
      "read",
      subject({ roles: [role], doctorId: null }),
      resource({}),
      env,
    );
    expect(result.effect).toBe("allow");
  });

  // LAB is clinic-wide on the object routes it can reach (sample/result/
  // release). Payment verification is a front-desk action (matrix-scoped to
  // ADMIN/ADMIN_DOCTOR/RECEPTIONIST) and is exercised via the RECEPTIONIST
  // row below — the policy stage never sees LAB on that route.
  it.each(["sample collection", "result upload", "release"] as const)(
    "LAB may %s any clinic order (C4.1 baseline pin)",
    () => {
      const result = policy.can(
        "update",
        subject({ roles: ["LAB"], doctorId: null }),
        resource({}),
        env,
      );
      expect(result.effect).toBe("allow");
    },
  );

  it("RECEPTIONIST verifies payment on any clinic order (front-desk payment attribute)", () => {
    const result = policy.can(
      "update",
      subject({ roles: ["RECEPTIONIST"], doctorId: null }),
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
  // Current lab-workflow wire contract: clinic-scoped 404 via getOrderById +
  // matrix roles. LAB is clinic-wide on object routes today (labId scoping
  // exists only on the list queue). C4.1 DEFERS assignment pinning (LAB →
  // LabTestOrder.labId) and payment-state conditions — no service-layer guard
  // exists, so enforcing them would tighten behavior; these rows pin the
  // baseline and must flip in the same commit as any future decision.
  intended: "allow" | "deny";
};

const ORACLE_ROWS: OracleRow[] = [
  {
    name: "LAB same-clinic read",
    sub: subject({ roles: ["LAB"], doctorId: null }),
    res: resource({}),
    action: "read",
    intended: "allow",
  },
  {
    name: "LAB same-clinic update any order (C4.1 baseline pin)",
    sub: subject({ roles: ["LAB"], doctorId: null }),
    res: resource({}),
    action: "update",
    intended: "allow",
  },
  {
    name: "DOCTOR same-clinic read",
    sub: subject({ roles: ["DOCTOR"], doctorId: "d1" }),
    res: resource({}),
    action: "read",
    intended: "allow",
  },
  {
    name: "NURSE same-clinic update",
    sub: subject({ roles: ["NURSE"], doctorId: null }),
    res: resource({}),
    action: "update",
    intended: "allow",
  },
  {
    name: "RECEPTIONIST payment verification (front-desk payment attribute)",
    sub: subject({ roles: ["RECEPTIONIST"], doctorId: null }),
    res: resource({}),
    action: "update",
    intended: "allow",
  },
  {
    name: "staff cross-clinic (404 via guard tenant discipline)",
    sub: subject({ roles: ["LAB"] }),
    res: resource({ clinicId: "clinic-b" }),
    action: "read",
    intended: "deny",
  },
  {
    name: "PATIENT own order read (portal parity)",
    sub: subject({ roles: ["PATIENT"], patientId: "pat-1", doctorId: null }),
    res: resource({ assignedPatientId: "pat-1" }),
    action: "read",
    intended: "allow",
  },
  {
    name: "PATIENT on another patient's order",
    sub: subject({ roles: ["PATIENT"], patientId: "pat-1", doctorId: null }),
    res: resource({ assignedPatientId: "pat-2" }),
    action: "read",
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
