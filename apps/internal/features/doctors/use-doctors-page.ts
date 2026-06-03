"use client";

import { useEffect, useMemo } from "react";
import {
  useInternalClinics,
  useInternalDoctorsList,
} from "@workspace/data-access/internal";
import { useAuth } from "@/lib/auth/auth";
import { useInternalFiltersStore } from "@/lib/stores/internal-filters-store";
import {
  buildPageMeta,
  EMPTY_CLINICS,
  filterDoctors,
} from "./doctor-helpers";
import { useDoctorActions } from "./use-doctor-actions";

export function useDoctorsPage() {
  const { doctorSearch, selectedClinic, setDoctorSearch, setSelectedClinic } =
    useInternalFiltersStore();
  const { token } = useAuth();

  const clinicsQuery = useInternalClinics(token);
  const clinics = useMemo(
    () => clinicsQuery.data ?? EMPTY_CLINICS,
    [clinicsQuery.data],
  );
  useEffect(() => {
    if ((!selectedClinic || selectedClinic === "all") && clinics.length > 0)
      setSelectedClinic(clinics[0]!.id);
  }, [clinics, selectedClinic, setSelectedClinic]);

  const doctorsQuery = useInternalDoctorsList(token, selectedClinic, clinics);
  const loading = clinicsQuery.isLoading || doctorsQuery.isLoading;

  const {
    selectedDoctor, isViewOpen, adminActionBusy, rejectionReasonDraft,
    showRejectForm, setIsViewOpen, setShowRejectForm, setRejectionReasonDraft,
    handleViewDoctor, handleAdminVerify, handleAdminReject,
  } = useDoctorActions(token, selectedClinic, () => doctorsQuery.refetch());

  const filteredDoctors = filterDoctors(doctorsQuery.data ?? [], doctorSearch);
  const { pageStatus, errorMessage } = buildPageMeta(
    loading,
    clinicsQuery.error ?? doctorsQuery.error,
    !!token,
  );

  return {
    clinics, doctors: doctorsQuery.data ?? [], filteredDoctors, selectedDoctor,
    doctorSearch, selectedClinic, isViewOpen, adminActionBusy,
    rejectionReasonDraft, showRejectForm, pageStatus, errorMessage,
    setDoctorSearch, setSelectedClinic, setIsViewOpen, setShowRejectForm,
    setRejectionReasonDraft, handleViewDoctor, handleAdminVerify,
    handleAdminReject,
    refetchAll: () => { void clinicsQuery.refetch(); void doctorsQuery.refetch(); },
  };
}
