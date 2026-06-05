"use client";

import { useCallback, useEffect, useMemo } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import type { PageTabItem } from "@workspace/ui/components/navigation/page-tabs";
import { usePermissions } from "@/hooks/use-permissions";
import {
  LEGACY_PATIENT_TAB_REDIRECTS,
  PATIENT_RECORDS_SUB_TABS,
  RECORDS_SUB_TAB_LABELS,
  TAB_DEFINITIONS,
  isPatientDetailTabValue,
  isPatientRecordsSubTab,
  type PatientDetailTabValue,
  type PatientRecordsSubTab,
} from "./patient-detail-tabs-config";

export function usePatientDetailTabs() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { canViewInvoices } = usePermissions();

  const tabFromUrl = searchParams.get("tab");
  const subtabFromUrl = searchParams.get("subtab");

  const legacyRedirect = tabFromUrl
    ? LEGACY_PATIENT_TAB_REDIRECTS[tabFromUrl]
    : undefined;

  useEffect(() => {
    if (!legacyRedirect) return;
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", legacyRedirect.tab);
    if (legacyRedirect.subtab) {
      params.set("subtab", legacyRedirect.subtab);
    }
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, {
      scroll: false,
    });
  }, [legacyRedirect, pathname, router, searchParams]);

  const activeTab: PatientDetailTabValue = legacyRedirect
    ? legacyRedirect.tab
    : isPatientDetailTabValue(tabFromUrl)
      ? tabFromUrl
      : "summary";

  const activeRecordsSubTab: PatientRecordsSubTab = legacyRedirect?.subtab
    ? legacyRedirect.subtab
    : isPatientRecordsSubTab(subtabFromUrl)
      ? subtabFromUrl
      : "history";

  useEffect(() => {
    if (activeTab !== "billing") return;
    if (canViewInvoices) return;
    const params = new URLSearchParams(searchParams.toString());
    params.delete("tab");
    params.delete("subtab");
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, {
      scroll: false,
    });
  }, [activeTab, canViewInvoices, pathname, router, searchParams]);

  const handleSelectTab = useCallback(
    (next: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (next === "summary") {
        params.delete("tab");
      } else {
        params.set("tab", next);
      }
      params.delete("subtab");
      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, {
        scroll: false,
      });
    },
    [pathname, router, searchParams],
  );

  const handleSelectRecordsSubTab = useCallback(
    (next: string) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("tab", "records");
      if (next === "history") {
        params.delete("subtab");
      } else {
        params.set("subtab", next);
      }
      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, {
        scroll: false,
      });
    },
    [pathname, router, searchParams],
  );

  const items = useMemo<PageTabItem[]>(
    () =>
      TAB_DEFINITIONS.filter(
        ({ value }) => value !== "billing" || canViewInvoices,
      ).map(({ value, label }) => ({ id: value, label })),
    [canViewInvoices],
  );

  const recordsSubItems = useMemo<PageTabItem[]>(
    () =>
      PATIENT_RECORDS_SUB_TABS.map((value) => ({
        id: value,
        label: RECORDS_SUB_TAB_LABELS[value],
      })),
    [],
  );

  return {
    activeTab,
    activeRecordsSubTab,
    handleSelectTab,
    handleSelectRecordsSubTab,
    items,
    recordsSubItems,
    canViewInvoices,
  };
}
