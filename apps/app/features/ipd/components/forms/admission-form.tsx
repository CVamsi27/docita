"use client";

import React, { FC, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Button } from "@workspace/ui/components/button";

export interface AdmissionFormData {
  patientId: string;
  wardId: string;
  bedId: string;
  attendingDoctorId: string;
  diagnosis?: string;
  notes?: string;
}

export interface AdmissionFormProps {
  onSubmit?: (data: AdmissionFormData) => void;
}

interface AdmissionFormErrors {
  patientId?: string;
  wardId?: string;
  bedId?: string;
  attendingDoctorId?: string;
  diagnosis?: string;
}

export const AdmissionForm: FC<AdmissionFormProps> = ({ onSubmit }) => {
  const [formData, setFormData] = useState({
    patientId: "",
    wardId: "",
    bedId: "",
    attendingDoctorId: "",
    diagnosis: "",
    notes: "",
  });
  const [formErrors, setFormErrors] = useState<AdmissionFormErrors>({});

  const validateForm = (): AdmissionFormErrors => {
    const errors: AdmissionFormErrors = {};

    if (!formData.patientId.trim()) {
      errors.patientId = "Patient is required";
    }
    if (!formData.wardId) {
      errors.wardId = "Ward is required";
    }
    if (!formData.bedId) {
      errors.bedId = "Bed is required";
    }
    if (!formData.attendingDoctorId) {
      errors.attendingDoctorId = "Attending doctor is required";
    }
    if (!formData.diagnosis.trim()) {
      errors.diagnosis = "Admission diagnosis is required";
    }

    return errors;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const errors = validateForm();
    setFormErrors(errors);

    if (Object.keys(errors).length > 0) {
      return;
    }

    onSubmit?.(formData as AdmissionFormData);
  };

  return (
    <Card className="border-none shadow-lg">
      <CardHeader>
        <CardTitle>New Admission</CardTitle>
        <CardDescription>Admit a patient to the hospital</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Patient</label>
            <input
              className={`w-full p-2 rounded-md border bg-background ${
                formErrors.patientId ? "border-destructive" : ""
              }`}
              placeholder="Search patient by name or phone..."
              value={formData.patientId}
              onChange={(e) => {
                setFormData({ ...formData, patientId: e.target.value });
                if (formErrors.patientId) {
                  setFormErrors((prev) => ({ ...prev, patientId: undefined }));
                }
              }}
              aria-invalid={!!formErrors.patientId}
              aria-describedby={
                formErrors.patientId ? "ipd-patient-error" : undefined
              }
            />
            {formErrors.patientId && (
              <p id="ipd-patient-error" className="text-sm text-destructive">
                {formErrors.patientId}
              </p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Ward</label>
              <select
                className={`w-full p-2 rounded-md border bg-background ${
                  formErrors.wardId ? "border-destructive" : ""
                }`}
                value={formData.wardId}
                onChange={(e) => {
                  setFormData({ ...formData, wardId: e.target.value });
                  if (formErrors.wardId) {
                    setFormErrors((prev) => ({ ...prev, wardId: undefined }));
                  }
                }}
                aria-invalid={!!formErrors.wardId}
                aria-describedby={
                  formErrors.wardId ? "ipd-ward-error" : undefined
                }
              >
                <option value="">Select Ward</option>
                <option value="general">General Ward</option>
                <option value="icu">ICU</option>
                <option value="private">Private Room</option>
              </select>
              {formErrors.wardId && (
                <p id="ipd-ward-error" className="text-sm text-destructive">
                  {formErrors.wardId}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Bed</label>
              <select
                className={`w-full p-2 rounded-md border bg-background ${
                  formErrors.bedId ? "border-destructive" : ""
                }`}
                value={formData.bedId}
                onChange={(e) => {
                  setFormData({ ...formData, bedId: e.target.value });
                  if (formErrors.bedId) {
                    setFormErrors((prev) => ({ ...prev, bedId: undefined }));
                  }
                }}
                aria-invalid={!!formErrors.bedId}
                aria-describedby={
                  formErrors.bedId ? "ipd-bed-error" : undefined
                }
              >
                <option value="">Select Bed</option>
                <option value="bed-1">Bed 101</option>
                <option value="bed-2">Bed 102</option>
                <option value="bed-3">Bed 103</option>
              </select>
              {formErrors.bedId && (
                <p id="ipd-bed-error" className="text-sm text-destructive">
                  {formErrors.bedId}
                </p>
              )}
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Attending Doctor</label>
            <select
              className={`w-full p-2 rounded-md border bg-background ${
                formErrors.attendingDoctorId ? "border-destructive" : ""
              }`}
              value={formData.attendingDoctorId}
              onChange={(e) => {
                setFormData({ ...formData, attendingDoctorId: e.target.value });
                if (formErrors.attendingDoctorId) {
                  setFormErrors((prev) => ({
                    ...prev,
                    attendingDoctorId: undefined,
                  }));
                }
              }}
              aria-invalid={!!formErrors.attendingDoctorId}
              aria-describedby={
                formErrors.attendingDoctorId ? "ipd-doctor-error" : undefined
              }
            >
              <option value="">Select Doctor</option>
              <option value="dr1">Dr. Vamsi Krishna</option>
              <option value="dr2">Dr. Priya Sharma</option>
            </select>
            {formErrors.attendingDoctorId && (
              <p id="ipd-doctor-error" className="text-sm text-destructive">
                {formErrors.attendingDoctorId}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Admission Diagnosis</label>
            <textarea
              className={`w-full p-2 rounded-md border bg-background min-h-20 ${
                formErrors.diagnosis ? "border-destructive" : ""
              }`}
              placeholder="Primary diagnosis for admission..."
              value={formData.diagnosis}
              onChange={(e) => {
                setFormData({ ...formData, diagnosis: e.target.value });
                if (formErrors.diagnosis) {
                  setFormErrors((prev) => ({ ...prev, diagnosis: undefined }));
                }
              }}
              aria-invalid={!!formErrors.diagnosis}
              aria-describedby={
                formErrors.diagnosis ? "ipd-diagnosis-error" : undefined
              }
            />
            {formErrors.diagnosis && (
              <p id="ipd-diagnosis-error" className="text-sm text-destructive">
                {formErrors.diagnosis}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Notes</label>
            <textarea
              className="w-full p-2 rounded-md border bg-background min-h-[60px]"
              placeholder="Additional notes..."
              value={formData.notes}
              onChange={(e) =>
                setFormData({ ...formData, notes: e.target.value })
              }
            />
          </div>
          <Button type="submit" className="w-full">
            Admit Patient
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};
