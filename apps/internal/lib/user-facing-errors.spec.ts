import { describe, expect, it, vi } from "vitest";
import { showUserFacingErrorToast } from "./user-facing-errors";

vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
  },
}));

describe("internal user-facing error toasts", () => {
  it("auto-dismisses error toasts after a few seconds", async () => {
    const { toast } = await import("sonner");

    showUserFacingErrorToast(
      { data: { message: "Response validation failed: HTTP 500" } },
      "We could not save your changes. Please try again.",
      "save",
    );

    expect(toast.error).toHaveBeenCalledWith(
      "We could not save your changes. Please try again.",
      { duration: 8000 },
    );
  });
});
