import { describe, expect, it } from "vitest";
import { APP_ACCESS_TARGETS, Tier } from "@workspace/types";
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

    // Nurse can read prescriptions (clinical reference + medication admin)
    // but cannot author them; the matrix split is exercised in
    // access-policy.matrix.test.ts.
    expect(
      canAccessTarget(APP_ACCESS_TARGETS.PAGE_PRESCRIPTIONS, {
        role: "NURSE",
        canAccessFeature: () => true,
      }),
    ).toBe(true);

    expect(
      canAccessTarget(APP_ACCESS_TARGETS.PAGE_UPGRADE, {
        role: "NURSE",
      }),
    ).toBe(false);
  });

  it("blocks clinical surfaces in FRONT_DESK mode while keeping appointments", () => {
    expect(
      canAccessTarget(APP_ACCESS_TARGETS.PAGE_CONSULTATION, {
        role: "ADMIN",
        canAccessFeature: () => true,
        currentTier: Tier.ESSENTIAL,
        currentMode: "FRONT_DESK",
      }),
    ).toBe(false);

    expect(
      canAccessTarget(APP_ACCESS_TARGETS.PAGE_APPOINTMENTS, {
        role: "RECEPTIONIST",
        canAccessFeature: () => true,
        currentTier: Tier.ESSENTIAL,
        currentMode: "FRONT_DESK",
      }),
    ).toBe(true);

    expect(
      canAccessTarget(APP_ACCESS_TARGETS.PAGE_APPOINTMENTS, {
        role: "ADMIN",
        canAccessFeature: () => true,
        currentTier: Tier.ESSENTIAL,
        currentMode: "FRONT_DESK",
      }),
    ).toBe(true);

    expect(
      canAccessTarget(APP_ACCESS_TARGETS.PAGE_CONSULTATION, {
        role: "ADMIN",
        canAccessFeature: () => true,
        currentTier: Tier.ESSENTIAL,
      }),
    ).toBe(true);
  });
});
