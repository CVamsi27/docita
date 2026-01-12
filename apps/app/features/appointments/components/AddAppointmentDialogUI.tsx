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
            <FormField
              control={form.control}
              name="patientId"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Patient</FormLabel>
                  <Popover
                    open={patientComboboxOpen}
                    onOpenChange={setPatientComboboxOpen}
                    modal={true}
                  >
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          role="combobox"
                          className={cn(
                            "w-full justify-between",
                            !field.value && "text-muted-foreground",
                          )}
                        >
                          {field.value
                            ? (() => {
                                const patient = patients.find((p) => p.id === field.value);
                                return patient
                                  ? `${patient.firstName} ${patient.lastName}`
                                  : "Select patient";
                              })()
                            : "Select patient"}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-[300px] p-0" align="start">
                      <Command shouldFilter={false}>
                        <CommandInput
                          placeholder="Search patients..."
                          value={patientSearch}
                          onValueChange={setPatientSearch}
                        />
                        <CommandList>
                          <CommandEmpty>
                            {patientsLoading ? (
                              <div className="flex items-center justify-center p-4">
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                <span>Searching...</span>
                              </div>
                            ) : (
                              "No patients found."
                            )}
                          </CommandEmpty>
                          <CommandGroup heading="Patients">
                            {patients.map((patient) => (
                              <CommandItem
                                key={patient.id}
                                value={patient.id}
                                onSelect={() => {
                                  if (patient.id) {
                                    form.setValue("patientId", patient.id);
                                  }
                                  setPatientComboboxOpen(false);
                                }}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    patient.id === field.value
                                      ? "opacity-100"
                                      : "opacity-0",
                                  )}
                                />
                                <div className="flex flex-col">
                                  <span>{`${patient.firstName} ${patient.lastName}`}</span>
                                  <span className="text-xs text-muted-foreground mr-2">
                                    {patient.phoneNumber}
                                  </span>
                                </div>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Doctor Selection */}
            <FormField
              control={form.control}
              name="doctorId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Doctor</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select doctor" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {doctorsLoading ? (
                        <div className="flex items-center justify-center p-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                        </div>
                      ) : (
                        doctors.map((doctor) => (
                          <SelectItem key={doctor.id} value={doctor.id}>
                            {doctor.name || "Doctor"}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Start Time */}
            <FormField
              control={form.control}
              name="startTime"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Start Time</FormLabel>
                  <DateTimePicker
                    value={field.value}
                    onChange={field.onChange}
                    startHour={startHour}
                    endHour={endHour}
                  />
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* End Time (Optional/Auto-calculated) */}
            <FormField
              control={form.control}
              name="endTime"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>End Time (Optional)</FormLabel>
                  <DateTimePicker
                    value={field.value}
                    onChange={field.onChange}
                    startHour={startHour}
                    endHour={endHour}
                  />
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Appointment Type */}
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Type</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {appointmentTypeOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Notes - Full Width */}
            <div className="md:col-span-2">
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Add any additional notes..."
                        className="resize-none"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
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
