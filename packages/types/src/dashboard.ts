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
