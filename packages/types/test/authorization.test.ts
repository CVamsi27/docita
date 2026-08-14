import { describe, expect, it } from "vitest";
import {
  envAttributesSchema,
  resourceAttributesSchema,
  subjectAttributesSchema,
} from "../src/authorization";

const VALID_SUBJECT = {
  userId: "u1",
  roles: ["DOCTOR"],
  clinicId: "clinic-a",
  doctorId: "u1",
};

const VALID_RESOURCE = {
  type: "patient",
  clinicId: "clinic-a",
  ownerId: "pat-user-1",
  classification: "phi",
};

const VALID_ENV = {
  authnContext: "session",
  time: "2026-08-06T00:00:00.000Z",
};

describe("subjectAttributesSchema", () => {
  it("parses a minimal valid doctor subject", () => {
    expect(subjectAttributesSchema.parse(VALID_SUBJECT)).toMatchObject({
      userId: "u1",
      roles: ["DOCTOR"],
      clinicId: "clinic-a",
      doctorId: "u1",
    });
  });

  it("defaults optional attribute arrays (no permissive grant)", () => {
    const parsed = subjectAttributesSchema.parse(VALID_SUBJECT);
    expect(parsed.careTeamIds).toEqual([]);
    expect(parsed.shifts).toEqual([]);
    expect(parsed.isVerified).toBe(false);
  });

  it("rejects a subject without roles", () => {
    expect(() =>
      subjectAttributesSchema.parse({ userId: "u1", clinicId: "c" }),
    ).toThrow();
  });

  it("rejects a subject without clinicId", () => {
    expect(() =>
      subjectAttributesSchema.parse({ userId: "u1", roles: ["DOCTOR"] }),
    ).toThrow();
  });

  it("rejects an unknown role", () => {
    expect(() =>
      subjectAttributesSchema.parse({ ...VALID_SUBJECT, roles: ["SYSADMIN"] }),
    ).toThrow();
  });
});

describe("resourceAttributesSchema", () => {
  it("parses a minimal patient resource", () => {
    expect(resourceAttributesSchema.parse(VALID_RESOURCE)).toMatchObject({
      type: "patient",
      clinicId: "clinic-a",
      classification: "phi",
    });
  });

  it("defaults assignment arrays to empty (default = no assignment pin)", () => {
    const parsed = resourceAttributesSchema.parse(VALID_RESOURCE);
    expect(parsed.assignedDoctorIds).toEqual([]);
    expect(parsed.requiresAssignment).toBe(false);
  });

  it("rejects an unknown classification", () => {
    expect(() =>
      resourceAttributesSchema.parse({
        ...VALID_RESOURCE,
        classification: "top-secret",
      }),
    ).toThrow();
  });

  it("rejects a resource without type or clinicId", () => {
    expect(() =>
      resourceAttributesSchema.parse({ classification: "phi" }),
    ).toThrow();
  });
});

describe("envAttributesSchema", () => {
  it("parses a minimal session env with clock time", () => {
    expect(envAttributesSchema.parse(VALID_ENV)).toMatchObject({
      authnContext: "session",
      clinic: null,
    });
  });

  it("rejects env without authnContext (never permissive by default)", () => {
    expect(() =>
      envAttributesSchema.parse({ time: "2026-08-06T00:00:00.000Z" }),
    ).toThrow();
  });

  it("rejects env without time", () => {
    expect(() => envAttributesSchema.parse({ authnContext: "session" })).toThrow();
  });

  it("rejects an unknown authnContext", () => {
    expect(() =>
      envAttributesSchema.parse({
        authnContext: "root",
        time: "2026-08-06T00:00:00.000Z",
      }),
    ).toThrow();
  });
});
