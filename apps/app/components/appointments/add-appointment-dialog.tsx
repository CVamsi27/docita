/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import { useState, useCallback } from "react"

import { Plus } from "lucide-react"

import { Button } from "@workspace/ui/components/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@workspace/ui/components/dialog"
import { FormProvider } from "react-hook-form"
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@workspace/ui/components/form"
import { Input } from "@workspace/ui/components/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import { Textarea } from "@workspace/ui/components/textarea"
import { useAppointmentForm } from "@/hooks/use-appointment-form"

interface AddAppointmentDialogProps {
  onAppointmentAdded: () => void
  selectedDate?: Date
  open?: boolean
  onOpenChange?: (open: boolean) => void
  preselectedPatientId?: string
}

export function AddAppointmentDialog({ onAppointmentAdded, selectedDate, open: controlledOpen, onOpenChange: controlledOnOpenChange, preselectedPatientId }: AddAppointmentDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false)
  const isControlled = controlledOpen !== undefined
  const open = isControlled ? controlledOpen : internalOpen
  const setOpen = isControlled ? controlledOnOpenChange : setInternalOpen

  const {
    form,
    loading,
    patients,
    onSubmit,
  } = useAppointmentForm({ 
    onAppointmentAdded, 
    selectedDate,
    preselectedPatientId
  })

  const handleSubmit = useCallback(async (data: any) => {
    await onSubmit(data, () => setOpen?.(false))
  }, [onSubmit, setOpen])

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          New Appointment
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Schedule Appointment</DialogTitle>
          <DialogDescription>
            Create a new appointment for a patient.
          </DialogDescription>
        </DialogHeader>
        <FormProvider {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control as any}
              name="patientId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Patient</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a patient" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {patients.map((patient) => (
                        <SelectItem key={patient.id} value={patient.id || ""}>
                          {patient.firstName} {patient.lastName}
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
                control={form.control as any}
                name="startTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start Time</FormLabel>
                    <FormControl>
                      <Input type="datetime-local" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control as any}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="consultation">Consultation</SelectItem>
                        <SelectItem value="follow-up">Follow-up</SelectItem>
                        <SelectItem value="check-up">Check-up</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control as any}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Reason for visit..." {...field} value={field.value || ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="submit" disabled={loading}>
                {loading ? "Scheduling..." : "Schedule Appointment"}
              </Button>
            </DialogFooter>
          </form>
        </FormProvider>
      </DialogContent>
    </Dialog>
  )
}
