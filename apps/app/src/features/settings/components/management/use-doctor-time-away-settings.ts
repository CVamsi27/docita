import { useEffect, useMemo, useState } from "react";
import {
  useClinicMembers,
  useCreateDoctorTimeOff,
  useDeleteDoctorTimeOffMutation,
  useDoctorTimeOffs,
} from "@workspace/data-access";
import { isAdmin, isDoctor } from "@/lib/auth/permissions";
import { useAuth } from "@/lib/auth/auth-context";
import { toast } from "sonner";
import { showUserFacingErrorToast } from "@/lib/errors/user-facing-errors";

/**
 * Owns "which doctor's time-away are we viewing/editing" — the clinic-member
 * lookup, the doctor filter, the selection state (defaulting an admin to the
 * first doctor), and the derived query id. Self-contained: every other hook
 * here only needs its `isAdminUser`/`selectedDoctorId`/`queryDoctorId` outputs.
 */
function useDoctorTimeAwaySelection() {
  const { user } = useAuth();
  const { data: members = [] } = useClinicMembers();
  const doctors = useMemo(
    () => members.filter((m) => isDoctor(m.role)),
    [members],
  );
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>("me");
  const isAdminUser = isAdmin(user?.role);

  useEffect(() => {
    if (isAdminUser && doctors.length > 0 && selectedDoctorId === "me") {
      setSelectedDoctorId(doctors[0]?.id ?? "me");
    }
  }, [isAdminUser, doctors, selectedDoctorId]);

  const queryDoctorId =
    isAdminUser && selectedDoctorId !== "me" ? selectedDoctorId : undefined;

  return {
    user,
    isAdminUser,
    doctors,
    selectedDoctorId,
    setSelectedDoctorId,
    queryDoctorId,
  };
}

interface TimeAwayDraft {
  startDate: string;
  endDate: string;
  reason: string;
  isFullDay: boolean;
  partialStart: string;
  partialEnd: string;
}

/**
 * Validates an "add time away" draft, returning the first user-facing error
 * message (or `null` when valid). Named once so the submit handler reduces to
 * a single check instead of two parallel guard blocks.
 */
function getTimeAwayValidationError(draft: TimeAwayDraft): string | null {
  if (!draft.startDate.trim() || !draft.endDate.trim()) {
    return "Choose a start date and end date for time away.";
  }
  if (
    !draft.isFullDay &&
    (!draft.partialStart.trim() || !draft.partialEnd.trim())
  ) {
    return "Partial days require start and end times.";
  }
  return null;
}

/**
 * Owns the "add time away" draft's field state and reset — purely the form's
 * data, with no knowledge of how it gets submitted. Self-contained.
 */
function useTimeAwayDraftFields() {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");
  const [isFullDay, setIsFullDay] = useState(true);
  const [partialStart, setPartialStart] = useState("09:00");
  const [partialEnd, setPartialEnd] = useState("17:00");

  const reset = () => {
    setStartDate("");
    setEndDate("");
    setReason("");
    setIsFullDay(true);
    setPartialStart("09:00");
    setPartialEnd("17:00");
  };

  return {
    startDate,
    setStartDate,
    endDate,
    setEndDate,
    reason,
    setReason,
    isFullDay,
    setIsFullDay,
    partialStart,
    setPartialStart,
    partialEnd,
    setPartialEnd,
    reset,
  };
}

type TimeAwayDraftFields = ReturnType<typeof useTimeAwayDraftFields>;

/**
 * Owns submitting the draft — validation, doctor-id targeting for admins, the
 * mutation, and success/error toasts (resetting the draft on success). Its
 * only shared dependencies are the selection hook's
 * `isAdminUser`/`selectedDoctorId` and the draft fields it submits.
 */
function useTimeAwayCreateSubmission(
  isAdminUser: boolean,
  selectedDoctorId: string,
  draft: TimeAwayDraftFields,
) {
  const createMutation = useCreateDoctorTimeOff();

  const handleCreate = async () => {
    const validationError = getTimeAwayValidationError(draft);
    if (validationError) {
      showUserFacingErrorToast(null, validationError, "form");
      return;
    }

    try {
      await createMutation.mutateAsync({
        ...(isAdminUser && selectedDoctorId !== "me"
          ? { doctorId: selectedDoctorId }
          : {}),
        startDate: draft.startDate,
        endDate: draft.endDate,
        reason: draft.reason.trim() || undefined,
        isFullDay: draft.isFullDay,
        ...(!draft.isFullDay
          ? { startTime: draft.partialStart, endTime: draft.partialEnd }
          : {}),
      });
      toast.success("Time away saved");
      draft.reset();
    } catch (error) {
      showUserFacingErrorToast(
        error,
        "We could not save this time away. Please try again.",
        "save",
      );
    }
  };

  return { handleCreate, isCreating: createMutation.isPending };
}

/**
 * Composes the draft fields and their submission around the shared
 * `isAdminUser`/`selectedDoctorId` — kept as one seam from the settings
 * panel's perspective (it only cares about "the form"), while the two
 * independent concerns underneath stay separately readable and testable.
 */
function useDoctorTimeAwayForm(isAdminUser: boolean, selectedDoctorId: string) {
  const draft = useTimeAwayDraftFields();
  const submission = useTimeAwayCreateSubmission(
    isAdminUser,
    selectedDoctorId,
    draft,
  );

  return { ...draft, ...submission };
}

/**
 * Owns the scheduled time-away list — the query, the upcoming-first sort, and
 * the delete handler (with its own success/error toasts). Its only shared
 * dependency is the selection hook's `queryDoctorId`.
 */
function useDoctorTimeAwayList(queryDoctorId: string | undefined) {
  const { data: timeOffs = [], isLoading } = useDoctorTimeOffs(
    queryDoctorId,
    false,
  );
  const deleteMutation = useDeleteDoctorTimeOffMutation();

  const upcomingSorted = useMemo(() => {
    const now = Date.now();
    return [...timeOffs].sort((a, b) => {
      const ta = new Date(a.endDate).getTime();
      const tb = new Date(b.endDate).getTime();
      if (ta >= now && tb >= now) return ta - tb;
      return new Date(b.startDate).getTime() - new Date(a.startDate).getTime();
    });
  }, [timeOffs]);

  const handleDelete = async (id: string) => {
    try {
      await deleteMutation.mutateAsync(id);
      toast.success("Time away removed");
    } catch (error) {
      showUserFacingErrorToast(
        error,
        "We could not remove this entry. Please try again.",
        "save",
      );
    }
  };

  return {
    upcomingSorted,
    isLoading,
    handleDelete,
    isDeleting: deleteMutation.isPending,
  };
}

/**
 * Composes the three independent concerns the settings panel bundles —
 * doctor selection, the add-time-away form, and the scheduled list — around
 * the shared `isAdminUser`/`selectedDoctorId`/`queryDoctorId` derived by
 * selection. Extracted from `DoctorTimeAwaySettings` so the component's render
 * wiring isn't carrying this much state-and-query bookkeeping alongside it.
 */
export function useDoctorTimeAwaySettings() {
  const selection = useDoctorTimeAwaySelection();
  const form = useDoctorTimeAwayForm(
    selection.isAdminUser,
    selection.selectedDoctorId,
  );
  const list = useDoctorTimeAwayList(selection.queryDoctorId);

  return { selection, form, list };
}
