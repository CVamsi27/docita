"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { Label } from "@workspace/ui/components/label";
import { Input } from "@workspace/ui/components/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { Textarea } from "@workspace/ui/components/textarea";
import { DatePicker } from "@workspace/ui/components/date-picker";
import { CRUDDialog } from "@workspace/ui/components/crud-dialog";
import { Patient } from "@workspace/types";
import { apiHooks } from "@/lib/api-hooks";
import { useFormOptions } from "@/lib/app-config-context";

interface EditPatientDialogProps {
  patient: Patient | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPatientUpdated: () => void;
}

function getInitialFormData(patient: Patient | null) {
  if (!patient) {
    return {
      firstName: "",
      lastName: "",
      dateOfBirth: "",
      gender: "MALE" as const,
      phoneNumber: "",
      email: "",
      address: "",
      bloodGroup: "",
      allergies: "",
    };
  }

  let dobStr = "";
  if (patient.dateOfBirth) {
    try {
      dobStr = new Date(patient.dateOfBirth).toISOString().split("T")[0] || "";
    } catch {
      dobStr = "";
    }
  }

  return {
    firstName: patient.firstName || "",
    lastName: patient.lastName || "",
    dateOfBirth: dobStr,
    gender: (patient.gender || "MALE") as "MALE" | "FEMALE" | "OTHER",
    phoneNumber: patient.phoneNumber || "",
    email: patient.email || "",
    address: patient.address || "",
    bloodGroup: patient.bloodGroup || "",
    allergies: patient.allergies || "",
  };
}

export function EditPatientDialog({
  patient,
  open,
  onOpenChange,
  onPatientUpdated,
}: EditPatientDialogProps) {
  // Get form options from config
  const genderOptions = useFormOptions("gender");
  const bloodGroupOptions = useFormOptions("bloodGroup");

  const lastPatientIdRef = useRef<string | null>(null);
  const [formData, setFormData] = useState(() => getInitialFormData(patient));
  const [loading, setLoading] = useState(false);

  // Sync form data when patient changes (without useEffect)
  if (patient?.id !== lastPatientIdRef.current) {
    lastPatientIdRef.current = patient?.id ?? null;
    const newFormData = getInitialFormData(patient);
    // Only update if the form data would actually change
    if (JSON.stringify(newFormData) !== JSON.stringify(formData)) {
      setFormData(newFormData);
    }
  }

  // Get the update mutation - create it once with a placeholder ID
  const updatePatientMutation = apiHooks.useUpdatePatient(patient?.id || "");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patient?.id) return;

    setLoading(true);
    try {
      await updatePatientMutation.mutateAsync({
        ...formData,
        dateOfBirth: formData.dateOfBirth
          ? new Date(formData.dateOfBirth).toISOString()
          : undefined,
      });
      toast.success("Patient updated successfully");
      onPatientUpdated();
      setTimeout(() => onOpenChange(false), 100);
    } catch (error) {
      console.error("Failed to update patient:", error);
      toast.error("Failed to update patient");
    } finally {
      setLoading(false);
    }
  };

  return (
    <CRUDDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Edit Patient"
      description="Update the patient's information."
      isLoading={loading}
      onSubmit={() =>
        handleSubmit({ preventDefault: () => {} } as React.FormEvent)
      }
      submitLabel={loading ? "Saving..." : "Save Changes"}
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="firstName">First Name</Label>
            <Input
              id="firstName"
              placeholder="John"
              value={formData.firstName}
              onChange={(e) =>
                setFormData({ ...formData, firstName: e.target.value })
              }
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="lastName">Last Name</Label>
            <Input
              id="lastName"
              placeholder="Doe"
              value={formData.lastName}
              onChange={(e) =>
                setFormData({ ...formData, lastName: e.target.value })
              }
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="dateOfBirth">Date of Birth</Label>
            <DatePicker
              value={formData.dateOfBirth}
              onChange={(date) =>
                setFormData({
                  ...formData,
                  dateOfBirth: date?.toISOString().split("T")[0] || "",
                })
              }
              placeholder="Select date of birth"
              maxDate={new Date()}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="gender">Gender</Label>
            <Select
              value={formData.gender}
              onValueChange={(val) =>
                setFormData({
                  ...formData,
                  gender: val as "MALE" | "FEMALE" | "OTHER",
                })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select gender" />
              </SelectTrigger>
              <SelectContent>
                {genderOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="phoneNumber">Phone Number</Label>
            <Input
              id="phoneNumber"
              placeholder="+1234567890"
              value={formData.phoneNumber}
              onChange={(e) =>
                setFormData({ ...formData, phoneNumber: e.target.value })
              }
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="john@example.com"
              value={formData.email}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="bloodGroup">Blood Group</Label>
            <Select
              value={formData.bloodGroup}
              onValueChange={(val) =>
                setFormData({ ...formData, bloodGroup: val })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select blood group" />
              </SelectTrigger>
              <SelectContent>
                {bloodGroupOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="allergies">Allergies</Label>
            <Input
              id="allergies"
              placeholder="Known allergies"
              value={formData.allergies}
              onChange={(e) =>
                setFormData({ ...formData, allergies: e.target.value })
              }
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="address">Address</Label>
          <Textarea
            id="address"
            placeholder="123 Main St, City, Country"
            value={formData.address}
            onChange={(e) =>
              setFormData({ ...formData, address: e.target.value })
            }
          />
        </div>
      </div>
    </CRUDDialog>
  );
}
