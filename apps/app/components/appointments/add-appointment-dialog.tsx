"use client";

import { useState, useCallback } from "react";

import { Plus, Check, ChevronsUpDown, Loader2 } from "lucide-react";
import type { CreateAppointmentInput } from "@workspace/types";

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
  CommandList,
} from "@workspace/ui/components/command";
import { FormDialog } from "@workspace/ui/components/form-dialog";
import { cn } from "@workspace/ui/lib/utils";
import { useAppointmentForm } from "@/hooks/use-appointment-form";
import { useFormOptions } from "@/lib/app-config-context";
import { useClinic } from "@/lib/clinic-context";
import { DateTimePicker } from "@/components/common/date-time-picker";

interface AddAppointmentDialogProps {
  onAppointmentAdded: () => void;
  selectedDate?: Date;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  preselectedPatientId?: string;
}

export function AddAppointmentDialog({
  onAppointmentAdded,
  selectedDate,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  preselectedPatientId,
}: AddAppointmentDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [patientComboboxOpen, setPatientComboboxOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = useCallback(
    (newOpen: boolean) => {
      if (isControlled && controlledOnOpenChange) {
        controlledOnOpenChange(newOpen);
      } else {
        setInternalOpen(newOpen);
      }
    },
    [isControlled, controlledOnOpenChange],
  );

  // Get clinic settings
  const { clinic } = useClinic();

  // Extract clinic opening/closing times
  const openingTimeStr = clinic?.openingTime;
  const closingTimeStr = clinic?.closingTime;

  const startHour = openingTimeStr
    ? parseInt(openingTimeStr.split(":")[0] ?? "9", 10)
    : 9;
  const endHour = closingTimeStr
    ? parseInt(closingTimeStr.split(":")[0] ?? "18", 10)
    : 18;

  // Get form options from config
  const appointmentTypeOptions = useFormOptions("appointmentType");

  const {
    form,
    loading,
    patients,
    patientsLoading,
    patientSearch,
    setPatientSearch,
    doctors,
    doctorsLoading,
    onSubmit,
  } = useAppointmentForm({
    onAppointmentAdded,
    selectedDate,
    preselectedPatientId,
    startHour,
    endHour,
  });

  const handleSubmit = useCallback(
    async (data: CreateAppointmentInput) => {
      await onSubmit(data, () => setOpen(false));
    },
    [onSubmit, setOpen],
  );

  // Get selected patient name for display
  const selectedPatientId = form.watch("patientId");
  const selectedPatient = patients.find((p) => p.id === selectedPatientId);

  return (
    <>
      <Button className="gap-2" onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" />
        New Appointment
      </Button>
      <FormDialog
        open={open}
        onOpenChange={setOpen}
        title="Schedule Appointment"
        description="Create a new appointment for a patient."
      >
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-4"
          >
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
                          type="button"
                          aria-expanded={patientComboboxOpen}
                          className={cn(
                            "w-full justify-between",
                            !field.value && "text-muted-foreground",
                          )}
                        >
                          {selectedPatient
                            ? `${selectedPatient.firstName} ${selectedPatient.lastName}`
                            : "Search patient by name..."}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent
                      className="w-[400px] p-0 z-100"
                      align="start"
                    >
                      <Command shouldFilter={false}>
                        <CommandInput
                          placeholder="Search patient by name..."
                          value={patientSearch}
                          onValueChange={setPatientSearch}
                        />
                        <CommandList>
                          {patientsLoading ? (
                            <div className="flex items-center justify-center py-6">
                              <Loader2 className="h-4 w-4 animate-spin" />
                              <span className="ml-2 text-sm text-muted-foreground">
                                Searching...
                              </span>
                            </div>
                          ) : patients.length === 0 ? (
                            <CommandEmpty>
                              {patientSearch
                                ? "No patient found."
                                : "Type to search patients..."}
                            </CommandEmpty>
                          ) : (
                            <CommandGroup>
                              {patients.map((patient) => (
                                <div
                                  key={patient.id}
                                  onClick={() => {
                                    field.onChange(patient.id);
                                    setPatientComboboxOpen(false);
                                  }}
                                  className="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground"
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      field.value === patient.id
                                        ? "opacity-100"
                                        : "opacity-0",
                                    )}
                                  />
                                  <div className="flex flex-col">
                                    <span>
                                      {patient.firstName} {patient.lastName}
                                    </span>
                                    {patient.phoneNumber && (
                                      <span className="text-xs text-muted-foreground">
                                        {patient.phoneNumber}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </CommandGroup>
                          )}
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="doctorId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Doctor</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    disabled={doctorsLoading}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue
                          placeholder={
                            doctorsLoading ? "Loading..." : "Select doctor"
                          }
                        />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {doctors.map((doctor) => (
                        <SelectItem key={doctor.id} value={doctor.id}>
                          Dr. {doctor.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="startTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date & Time</FormLabel>
                    <FormControl>
                      <DateTimePicker
                        value={field.value}
                        onChange={field.onChange}
                        placeholder="Select date and time"
                        minDate={new Date()}
                        startHour={startHour}
                        endHour={endHour}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
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
            </div>

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Reason for visit..."
                      {...field}
                      value={field.value || ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={loading}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading} className="flex-1">
                {loading ? "Scheduling..." : "Schedule Appointment"}
              </Button>
            </div>
          </form>
        </Form>
      </FormDialog>
    </>
  );
}
