"use client";

import { useState } from "react";
import { toast } from "sonner";
import { client } from "@/lib/api/api-client";
import { showUserFacingErrorToast } from "@/lib/errors/user-facing-errors";
import { type Doctor, doctorRejectUrl, doctorVerifyUrl, REJECT_DOCTOR_ERROR, REJECT_DOCTOR_REASON_ERROR, VERIFY_DOCTOR_ERROR } from "./doctor-helpers";

export function useDoctorAdminActions(
  selectedDoctor: Doctor | null,
  refetchDoctors: () => Promise<unknown>,
  refreshSelectedDoctor: (doctorId: string) => Promise<void>,
) {
  const [adminActionBusy, setAdminActionBusy] = useState<"verify" | "reject" | null>(null);
  const [rejectionReasonDraft, setRejectionReasonDraft] = useState("");
  const [showRejectForm, setShowRejectForm] = useState(false);

  const handleAdminVerify = async () => {
    if (!selectedDoctor) return;
    setAdminActionBusy("verify");
    try {
      await client.post(doctorVerifyUrl(selectedDoctor.id), {});
      toast.success("Doctor verified");
      await refreshSelectedDoctor(selectedDoctor.id);
      setShowRejectForm(false);
    } catch (error) {
      showUserFacingErrorToast(error, VERIFY_DOCTOR_ERROR, "verification");
    } finally {
      setAdminActionBusy(null);
    }
  };

  const handleAdminReject = async () => {
    if (!selectedDoctor) return;
    const reason = rejectionReasonDraft.trim();
    if (reason.length < 3) {
      showUserFacingErrorToast(null, REJECT_DOCTOR_REASON_ERROR, "form");
      return;
    }
    setAdminActionBusy("reject");
    try {
      await client.post(doctorRejectUrl(selectedDoctor.id), { reason });
      toast.success("Doctor rejected with reason");
      await refreshSelectedDoctor(selectedDoctor.id);
      setShowRejectForm(false);
      setRejectionReasonDraft("");
    } catch (error) {
      showUserFacingErrorToast(error, REJECT_DOCTOR_ERROR, "verification");
    } finally {
      setAdminActionBusy(null);
    }
  };

  return {
    adminActionBusy,
    rejectionReasonDraft,
    showRejectForm,
    setShowRejectForm,
    setRejectionReasonDraft,
    handleAdminVerify,
    handleAdminReject,
  };
}
