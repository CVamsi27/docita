import { describe, expect, it } from "vitest";
import { navItems, SETTINGS_NAV_ITEM, IPD_NAV_ITEM } from "./nav-config";
import { getAccessTargetForPath } from "@/lib/access-routes";

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

  it("keeps sidebar targets aligned with route access mapping", () => {
    [...navItems, SETTINGS_NAV_ITEM, IPD_NAV_ITEM].forEach((item) => {
      expect(item.accessTarget).toBe(getAccessTargetForPath(item.href));
    });
  });
});
