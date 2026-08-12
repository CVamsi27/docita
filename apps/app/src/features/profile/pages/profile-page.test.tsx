import { describe, expect, it } from "vitest";
import { ProfilePage } from "./profile-page";

describe("ProfilePage (smoke)", () => {
  it("exports a component", () => {
    expect(typeof ProfilePage).toBe("function");
  });
});
