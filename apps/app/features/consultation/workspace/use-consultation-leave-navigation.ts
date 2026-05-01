"use client";

import { useCallback, useState, type RefObject } from "react";
import { useRouter } from "next/navigation";
import { readInAppNavCount } from "@/providers/navigation-history-provider";
import { useConsultationDraft } from "@/features/consultation/state/useConsultationDraft";

export type ConsultationSaveHandles = {
  flush: (opts?: { force?: boolean }) => Promise<boolean>;
  submitPrescriptions: () => Promise<boolean>;
};

interface UseConsultationLeaveNavigationOptions {
  readOnly: boolean;
  fallbackRoute: string;
  saveHandlesRef: RefObject<ConsultationSaveHandles | null>;
}

export function useConsultationLeaveNavigation({
  readOnly,
  fallbackRoute,
  saveHandlesRef,
}: UseConsultationLeaveNavigationOptions) {
  const router = useRouter();
  const [leaveDialogOpen, setLeaveDialogOpen] = useState(false);
  const [leaveBusy, setLeaveBusy] = useState(false);

  const navigateAway = useCallback(() => {
    if (readInAppNavCount() > 1) {
      router.back();
      return;
    }
    router.push(fallbackRoute);
  }, [fallbackRoute, router]);

  const tryNavigateAway = useCallback(() => {
    if (readOnly) {
      navigateAway();
      return;
    }
    const { dirty, saveState } = useConsultationDraft.getState();
    const needsConfirmation =
      dirty || saveState === "error" || saveState === "saving";
    if (!needsConfirmation) {
      navigateAway();
      return;
    }
    setLeaveDialogOpen(true);
  }, [readOnly, navigateAway]);

  const saveAndLeave = useCallback(async () => {
    setLeaveBusy(true);
    try {
      const handles = saveHandlesRef.current;
      if (handles) {
        await handles.flush({ force: true });
        await handles.submitPrescriptions();
      }
      setLeaveDialogOpen(false);
      navigateAway();
    } finally {
      setLeaveBusy(false);
    }
  }, [navigateAway, saveHandlesRef]);

  const leaveWithoutSaving = useCallback(() => {
    setLeaveDialogOpen(false);
    navigateAway();
  }, [navigateAway]);

  return {
    tryNavigateAway,
    leaveDialogOpen,
    setLeaveDialogOpen,
    leaveBusy,
    saveAndLeave,
    leaveWithoutSaving,
    navigateAway,
  };
}
