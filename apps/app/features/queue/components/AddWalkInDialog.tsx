"use client";

import { FC, useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Button } from "@workspace/ui/components/button";
import { UserPlus } from "lucide-react";
import { toast } from "sonner";
import { apiHooks } from "@/lib/api-hooks";

interface AddWalkInDialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onSuccess?: () => void;
}

export const AddWalkInDialog: FC<AddWalkInDialogProps> = ({
  open,
  onOpenChange,
  onSuccess,
}) => {
  const [showForm, setShowForm] = useState(false);
  const [patient, setPatient] = useState({ name: "", phone: "", reason: "" });

  // Button trigger mode
  if (!open && !showForm) {
    return (
      <Button
        variant="default"
        className="gap-2"
        onClick={() => onOpenChange?.(true) ?? setShowForm(true)}
      >
        <UserPlus className="h-4 w-4" />
        Add Walk-in
      </Button>
    );
  }

  const isOpen = open ?? showForm;
  if (!isOpen) return null;

  const { mutate: addWalkIn, isPending: saving } = apiHooks.useCreateWalkIn();

  const handleClose = () => {
    onOpenChange?.(false);
    setShowForm(false);
    setPatient({ name: "", phone: "", reason: "" });
  };

  const handleSubmit = () => {
    if (!patient.name || !patient.phone) {
      toast.error("Please fill in required fields");
      return;
    }

    addWalkIn(
      {
        patientName: patient.name,
        phoneNumber: patient.phone,
        reason: patient.reason,
      },
      {
        onSuccess: () => {
          toast.success("Walk-in patient added to queue");
          onSuccess?.();
          handleClose();
        },
        onError: (error: Error) => {
          toast.error(error.message || "Failed to add walk-in patient");
        },
      },
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <Card className="w-full max-w-md m-4">
        <CardHeader>
          <CardTitle>Quick Walk-in Registration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium">Patient Name *</label>
            <input
              className="w-full p-2 mt-1 rounded border bg-background"
              placeholder="Enter patient name"
              value={patient.name}
              onChange={(e) => setPatient({ ...patient, name: e.target.value })}
            />
          </div>
          <div>
            <label className="text-sm font-medium">Phone Number *</label>
            <input
              className="w-full p-2 mt-1 rounded border bg-background"
              placeholder="Enter phone number"
              value={patient.phone}
              onChange={(e) =>
                setPatient({ ...patient, phone: e.target.value })
              }
            />
          </div>
          <div>
            <label className="text-sm font-medium">Reason for Visit</label>
            <input
              className="w-full p-2 mt-1 rounded border bg-background"
              placeholder="Brief reason for visit"
              value={patient.reason}
              onChange={(e) =>
                setPatient({ ...patient, reason: e.target.value })
              }
            />
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={saving}>
              {saving ? "Adding..." : "Add to Queue"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
