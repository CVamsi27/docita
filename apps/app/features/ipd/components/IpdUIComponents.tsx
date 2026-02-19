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
import { Activity, BedDouble, Calendar, Users } from "lucide-react";

// Import shared types from ipdRules
// Adjusting import path since we are in components folder now: ../rules/ipdRules matches
import type {
  Bed,
  BedStatus,
  BedType,
  Ward,
  WardType,
} from "../rules/ipdRules";

// Additional types for form data and component props
interface AdmissionFormData {
  patientId: string;
  wardId: string;
  bedId: string;
  attendingDoctorId: string;
  diagnosis?: string;
  notes?: string;
}

interface IpdDashboardProps {
  wards?: Ward[];
  beds?: Bed[];
}

interface AdmissionFormProps {
  onSubmit?: (data: AdmissionFormData) => void;
}

interface AdmissionFormErrors {
  patientId?: string;
  wardId?: string;
  bedId?: string;
  attendingDoctorId?: string;
  diagnosis?: string;
}

interface BedMapProps {
  ward?: Ward;
  beds?: Bed[];
}

// IPD Dashboard
export const IpdDashboard: FC<IpdDashboardProps> = ({
  wards = [],
  beds = [],
}) => {
  const occupiedCount = beds.filter((b) => b.status === "occupied").length;
  const dischargesCount = 0;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-none shadow-lg">
          <CardContent className="flex items-center gap-4 p-4">
            <div className="h-10 w-10 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600">
              <BedDouble className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold">{beds.length}</p>
              <p className="text-xs text-muted-foreground">Total Beds</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-lg">
          <CardContent className="flex items-center gap-4 p-4">
            <div className="h-10 w-10 rounded-xl bg-green-100 flex items-center justify-center text-green-600">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold">{occupiedCount}</p>
              <p className="text-xs text-muted-foreground">Admitted</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-lg">
          <CardContent className="flex items-center gap-4 p-4">
            <div className="h-10 w-10 rounded-xl bg-amber-100 flex items-center justify-center text-amber-600">
              <Activity className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold">{dischargesCount}</p>
              <p className="text-xs text-muted-foreground">Discharges Today</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-lg">
          <CardContent className="flex items-center gap-4 p-4">
            <div className="h-10 w-10 rounded-xl bg-purple-100 flex items-center justify-center text-purple-600">
              <Calendar className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold">{wards.length}</p>
              <p className="text-xs text-muted-foreground">Wards</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-none shadow-lg">
        <CardHeader>
          <CardTitle>Ward Overview</CardTitle>
          <CardDescription>Current bed occupancy by ward</CardDescription>
        </CardHeader>
        <CardContent>
          {wards.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No wards configured yet
            </p>
          ) : (
            <div className="space-y-4">
              {wards.map((ward) => {
                const wardBeds = beds.filter((b) => b.wardId === ward.id);
                const occupancy = wardBeds.filter(
                  (b) => b.status === "occupied",
                ).length;
                return (
                  <div
                    key={ward.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/30"
                  >
                    <div>
                      <p className="font-medium">{ward.name}</p>
                      <p className="text-sm text-muted-foreground">
                        Floor {ward.floor}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">
                        {occupancy}/{wardBeds.length}
                      </p>
                      <p className="text-sm text-muted-foreground">occupied</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

// Admission Form
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
              aria-describedby={formErrors.patientId ? "ipd-patient-error" : undefined}
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
                aria-describedby={formErrors.wardId ? "ipd-ward-error" : undefined}
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
                aria-describedby={formErrors.bedId ? "ipd-bed-error" : undefined}
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
              aria-describedby={formErrors.diagnosis ? "ipd-diagnosis-error" : undefined}
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

// Bed Map
export const BedMap: FC<BedMapProps> = ({ ward, beds = [] }) => {
  const getStatusColor = (status: BedStatus) => {
    switch (status) {
      case "available":
        return "bg-green-100 text-green-700";
      case "occupied":
        return "bg-red-100 text-red-700";
      case "maintenance":
        return "bg-amber-100 text-amber-700";
      case "reserved":
        return "bg-blue-100 text-blue-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  return (
    <Card className="border-none shadow-lg">
      <CardHeader>
        <CardTitle>Bed Map{ward ? `: ${ward.name}` : ""}</CardTitle>
        <CardDescription>Visual bed occupancy</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-4 gap-2">
          {beds.length > 0
            ? beds.map((bed) => (
                <div
                  key={bed.id}
                  className={`h-16 rounded-lg flex items-center justify-center font-medium ${getStatusColor(bed.status)}`}
                >
                  {bed.bedNumber}
                </div>
              ))
            : [1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                <div
                  key={i}
                  className="h-16 rounded-lg bg-green-100 flex items-center justify-center text-green-700 font-medium"
                >
                  Bed {i}
                </div>
              ))}
        </div>
      </CardContent>
    </Card>
  );
};

// Export types
export type {
  Bed,
  Ward,
  BedStatus,
  BedType,
  WardType,
  AdmissionFormData,
  IpdDashboardProps,
  AdmissionFormProps,
  BedMapProps,
};
