"use client";

import { useState, useCallback } from "react";
import { Plus, Check, ChevronsUpDown, Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import { Patient } from "@workspace/types";

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
import { apiHooks } from "@/lib/api-hooks";

interface PaginatedResponse<T> {
  items: T[];
  nextCursor?: string;
  hasMore: boolean;
  count: number;
}

const walkInSchemaBase = z.object({
  patientId: z.string().min(1, "Patient is required"),
  doctorId: z.string().optional(),
  priority: z.coerce.number().int().min(0).max(2).default(0),
  notes: z.string().optional(),
});

interface AddWalkInDialogProps {
  onWalkInAdded: () => void;
  doctors?: Array<{ id: string; name: string }>;
  useDoctorQueues?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function AddWalkInDialog({
  onWalkInAdded,
  doctors = [],
  useDoctorQueues = false,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
}: AddWalkInDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [patientComboboxOpen, setPatientComboboxOpen] = useState(false);
  const [patientSearch, setPatientSearch] = useState("");

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

  // Fetch doctors if not provided
  const { data: fetchedDoctors = [] } = apiHooks.useDoctors();
  const availableDoctors = doctors.length > 0 ? doctors : fetchedDoctors;

  const form = useForm({
    resolver: zodResolver(walkInSchemaBase),
    defaultValues: {
      patientId: "",
      doctorId: "",
      priority: 0,
      notes: "",
    },
  });

  // Fetch patients with search
  const { data: patientsResponse = { items: [] }, isLoading: patientsLoading } =
    apiHooks.usePatients({ search: patientSearch });
  const paginatedResponse = patientsResponse as PaginatedResponse<Patient>;
  const patients: Patient[] = paginatedResponse?.items || [];

  const createQueueToken = apiHooks.useCreateQueueToken();

  const onSubmit = useCallback(
    async (data: z.infer<typeof walkInSchemaBase>) => {
      try {
        await createQueueToken.mutateAsync({
          patientId: data.patientId,
          doctorId: data.doctorId,
          priority: data.priority,
          notes: data.notes || undefined,
        });

        toast.success("Walk-in patient added to queue");
        form.reset();
        setOpen(false);
        // Give the server a moment to persist, then refetch
        setTimeout(() => {
          onWalkInAdded();
        }, 300);
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "Failed to add walk-in patient",
        );
      }
    },
    [createQueueToken, form, setOpen, onWalkInAdded],
  );

  // Get selected patient name for display
  const selectedPatientId = form.watch("patientId");
  const selectedPatient = patients.find((p) => p.id === selectedPatientId);

  return (
    <>
      <Button className="gap-2" onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" />
        Add Walk-in
      </Button>
      <FormDialog
        open={open}
        onOpenChange={setOpen}
        title="Add Walk-in Patient"
        description="Add a walk-in patient directly to the queue."
      >
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
                  <FormLabel>
                    Doctor{" "}
                    {useDoctorQueues && (
                      <span className="text-destructive">*</span>
                    )}
                  </FormLabel>
                  <Select
                    onValueChange={(value) =>
                      field.onChange(value === "none" ? "" : value)
                    }
                    value={field.value || "none"}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select doctor" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="none">No specific doctor</SelectItem>
                      {availableDoctors.map((doctor) => (
                        <SelectItem key={doctor.id} value={doctor.id}>
                          {doctor.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="priority"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Priority</FormLabel>
                  <Select
                    onValueChange={(value) => field.onChange(Number(value))}
                    defaultValue={field.value?.toString() || "0"}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select priority" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="0">Normal</SelectItem>
                      <SelectItem value="1">High</SelectItem>
                      <SelectItem value="2">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Reason for visit or special instructions..."
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
                disabled={createQueueToken.isPending}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createQueueToken.isPending}
                className="flex-1"
              >
                {createQueueToken.isPending
                  ? "Adding to Queue..."
                  : "Add to Queue"}
              </Button>
            </div>
          </form>
        </Form>
      </FormDialog>
    </>
  );
}
