import { createZodDto } from 'nestjs-zod';
import {
  updateProfileRequestSchema,
  userProfileResponseSchema,
} from '@workspace/types';

export const UpdateProfileSchema = updateProfileRequestSchema;

export class UpdateProfileDto extends createZodDto(UpdateProfileSchema) {}

export class UserResponseDto extends createZodDto(userProfileResponseSchema) {}
