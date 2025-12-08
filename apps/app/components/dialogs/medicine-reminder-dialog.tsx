"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { toast } from "sonner";

interface MedicineReminderDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function MedicineReminderDialog({
  isOpen,
  onClose,
  onSuccess,
}: MedicineReminderDialogProps) {
  const [formData, setFormData] = useState({
    medicineName: "",
    dosage: "",
    frequency: "once_daily",
    reminderTime: "09:00",
    patientPhone: "",
  });
  const [isPending, setIsPending] = useState(false);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const frequencyOptions = [
    { value: "once_daily", label: "Once daily" },
    { value: "twice_daily", label: "Twice daily" },
    { value: "thrice_daily", label: "Thrice daily" },
    { value: "every_4_hours", label: "Every 4 hours" },
    { value: "every_6_hours", label: "Every 6 hours" },
    { value: "every_8_hours", label: "Every 8 hours" },
    { value: "as_needed", label: "As needed" },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.medicineName || !formData.dosage || !formData.reminderTime) {
      toast.error("Please fill in all required fields");
      return;
    }

    setIsPending(true);
    try {
      const response = await fetch("/api/whatsapp/medicine-reminder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          medicineName: formData.medicineName,
          dosage: formData.dosage,
          frequency: formData.frequency,
          reminderTime: formData.reminderTime,
          patientPhone: formData.patientPhone,
        }),
      });

      if (!response.ok) throw new Error("Failed to set medicine reminder");

      toast.success("Medicine reminder created successfully");
      setFormData({
        medicineName: "",
        dosage: "",
        frequency: "once_daily",
        reminderTime: "09:00",
        patientPhone: "",
      });
      onSuccess?.();
      onClose();
    } catch (error) {
      console.error("Error creating reminder:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to create reminder",
      );
    } finally {
      setIsPending(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Set Medicine Reminder</DialogTitle>
          <DialogDescription>
            Configure automatic WhatsApp reminders for patient medications
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="medicineName">
              Medicine Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="medicineName"
              name="medicineName"
              placeholder="e.g., Aspirin, Metformin"
              value={formData.medicineName}
              onChange={handleChange}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="dosage">
              Dosage <span className="text-red-500">*</span>
            </Label>
            <Input
              id="dosage"
              name="dosage"
              placeholder="e.g., 500mg, 1 tablet, 5ml"
              value={formData.dosage}
              onChange={handleChange}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="frequency">Frequency</Label>
            <Select
              value={formData.frequency}
              onValueChange={(value) => handleSelectChange("frequency", value)}
            >
              <SelectTrigger id="frequency">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {frequencyOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reminderTime">
              Reminder Time <span className="text-red-500">*</span>
            </Label>
            <Input
              id="reminderTime"
              name="reminderTime"
              type="time"
              value={formData.reminderTime}
              onChange={handleChange}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="patientPhone">Patient Phone Number</Label>
            <Input
              id="patientPhone"
              name="patientPhone"
              placeholder="+1234567890 (optional - auto-detected if empty)"
              value={formData.patientPhone}
              onChange={handleChange}
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isPending}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending} className="flex-1">
              {isPending ? "Creating..." : "Create Reminder"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
