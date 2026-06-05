import type { MutableRefObject } from "react";

export type ConsultationSaveHandles = {
  flush: (opts?: { force?: boolean }) => Promise<boolean>;
  submitPrescriptions: () => Promise<boolean>;
};

export type PendingHrefRef = MutableRefObject<string | null>;
export type PendingHistoryTrapsRef = MutableRefObject<number>;
export type PeelingHistoryTrapsRef = MutableRefObject<boolean>;
export type ReadOnlyRef = MutableRefObject<boolean>;
export type SetLeaveDialogOpen = (open: boolean) => void;
