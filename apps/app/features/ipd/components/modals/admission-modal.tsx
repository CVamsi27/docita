"use client";

import React, { FC, useMemo, useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/indicators/card";
import { Button } from "@workspace/ui/components/form/button";
import { useDoctors } from "@workspace/data-access";
import type { AdmitPatientRequest } from "@workspace/types";
import type { WardInfo } from "@/features/ipd/components/beds/bed-management-ui";

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
  const { data: doctors = [] } = useDoctors();

  const availableBeds = useMemo(() => {
    const ward = wards.find((item) => item.id === data.wardId);
    return (
      ward?.rooms.flatMap((room) =>
        room.beds
          .filter((bed) => bed.status === "AVAILABLE")
          .map((bed) => ({
            id: bed.id,
            label: `${ward.name} / Room ${room.roomNumber} / Bed ${bed.bedNumber}`,
          })),
      ) ?? []
    );
  }, [data.wardId, wards]);

  if (!open) return null;

  const validate = () => {
    const nextErrors: AdmissionFormErrors = {};
    if (!data.patientId.trim()) {
      nextErrors.patientId = "Enter the patient ID or MRN";
    }
    if (!data.bedId) {
      nextErrors.bedId = "Select an available bed";
    }
    if (!data.admittingDoctorId) {
      nextErrors.admittingDoctorId = "Select the attending doctor";
    }
    if (!data.diagnosis.trim()) {
      nextErrors.diagnosis = "Enter the admission diagnosis";
    }

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <Card className="w-full max-w-lg m-4">
        <CardHeader>
          <CardTitle>Admit Patient</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium" htmlFor="ipd-patient-id">
              Patient ID / MRN
            </label>
            <input
              id="ipd-patient-id"
              className="w-full p-2 mt-1 rounded border bg-background"
              value={data.patientId}
              onChange={(e) =>
                setData({ ...data, patientId: e.target.value })
              }
              placeholder="Patient ID"
              aria-invalid={!!errors.patientId}
            />
            {errors.patientId && (
              <p className="mt-1 text-xs text-destructive">
                {errors.patientId}
              </p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium" htmlFor="ipd-ward">
                Ward
              </label>
              <select
                id="ipd-ward"
                className="w-full p-2 mt-1 rounded border bg-background"
                value={data.wardId}
                onChange={(e) =>
                  setData({ ...data, wardId: e.target.value, bedId: "" })
                }
              >
                <option value="">Select Ward</option>
                {wards.map((ward) => (
                  <option key={ward.id} value={ward.id}>
                    {ward.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium" htmlFor="ipd-bed">
                Bed
              </label>
              <select
                id="ipd-bed"
                className="w-full p-2 mt-1 rounded border bg-background"
                value={data.bedId}
                onChange={(e) => setData({ ...data, bedId: e.target.value })}
                aria-invalid={!!errors.bedId}
              >
                <option value="">Select Bed</option>
                {availableBeds.map((bed) => (
                  <option key={bed.id} value={bed.id}>
                    {bed.label}
                  </option>
                ))}
              </select>
              {errors.bedId && (
                <p className="mt-1 text-xs text-destructive">{errors.bedId}</p>
              )}
            </div>
          </div>
          <div>
            <label className="text-sm font-medium" htmlFor="ipd-doctor">
              Attending Doctor
            </label>
            <select
              id="ipd-doctor"
              className="w-full p-2 mt-1 rounded border bg-background"
              value={data.admittingDoctorId}
              onChange={(e) =>
                setData({ ...data, admittingDoctorId: e.target.value })
              }
              aria-invalid={!!errors.admittingDoctorId}
            >
              <option value="">Select Doctor</option>
              {doctors.map((doc) => (
                <option key={doc.id} value={doc.id}>
                  {doc.name}
                </option>
              ))}
            </select>
            {errors.admittingDoctorId && (
              <p className="mt-1 text-xs text-destructive">
                {errors.admittingDoctorId}
              </p>
            )}
          </div>
          <div>
            <label className="text-sm font-medium" htmlFor="ipd-diagnosis">
              Admission Diagnosis
            </label>
            <textarea
              id="ipd-diagnosis"
              className="w-full p-2 mt-1 rounded border bg-background min-h-20"
              value={data.diagnosis}
              onChange={(e) => setData({ ...data, diagnosis: e.target.value })}
              aria-invalid={!!errors.diagnosis}
            />
            {errors.diagnosis && (
              <p className="mt-1 text-xs text-destructive">
                {errors.diagnosis}
              </p>
            )}
          </div>
          <div>
            <label className="text-sm font-medium" htmlFor="ipd-notes">
              Notes
            </label>
            <textarea
              id="ipd-notes"
              className="w-full p-2 mt-1 rounded border bg-background min-h-16"
              value={data.notes}
              onChange={(e) => setData({ ...data, notes: e.target.value })}
            />
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => onOpenChange?.(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? "Admitting…" : "Admit"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
