"use client";

// jscpd:ignore-start
import React, { FC, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/overlay/dialog";
import { Button } from "@workspace/ui/components/form/button";
import { Input } from "@workspace/ui/components/form/input";
import { Label } from "@workspace/ui/components/form/label";
import { Textarea } from "@workspace/ui/components/form/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/form/select";
import { useDoctors } from "@workspace/data-access";
import type { AdmitPatientRequest } from "@workspace/types";
import type { WardWithRooms as WardInfo } from "@/features/ipd/hooks/use-ipd-logic";

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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="md:max-w-lg">
        <DialogHeader>
          <DialogTitle>Admit patient</DialogTitle>
          <DialogDescription>
            Assign a bed and attending doctor to start an inpatient admission.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="space-y-2">
            <Label htmlFor="ipd-patient-id">Patient ID / MRN</Label>
            <Input
              id="ipd-patient-id"
              value={data.patientId}
              onChange={(e) => setData({ ...data, patientId: e.target.value })}
              placeholder="Patient ID"
              aria-invalid={!!errors.patientId}
            />
            {errors.patientId && (
              <p className="text-xs text-destructive">{errors.patientId}</p>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="ipd-ward">Ward</Label>
              <Select
                value={data.wardId}
                onValueChange={(value) =>
                  setData({ ...data, wardId: value, bedId: "" })
                }
              >
                <SelectTrigger id="ipd-ward">
                  <SelectValue placeholder="Select ward" />
                </SelectTrigger>
                <SelectContent>
                  {wards.map((ward) => (
                    <SelectItem key={ward.id} value={ward.id}>
                      {ward.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="ipd-bed">Bed</Label>
              <Select
                value={data.bedId}
                onValueChange={(value) => setData({ ...data, bedId: value })}
                disabled={!data.wardId}
              >
                <SelectTrigger id="ipd-bed" aria-invalid={!!errors.bedId}>
                  <SelectValue placeholder="Select bed" />
                </SelectTrigger>
                <SelectContent>
                  {availableBeds.map((bed) => (
                    <SelectItem key={bed.id} value={bed.id}>
                      {bed.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.bedId && (
                <p className="text-xs text-destructive">{errors.bedId}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="ipd-doctor">Attending doctor</Label>
            <Select
              value={data.admittingDoctorId}
              onValueChange={(value) =>
                setData({ ...data, admittingDoctorId: value })
              }
            >
              <SelectTrigger
                id="ipd-doctor"
                aria-invalid={!!errors.admittingDoctorId}
              >
                <SelectValue placeholder="Select doctor" />
              </SelectTrigger>
              <SelectContent>
                {doctors.map((doc) => (
                  <SelectItem key={doc.id} value={doc.id}>
                    {doc.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.admittingDoctorId && (
              <p className="text-xs text-destructive">
                {errors.admittingDoctorId}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="ipd-diagnosis">Admission diagnosis</Label>
            <Textarea
              id="ipd-diagnosis"
              className="min-h-20"
              value={data.diagnosis}
              onChange={(e) => setData({ ...data, diagnosis: e.target.value })}
              aria-invalid={!!errors.diagnosis}
            />
            {errors.diagnosis && (
              <p className="text-xs text-destructive">{errors.diagnosis}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="ipd-notes">Notes</Label>
            <Textarea
              id="ipd-notes"
              className="min-h-16"
              value={data.notes}
              onChange={(e) => setData({ ...data, notes: e.target.value })}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange?.(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? "Admitting…" : "Admit"}
// jscpd:ignore-end
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
