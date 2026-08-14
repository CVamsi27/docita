import { describe, expect, it } from "vitest";
import { appQueryKeys } from "./query-keys-app";

describe("appQueryKeys (app shell)", () => {
  describe("auth", () => {
    it("keys session, validation, and email checks", () => {
      expect(appQueryKeys.auth.session()).toEqual(["auth", "session"]);
      expect(appQueryKeys.auth.validate()).toEqual(["auth", "validate"]);
      expect(appQueryKeys.auth.checkEmail("a@b.c")).toEqual([
        "auth",
        "check-email",
        "a@b.c",
      ]);
    });
  });

  describe("onboarding", () => {
    it("keys sessions, progress, and signature sub-resources", () => {
      expect(appQueryKeys.onboarding.root()).toEqual(["onboarding"]);
      expect(appQueryKeys.onboarding.session("onb_1")).toEqual([
        "onboarding",
        "session",
        "onb_1",
      ]);
      expect(appQueryKeys.onboarding.progress("onb_1")).toEqual([
        "onboarding",
        "progress",
        "onb_1",
      ]);
      expect(
        appQueryKeys.onboarding.signatureSession("onb_1", "s1"),
      ).toEqual(["onboarding", "onb_1", "signature", "s1"]);
    });
  });

  describe("config", () => {
    it("defaults the clinic and user slots", () => {
      expect(appQueryKeys.config.app()).toEqual([
        "config",
        "app",
        "default",
        "anonymous",
      ]);
      expect(appQueryKeys.config.app("cl_1", "u_1")).toEqual([
        "config",
        "app",
        "cl_1",
        "u_1",
      ]);
      expect(appQueryKeys.config.tier()).toEqual(["config", "tier"]);
    });
  });

  describe("pricing", () => {
    it("keys currency config and tier-scoped estimates", () => {
      expect(appQueryKeys.pricing.config("INR")).toEqual(["pricing-config", "INR"]);
      expect(
        appQueryKeys.pricing.estimateTier("PROFESSIONAL", "q=1"),
      ).toEqual(["price-estimate", "PROFESSIONAL", "q=1"]);
      expect(appQueryKeys.pricing.subscriptionUsage()).toEqual([
        "subscription-usage",
      ]);
    });
  });

  describe("medication", () => {
    it("keys dosage and contraindication lookups", () => {
      expect(appQueryKeys.medication.dosage("Paracetamol", "500mg")).toEqual([
        "medication",
        "dosage",
        "Paracetamol",
        "500mg",
      ]);
      expect(appQueryKeys.medication.contraindications("payload-key")).toEqual([
        "medication",
        "contraindications",
        "payload-key",
      ]);
    });
  });

  describe("uploads", () => {
    it("keys upload sessions", () => {
      expect(appQueryKeys.uploads.session("sess_1")).toEqual([
        "uploads",
        "session",
        "sess_1",
      ]);
    });
  });
});
