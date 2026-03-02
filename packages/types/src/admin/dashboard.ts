import { z } from "zod";

export const dashboardStatsSchema = z.object({
  totalPatients: z.number().int(),
  totalDoctors: z.number().int(),
  newPatientsThisMonth: z.number().int(),
  todayAppointments: z.number().int(),
  totalAppointments: z.number().int(),
  activePrescriptions: z.number().int(),
  pendingReports: z.number().int(),
  monthlyRevenue: z.number(),
  recentActivity: z.array(
    z.object({
      id: z.string(),
      startTime: z.coerce.date(),
      status: z.string(),
      type: z.string().nullable(),
      createdAt: z.coerce.date(),
      patient: z.object({
        id: z.string(),
        firstName: z.string(),
        lastName: z.string(),
      }),
    }),
  ),
  upcomingAppointments: z.array(
    z.object({
      id: z.string(),
      startTime: z.coerce.date(),
      endTime: z.coerce.date(),
      status: z.string(),
      type: z.string().nullable(),
      patient: z.object({
        id: z.string(),
        firstName: z.string(),
        lastName: z.string(),
      }),
    }),
  ),
});

export type DashboardStats = z.infer<typeof dashboardStatsSchema>;

import { Patient } from "../patient/patients";
import { Appointment } from "../operations/appointments";

export interface DashboardPatient extends Patient {
  id: string;
}

export interface DashboardAppointment extends Appointment {
  id: string;
}
