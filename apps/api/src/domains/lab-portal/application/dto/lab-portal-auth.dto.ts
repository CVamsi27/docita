import { z } from 'zod';

export const labPortalLoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export type LabPortalLoginInput = z.infer<typeof labPortalLoginSchema>;
