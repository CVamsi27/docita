import { describe, expect, it } from "vitest";
import { DataProcessingAgreementContent } from "./DataProcessingAgreementContent";
import { PrivacyPolicyContent } from "./PrivacyPolicyContent";
import { SLAContent } from "./SLAContent";

// Audit T-density smoke: the feature module loads and its exports are
// renderable components. Functional coverage is tracked in the
// feature-test-density backlog.
describe("legal content (smoke)", () => {
  it("exports renderable components", () => {
    expect(typeof SLAContent).toBe("function");
    expect(typeof PrivacyPolicyContent).toBe("function");
    expect(typeof DataProcessingAgreementContent).toBe("function");
  });
});
