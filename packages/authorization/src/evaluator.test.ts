import { describe, expect, it } from "vitest";
import {
  type EnvAttributes,
  envAttributesSchema,
  type ResourceAttributes,
  resourceAttributesSchema,
  type SubjectAttributes,
  subjectAttributesSchema,
} from "@workspace/types/authorization";
import { denyOverrides, evaluatePolicy } from "./evaluator.js";
import type { AbacDecision, AbacPolicy } from "./types.js";

const subject: SubjectAttributes = subjectAttributesSchema.parse({
  userId: "u1",
  roles: ["DOCTOR"],
  clinicId: "clinic-a",
  doctorId: "u1",
});

const resource: ResourceAttributes = resourceAttributesSchema.parse({
  type: "patient",
  clinicId: "clinic-a",
  ownerId: "pat-user-1",
  classification: "phi",
});

const env: EnvAttributes = envAttributesSchema.parse({
  authnContext: "session",
  time: "2026-08-06T00:00:00.000Z",
});

class StubPolicy implements AbacPolicy {
  constructor(
    readonly id: string,
    private readonly decision: AbacDecision,
  ) {}
  can() {
    return this.decision;
  }
}

describe("evaluatePolicy", () => {
  it("returns the policy decision for the given action/subject/resource/env", () => {
    const policy = new StubPolicy("stub", {
      effect: "allow",
      policyId: "stub",
    });
    const result = evaluatePolicy(policy, {
      action: "read",
      subject,
      resource,
      env,
    });
    expect(result).toEqual({ effect: "allow", policyId: "stub" });
  });
});

describe("denyOverrides", () => {
  it("allows when every active decision allows", () => {
    const result = denyOverrides([
      { effect: "allow", policyId: "a" },
      { effect: "allow", policyId: "b" },
    ]);
    expect(result.effect).toBe("allow");
  });

  it("denies when any active decision denies (deny wins)", () => {
    const result = denyOverrides([
      { effect: "allow", policyId: "a" },
      { effect: "deny", policyId: "b", reason: "tenant_mismatch" },
    ]);
    expect(result).toMatchObject({ effect: "deny", reason: "tenant_mismatch" });
  });

  it("defaults to deny when every decision is not-applicable", () => {
    const result = denyOverrides([
      { effect: "not-applicable", policyId: "a" },
    ]);
    expect(result.effect).toBe("deny");
    expect(result.reason).toBe("role_denied");
  });

  it("defaults to deny on an empty decision list", () => {
    const result = denyOverrides([]);
    expect(result.effect).toBe("deny");
  });
});
