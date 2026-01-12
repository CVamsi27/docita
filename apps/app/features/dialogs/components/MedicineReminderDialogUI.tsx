import { CRUDDialog } from "@workspace/ui/components/crud-dialog";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";

export interface MedicineReminderFormData {
  medicineName: string;
  dosage: string;
  frequency: string;
  reminderTime: string;
  patientPhone: string;
}

export interface MedicineReminderDialogUIProps {
  isOpen: boolean;
  formData: MedicineReminderFormData;
  isLoading: boolean;
  onClose: () => void;
  onInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSelectChange: (name: string, value: string) => void;
  onSubmit: () => void;
}

const frequencyOptions = [
  { value: "once_daily", label: "Once daily" },
  { value: "twice_daily", label: "Twice daily" },
  { value: "thrice_daily", label: "Thrice daily" },
  { value: "every_4_hours", label: "Every 4 hours" },
  { value: "every_6_hours", label: "Every 6 hours" },
  { value: "every_8_hours", label: "Every 8 hours" },
  { value: "as_needed", label: "As needed" },
];

export function MedicineReminderDialogUI({
  isOpen,
  formData,
  isLoading,
  onClose,
  onInputChange,
  onSelectChange,
  onSubmit,
}: MedicineReminderDialogUIProps) {
  return (
    <CRUDDialog
      open={isOpen}
      onOpenChange={onClose}
      title="Set Medicine Reminder"
      description="Configure automatic WhatsApp reminders for patient medications"
      isLoading={isLoading}
      onSubmit={onSubmit}
      submitLabel={isLoading ? "Creating..." : "Create Reminder"}
    >
      <form className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="medicineName">
            Medicine Name <span className="text-red-500">*</span>
          </Label>
          <Input
            id="medicineName"
            name="medicineName"
            placeholder="e.g., Aspirin, Metformin"
            value={formData.medicineName}
            onChange={onInputChange}
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
            onChange={onInputChange}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="frequency">Frequency</Label>
          <Select
            value={formData.frequency}
            onValueChange={(value) => onSelectChange("frequency", value)}
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
            onChange={onInputChange}
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
            onChange={onInputChange}
          />
        </div>
      </form>
    </CRUDDialog>
  );
}
