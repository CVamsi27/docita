import { describe, expect, it } from "vitest";
import { APIRequestError } from "@workspace/data-access";
import { resolveUploadErrorPresentation } from "./mobile-upload-error-helpers";

describe("resolveUploadErrorPresentation", () => {
  it("maps expected API statuses to a specific, non-reported message", () => {
    const result = resolveUploadErrorPresentation(
      new APIRequestError("too big", { status: 413 }),
    );
    expect(result.message).toContain("too large");
    expect(result.reportable).toBeNull();
  });

  it("explains an expired session for 404", () => {
    const result = resolveUploadErrorPresentation(
      new APIRequestError("gone", { status: 404 }),
    );
    expect(result.message).toContain("Session expired");
    expect(result.reportable).toBeNull();
  });

  it("reports unexpected API statuses with the generic message", () => {
    const error = new APIRequestError("boom", { status: 500 });
    const result = resolveUploadErrorPresentation(error);
    expect(result.message).toContain("could not upload");
    expect(result.reportable).toBe(error);
  });

  it("reports non-API errors with the generic message", () => {
    const error = new Error("network down");
    const result = resolveUploadErrorPresentation(error);
    expect(result.message).toContain("could not upload");
    expect(result.reportable).toBe(error);
  });
});
