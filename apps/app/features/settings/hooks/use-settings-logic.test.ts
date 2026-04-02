import { beforeEach, describe, expect, it } from "vitest";
import { Tier } from "@workspace/types";
import { usePermissionStore } from "@/lib/stores/permission-store";
import { getVisibleSettingsTabs } from "./use-settings-logic";

describe("getVisibleSettingsTabs", () => {
  beforeEach(() => {
    const store = usePermissionStore.getState();
    store.setTier(Tier.STARTER);
    store.setFeatureOverrides({});
    store.setUserRole("ADMIN");
  });

  it("hides the queue tab when the plan is below Essential", () => {
    const store = usePermissionStore.getState();

    const tabs = getVisibleSettingsTabs({
      userRole: "ADMIN",
      canAccessFeature: store.canAccess,
      canAccessTier: store.canAccessTier,
    });

    const visibleTabValues = tabs.flatMap((category) =>
      category.items.map((item) => item.value),
    );

    expect(visibleTabValues).not.toContain("queue");
  });

  it("shows the queue tab once the clinic reaches Essential", () => {
    const store = usePermissionStore.getState();
    store.setTier(Tier.ESSENTIAL);

    const tabs = getVisibleSettingsTabs({
      userRole: "ADMIN",
      canAccessFeature: store.canAccess,
      canAccessTier: store.canAccessTier,
    });

    const visibleTabValues = tabs.flatMap((category) =>
      category.items.map((item) => item.value),
    );

    expect(visibleTabValues).toContain("queue");
  });
});
