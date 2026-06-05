"use client";

import { useState } from "react";
import { type InternalDoctorListItem } from "@workspace/data-access/internal";
import { client } from "@/lib/api/api-client";
import { showUserFacingErrorToast } from "@/lib/errors/user-facing-errors";
import { type Doctor, DOCTOR_REQUIRES_CLINIC_ERROR, doctorDetailsUrl, LOAD_DOCTOR_DETAILS_ERROR } from "./doctor-helpers";
import { useDoctorAdminActions } from "./use-doctor-admin-actions";

export function useDoctorActions(
  token: string | null | undefined,
  selectedClinic: string | null,
  refetchDoctors: () => Promise<unknown>,
) {
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  const [isViewOpen, setIsViewOpen] = useState(false);

  const fetchDoctorDetails = async (clinicId: string, doctorId: string) => {
    if (!token) return;
    try {
      setSelectedDoctor(await client.get<Doctor>(doctorDetailsUrl(clinicId, doctorId)));
    } catch {
      showUserFacingErrorToast(LOAD_DOCTOR_DETAILS_ERROR);
    }
  };

  const handleViewDoctor = async (doctor: InternalDoctorListItem) => {
    const clinicId = doctor.clinicId || (selectedClinic !== "all" ? selectedClinic : "");
    if (!clinicId) { showUserFacingErrorToast(DOCTOR_REQUIRES_CLINIC_ERROR); return; }
    await fetchDoctorDetails(clinicId, doctor.id);
    admin.setShowRejectForm(false);
    admin.setRejectionReasonDraft("");
    setIsViewOpen(true);
  };

  const refreshSelectedDoctor = async (doctorId: string) => {
    const clinicId = selectedDoctor?.clinicId;
    if (clinicId) await fetchDoctorDetails(clinicId, doctorId);
    await refetchDoctors();
  };

  const admin = useDoctorAdminActions(selectedDoctor, refetchDoctors, refreshSelectedDoctor);

  return { selectedDoctor, isViewOpen, setIsViewOpen, handleViewDoctor, ...admin };
}
