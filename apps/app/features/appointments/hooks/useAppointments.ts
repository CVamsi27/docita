import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { appointmentsApi } from "../api/appointments.api";
import type {
  CreateAppointmentInput,
  UpdateAppointmentInput,
} from "@workspace/types";
import { toast } from "sonner";

/**
 * React Query hooks for appointment operations
 */

/**
 * Fetch all appointments with optional filters
 */
export function useAppointments(params?: {
  date?: string;
  startDate?: string;
  endDate?: string;
  doctorId?: string;
}) {
  return useQuery({
    queryKey: ["appointments", params],
    queryFn: () => appointmentsApi.getAll(params),
  });
}

/**
 * Fetch a single appointment by ID
 */
export function useAppointment(id: string) {
  return useQuery({
    queryKey: ["appointments", id],
    queryFn: () => appointmentsApi.getById(id),
    enabled: !!id,
  });
}

/**
 * Create a new appointment
 */
export function useCreateAppointment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateAppointmentInput) => appointmentsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      toast.success("Appointment created successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to create appointment");
    },
  });
}

/**
 * Update an existing appointment
 */
export function useUpdateAppointment(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateAppointmentInput) =>
      appointmentsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      queryClient.invalidateQueries({ queryKey: ["appointments", id] });
      toast.success("Appointment updated successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update appointment");
    },
  });
}

/**
 * Delete an appointment
 */
export function useDeleteAppointment(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => appointmentsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      toast.success("Appointment cancelled");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to cancel appointment");
    },
  });
}

/**
 * Check-in an appointment
 */
export function useCheckInAppointment(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => appointmentsApi.checkIn(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      queryClient.invalidateQueries({ queryKey: ["appointments", id] });
      toast.success("Patient checked in");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to check in");
    },
  });
}
