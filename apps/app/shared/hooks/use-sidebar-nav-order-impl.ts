import { useCallback, useEffect, useMemo, useState } from "react";
import type { NavItem, NavSection } from "@/components/navigation/nav-config";
import { navSections } from "@/components/navigation/nav-config";
import { sidebarNavOrderSchema } from "@workspace/types";
import { useOptionalAppConfig } from "@/lib/contexts/app-config-context";
import {
  useUpdateClinicSettings,
  useUpdateProfile,
  useUserProfile,
} from "@workspace/data-access";
import {
  buildDefaultOrder,
  getClinicStorageKey,
  getUserStorageKey,
  normalizeOrderForSection,
  safeParseSidebarNavOrder,
  type SidebarNavOrder,
} from "@/hooks/use-sidebar-nav-order-helpers";

export type UseSidebarNavOrderArgs = {
  clinicId: string | null;
  userId: string | null;
  canEditClinicDefault: boolean;
};

function useClinicDefaultOrder(clinicId: string | null): SidebarNavOrder | null {
  const appConfig = useOptionalAppConfig();
  const raw = clinicId
    ? appConfig?.getClinicSetting("sidebarNavOrder")
    : undefined;

  return useMemo(() => {
    const parsed = sidebarNavOrderSchema.safeParse(raw);
    return parsed.success ? parsed.data : null;
  }, [raw]);
}

function useUserOverrideOrder(): SidebarNavOrder | null {
  const userProfile = useUserProfile();

  return useMemo(() => {
    const raw = userProfile.data?.sidebarNavOrderOverride ?? null;
    const parsed = sidebarNavOrderSchema.safeParse(raw);
    return parsed.success ? parsed.data : null;
  }, [userProfile.data?.sidebarNavOrderOverride]);
}

function orderItems(
  section: NavSection,
  effectiveOrder: SidebarNavOrder,
): NavSection {
  const desired = effectiveOrder[section.id];
  const normalized = normalizeOrderForSection(section.items, desired);
  const byHref = new Map(section.items.map((item) => [item.href, item] as const));
  return {
    ...section,
    items: normalized
      .map((href) => byHref.get(href))
      .filter((item): item is NavItem => Boolean(item)),
  };
}

export function useSidebarNavOrderImpl({
  clinicId,
  userId,
  canEditClinicDefault,
}: UseSidebarNavOrderArgs) {
  const clinicDefaultFromConfig = useClinicDefaultOrder(clinicId);
  const userOverrideFromApi = useUserOverrideOrder();
  const updateClinicSettings = useUpdateClinicSettings();
  const updateProfile = useUpdateProfile();
  const [clinicOrder, setClinicOrder] = useState<SidebarNavOrder | null>(null);
  const [userOrder, setUserOrder] = useState<SidebarNavOrder | null>(null);

  useEffect(() => {
    if (!clinicId) return;
    setClinicOrder(
      safeParseSidebarNavOrder(localStorage.getItem(getClinicStorageKey(clinicId))),
    );
  }, [clinicId]);

  useEffect(() => {
    if (!clinicId || !userId) return;
    setUserOrder(
      safeParseSidebarNavOrder(
        localStorage.getItem(getUserStorageKey(clinicId, userId)),
      ),
    );
  }, [clinicId, userId]);

  useEffect(() => {
    if (!clinicDefaultFromConfig) return;
    setClinicOrder((prev) => prev ?? clinicDefaultFromConfig);
  }, [clinicDefaultFromConfig]);

  useEffect(() => {
    if (!userOverrideFromApi) return;
    setUserOrder((prev) => prev ?? userOverrideFromApi);
  }, [userOverrideFromApi]);

  const baseDefaults = useMemo(() => buildDefaultOrder(navSections), []);
  const effectiveOrder = useMemo<SidebarNavOrder>(() => {
    const fromClinic = clinicOrder ?? baseDefaults;
    const fromUser = userOrder ?? null;
    return {
      track: fromUser?.track ?? fromClinic.track,
      services: fromUser?.services ?? fromClinic.services,
    };
  }, [baseDefaults, clinicOrder, userOrder]);

  const orderSections = useCallback(
    (sections: NavSection[]): NavSection[] =>
      sections.map((section) => orderItems(section, effectiveOrder)),
    [effectiveOrder],
  );

  const setOrder = useCallback(
    (next: SidebarNavOrder, scope: "clinic" | "user") => {
      if (!clinicId) return;
      if (scope === "clinic") {
        if (!canEditClinicDefault) return;
        localStorage.setItem(getClinicStorageKey(clinicId), JSON.stringify(next));
        setClinicOrder(next);
        updateClinicSettings.mutate({ sidebarNavOrder: next });
        return;
      }
      if (!userId) return;
      localStorage.setItem(getUserStorageKey(clinicId, userId), JSON.stringify(next));
      setUserOrder(next);
      updateProfile.mutate({ sidebarNavOrderOverride: next });
    },
    [canEditClinicDefault, clinicId, updateClinicSettings, updateProfile, userId],
  );

  const clearUserOverride = useCallback(() => {
    if (!clinicId || !userId) return;
    localStorage.removeItem(getUserStorageKey(clinicId, userId));
    setUserOrder(null);
    updateProfile.mutate({ sidebarNavOrderOverride: null });
  }, [clinicId, updateProfile, userId]);

  return {
    effectiveOrder,
    orderSections,
    setOrder,
    clearUserOverride,
    hasUserOverride: Boolean(userOrder),
    canEditClinicDefault,
  };
}
