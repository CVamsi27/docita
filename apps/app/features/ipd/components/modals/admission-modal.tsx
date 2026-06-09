"use client";

import React, { FC, useState } from "react";
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

export const AdmissionModal: FC<ModalProps> = ({
  open,
  onOpenChange,
  wards = [],
  isSubmitting = false,
  onSubmit,
}) => {
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
    if (!data.patientId.trim()) nextErrors.patientId = "Enter the patient ID or MRN";
    if (!data.bedId) nextErrors.bedId = "Select an available bed";
    if (!data.admittingDoctorId) nextErrors.admittingDoctorId = "Select the attending doctor";
    if (!data.diagnosis.trim()) nextErrors.diagnosis = "Enter the admission diagnosis";
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
          <DialogTitle>Admit patient</DialogTitle>
          <DialogDescription>
            Assign a bed and attending doctor to start an inpatient admission.
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
