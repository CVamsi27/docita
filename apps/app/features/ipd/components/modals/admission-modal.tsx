"use client";

import React, { FC, useState } from "react";
import { useTranslations } from "next-intl";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/overlay/dialog";
import type { AdmitPatientRequest } from "@workspace/types";
import type { WardWithRooms as WardInfo } from "@/features/ipd/hooks/use-ipd-logic";
import { AdmissionPatientInfo } from "./AdmissionPatientInfo";
import { AdmissionFormFields } from "./AdmissionFormFields";
import { AdmissionActions } from "./AdmissionActions";

interface ModalProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  wards?: WardInfo[];
  isSubmitting?: boolean;
  onSubmit?: (data: AdmitPatientRequest) => Promise<void> | void;
}

interface AdmissionFormErrors {
  patientId?: string;
  bedId?: string;
  admittingDoctorId?: string;
  diagnosis?: string;
}

/**
 * Phase 3 (per-feature): apps/app IPD > Admission modal
 * (admit patient dialog chrome). The 4 validate() error strings are
 * also lifted to the same namespace so the error messages can be
 * translated when surfaced via FormMessage components.
 */
function useAdmissionModalTranslations() {
  return useTranslations("Ipd.admission");
}

export const AdmissionModal: FC<ModalProps> = ({
  open,
  onOpenChange,
  wards = [],
  isSubmitting = false,
  onSubmit,
}) => {
  const t = useAdmissionModalTranslations();
  const [data, setData] = useState({
    patientId: "",
    wardId: "",
    bedId: "",
    admittingDoctorId: "",
    diagnosis: "",
    notes: "",
  });
  const [errors, setErrors] = useState<AdmissionFormErrors>({});

  const validate = () => {
    const nextErrors: AdmissionFormErrors = {};
    if (!data.patientId.trim()) nextErrors.patientId = t("errorPatientId");
    if (!data.bedId) nextErrors.bedId = t("errorBed");
    if (!data.admittingDoctorId) nextErrors.admittingDoctorId = t("errorDoctor");
    if (!data.diagnosis.trim()) nextErrors.diagnosis = t("errorDiagnosis");
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    await onSubmit?.({
      patientId: data.patientId.trim(),
      bedId: data.bedId,
      admittingDoctorId: data.admittingDoctorId,
      admissionReason: data.diagnosis.trim(),
      diagnosis: data.diagnosis.trim(),
      notes: data.notes.trim() || undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="md:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("modalTitle")}</DialogTitle>
          <DialogDescription>
            {t("modalDescription")}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <AdmissionPatientInfo
            patientId={data.patientId}
            error={errors.patientId}
            onChange={(value) => setData({ ...data, patientId: value })}
          />
          <AdmissionFormFields
            wardId={data.wardId}
            bedId={data.bedId}
            admittingDoctorId={data.admittingDoctorId}
            diagnosis={data.diagnosis}
            notes={data.notes}
            wards={wards}
            errors={errors}
            onWardChange={(value) => setData({ ...data, wardId: value, bedId: "" })}
            onBedChange={(value) => setData({ ...data, bedId: value })}
            onDoctorChange={(value) => setData({ ...data, admittingDoctorId: value })}
            onDiagnosisChange={(value) => setData({ ...data, diagnosis: value })}
            onNotesChange={(value) => setData({ ...data, notes: value })}
          />
        </div>

        <AdmissionActions
          isSubmitting={isSubmitting}
          onCancel={() => onOpenChange?.(false)}
          onSubmit={handleSubmit}
        />
      </DialogContent>
    </Dialog>
  );
};
