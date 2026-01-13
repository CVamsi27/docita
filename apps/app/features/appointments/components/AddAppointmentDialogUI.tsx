import {
  Check,
  ChevronsUpDown,
  Loader2,
  Plus,
  Calendar as CalendarIcon,
} from "lucide-react";
import type { UseFormReturn } from "react-hook-form";
import type { CreateAppointmentInput, Patient, Doctor } from "@workspace/types";
import type { SelectOption } from "@/lib/app-config-context";
import { format } from "date-fns";
import { cn } from "@workspace/ui/lib/utils";

import { Button } from "@workspace/ui/components/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@workspace/ui/components/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { Textarea } from "@workspace/ui/components/textarea";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@workspace/ui/components/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@workspace/ui/components/command";
import { FormDialog } from "@workspace/ui/components/form-dialog";
import { DateTimePicker } from "@workspace/ui/components/date-time-picker";
import { ScrollArea } from "@workspace/ui/components/scroll-area";
import { Separator } from "@workspace/ui/components/separator";
import { AppointmentFormFields } from "./sections/add-dialog/AppointmentFormFields";
import { PatientSelector } from "./sections/add-dialog/PatientSelector";
import { DoctorSelector } from "./sections/add-dialog/DoctorSelector";
import { TimeSlotPicker } from "./sections/add-dialog/TimeSlotPicker";

interface AddAppointmentDialogUIProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  form: UseFormReturn<CreateAppointmentInput>;
  loading: boolean;
  patients: Patient[];
  patientsLoading: boolean;
  patientSearch: string;
  setPatientSearch: (search: string) => void;
  doctors: Doctor[];
  doctorsLoading: boolean;
  onSubmit: (
    data: CreateAppointmentInput,
    onSuccess?: () => void,
  ) => Promise<void>;
  appointmentTypeOptions: SelectOption[];
  patientComboboxOpen: boolean;
  setPatientComboboxOpen: (open: boolean) => void;
  startHour: number;
  endHour: number;
}

export function AddAppointmentDialogUI({
  open,
  onOpenChange,
  form,
  loading,
  patients,
  patientsLoading,
  patientSearch,
  setPatientSearch,
  doctors,
  doctorsLoading,
  onSubmit,
  appointmentTypeOptions,
  patientComboboxOpen,
  setPatientComboboxOpen,
  startHour,
  endHour,
}: AddAppointmentDialogUIProps) {
  const handleSubmit = form.handleSubmit((data) => {
    onSubmit(data, () => onOpenChange(false));
  });

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Schedule Appointment"
      description="Create a new appointment for a patient."
    >
      <Form {...form}>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {/* Patient Selection */}
            <PatientSelector
              form={form}
              patients={patients}
              patientsLoading={patientsLoading}
              patientSearch={patientSearch}
              setPatientSearch={setPatientSearch}
              patientComboboxOpen={patientComboboxOpen}
              setPatientComboboxOpen={setPatientComboboxOpen}
            />

            {/* Doctor Selection */}
            <DoctorSelector
              form={form}
              doctors={doctors}
              doctorsLoading={doctorsLoading}
            />

            {/* Time Slots */}
            <TimeSlotPicker
              form={form}
              startHour={startHour}
              endHour={endHour}
            />

            {/* Extracted Type and Notes */}
            <AppointmentFormFields
              form={form}
              appointmentTypeOptions={appointmentTypeOptions}
            />
          </div>

          <div className="flex justify-end space-x-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Schedule
            </Button>
          </div>
        </form>
      </Form>
    </FormDialog>
  );
}
