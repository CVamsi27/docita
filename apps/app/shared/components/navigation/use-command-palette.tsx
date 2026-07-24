"use client";

import { useCallback, useEffect, useMemo } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useStartConsultation, useQueueByDoctor } from "@workspace/data-access";
import { usePermissions } from "@/hooks/use-permissions";
import { useAuth } from "@/lib/auth/auth-context";
import { canAccessTarget } from "@/lib/access-control/access-policy";
import { usePermissionStore } from "@/lib/stores/permission-store";
import { APP_ACCESS_TARGETS } from "@workspace/types/access";
import { showUserFacingErrorToast } from "@/lib/errors/user-facing-errors";
import { useAskAi } from "@/components/ask-ai/ask-ai-context";
import { useSidebarNavOrder } from "@/hooks/use-sidebar-nav-order";
import { useClinic } from "@/lib/contexts/clinic-context";
import { COMMAND_PALETTE_GROUP_ACTIONS, COMMAND_PALETTE_GROUP_AI, COMMAND_PALETTE_GROUP_NAVIGATION } from "./command-palette-config";
import { usePaletteKeyboard } from "./use-palette-keyboard";
import { usePaletteSearch } from "./use-palette-search";
import { buildPaletteActions } from "./build-palette-actions";

export function useCommandPalette() {
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useAuth();
  const { clinicId } = useClinic();
  const { openOverlay } = useAskAi();
  const { canStartConsultation } = usePermissions();
  const { canAccess, currentTier, currentMode, hasIntelligence } =
    usePermissionStore();
  const navOrder = useSidebarNavOrder({
    clinicId,
    userId: user?.id ?? null,
    canEditClinicDefault: false,
  });
  const { open, setOpen } = usePaletteKeyboard();

  const canAccessQueueApi = canAccessTarget(
    APP_ACCESS_TARGETS.API_QUEUE,
    {
      role: user?.role,
      canAccessFeature: canAccess,
      currentTier,
      currentMode,
      hasIntelligence,
    },
    "read",
  );
  const startConsultation = useStartConsultation();
  const doctorQueue = useQueueByDoctor(
    canStartConsultation && canAccessQueueApi ? user?.id : undefined,
    undefined,
    open && canStartConsultation && canAccessQueueApi && !!user?.id,
  );

  const handleStartConsultation = useCallback(async () => {
    const items = doctorQueue.data ?? [];
    const inProgress = items.find(
      (it) => it.appointmentId && it.status.toUpperCase() === "IN_PROGRESS",
    )?.appointmentId;
    const waiting = items.find(
      (it) => it.appointmentId && it.status.toUpperCase() === "WAITING",
    )?.appointmentId;
    const appointmentId = inProgress ?? waiting;
    if (!appointmentId) {
      router.push("/consultation");
      return;
    }
    try {
      const result = await startConsultation.mutateAsync({ appointmentId });
      router.push(`/consultation/${result.appointmentId}`);
    } catch (error) {
      showUserFacingErrorToast(
        error,
        "We could not open this consultation. Please try again.",
        "save",
      );
      router.push("/consultation");
    }
  }, [doctorQueue.data, router, startConsultation]);

  useEffect(() => {
    const startFromEvent = () => {
      void handleStartConsultation();
    };
    window.addEventListener("docita:start-consultation", startFromEvent);
    return () => {
      window.removeEventListener("docita:start-consultation", startFromEvent);
    };
  }, [handleStartConsultation]);

  const rawActions = useMemo(
    () =>
      buildPaletteActions({
        navOrder,
        userRole: user?.role,
        canAccess,
        currentTier,
        currentMode,
        hasIntelligence,
        canStartConsultation,
        router,
        openOverlay,
        pathname,
        handleStartConsultation: () => {
          void handleStartConsultation();
        },
      }),
    [
      navOrder,
      user?.role,
      canAccess,
      currentTier,
      currentMode,
      hasIntelligence,
      canStartConsultation,
      router,
      openOverlay,
      pathname,
      handleStartConsultation,
    ],
  );

  const { search, setSearch, filtered } = usePaletteSearch(rawActions);

  return {
    open,
    setOpen,
    search,
    setSearch,
    actions: filtered,
    groupOrder: [
      COMMAND_PALETTE_GROUP_NAVIGATION,
      COMMAND_PALETTE_GROUP_AI,
      COMMAND_PALETTE_GROUP_ACTIONS,
    ] as const,
  };
}
