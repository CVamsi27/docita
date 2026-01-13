import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { userSchema } from '@workspace/types';

export const UpdateProfileSchema = z
  .object({
    name: z.string().min(1).optional(),
    email: z.string().email().optional(),
  })
  .refine((data) => data.name || data.email, {
    message: 'At least one field (name or email) is required',
  });

export class UpdateProfileDto extends createZodDto(UpdateProfileSchema) {}

export class UserResponseDto extends createZodDto(userSchema) {}
