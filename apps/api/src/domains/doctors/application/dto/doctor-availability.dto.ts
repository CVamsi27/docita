import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import {
  listDoctorSchedulesQuerySchema,
  listDoctorTimeOffQuerySchema,
  doctorAvailableSlotsQuerySchema,
} from '@workspace/types';

export const dayOfWeekSchema = z.enum([
  'SUNDAY',
  'MONDAY',
  'TUESDAY',
  'WEDNESDAY',
  'THURSDAY',
  'FRIDAY',
  'SATURDAY',
]);

export type DayOfWeek = z.infer<typeof dayOfWeekSchema>;

export const createScheduleSchema = z.object({
  doctorId: z.string().optional(),
  dayOfWeek: dayOfWeekSchema,
  startTime: z
    .string()
    .regex(
      /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/,
      'Invalid time format. Use HH:MM format.',
    ),
  endTime: z
    .string()
    .regex(
      /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/,
      'Invalid time format. Use HH:MM format.',
    ),
  slotDuration: z.number().int().positive().optional().default(30),
  isActive: z.boolean().optional().default(true),
});

export type CreateScheduleDto = z.infer<typeof createScheduleSchema>;

export const updateScheduleSchema = createScheduleSchema
  .partial()
  .omit({ doctorId: true, dayOfWeek: true });

export type UpdateScheduleDto = z.infer<typeof updateScheduleSchema>;

export const bulkScheduleSchema = z.object({
  doctorId: z.string().optional(),
  schedules: z.array(
    z.object({
      dayOfWeek: dayOfWeekSchema,
      startTime: z
        .string()
        .regex(
          /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/,
          'Invalid time format. Use HH:MM format.',
        ),
      endTime: z
        .string()
        .regex(
          /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/,
          'Invalid time format. Use HH:MM format.',
        ),
      slotDuration: z.number().int().positive().optional(),
      isActive: z.boolean().optional(),
    }),
  ),
});

export type BulkScheduleDto = z.infer<typeof bulkScheduleSchema>;

export const createTimeOffSchema = z.object({
  doctorId: z.string().optional(),
  startDate: z.string(),
  endDate: z.string(),
  reason: z.string().optional(),
  isFullDay: z.boolean().optional().default(true),
  startTime: z
    .string()
    .regex(
      /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/,
      'Invalid time format. Use HH:MM format.',
    )
    .optional(),
  endTime: z
    .string()
    .regex(
      /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/,
      'Invalid time format. Use HH:MM format.',
    )
    .optional(),
});

export type CreateTimeOffDto = z.infer<typeof createTimeOffSchema>;

export const ListDoctorSchedulesQuerySchema = listDoctorSchedulesQuerySchema;
export class ListDoctorSchedulesQueryDto extends createZodDto(
  ListDoctorSchedulesQuerySchema,
) {}

export const ListDoctorTimeOffQuerySchema = listDoctorTimeOffQuerySchema;
export class ListDoctorTimeOffQueryDto extends createZodDto(
  ListDoctorTimeOffQuerySchema,
) {}

export const DoctorAvailableSlotsQuerySchema = doctorAvailableSlotsQuerySchema;
export class DoctorAvailableSlotsQueryDto extends createZodDto(
  DoctorAvailableSlotsQuerySchema,
) {}
