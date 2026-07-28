import { describe, expect, it } from "vitest";
import { internalQueryKeys } from "./query-keys-internal-all";

describe("internalQueryKeys", () => {
  describe("referrers", () => {
    it("produces the canonical referrers key (used by list + resend invalidation)", () => {
      expect(internalQueryKeys.internal.referrers()).toEqual([
        "internal",
        "referrers",
      ]);
    });

    it("keys messages under the referrer id (granular cache per-partner)", () => {
      expect(internalQueryKeys.internal.referrerMessages("rfr_1")).toEqual([
        "internal",
        "referrers",
        "rfr_1",
        "messages",
      ]);
    });
  });

  describe("referralPayouts", () => {
    it("includes the status when set", () => {
      expect(
        internalQueryKeys.internal.referralPayouts("PENDING"),
      ).toEqual(["internal", "referral-payouts", "PENDING"]);
    });

    it("uses the empty-string slot for the unfiltered query", () => {
      expect(internalQueryKeys.internal.referralPayouts("")).toEqual([
        "internal",
        "referral-payouts",
        "",
      ]);
    });

    it("exposes a root key for the unfiltered query shortcut", () => {
      expect(internalQueryKeys.internal.referralPayoutsRoot()).toEqual([
        "internal",
        "referral-payouts",
      ]);
    });

    it("summary key is independent of the filtered lists", () => {
      expect(internalQueryKeys.internal.referralPayoutSummary()).toEqual([
        "internal",
        "referral-payouts",
        "summary",
      ]);
    });
  });
});
