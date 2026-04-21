import { describe, expect, it } from "vitest";
import { APP_ACCESS_TARGETS } from "@workspace/types";
import { canAccessTarget } from "./access-policy";

describe("canAccessTarget", () => {
  it("allows billing access only for billing roles", () => {
    expect(
      canAccessTarget(APP_ACCESS_TARGETS.PAGE_UPGRADE, {
        role: "ADMIN",
      }),
    ).toBe(true);

    expect(
      canAccessTarget(APP_ACCESS_TARGETS.PAGE_UPGRADE, {
        role: "ADMIN_DOCTOR",
      }),
    ).toBe(true);

    expect(
      canAccessTarget(APP_ACCESS_TARGETS.PAGE_UPGRADE, {
        role: "DOCTOR",
      }),
    ).toBe(false);
  });

  it("requires both role and feature for analytics page", () => {
    expect(
      canAccessTarget(APP_ACCESS_TARGETS.PAGE_ANALYTICS, {
        role: "DOCTOR",
        canAccessFeature: () => true,
      }),
    ).toBe(true);

    expect(
      canAccessTarget(APP_ACCESS_TARGETS.PAGE_ANALYTICS, {
        role: "RECEPTIONIST",
        canAccessFeature: () => true,
      }),
    ).toBe(false);

    expect(
      canAccessTarget(APP_ACCESS_TARGETS.PAGE_ANALYTICS, {
        role: "DOCTOR",
        canAccessFeature: () => false,
      }),
    ).toBe(false);
  });

  it("blocks import page for non-admin roles", () => {
    expect(
      canAccessTarget(APP_ACCESS_TARGETS.PAGE_IMPORT, {
        role: "RECEPTIONIST",
        canAccessFeature: () => true,
      }),
    ).toBe(false);
  });

  it("strictly blocks feature-gated targets when feature checker is missing", () => {
    expect(
      canAccessTarget(APP_ACCESS_TARGETS.PAGE_ANALYTICS, {
        role: "DOCTOR",
      }),
    ).toBe(false);
  });

  it("blocks routes marked as coming soon even when role and feature checks pass", () => {
    expect(
      canAccessTarget(APP_ACCESS_TARGETS.PAGE_HOSPITAL, {
        role: "ADMIN",
        canAccessFeature: () => true,
      }),
    ).toBe(false);
  });

  it("allows nurses into patient and appointment workflows but not billing or prescriptions", () => {
    expect(
      canAccessTarget(APP_ACCESS_TARGETS.PAGE_PATIENTS, {
        role: "NURSE",
        canAccessFeature: () => true,
      }),
    ).toBe(true);

    expect(
      canAccessTarget(APP_ACCESS_TARGETS.API_PATIENT_METRICS, {
        role: "NURSE",
        canAccessFeature: () => true,
      }),
    ).toBe(true);

    expect(
      canAccessTarget(APP_ACCESS_TARGETS.PAGE_PRESCRIPTIONS, {
        role: "NURSE",
        canAccessFeature: () => true,
      }),
    ).toBe(false);

    expect(
      canAccessTarget(APP_ACCESS_TARGETS.PAGE_UPGRADE, {
        role: "NURSE",
      }),
    ).toBe(false);
  });
});
