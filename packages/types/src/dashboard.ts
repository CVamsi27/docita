import { z } from "zod";

export const dashboardStatsSchema = z.object({
    totalPatients: z.number().int(),
    totalDoctors: z.number().int(),
    newPatientsThisMonth: z.number().int(),
    todayAppointments: z.number().int(),
    activePrescriptions: z.number().int(),
    pendingReports: z.number().int(),
});

export type DashboardStats = z.infer<typeof dashboardStatsSchema>;

// Extended types for Dashboard usage where ID is required
import { Patient } from "./patients";
import { Appointment } from "./appointments";

export interface DashboardPatient extends Patient {
  id: string;
}

export interface DashboardAppointment extends Appointment {
  id: string;
}
