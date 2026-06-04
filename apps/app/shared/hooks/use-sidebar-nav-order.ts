import { useCallback, useEffect, useMemo, useState } from "react";
import type { NavItem, NavSection } from "@/components/navigation/nav-config";
import { navSections } from "@/components/navigation/nav-config";
import { sidebarNavOrderSchema } from "@workspace/types";
import { useOptionalAppConfig } from "@/lib/contexts/app-config-context";
import { useUpdateClinicSettings, useUpdateProfile, useUserProfile } from "@workspace/data-access";
import {
  buildDefaultOrder,
  getClinicStorageKey,
  getUserStorageKey,
  normalizeOrderForSection,
  safeParseSidebarNavOrder,
  type SidebarNavOrder,
} from "@/hooks/use-sidebar-nav-order-helpers";

export function useSidebarNavOrder(args: {
  clinicId: string | null;
  userId: string | null;
  /** Whether the current user can edit clinic defaults (admin). */
  canEditClinicDefault: boolean;
}) {
  const { clinicId, userId, canEditClinicDefault } = args;
  const appConfig = useOptionalAppConfig();
  const clinicDefaultFromConfigUnknown = clinicId
    ? appConfig?.getClinicSetting("sidebarNavOrder")
    : undefined;
  const clinicDefaultFromConfig = useMemo<SidebarNavOrder | null>(() => {
    const parsed = sidebarNavOrderSchema.safeParse(clinicDefaultFromConfigUnknown);
    return parsed.success ? parsed.data : null;
  }, [clinicDefaultFromConfigUnknown]);

  const userProfile = useUserProfile();
  const userOverrideFromApi = useMemo<SidebarNavOrder | null>(() => {
    const raw = userProfile.data?.sidebarNavOrderOverride ?? null;
    const parsed = sidebarNavOrderSchema.safeParse(raw);
    return parsed.success ? parsed.data : null;
  }, [userProfile.data?.sidebarNavOrderOverride]);

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
    (sections: NavSection[]): NavSection[] => {
      return sections.map((section) => {
        const desired = effectiveOrder[section.id];
        const normalized = normalizeOrderForSection(section.items, desired);
        const byHref = new Map(section.items.map((i) => [i.href, i] as const));
        return {
          ...section,
          items: normalized.map((href) => byHref.get(href)).filter((x): x is NavItem => Boolean(x)),
        };
      });
    },
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

