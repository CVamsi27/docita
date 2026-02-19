import { z } from "zod";

export const reminderSettingsSchema = z.object({
    id: z.string(),
    enabled: z.boolean(),
    smsEnabled: z.boolean(),
    emailEnabled: z.boolean(),
    whatsappEnabled: z.boolean(),
    hoursBeforeAppt: z.number(),
    minutesBefore30: z.boolean(),
    smsTemplate: z.string().nullable().optional(),
    emailTemplate: z.string().nullable().optional(),
    whatsappTemplate: z.string().nullable().optional(),
    emailSubject: z.string(),
    clinicId: z.string().nullable().optional(),
    createdAt: z.date().or(z.string()),
    updatedAt: z.date().or(z.string()),
});

export const appointmentReminderSchema = z.object({
    id: z.string(),
    appointmentId: z.string(),
    type: z.string(),
    status: z.string(),
    sentAt: z.date().or(z.string()).nullable().optional(),
    error: z.string().nullable().optional(),
    createdAt: z.date().or(z.string()),
    updatedAt: z.date().or(z.string()),

    // Relations usually included in history
    appointment: z.object({
        id: z.string(),
        // We can expand this with more appointment fields if needed
        // Assuming simple structure for now or maybe including patient
        patient: z.object({
            firstName: z.string(),
            lastName: z.string(),
        }).optional(),
    }).optional(),
});

export const sendManualReminderResponseSchema = z.object({
    success: z.boolean(),
    message: z.string()
});


export type ReminderSettings = z.infer<typeof reminderSettingsSchema>;
export type AppointmentReminder = z.infer<typeof appointmentReminderSchema>;
