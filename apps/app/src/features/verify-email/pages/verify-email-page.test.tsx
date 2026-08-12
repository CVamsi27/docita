import { describe, expect, it } from "vitest";
import {
  VerifyEmailPage,
  VerifyEmailSentPage,
  VerifiedPage,
} from "./verify-email-page";

// P2.1 T-density smoke: prove the feature module loads and the page exports are
// renderable React components. The inner content uses auth context + network
// calls, so a full render needs auth/session fixtures — tracked under the
// feature-test-density backlog. Mirrors the settings-* page smoke pattern.
describe("VerifyEmail pages (smoke)", () => {
  it("exports the three page components", () => {
    expect(typeof VerifyEmailPage).toBe("function");
    expect(typeof VerifyEmailSentPage).toBe("function");
    expect(typeof VerifiedPage).toBe("function");
  });
});
