import { createZodDto } from 'nestjs-zod';
import {
  staffAccountDeletionRequestSchema,
  staffAccountDeletionResponseSchema,
  updateProfileRequestSchema,
  userProfileResponseSchema,
} from '@workspace/types';

export const UpdateProfileSchema = updateProfileRequestSchema;

export class UpdateProfileDto extends createZodDto(UpdateProfileSchema) {}

export class UserResponseDto extends createZodDto(userProfileResponseSchema) {}

export const StaffAccountDeletionRequestSchema =
  staffAccountDeletionRequestSchema;

export class StaffAccountDeletionRequestDto extends createZodDto(
  StaffAccountDeletionRequestSchema,
) {}

export class StaffAccountDeletionResponseDto extends createZodDto(
  staffAccountDeletionResponseSchema,
) {}
