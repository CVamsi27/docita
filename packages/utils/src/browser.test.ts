import { describe, expect, it } from "vitest";
import { inBrowser } from "./browser.js";

describe("inBrowser", () => {
  it("returns a boolean", () => {
    expect(typeof inBrowser()).toBe("boolean");
  });

  it("is false in the node test runtime (no DOM lib window)", () => {
    // packages/utils vitest runs in node without jsdom, so `window` is
    // undeclared — the guard must report false, the SSR-safe branch.
    expect(inBrowser()).toBe(false);
  });
});
