import { describe, expect, it } from "vitest";
import { navItems, SETTINGS_NAV_ITEM, IPD_NAV_ITEM } from "./nav-config";

describe("navigation access targets", () => {
  it("assigns an access target to every primary nav item", () => {
    navItems.forEach((item) => {
      expect(item.accessTarget, `missing accessTarget for ${item.href}`).toBeDefined();
    });
  });

  it("assigns access targets to fixed settings and hospital items", () => {
    expect(SETTINGS_NAV_ITEM.accessTarget).toBeDefined();
    expect(IPD_NAV_ITEM.accessTarget).toBeDefined();
  });
});
