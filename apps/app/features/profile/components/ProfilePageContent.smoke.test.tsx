import { describe, expect, it } from "vitest";
import ProfilePage from "@/app/(protected)/profile/page";

describe("ProfilePage (smoke)", () => {
  it("exports a component", () => {
    expect(typeof ProfilePage).toBe("function");
  });
});
