import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { CRUDDialog, FormFieldGroup } from "@workspace/ui/components";
import { Input } from "@workspace/ui/components/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { Form, FormControl, FormField } from "@workspace/ui/components/form";
import {
  phoneSchema,
  requiredStringSchema,
} from "@/features/_shared/schemas/common.schemas";

const medicineReminderSchema = z.object({
  medicineName: requiredStringSchema("Medicine Name"),
  dosage: requiredStringSchema("Dosage"),
  frequency: z.string().min(1, "Select how often the reminder should be sent"),
  reminderTime: requiredStringSchema("Reminder Time"),
  patientPhone: phoneSchema.optional().or(z.literal("")),
});

type MedicineReminderFormValues = z.infer<typeof medicineReminderSchema>;

export type MedicineReminderFormData = MedicineReminderFormValues;

export interface MedicineReminderDialogUIProps {
  isOpen: boolean;
  defaultValues?: Partial<MedicineReminderFormValues>;
  isLoading: boolean;
  onClose: () => void;
  onSubmit: (data: MedicineReminderFormValues) => void;
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
  defaultValues,
  isLoading,
  onClose,
  onSubmit,
}: MedicineReminderDialogUIProps) {
  const form = useForm<MedicineReminderFormValues>({
    resolver: zodResolver(medicineReminderSchema),
    defaultValues: {
      medicineName: "",
      dosage: "",
      frequency: "once_daily",
      reminderTime: "09:00",
      patientPhone: "",
      ...defaultValues,
    },
  });

  useEffect(() => {
    if (isOpen) {
      form.reset({
        medicineName: "",
        dosage: "",
        frequency: "once_daily",
        reminderTime: "09:00",
        patientPhone: "",
        ...defaultValues,
      });
    }
  }, [isOpen, defaultValues, form]);

  const handleSubmit = (data: MedicineReminderFormValues) => {
    onSubmit(data);
  };

  return (
    <CRUDDialog
      open={isOpen}
      onOpenChange={onClose}
      title="Set Medicine Reminder"
      description="Configure automatic WhatsApp reminders for patient medications"
      isLoading={isLoading}
      onSubmit={form.handleSubmit(handleSubmit)}
      submitLabel={isLoading ? "Creating..." : "Create Reminder"}
    >
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(handleSubmit)}
          noValidate
          className="space-y-4"
        >
          <FormField
            control={form.control}
            name="medicineName"
            render={({ field }) => (
              <FormFieldGroup
                label="Medicine Name"
                required
                error={form.formState.errors.medicineName?.message}
              >
                <FormControl>
                  <Input placeholder="e.g., Aspirin, Metformin" {...field} />
                </FormControl>
              </FormFieldGroup>
            )}
          />

          <FormField
            control={form.control}
            name="dosage"
            render={({ field }) => (
              <FormFieldGroup
                label="Dosage"
                required
                error={form.formState.errors.dosage?.message}
              >
                <FormControl>
                  <Input placeholder="e.g., 500mg, 1 tablet, 5ml" {...field} />
                </FormControl>
              </FormFieldGroup>
            )}
          />

          <FormField
            control={form.control}
            name="frequency"
            render={({ field }) => (
              <FormFieldGroup
                label="Frequency"
                error={form.formState.errors.frequency?.message}
              >
                <Select
                  onValueChange={field.onChange}
                  value={field.value ?? ""}
                >
                  <FormControl>
                    <SelectTrigger id="frequency">
                      <SelectValue placeholder="Select frequency" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {frequencyOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormFieldGroup>
            )}
          />

          <FormField
            control={form.control}
            name="reminderTime"
            render={({ field }) => (
              <FormFieldGroup
                label="Reminder Time"
                required
                error={form.formState.errors.reminderTime?.message}
              >
                <FormControl>
                  <Input type="time" {...field} />
                </FormControl>
              </FormFieldGroup>
            )}
          />

          <FormField
            control={form.control}
            name="patientPhone"
            render={({ field }) => (
              <FormFieldGroup
                label="Patient Phone Number"
                error={form.formState.errors.patientPhone?.message}
              >
                <FormControl>
                  <Input
                    placeholder="+1234567890 (optional - auto-detected if empty)"
                    {...field}
                    value={field.value || ""}
                  />
                </FormControl>
              </FormFieldGroup>
            )}
          />
        </form>
      </Form>
    </CRUDDialog>
  );
}
