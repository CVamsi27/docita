// jscpd:ignore-start
import { z } from 'zod';
import { stripHtmlTags } from '@workspace/types';

export const doctorFieldsSchema = z.object({
  doctorName: z.string().max(100).transform(stripHtmlTags).optional(),
  doctorEmail: z.string().email().max(255).transform(stripHtmlTags).optional(),
  doctorPhone: z.string().max(20).transform(stripHtmlTags).optional(),
  doctorSpecialization: z.string().max(100).transform(stripHtmlTags).optional(),
  doctorRole: z.string().max(50).transform(stripHtmlTags).optional(),
  doctorRegistrationNumber: z
    .string()
    .max(100)
    .transform(stripHtmlTags)
    .optional(),
  doctorLicenseNumber: z.string().max(100).transform(stripHtmlTags).optional(),
});
