"use client";

import React, { FC, ReactNode, useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Button } from "@workspace/ui/components/button";
import { Download } from "lucide-react";

import { Patient } from "@workspace/types";

interface AddPatientDialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onPatientAdded?: () => void;
}

interface EditPatientDialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  patient?: Patient | null;
  onPatientUpdated?: () => void;
}

// Add Patient Dialog
export const AddPatientDialog: FC<AddPatientDialogProps> = ({
  open,
  onOpenChange,
  onPatientAdded,
}) => {
  const [patient, setPatient] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    email: "",
    gender: "",
    dob: "",
  });

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <Card className="w-full max-w-lg m-4">
        <CardHeader>
          <CardTitle>Add New Patient</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">First Name *</label>
              <input
                className="w-full p-2 mt-1 rounded border bg-background"
                value={patient.firstName}
                onChange={(e) =>
                  setPatient({ ...patient, firstName: e.target.value })
                }
              />
            </div>
            <div>
              <label className="text-sm font-medium">Last Name *</label>
              <input
                className="w-full p-2 mt-1 rounded border bg-background"
                value={patient.lastName}
                onChange={(e) =>
                  setPatient({ ...patient, lastName: e.target.value })
                }
              />
            </div>
            <div>
              <label className="text-sm font-medium">Phone *</label>
              <input
                className="w-full p-2 mt-1 rounded border bg-background"
                value={patient.phone}
                onChange={(e) =>
                  setPatient({ ...patient, phone: e.target.value })
                }
              />
            </div>
            <div>
              <label className="text-sm font-medium">Email</label>
              <input
                className="w-full p-2 mt-1 rounded border bg-background"
                type="email"
                value={patient.email}
                onChange={(e) =>
                  setPatient({ ...patient, email: e.target.value })
                }
              />
            </div>
            <div>
              <label className="text-sm font-medium">Gender</label>
              <select
                className="w-full p-2 mt-1 rounded border bg-background"
                value={patient.gender}
                onChange={(e) =>
                  setPatient({ ...patient, gender: e.target.value })
                }
              >
                <option value="">Select</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">Date of Birth</label>
              <input
                className="w-full p-2 mt-1 rounded border bg-background"
                type="date"
                value={patient.dob}
                onChange={(e) =>
                  setPatient({ ...patient, dob: e.target.value })
                }
              />
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => onOpenChange?.(false)}>
              Cancel
            </Button>
            <Button onClick={() => onOpenChange?.(false)}>Add Patient</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// Edit Patient Dialog
export const EditPatientDialog: FC<EditPatientDialogProps> = (props) => {
  if (!props.open) return null;
  // Stub implementation for now as per original file
  return null;
};

// Patient Form Dialog
interface PatientFormDialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children?: ReactNode;
}

export const PatientFormDialog: FC<PatientFormDialogProps> = ({ children }) => {
  return <>{children}</>;
};

// FHIR Export Dialog
interface FhirExportDialogProps {
  children?: ReactNode;
  patientId?: string;
  patientName?: string;
}

export const FhirExportDialog: FC<FhirExportDialogProps> = ({ children }) => {
  return (
    <>
      {children ?? (
        <Button variant="outline" size="sm" className="gap-2">
          <Download className="h-4 w-4" />
          Export FHIR
        </Button>
      )}
    </>
  );
};
